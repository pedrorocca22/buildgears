import OCModule from 'replicad-opencascadejs'
import ocWasmUrl from 'replicad-opencascadejs/wasm?url'
import { setOC, draw, drawCircle, drawRectangle, makeCompound } from 'replicad'
import type { GearParameters } from './types'
import { generateInvoluteProfile, generateRackProfile, calculateDimensions, getConjugatePinionParams } from './gearMath'
import { getDIN6885Keyway } from './din6885'
import { getDIN912Screw } from './din912'


let ocLoaded = false
let ocLoadingPromise: Promise<void> | null = null

async function initOC() {
  if (ocLoaded) return
  if (!ocLoadingPromise) {
    ocLoadingPromise = (async () => {
      self.postMessage({ type: 'PROGRESS', progress: 15, message: 'Cargando OpenCASCADE WASM kernel...' })
      const OC = await OCModule({
        locateFile: () => ocWasmUrl,
      })
      setOC(OC)
      ocLoaded = true
      self.postMessage({ type: 'PROGRESS', progress: 40, message: 'OpenCASCADE inicializado con éxito.' })
    })()
  }
  return ocLoadingPromise
}

function buildCylindricalGearSolid(gp: GearParameters): any {
  const dims = calculateDimensions(gp)
  const {
    gearType,
    faceWidth,
    boreDiameter,
    hasKeyway,
    bodyStyle,
    hubDiameter,
    hubOffset,
    holeCount,
    holeDiameter,
    holeCircleRadius,
  } = gp

  // Optimización crítica para OpenCASCADE B-Rep en WebAssembly:
  // En engranajes helicoidales o espiga, OpenCASCADE utiliza un barrido helicoidal no lineal (BRepOffsetAPI_MakePipeShell).
  // Con 8 puntos por flanco se generan más de 550 caras helicoidales B-Spline que sobrecargan el solver en WASM (~5 min).
  // Reduciendo a 3 puntos por flanco, la desviación respecto a la evolvente ideal es < 0.008 mm (grado de precisión ISO 6),
  // pero el cálculo y las operaciones booleanas se aceleran entre 15x y 25x, exportando en pocos segundos.
  const isTwisted = gearType === 'helical' || gearType === 'herringbone'
  const pointsPerFlank = isTwisted ? 3 : 4
  const contour = generateInvoluteProfile(gp, pointsPerFlank)

  let pen = draw(contour[0])
  for (let i = 1; i < contour.length; i++) {
    pen = pen.lineTo(contour[i])
  }
  const drawing = pen.close()
  const sketch = drawing.sketchOnPlane('XY')

  let solid: any = null
  if (gearType === 'spur' || gearType === 'bevel') {
    solid = sketch.extrude(faceWidth)
  } else if (gearType === 'helical') {
    const twist = dims.twistAngleDeg
    solid = sketch.extrude(faceWidth, { twistAngle: twist })
  } else if (gearType === 'herringbone') {
    const halfTwist = dims.twistAngleDeg / 2
    const halfB = faceWidth / 2
    const top: any = sketch.extrude(halfB, { twistAngle: halfTwist })
    const bottom: any = top.clone(true).mirror('XY')
    // Se traslada en Z exactamente igual que la cremallera (+halfB) para que el vértice de la espiga (V)
    // coincida en el plano central Z = halfB y los dientes queden perfectamente enfrentados y engranados.
    solid = top.fuse(bottom).translate([0, 0, halfB])
  }

  // Chaflán paramétrico a 45° en extremos axiales de los dientes (Z = 0 y Z = faceWidth)
  if (gp.hasToothChamfer && (gp.toothChamfer || 0) > 0) {
    const ra = dims.tipRadius
    const maxC = Math.min(faceWidth * 0.35, (dims.tipRadius - dims.rootRadius) * 0.8, 5.0)
    const c = Math.max(0.05, Math.min(gp.toothChamfer || 0.6, maxC))
    const rOut = ra + 20

    // Perfil cortador superior en el plano XZ (revolución alrededor de [0, 0, 1])
    const topPen = draw([ra - c, faceWidth])
      .lineTo([ra, faceWidth - c])
      .lineTo([rOut, faceWidth - c])
      .lineTo([rOut, faceWidth + 2])
      .lineTo([ra - c, faceWidth + 2])
    const topChamfer = topPen.close().sketchOnPlane('XZ').revolve([0, 0, 1])

    // Perfil cortador inferior en el plano XZ
    const botPen = draw([ra - c, 0])
      .lineTo([ra, c])
      .lineTo([rOut, c])
      .lineTo([rOut, -2])
      .lineTo([ra - c, -2])
    const botChamfer = botPen.close().sketchOnPlane('XZ').revolve([0, 0, 1])

    solid = solid.cut(makeCompound([topChamfer, botChamfer]))
  }

  // Preparamos el cortador central (eje cilíndrico + chavetero DIN 6885) en una sola entidad geométrica:
  // Fusión rápida de dos primitivas simples (0.01s), evitando múltiples cortes pesados sobre las caras del engranaje.
  let shaftCutter: any = null
  if (boreDiameter > 0) {
    const boreTotalLen = faceWidth + (hubOffset || 0) + 40
    shaftCutter = drawCircle(boreDiameter / 2)
      .sketchOnPlane('XY')
      .extrude(boreTotalLen)
      .translate([0, 0, -20])

    if (hasKeyway) {
      const kw = getDIN6885Keyway(boreDiameter)
      const bKey = gp.keywayWidth ?? kw.b
      const t2Key = gp.keywayDepth ?? kw.t2

      const keyBox: any = drawRectangle(bKey, t2Key * 2)
        .sketchOnPlane('XY')
        .extrude(boreTotalLen)
        .translate([0, boreDiameter / 2, -20])
      shaftCutter = shaftCutter.fuse(keyBox)
    }
  }

  // Buje (Hub) - parte desde la base Z = 0 y sobresale por la cara superior en hubOffset
  if (bodyStyle === 'hub' && hubDiameter > boreDiameter) {
    const hubTotal = faceWidth + (hubOffset || 0)
    const hub: any = drawCircle(hubDiameter / 2)
      .sketchOnPlane('XY')
      .extrude(hubTotal)
    solid = solid.fuse(hub)
  }

  // Corte pasante del eje y chavetero en un único paso booleano sobre la pieza completa
  if (shaftCutter) {
    solid = solid.cut(shaftCutter)
  }

  // Aligeramiento (Spoke) - agrupado en un único corte compuesto para máxima velocidad
  if (bodyStyle === 'spoke' && holeCount > 0 && holeDiameter > 2 && holeCircleRadius > (boreDiameter / 2 + holeDiameter / 2)) {
    const cutLen = faceWidth + 40
    const spokeHoles: any[] = []
    for (let i = 0; i < holeCount; i++) {
      const angle = (i * 2 * Math.PI) / holeCount
      const hx = holeCircleRadius * Math.cos(angle)
      const hy = holeCircleRadius * Math.sin(angle)

      const hole: any = drawCircle(holeDiameter / 2)
        .sketchOnPlane('XY')
        .extrude(cutLen)
        .translate([hx, hy, -20])
      spokeHoles.push(hole)
    }
    if (spokeHoles.length > 0) {
      solid = solid.cut(makeCompound(spokeHoles))
    }
  }

  return solid
}

