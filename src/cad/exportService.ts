import type { GearParameters } from './types'
import { exportGearToSTEP, downloadBlob, type StepStageTimings, type StepQualityInfo } from './replicadClient'
import { buildGearManifold } from './manifoldEngine'
import { calculateDimensions, getConjugatePinionParams } from './gearMath'
import confetti from 'canvas-confetti'

/**
 * Mensaje final de exportación STEP con tiempos y control de calidad.
 * Puro y testeado: `stages`/`quality` pueden venir ausentes (workers viejos).
 */
export function formatStepBreakdown(
  stages: StepStageTimings | undefined,
  quality: StepQualityInfo | null | undefined,
): string {
  let out = 'STEP model generated successfully!'
  if (stages) {
    out += ` (${stages.totalMs}ms · kernel ${stages.kernelMs} · build ${stages.buildMs} · encode ${stages.encodeMs}`
    if (stages.hbExtrudeMs !== undefined) {
      out += ` · hb extr ${stages.hbExtrudeMs} / mirror ${stages.hbMirrorMs} / join ${stages.hbJoinMs}`
    }
    out += ')'
  }
  if (quality) {
    const tris = quality.meshTris !== null ? ` · tris ${quality.meshTris}` : ''
    const warn = quality.warnings.length > 0 ? ` · ⚠ ${quality.warnings.join('; ')}` : ''
    out += ` · QC solids ${quality.solids} / faces ${quality.faces} / vol ${quality.volumeMm3}mm³${tris}${warn}`
  }
  return out
}

export interface RunExportOptions {
  params: GearParameters
  format: 'stl' | '3mf' | 'step'
  target?: 'default' | 'rack' | 'pinion' | 'assembly'
  onProgress: (progress: number, message: string) => void
}

/**
 * Ejecuta el proceso completo de exportación y descarga de archivos CAD (STL, 3MF, STEP)
 */
