import type { GearParameters } from './types'

let worker: Worker | null = null

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./replicadWorker.ts', import.meta.url), {
      type: 'module',
    })
  }
  return worker
}

export interface StepStageTimings {
  kernelMs: number
  curvesMs: number
  buildMs: number
  encodeMs: number
  totalMs: number
  hbExtrudeMs?: number
  hbMirrorMs?: number
  hbJoinMs?: number
}

export interface StepQualityInfo {
  faces: number
  solids: number
  volumeMm3: number
  areaMm2: number
  bboxMm: [[number, number, number], [number, number, number]] | null
  meshTris: number | null
  meshMs: number
  ok: boolean
  warnings: string[]
}

export interface StepExportResult {
  blob: Blob
  fileName: string
  sizeBytes: number
  stages?: StepStageTimings
  quality?: StepQualityInfo | null
}

export function resetWorker() {
  if (worker) {
    worker.terminate()
    worker = null
  }
}

export function exportGearToSTEP(
  params: GearParameters,
  onProgress?: (progress: number, message: string) => void,
  exportTarget: 'default' | 'rack' | 'pinion' | 'assembly' = 'default'
): Promise<StepExportResult> {
  return new Promise((resolve, reject) => {
    const w = getWorker()

    const handleMessage = (e: MessageEvent) => {
      const data = e.data

      if (data.type === 'PROGRESS') {
        onProgress?.(data.progress, data.message)
      } else if (data.type === 'STEP_READY') {
        w.removeEventListener('message', handleMessage)
        if (data.stages) {
          // Tabla copiable en consola para perfilar la exportación STEP
          console.table({ export: data.fileName, sizeBytes: data.sizeBytes, ...data.stages })
        }
        if (data.quality) {
          console.table({ quality: data.fileName, ...data.quality })
          if (data.quality.warnings?.length > 0) {
            console.warn('[STEP QC]', data.quality.warnings)
          }
        }
        resolve({
          blob: data.blob,
          fileName: data.fileName,
          sizeBytes: data.sizeBytes,
          stages: data.stages,
          quality: data.quality ?? null,
        })
      } else if (data.type === 'ERROR') {
        w.removeEventListener('message', handleMessage)
        resetWorker()
        reject(new Error(data.error || 'Unknown error during STEP export'))
      }
    }

    w.addEventListener('message', handleMessage)

    let defaultName = `gear_${params.gearType}_m${params.module}_z${params.teeth}.step`
    if (exportTarget === 'assembly') {
      if (params.gearType === 'rack') {
        defaultName = `assembly_rack_pinion_m${params.module}_zp${params.rackPinionTeeth || 20}.step`
      } else {
        defaultName = `assembly_${params.gearType}_m${params.module}_z1_${params.teeth}_z2_${params.rackPinionTeeth || 24}.step`
      }
    } else if (params.gearType === 'rack') {
      if (exportTarget === 'pinion') {
        defaultName = `drive_pinion_m${params.module}_z${params.rackPinionTeeth || 20}.step`
      } else {
        defaultName = `gear_rack_${params.rackToothType || 'spur'}_m${params.module}_L${params.rackLength || 160}.step`
      }
    }

    w.postMessage({
      type: 'EXPORT_STEP',
      params,
      exportTarget,
      fileName: defaultName,
    })
  })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
