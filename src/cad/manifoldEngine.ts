import Module from 'manifold-3d'
import manifoldWasmUrl from 'manifold-3d/manifold.wasm?url'
import * as THREE from 'three'
import type { GearParameters } from './types'
import { generateInvoluteProfile, generateRackProfile, calculateDimensions } from './gearMath'
import { getDIN6885Keyway } from './din6885'
import { getDIN912Screw } from './din912'

import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'


let manifoldInstance: any = null
let initPromise: Promise<any> | null = null

export async function getManifold() {
  if (manifoldInstance) return manifoldInstance
  if (!initPromise) {
    initPromise = (async () => {
      const module = await Module({
        locateFile: () => manifoldWasmUrl,
      })
      module.setup()
      manifoldInstance = module
      return module
    })()
  }
  return initPromise
}

/**
 * Convierte una malla de Manifold a Three.js BufferGeometry con normales de ángulo agudo (Creased Normals).
 * Esto elimina por completo los artefactos de mallado y diagonales en caras planas,
 * manteniendo las caras cilíndricas e involutas suaves pero con aristas vivas a 90°.
 */
export function manifoldToThreeGeometry(manifoldSolid: any): THREE.BufferGeometry {
  const mesh = manifoldSolid.getMesh()
  const rawGeometry = new THREE.BufferGeometry()

  rawGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(mesh.vertProperties), 3)
  )
  rawGeometry.setIndex(new THREE.BufferAttribute(new Uint32Array(mesh.triVerts), 1))

  // Ángulo límite de 30° (Math.PI / 6):
  // Si el ángulo entre triángulos vecinos > 30° (como entre la cara superior plana y los laterales del diente, o chavetero),
  // las normales se separan y quedan estrictamente perpendiculares a cada cara (cara plana 100% lisa sin sombras diagonales).
  // Si el ángulo <= 30° (como la curvatura suave del flanco del diente o cilindro), las normales se suavizan.
  const creasedGeometry = toCreasedNormals(rawGeometry, Math.PI / 6)
  rawGeometry.dispose()

  return creasedGeometry
}

/**
 * Genera el sólido 3D con Manifold-3D a partir de los parámetros de ingeniería.
 */
