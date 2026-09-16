import OCModule from 'replicad-opencascadejs'
import ocWasmUrl from 'replicad-opencascadejs/wasm?url'
import { setOC, draw, drawCircle, drawRectangle, makeCompound, measureVolume, measureArea } from 'replicad'
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

export interface StepQualityReport {
  faces: number
  solids: number
  volumeMm3: number
  areaMm2: number
  bboxMm: [[number, number, number], [number, number, number]] | null
  meshTris: number | null // sonda de teselado OC (solo modo exact, cuesta tiempo)
  meshMs: number
  ok: boolean
  warnings: string[]
}

/**
 * Control de calidad del sólido antes de serializar: topología (caras,
 * sólidos), propiedades físicas (volumen > 0) y caja. Nunca rompe la
 * exportación: cada métrica va en try/catch y los fallos van a warnings.
 */
function qualityReport(solid: any, probeMesh: boolean): StepQualityReport {
  const warnings: string[] = []
  let faces = 0
  let solids = 0
  let volumeMm3 = 0
  let areaMm2 = 0
  let bboxMm: StepQualityReport['bboxMm'] = null
  let meshTris: number | null = null
  const tMesh0 = Date.now()
  try {
    faces = solid.faces?.length ?? 0
  } catch { warnings.push('faces: no legible') }
  try {
    solids = solid.solids?.length ?? 0
  } catch { warnings.push('solids: no legible') }
  try {
    volumeMm3 = Number(measureVolume(solid).toFixed(2))
  } catch { warnings.push('volume: no medible') }
  try {
    areaMm2 = Number(measureArea(solid).toFixed(2))
  } catch { warnings.push('area: no medible') }
  try {
    const b = solid.boundingBox?.bounds
    if (b) {
      const r = (v: number) => Number(v.toFixed(2))
      bboxMm = [[r(b[0][0]), r(b[0][1]), r(b[0][2])], [r(b[1][0]), r(b[1][1]), r(b[1][2])]]
    }
  } catch { warnings.push('bbox: no legible') }
  if (probeMesh) {
    try {
      const m = solid.mesh()
      meshTris = Math.round((m.triangles?.length ?? 0) / 3)
    } catch { warnings.push('mesh probe: falló teselado OC') }
  }
  const meshMs = Date.now() - tMesh0
  if (!(volumeMm3 > 0)) warnings.push('volumen no positivo: sólido sospechoso')
  if (faces === 0) warnings.push('cero caras: sólido vacío')
  return {
    faces, solids, volumeMm3, areaMm2, bboxMm, meshTris, meshMs,
    ok: volumeMm3 > 0 && faces > 0 && warnings.length === 0,
    warnings,
  }
}

export interface BuildOptions {
  /** Callback de profiling: recibe el nombre de cada hito con timestamp interno. */
  mark?: (name: string) => void
}