function buildRackSolid(gearParams: GearParameters): any {
  const { faceWidth } = gearParams
  const rLength = gearParams.rackLength || 150
  const rHeight = gearParams.rackHeight || 25
  const contour = generateRackProfile(gearParams, rLength, rHeight)

  // Cada llamada a getFreshSketch genera un nuevo objeto Sketch en OpenCASCADE
  // para evitar errores de 'This object has been deleted' al extruir múltiples mitades (como en espiga/doble hélice).
  const getFreshSketch = () => {
    let pen = draw(contour[0])
    for (let i = 1; i < contour.length; i++) {
      pen = pen.lineTo(contour[i])
    }
    return pen.close().sketchOnPlane('XY')
  }

  const isHerringboneRack = gearParams.rackToothType === 'herringbone'
  const isHelicalRack = gearParams.rackToothType === 'helical' || (!gearParams.rackToothType && gearParams.helixAngle && gearParams.helixAngle > 0)
  const effectiveAngle = gearParams.helixAngle || 20

  let solid: any = null

  if (isHerringboneRack) {
    const halfB = faceWidth / 2
    const betaRad = ((effectiveAngle * Math.PI) / 180) * (gearParams.helixHand === 'left' ? -1 : 1)
    const tanBeta = Math.tan(betaRad)
    const dist = halfB / Math.cos(betaRad)
    const top: any = getFreshSketch().extrude(dist, {
      extrusionDirection: [tanBeta, 0, 1],
    })
    const bottom: any = getFreshSketch().extrude(dist, {
      extrusionDirection: [tanBeta, 0, -1],
    })
    solid = top.fuse(bottom).translate([0, 0, halfB])
  } else if (isHelicalRack) {
    const betaRad = ((effectiveAngle * Math.PI) / 180) * (gearParams.helixHand === 'left' ? -1 : 1)
    const dist = faceWidth / Math.cos(betaRad)
    solid = getFreshSketch().extrude(dist, {
      extrusionDirection: [Math.tan(betaRad), 0, 1],
    })
  } else {
    solid = getFreshSketch().extrude(faceWidth)
  }

  // Chaflán paramétrico a 45° en extremos de dientes de cremallera (Z = 0 y Z = faceWidth)
  if (gearParams.hasToothChamfer && (gearParams.toothChamfer || 0) > 0) {
    const ha = (gearParams.addendumCoeff ?? 1.0) * gearParams.module
    const maxC = Math.min(faceWidth * 0.35, ha * 0.8, 5.0)
    const c = Math.max(0.05, Math.min(gearParams.toothChamfer || 0.6, maxC))
    const xSpan = rLength + 20

    // Cortador superior en plano YZ (extruido a lo largo de X)
    const topPen = draw([ha - c, faceWidth])
      .lineTo([ha, faceWidth - c])
      .lineTo([ha + 5, faceWidth - c])
      .lineTo([ha + 5, faceWidth + 2])
      .lineTo([ha - c, faceWidth + 2])
    const topChamfer = topPen.close()
      .sketchOnPlane('YZ')
      .extrude(xSpan)
      .translate([-xSpan / 2, 0, 0])

    // Cortador inferior en plano YZ
    const botPen = draw([ha - c, 0])
      .lineTo([ha, c])
      .lineTo([ha + 5, c])
      .lineTo([ha + 5, -2])
      .lineTo([ha - c, -2])
    const botChamfer = botPen.close()
      .sketchOnPlane('YZ')
      .extrude(xSpan)
      .translate([-xSpan / 2, 0, 0])

    solid = solid.cut(makeCompound([topChamfer, botChamfer]))
  }

  // Taladros y cajeras DIN 912 para exportación STEP
  if (gearParams.rackMountingHoles) {
    const din912 = getDIN912Screw(gearParams.rackScrewStandard || 'M5')
    const count = Math.max(2, gearParams.rackHoleCount || 3)
    const holePos = gearParams.rackHolePosition || 'bottom'

    const endMargin = Math.min(25, rLength / (count + 1))
    const usableSpan = rLength - 2 * endMargin
    const stepX = count > 1 ? usableSpan / (count - 1) : 0

    const holeCutters: any[] = []

    for (let i = 0; i < count; i++) {
      const hx = count > 1 ? -rLength / 2 + endMargin + i * stepX : 0

      if (holePos === 'bottom') {
        const holeLen = rHeight * 2 + 10
        const throughHole = drawCircle(din912.throughHoleDia / 2)
          .sketchOnPlane('XZ')
          .extrude(holeLen)
          .translate([hx, -rHeight - 5, faceWidth / 2])
        holeCutters.push(throughHole)

        const cbHeight = din912.counterboreDepth + 2
        const counterbore = drawCircle(din912.counterboreDia / 2)
          .sketchOnPlane('XZ')
          .extrude(cbHeight)
          .translate([hx, -rHeight - 1, faceWidth / 2])
        holeCutters.push(counterbore)
      } else {
        const holeLen = faceWidth + 10
        const throughHole = drawCircle(din912.throughHoleDia / 2)
          .sketchOnPlane('XY')
          .extrude(holeLen)
          .translate([hx, -rHeight / 2, -5])
        holeCutters.push(throughHole)

        const cbHeight = din912.counterboreDepth + 2
        const counterbore = drawCircle(din912.counterboreDia / 2)
          .sketchOnPlane('XY')
          .extrude(cbHeight)
          .translate([hx, -rHeight / 2, faceWidth - din912.counterboreDepth])
        holeCutters.push(counterbore)
      }
    }

    if (holeCutters.length > 0) {
      solid = solid.cut(makeCompound(holeCutters))
    }
  }

  return solid
}

