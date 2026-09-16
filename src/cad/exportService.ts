import type { GearParameters } from './types'
import { exportGearToSTEP, downloadBlob } from './replicadClient'
import { buildGearManifold } from './manifoldEngine'
import { calculateDimensions, getConjugatePinionParams } from './gearMath'
import confetti from 'canvas-confetti'

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
      ? 'conjunto ensamblado'
      : target === 'pinion'
      ? 'piñón motriz'
      : target === 'rack'
      ? 'barra cremallera'
      : 'engranaje'

    onProgress(10, `Iniciando kernel OpenCASCADE para ${targetLabel}...`)

    const result = await exportGearToSTEP(
      params,
      (progress, message) => {
        onProgress(progress, message)
      },
      target
    )

    onProgress(98, 'Descargando archivo STEP...')
    downloadBlob(result.blob, result.fileName)
    onProgress(100, '¡Modelo STEP generado con éxito!')

    confetti({
      particleCount: 45,
      spread: 55,
      origin: { y: 0.7, x: 0.5 },
    })

    return { fileName: result.fileName }
  }

  // Exportación de mallas STL / 3MF con Manifold-3D WASM
  onProgress(25, 'Inicializando motor Manifold-3D WASM...')

  let solid: any = null
  let fileName = ''
  const ext = format === '3mf' ? '3mf' : 'stl'

  if (isRack) {
    if (target === 'pinion') {
      onProgress(45, 'Generando geometría del piñón motriz...')
      const pParams = getConjugatePinionParams(params)
      solid = await buildGearManifold(pParams)
      fileName = `pinion_motriz_m${params.module}_z${params.rackPinionTeeth || 20}.${ext}`
    } else if (target === 'assembly') {
      onProgress(35, 'Generando barra de cremallera...')
      const rackSolid = await buildGearManifold(params)
      onProgress(60, 'Generando piñón conjugado...')
      const pParams = getConjugatePinionParams(params)
      const pinionSolid = await buildGearManifold(pParams)
      const opY = dims.pinionOperatingY || ((dims.circularPitch / Math.PI) * (params.rackPinionTeeth || 20) / 2)
      solid = rackSolid.add(pinionSolid.translate([0, opY, 0]))
      fileName = `conjunto_cremallera_pinion_m${params.module}_zp${params.rackPinionTeeth || 20}.${ext}`
    } else {
      onProgress(50, 'Generando barra de cremallera...')
      solid = await buildGearManifold(params)
      fileName = `cremallera_${params.rackToothType || 'recta'}_m${params.module}_L${params.rackLength || 160}.${ext}`
    }
  } else {
    onProgress(45, `Generando ${params.gearType} en Manifold-3D...`)
    solid = await buildGearManifold(params)
    fileName = `engranaje_${params.gearType}_m${params.module}_z${params.teeth}.${ext}`
  }

  onProgress(75, 'Triangulando y optimizando malla...')
  const mesh = solid.getMesh()
  const numTri = mesh.numTri
  const bufferSize = 84 + 50 * numTri
  const buffer = new ArrayBuffer(bufferSize)
  const view = new DataView(buffer)

  // Cabecera de 80 bytes
  for (let i = 0; i < 80; i++) view.setUint8(i, 32)
  // Número de triángulos (uint32)
  view.setUint32(80, numTri, true)

  let offset = 84
  for (let i = 0; i < numTri; i++) {
    // Normal (0,0,0)
    view.setFloat32(offset, 0, true)
    view.setFloat32(offset + 4, 0, true)
    view.setFloat32(offset + 8, 0, true)
    offset += 12

    // 3 vértices
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

  onProgress(95, 'Descargando archivo...')
  const blob = new Blob([buffer], { type: 'application/octet-stream' })
  downloadBlob(blob, fileName)
  onProgress(100, `¡${fileName} descargado con éxito!`)

  confetti({
    particleCount: 35,
    spread: 50,
    origin: { y: 0.7, x: 0.5 },
  })

  return { fileName }
}