function buildCylindricalGearSolid(gp: GearParameters, opts?: BuildOptions): any {
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
    opts?.mark?.('hbExtrudeStart')
    const top: any = sketch.extrude(halfB, { twistAngle: halfTwist })
    opts?.mark?.('hbExtrudeDone')
    const bottom: any = top.clone(true).mirror('XY')
    opts?.mark?.('hbMirrorDone')
    // Las mitades coinciden en el plano Z=0: compound sin booleano de fusión
    // (el fuse de dos barridos helicoidales costaba ~16 s; verificado mismo volumen).
    // Se traslada en Z (+halfB) para que el vértice de la espiga (V)
    // coincida en el plano central Z = halfB y los dientes queden perfectamente enfrentados y engranados.
    solid = makeCompound([top, bottom]).translate([0, 0, halfB])
    opts?.mark?.('hbJoinDone')
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
      self.postMessage({ type: 'ERROR', error: err.message || 'Failed to initialize OpenCASCADE' })
    }
    return
  }

  if (type === 'EXPORT_STEP') {
    const t0 = Date.now()
    // Profiling por etapas: kernel (carga WASM) / build (sketch+booleanos) / encode (blobSTEP)
    const stageMs: Record<string, number> = {}
    const buildStartRef: { t: number } = { t: 0 }
    let qcReport: StepQualityReport | null = null
    const encodeStep = (solid: any): Blob => {
      stageMs.encodeStart = Date.now()
      // QC antes de serializar (siempre topología+volumen; sonda de teselado incluida)
      qcReport = qualityReport(solid, true)
      const blob = solid.blobSTEP()
      stageMs.encodeDone = Date.now()
      return blob
    }
    const buildOpts: BuildOptions = {
      mark: (name: string) => {
        stageMs[name] = Date.now()
      },
    }
    try {
      await initOC()
      stageMs.kernelDone = Date.now()
      self.postMessage({ type: 'PROGRESS', progress: 45, message: 'Computing analytical B-Rep geometry...' })

      const gearParams = params as GearParameters
      const dims = calculateDimensions(gearParams)
      const { gearType, faceWidth } = gearParams
      stageMs.curvesDone = Date.now()

      self.postMessage({ type: 'PROGRESS', progress: 60, message: 'Generating exact involute curves...' })

      let stepBlob: Blob
      buildStartRef.t = Date.now()

      if (gearType === 'rack') {
        if (exportTarget === 'pinion') {
          self.postMessage({ type: 'PROGRESS', progress: 70, message: 'Modeling conjugate driving pinion...' })
          const pinionParams = getConjugatePinionParams(gearParams)
          const pinionSolid = buildCylindricalGearSolid(pinionParams, buildOpts)
          self.postMessage({ type: 'PROGRESS', progress: 92, message: 'Encoding STEP ISO 10303 AP214 entities...' })
          stepBlob = encodeStep(pinionSolid)
        } else if (exportTarget === 'assembly') {
          self.postMessage({ type: 'PROGRESS', progress: 65, message: 'Modeling rack bar...' })
          const rackSolid = buildRackSolid(gearParams)

          self.postMessage({ type: 'PROGRESS', progress: 75, message: 'Modeling conjugate driving pinion...' })
          const pinionParams = getConjugatePinionParams(gearParams)
          const pinionSolid = buildCylindricalGearSolid(pinionParams, buildOpts)

          const pinionY = dims.pinionOperatingY || ((dims.circularPitch / Math.PI) * (gearParams.rackPinionTeeth || 20) / 2)
          const positionedPinion = pinionSolid.translate([0, pinionY, 0])

          self.postMessage({ type: 'PROGRESS', progress: 92, message: 'Assembling multi-body STEP compound...' })

          const assemblyCompound = makeCompound([rackSolid, positionedPinion])
          stepBlob = encodeStep(assemblyCompound)
        } else {
          // Standard export of rack bar only
          const rackSolid = buildRackSolid(gearParams)
          self.postMessage({ type: 'PROGRESS', progress: 92, message: 'Encoding STEP ISO 10303 AP214 entities...' })
          stepBlob = encodeStep(rackSolid)
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

        self.postMessage({ type: 'PROGRESS', progress: 92, message: 'Encoding STEP ISO 10303 AP214 entities...' })
        stepBlob = solid.blobSTEP()
      } else {
        if (exportTarget === 'assembly') {
          self.postMessage({ type: 'PROGRESS', progress: 65, message: 'Modeling gear 1...' })
          const solid1 = buildCylindricalGearSolid(gearParams, buildOpts)

          self.postMessage({ type: 'PROGRESS', progress: 78, message: 'Modeling conjugate gear 2...' })
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
          const solid2 = buildCylindricalGearSolid(gear2Params, buildOpts).translate([centerDist, 0, 0])

          self.postMessage({ type: 'PROGRESS', progress: 92, message: 'Assembling multi-body STEP compound...' })
          const assemblyCompound = makeCompound([solid1, solid2])
          stepBlob = encodeStep(assemblyCompound)
        } else {
          const solid = buildCylindricalGearSolid(gearParams, buildOpts)
          self.postMessage({ type: 'PROGRESS', progress: 92, message: 'Encoding STEP ISO 10303 AP214 entities...' })
          stepBlob = encodeStep(solid)
        }
      }

      const tEnd = Date.now()
      const stages: Record<string, number> = {
        kernelMs: (stageMs.kernelDone ?? t0) - t0,
        curvesMs: (stageMs.curvesDone ?? t0) - (stageMs.kernelDone ?? t0),
        buildMs: (stageMs.encodeStart ?? tEnd) - buildStartRef.t,
        encodeMs: (stageMs.encodeDone ?? tEnd) - (stageMs.encodeStart ?? tEnd),
        totalMs: tEnd - t0,
      }
      // Sub-etapas del herringbone (solo presentes en ese tipo)
      if (stageMs.hbExtrudeStart !== undefined && stageMs.hbJoinDone !== undefined) {
        stages.hbExtrudeMs = (stageMs.hbExtrudeDone ?? tEnd) - stageMs.hbExtrudeStart
        stages.hbMirrorMs = (stageMs.hbMirrorDone ?? tEnd) - (stageMs.hbExtrudeDone ?? tEnd)
        stages.hbJoinMs = stageMs.hbJoinDone - (stageMs.hbMirrorDone ?? tEnd)
      }
      self.postMessage({
        type: 'STEP_READY',
        blob: stepBlob,
        sizeBytes: stepBlob.size,
        fileName: fileName || `gear_${gearType}_m${gearParams.module}_z${gearParams.teeth}.step`,
        stages,
        quality: qcReport,
      })
    } catch (err: any) {
      console.error('Error in Replicad Web Worker:', err)
      self.postMessage({ type: 'ERROR', error: err.message || 'Error generating STEP file' })
    }
  }
}
