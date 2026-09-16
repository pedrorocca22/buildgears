import React from 'react'
import { useGearStore } from '../store/useGearStore'
import { CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react'

export const ExportModal: React.FC = () => {
  const exportStatus = useGearStore((s) => s.exportStatus)
  const setExportStatus = useGearStore((s) => s.setExportStatus)

  if (!exportStatus.isExporting && !exportStatus.error && exportStatus.progress !== 100) {
    return null
  }

  const handleClose = () => {
    setExportStatus({
      isExporting: false,
      progress: 0,
      message: '',
      error: undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-6 relative overflow-hidden">
        {/* Barra superior de acento */}
        <div
          className={`absolute top-0 left-0 right-0 h-1 transition-all duration-300 ${
            exportStatus.error
              ? 'bg-rose-500'
              : exportStatus.progress === 100
              ? 'bg-emerald-500'
              : 'bg-orange-500'
          }`}
          style={{ width: `${Math.max(5, exportStatus.progress)}%` }}
        />

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {exportStatus.isExporting ? (
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : exportStatus.error ? (
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500">
                <AlertCircle className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )}

            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {exportStatus.isExporting
                  ? 'Exportando Modelo CAD STEP'
                  : exportStatus.error
                  ? 'Error en la Exportación'
                  : '¡Exportación STEP Completada!'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Replicad 1.1 + OpenCASCADE WASM B-Rep Kernel
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mensaje de estado */}
        <div className="my-4">
          <div className="flex justify-between text-xs text-slate-700 font-medium mb-1.5">
            <span>{exportStatus.message || 'Procesando sólidos CAD...'}</span>
            <span className="font-mono font-bold text-orange-600">{exportStatus.progress}%</span>
          </div>

          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                exportStatus.error
                  ? 'bg-rose-500'
                  : exportStatus.progress === 100
                  ? 'bg-emerald-500'
                  : 'bg-orange-500'
              }`}
              style={{ width: `${exportStatus.progress}%` }}
            />
          </div>

          {exportStatus.error && (
            <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              {exportStatus.error}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