export async function runExport({
  params,
  format,
  target = 'default',
  onProgress,
}: RunExportOptions): Promise<{ fileName: string }> {
  const isRack = params.gearType === 'rack'
  const dims = calculateDimensions(params)

  if (format === 'step') {
    const targetLabel = target === 'assembly'
      ? 'assembled mechanism'
      : target === 'pinion'
      ? 'driving pinion'
      : target === 'rack'
      ? 'rack bar'
      : 'gear'

    onProgress(10, `Starting OpenCASCADE kernel for ${targetLabel}...`)

    const result = await exportGearToSTEP(
      params,
      (progress, message) => {
        onProgress(progress, message)
      },
      target
    )

    onProgress(98, 'Downloading STEP file...')
    downloadBlob(result.blob, result.fileName)
    onProgress(100, formatStepBreakdown(result.stages, result.quality))

    confetti({
      particleCount: 45,
      spread: 55,
      origin: { y: 0.7, x: 0.5 },
    })

    return { fileName: result.fileName }
  }

  // STL / 3MF mesh export with Manifold-3D WASM
  onProgress(25, 'Initializing Manifold-3D WASM engine...')

  let solid: any = null
  let fileName = ''
  const ext = format === '3mf' ? '3mf' : 'stl'

  if (isRack) {
    if (target === 'pinion') {
      onProgress(45, 'Generating driving pinion geometry...')
      const pParams = getConjugatePinionParams(params)
      solid = await buildGearManifold(pParams)
      fileName = `driving_pinion_m${params.module}_z${params.rackPinionTeeth || 20}.${ext}`
    } else if (target === 'assembly') {
      onProgress(35, 'Generating rack bar...')
      const rackSolid = await buildGearManifold(params)
      onProgress(60, 'Generating conjugate pinion...')
      const pParams = getConjugatePinionParams(params)
      const pinionSolid = await buildGearManifold(pParams)
      const opY = dims.pinionOperatingY || ((dims.circularPitch / Math.PI) * (params.rackPinionTeeth || 20) / 2)
      solid = rackSolid.add(pinionSolid.translate([0, opY, 0]))
      fileName = `rack_pinion_assembly_m${params.module}_zp${params.rackPinionTeeth || 20}.${ext}`
    } else {
      onProgress(50, 'Generating rack bar...')
      solid = await buildGearManifold(params)
      fileName = `rack_${params.rackToothType || 'spur'}_m${params.module}_L${params.rackLength || 160}.${ext}`
    }
  } else {
    if (target === 'assembly') {
      const z2 = params.rackPinionTeeth || 24
      const pairDims = calculateDimensions(params, z2)
      const centerDist = pairDims.centerDistance || (params.module * (params.teeth + z2) / 2)
      onProgress(35, 'Generating gear 1...')
      const solid1 = await buildGearManifold(params)
      onProgress(60, 'Generating conjugate gear 2...')
      const gear2Params = {
        ...params,
        gearType: (params.gearType === 'internal' ? 'spur' : params.gearType) as any,
        teeth: z2,
        helixHand: (params.helixHand === 'right' ? 'left' : 'right') as any,
        bodyStyle: 'solid' as const,
        boreDiameter: params.boreDiameter > 0 ? Math.min(params.boreDiameter, 14) : 0,
        hasKeyway: false,
      }
      const solid2 = await buildGearManifold(gear2Params)
      solid = solid1.add(solid2.translate([centerDist, 0, 0]))
      fileName = `assembly_${params.gearType}_m${params.module}_z1_${params.teeth}_z2_${z2}.${ext}`
    } else {
      onProgress(45, `Generating ${params.gearType} in Manifold-3D...`)
      solid = await buildGearManifold(params)
      fileName = `gear_${params.gearType}_m${params.module}_z${params.teeth}.${ext}`
    }
  }

  onProgress(75, 'Tessellating and optimizing 3D mesh...')
  // QC de malla Manifold: estado del CSG + nº de triángulos (0 = vacía)
  let manifoldStatus = 'unknown'
  try {
    manifoldStatus = solid.status?.() ?? 'unknown'
  } catch {
    manifoldStatus = 'status unreadable'
  }
  const mesh = solid.getMesh()
  const numTri = mesh.numTri
  const bufferSize = 84 + 50 * numTri
  const buffer = new ArrayBuffer(bufferSize)
  const view = new DataView(buffer)

  // 80-byte header
  for (let i = 0; i < 80; i++) view.setUint8(i, 32)
  // Number of triangles (uint32)
  view.setUint32(80, numTri, true)

  let offset = 84
  for (let i = 0; i < numTri; i++) {
    // Normal (0,0,0)
    view.setFloat32(offset, 0, true)
    view.setFloat32(offset + 4, 0, true)
    view.setFloat32(offset + 8, 0, true)
    offset += 12

    // 3 vertices
    for (let v = 0; v < 3; v++) {
      const vertIdx = mesh.triVerts[i * 3 + v]
      view.setFloat32(offset, mesh.vertProperties[vertIdx * 3], true)
      view.setFloat32(offset + 4, mesh.vertProperties[vertIdx * 3 + 1], true)
      view.setFloat32(offset + 8, mesh.vertProperties[vertIdx * 3 + 2], true)
      offset += 12
    }
    view.setUint16(offset, 0, true)
    offset += 2
  }

  onProgress(95, 'Downloading file...')
  const blob = new Blob([buffer], { type: 'application/octet-stream' })
  downloadBlob(blob, fileName)
  const qcWarn = manifoldStatus !== 'NoError' || numTri === 0
    ? ` · ⚠ QC status=${manifoldStatus}`
    : ` · QC ${manifoldStatus}`
  onProgress(100, `${fileName} downloaded successfully! (${numTri} tris${qcWarn})`)

  confetti({
    particleCount: 35,
    spread: 50,
    origin: { y: 0.7, x: 0.5 },
  })

  return { fileName }
}