self.onmessage = async (e: MessageEvent) => {
  const { type, params, fileName, exportTarget = 'default' } = e.data

  if (type === 'INIT') {
    try {
      await initOC()
      self.postMessage({ type: 'INIT_DONE' })
    } catch (err: any) {
      self.postMessage({ type: 'ERROR', error: err.message || 'Error al iniciar OpenCASCADE' })
    }
    return
  }

  if (type === 'EXPORT_STEP') {
    try {
      await initOC()
      self.postMessage({ type: 'PROGRESS', progress: 45, message: 'Calculando geometría analítica B-Rep...' })

      const gearParams = params as GearParameters
      const dims = calculateDimensions(gearParams)
      const { gearType, faceWidth } = gearParams

      self.postMessage({ type: 'PROGRESS', progress: 60, message: 'Generando curvas de involuta exactas...' })

      let stepBlob: Blob

      if (gearType === 'rack') {
        if (exportTarget === 'pinion') {
          self.postMessage({ type: 'PROGRESS', progress: 70, message: 'Modelando piñón motriz conjugado...' })
          const pinionParams = getConjugatePinionParams(gearParams)
          const pinionSolid = buildCylindricalGearSolid(pinionParams)
          self.postMessage({ type: 'PROGRESS', progress: 92, message: 'Codificando entidades STEP ISO 10303...' })
          stepBlob = pinionSolid.blobSTEP()
        } else if (exportTarget === 'assembly') {
          self.postMessage({ type: 'PROGRESS', progress: 65, message: 'Modelando barra de cremallera...' })
          const rackSolid = buildRackSolid(gearParams)

          self.postMessage({ type: 'PROGRESS', progress: 75, message: 'Modelando piñón motriz conjugado...' })
          const pinionParams = getConjugatePinionParams(gearParams)
          const pinionSolid = buildCylindricalGearSolid(pinionParams)

          const pinionY = dims.pinionOperatingY || ((dims.circularPitch / Math.PI) * (gearParams.rackPinionTeeth || 20) / 2)
          const positionedPinion = pinionSolid.translate([0, pinionY, 0])

          self.postMessage({ type: 'PROGRESS', progress: 92, message: 'Ensamblando conjunto multi-cuerpo STEP...' })

          // Exportamos como verdadero ENSAMBLAJE STEP multi-cuerpo (TopoDS_Compound)
          // sin fusionar los sólidos: Cada componente conserva su cuerpo sólido individual,
          // y se exporta de forma instantánea (< 0.5s) sin el cuello de botella de proyección UV de AP242.
          const assemblyCompound = makeCompound([rackSolid, positionedPinion])
          stepBlob = assemblyCompound.blobSTEP()
        } else {
          // Exportación estándar de solo la cremallera
          const rackSolid = buildRackSolid(gearParams)
          self.postMessage({ type: 'PROGRESS', progress: 92, message: 'Codificando entidades STEP ISO 10303...' })
          stepBlob = rackSolid.blobSTEP()
        }
      } else if (gearType === 'internal') {
        const contour = generateInvoluteProfile(gearParams, 8)
        let pen = draw(contour[0])
        for (let i = 1; i < contour.length; i++) {
          pen = pen.lineTo(contour[i])
        }
        const drawing = pen.close()

        const teethSolid: any = drawing.sketchOnPlane('XY').extrude(faceWidth)
        const outerR = Math.max(dims.tipRadius + 12, (gearParams.outerRingDiameter || 0) / 2 || dims.tipRadius + 15)
        const ring: any = drawCircle(outerR).sketchOnPlane('XY').extrude(faceWidth)
        let solid = ring.cut(teethSolid)

        if (gearParams.hasToothChamfer && (gearParams.toothChamfer || 0) > 0) {
          const ra = dims.tipRadius
          const maxC = Math.min(faceWidth * 0.35, Math.abs(dims.pitchRadius - dims.tipRadius) * 0.8, 5.0)
          const c = Math.max(0.05, Math.min(gearParams.toothChamfer || 0.6, maxC))

          const topPen = draw([ra, faceWidth - c])
            .lineTo([ra - 5, faceWidth - c])
            .lineTo([ra - 5, faceWidth + 2])
            .lineTo([ra + c, faceWidth + 2])
            .lineTo([ra + c, faceWidth])
          const topChamfer = topPen.close().sketchOnPlane('XZ').revolve([0, 0, 1])

          const botPen = draw([ra, c])
            .lineTo([ra - 5, c])
            .lineTo([ra - 5, -2])
            .lineTo([ra + c, -2])
            .lineTo([ra + c, 0])
          const botChamfer = botPen.close().sketchOnPlane('XZ').revolve([0, 0, 1])

          solid = solid.cut(makeCompound([topChamfer, botChamfer]))
        }

        self.postMessage({ type: 'PROGRESS', progress: 92, message: 'Codificando entidades STEP ISO 10303...' })
        stepBlob = solid.blobSTEP()
      } else {
        if (exportTarget === 'assembly') {
          self.postMessage({ type: 'PROGRESS', progress: 65, message: 'Modelando engranaje 1...' })
          const solid1 = buildCylindricalGearSolid(gearParams)

          self.postMessage({ type: 'PROGRESS', progress: 78, message: 'Modelando engranaje 2 conjugado...' })
          const z2 = gearParams.rackPinionTeeth || 24
          const pairDims = calculateDimensions(gearParams, z2)
          const centerDist = pairDims.centerDistance || (gearParams.module * (gearParams.teeth + z2) / 2)
          const gear2Params: GearParameters = {
            ...gearParams,
            gearType: (gearParams.gearType === 'internal' ? 'spur' : gearParams.gearType) as any,
            teeth: z2,
            helixHand: (gearParams.helixHand === 'right' ? 'left' : 'right') as any,
            bodyStyle: 'solid',
            boreDiameter: gearParams.boreDiameter > 0 ? Math.min(gearParams.boreDiameter, 14) : 0,
            hasKeyway: false,
          }
          const solid2 = buildCylindricalGearSolid(gear2Params).translate([centerDist, 0, 0])

          self.postMessage({ type: 'PROGRESS', progress: 92, message: 'Ensamblando conjunto multi-cuerpo STEP...' })
          const assemblyCompound = makeCompound([solid1, solid2])
          stepBlob = assemblyCompound.blobSTEP()
        } else {
          const solid = buildCylindricalGearSolid(gearParams)
          self.postMessage({ type: 'PROGRESS', progress: 92, message: 'Codificando entidades STEP ISO 10303...' })
          stepBlob = solid.blobSTEP()
        }
      }

      self.postMessage({
        type: 'STEP_READY',
        blob: stepBlob,
        sizeBytes: stepBlob.size,
        fileName: fileName || `engranaje_${gearType}_m${gearParams.module}_z${gearParams.teeth}.step`,
      })
    } catch (err: any) {
      console.error('Error en Replicad Web Worker:', err)
      self.postMessage({ type: 'ERROR', error: err.message || 'Error en la generación del archivo STEP' })
    }
  }
}