export async function buildGearManifold(params: GearParameters): Promise<any> {
  const m3d = await getManifold()
  const dims = calculateDimensions(params)
  const {
    gearType,
    faceWidth,
    boreDiameter,
    hasKeyway,
    bodyStyle,
    hubDiameter,
    hubOffset,
    hubBothSides,
  } = params

  let gearSolid: any = null

  if (gearType === 'rack') {
    const rLength = params.rackLength || 150
    const rHeight = params.rackHeight || 25
    const contour = generateRackProfile(params, rLength, rHeight)
    const cs = m3d.CrossSection.ofPolygons([contour])

    const isHerringboneRack = params.rackToothType === 'herringbone'
    const isHelicalRack = params.rackToothType === 'helical' || (!params.rackToothType && params.helixAngle && params.helixAngle > 0)
    const effectiveAngle = params.helixAngle || 20

    if (isHerringboneRack) {
      // Cremallera Doble Hélice / Espiga (Herringbone):
      // Extruimos la mitad superior [0, +b/2] y le aplicamos cizalladura afín continua en Z.
      // Reflejamos sobre el plano Z=0 con mirror([0, 0, 1]) para obtener la mitad inferior simétrica [-b/2, 0].
      // Ambas mitades parten del mismo perfil en Z=0 formando una "V" perfectamente alineada y centrada.
      const halfB = faceWidth / 2
      const betaRad = ((effectiveAngle * Math.PI) / 180) * (params.helixHand === 'left' ? -1 : 1)
      const tanBeta = Math.tan(betaRad)

      let top = cs.extrude(halfB, 0, 0, [1, 1], false)
      top = top.warp((vert: any) => {
        vert[0] += vert[2] * tanBeta
      })
      const bottom = top.mirror([0, 0, 1])
      gearSolid = top.add(bottom)
    } else if (isHelicalRack) {
      // Cremallera helicoidal (cizalladura angular continua en el eje Z)
      gearSolid = cs.extrude(faceWidth, 0, 0, [1, 1], true)
      const betaRad = ((effectiveAngle * Math.PI) / 180) * (params.helixHand === 'left' ? -1 : 1)
      const tanBeta = Math.tan(betaRad)
      gearSolid = gearSolid.warp((vert: any) => {
        vert[0] += vert[2] * tanBeta
      })
    } else {
      // Cremallera recta (Spur)
      gearSolid = cs.extrude(faceWidth, 0, 0, [1, 1], true)
    }

    // Chaflán paramétrico a 45° en bordes axiales de dientes de cremallera (Z = ±faceWidth / 2)
    if (params.hasToothChamfer && (params.toothChamfer || 0) > 0) {
      const ha = (params.addendumCoeff ?? 1.0) * params.module
      const maxC = Math.min(faceWidth * 0.35, ha * 0.8, 5.0)
      const c = Math.max(0.05, Math.min(params.toothChamfer || 0.6, maxC))
      const w = c * Math.SQRT2
      const topCutter = m3d.Manifold.cube([rLength + 20, w, w], true)
        .rotate([45, 0, 0])
        .translate([0, ha, faceWidth / 2])
      const bottomCutter = topCutter.mirror([0, 0, 1])
      gearSolid = gearSolid.subtract(topCutter).subtract(bottomCutter)
    }

    // Taladros y cajeras normalizadas de fijación DIN 912 / ISO 4762
    if (params.rackMountingHoles) {
      const din912 = getDIN912Screw(params.rackScrewStandard || 'M5')
      const count = Math.max(2, params.rackHoleCount || 3)
      const holePos = params.rackHolePosition || 'bottom'

      const endMargin = Math.min(25, rLength / (count + 1))
      const usableSpan = rLength - 2 * endMargin
      const stepX = count > 1 ? usableSpan / (count - 1) : 0

      for (let i = 0; i < count; i++) {
        const hx = count > 1 ? -rLength / 2 + endMargin + i * stepX : 0

        if (holePos === 'bottom') {
          // Taladro vertical que atraviesa la barra desde la base
          const holeLen = rHeight * 2 + 10
          const throughHole = m3d.Manifold.cylinder(
            holeLen,
            din912.throughHoleDia / 2,
            din912.throughHoleDia / 2,
            32,
            true
          )
            .rotate([90, 0, 0])
            .translate([hx, -rHeight / 2, 0])

          gearSolid = gearSolid.subtract(throughHole)

          // Cajera cilíndrica para cabeza DIN 912 en la base inferior (Y = -rHeight)
          const cbHeight = din912.counterboreDepth + 4
          const counterbore = m3d.Manifold.cylinder(
            cbHeight,
            din912.counterboreDia / 2,
            din912.counterboreDia / 2,
            32,
            true
          )
            .rotate([90, 0, 0])
            .translate([hx, -rHeight + din912.counterboreDepth / 2 - 1, 0])

          gearSolid = gearSolid.subtract(counterbore)
        } else {
          // Taladro lateral pasante horizontal (eje Z)
          const throughHole = m3d.Manifold.cylinder(
            faceWidth + 10,
            din912.throughHoleDia / 2,
            din912.throughHoleDia / 2,
            32,
            true
          ).translate([hx, -rHeight / 2, 0])

          gearSolid = gearSolid.subtract(throughHole)

          // Cajera lateral para cabeza DIN 912
          const cbHeight = din912.counterboreDepth + 2
          const counterbore = m3d.Manifold.cylinder(
            cbHeight,
            din912.counterboreDia / 2,
            din912.counterboreDia / 2,
            32,
            true
          ).translate([hx, -rHeight / 2, faceWidth / 2 - din912.counterboreDepth / 2 + 0.5])

          gearSolid = gearSolid.subtract(counterbore)
        }
      }
    }
  } else if (gearType === 'internal') {
    // Corona interior
    const contour = generateInvoluteProfile(params, 8)
    const cs = m3d.CrossSection.ofPolygons([contour])
    const teethVoid = cs.extrude(faceWidth + 2, 0, 0, [1, 1], true)

    const outerR = Math.max(dims.tipRadius + 12, (params.outerRingDiameter || 0) / 2 || dims.tipRadius + 15)
    const ringCyl = m3d.Manifold.cylinder(faceWidth, outerR, outerR, 64, true)
    gearSolid = ringCyl.subtract(teethVoid)

    if (params.hasToothChamfer && (params.toothChamfer || 0) > 0) {
      const ra = dims.tipRadius
      const maxC = Math.min(faceWidth * 0.35, Math.abs(dims.pitchRadius - dims.tipRadius) * 0.8, 5.0)
      const c = Math.max(0.05, Math.min(params.toothChamfer || 0.6, maxC))
      const hExtra = 2.0
      const totalH = c + hExtra

      const chamferCone = m3d.Manifold.cylinder(totalH, ra, ra + totalH, 64, false)
        .translate([0, 0, faceWidth / 2 - c])
      const bottomChamferCone = chamferCone.mirror([0, 0, 1])
      gearSolid = gearSolid.subtract(chamferCone).subtract(bottomChamferCone)
    }
  } else {
    // Engranajes cilíndricos (Recto, Helicoidal, Herringbone, Cónico)
    const contour = generateInvoluteProfile(params, 10)
    const cs = m3d.CrossSection.ofPolygons([contour])

    if (gearType === 'spur') {
      gearSolid = cs.extrude(faceWidth, 0, 0, [1, 1], true)
    } else if (gearType === 'helical') {
      const twist = dims.twistAngleDeg
      const divisions = Math.max(16, Math.ceil(Math.abs(twist) / 1.5))
      gearSolid = cs.extrude(faceWidth, divisions, twist, [1, 1], true)
    } else if (gearType === 'herringbone') {
      // Doble hélice / Espiga continua simétrica:
      // Se extruye la mitad superior desde Z=0 con torsión +halfTwist,
      // y se refleja respecto a Z=0 para obtener la mitad inferior con torsión -halfTwist.
      // Ambas mitades parten del mismo perfil en Z=0 formando una "V" perfectamente alineada sin desfase.
      const halfTwist = dims.twistAngleDeg / 2
      const halfB = faceWidth / 2
      const div = Math.max(12, Math.ceil(Math.abs(halfTwist) / 1.5))

      const top = cs.extrude(halfB, div, halfTwist, [1, 1], false)
      const bottom = top.mirror([0, 0, 1])

      gearSolid = top.add(bottom)
    } else if (gearType === 'bevel') {
      // Cónico recto: perfil escalado hacia el cono primitivo
      const coneDist = dims.pitchRadius * 2.5
      const scaleTop = Math.max(0.4, (coneDist - faceWidth) / coneDist)
      gearSolid = cs.extrude(faceWidth, 0, 0, [scaleTop, scaleTop], true)
    }

    // Chaflán paramétrico a 45° en bordes axiales de los dientes (Z = ±faceWidth / 2)
    if (params.hasToothChamfer && (params.toothChamfer || 0) > 0) {
      const ra = dims.tipRadius
      const maxC = Math.min(faceWidth * 0.35, (dims.tipRadius - dims.rootRadius) * 0.8, 5.0)
      const c = Math.max(0.05, Math.min(params.toothChamfer || 0.6, maxC))
      const hExtra = 2.0
      const totalH = c + hExtra
      const rOut = ra + 20

      // Cono interior cortador: a Z=0 tiene radio ra, a Z=totalH tiene radio ra - totalH (pendiente 45°)
      const innerCone = m3d.Manifold.cylinder(totalH, ra, ra - totalH, 64, false)
      const outerCyl = m3d.Manifold.cylinder(totalH, rOut, rOut, 64, false)
      const topCutter = outerCyl.subtract(innerCone).translate([0, 0, faceWidth / 2 - c])
      const bottomCutter = topCutter.mirror([0, 0, 1])

      gearSolid = gearSolid.subtract(topCutter).subtract(bottomCutter)
    }
  }

  // Si no es cremallera ni corona interior, aplicar buje, taladro, chavetero y aligeramiento
  if (gearType !== 'rack' && gearType !== 'internal') {
    // Buje adicional (Hub)
    if (bodyStyle === 'hub' && hubDiameter > boreDiameter) {
      const offset = hubOffset || 0
      const isBoth = Boolean(hubBothSides)
      const hubTotalLength = isBoth ? faceWidth + offset * 2 : faceWidth + offset
      const hubZOffset = isBoth ? 0 : offset / 2

      const hub = m3d.Manifold.cylinder(
        hubTotalLength,
        hubDiameter / 2,
        hubDiameter / 2,
        48,
        true
      ).translate([0, 0, hubZOffset])
      gearSolid = gearSolid.add(hub)
    }

    // Taladro central del eje (Bore)
    if (boreDiameter > 0) {
      const boreRadius = boreDiameter / 2
      const offset = hubOffset || 0
      const maxExt = hubBothSides ? offset * 2 : offset
      const boreLen = faceWidth + maxExt + 40
      const boreCyl = m3d.Manifold.cylinder(boreLen, boreRadius, boreRadius, 48, true)
      gearSolid = gearSolid.subtract(boreCyl)

      // Chavetero DIN 6885
      if (hasKeyway) {
        const kw = getDIN6885Keyway(boreDiameter)
        const bKey = params.keywayWidth ?? kw.b
        const t2Key = params.keywayDepth ?? kw.t2

        // Cajera para chavetero ubicada en la parte superior del agujero
        const keywayBox = m3d.Manifold.cube([bKey, t2Key * 2, boreLen + 2], true)
          .translate([0, boreRadius, 0])
        gearSolid = gearSolid.subtract(keywayBox)
      }
    }


  }

  return gearSolid
}

/**
 * Genera la geometría Three.js completa lista para el visor 3D
 */
export async function buildGearThreeGeometry(params: GearParameters): Promise<THREE.BufferGeometry> {
  const solid = await buildGearManifold(params)
  const geom = manifoldToThreeGeometry(solid)
  return geom
}
