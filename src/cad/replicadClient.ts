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

export interface StepExportResult {
  blob: Blob
  fileName: string
  sizeBytes: number
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
        resolve({
          blob: data.blob,
          fileName: data.fileName,
          sizeBytes: data.sizeBytes,
        })
      } else if (data.type === 'ERROR') {
        w.removeEventListener('message', handleMessage)
        resetWorker()
        reject(new Error(data.error || 'Error desconocido al exportar STEP'))
      }
    }

    w.addEventListener('message', handleMessage)

    let defaultName = `engranaje_${params.gearType}_m${params.module}_z${params.teeth}.step`
    if (params.gearType === 'rack') {
      if (exportTarget === 'assembly') {
        defaultName = `conjunto_cremallera_pinion_m${params.module}_zp${params.rackPinionTeeth || 20}.step`
      } else if (exportTarget === 'pinion') {
        defaultName = `pinion_motriz_m${params.module}_z${params.rackPinionTeeth || 20}.step`
      } else {
        defaultName = `cremallera_${params.rackToothType || 'recta'}_m${params.module}_L${params.rackLength || 160}.step`
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
