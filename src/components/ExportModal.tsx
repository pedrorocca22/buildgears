import React, { useState, useEffect } from 'react'
import { useGearStore } from '../store/useGearStore'
import { runExport } from '../cad/exportService'

export const ExportModal: React.FC = () => {
  const params = useGearStore((s) => s.params)
  const exportStatus = useGearStore((s) => s.exportStatus)
  const setExportStatus = useGearStore((s) => s.setExportStatus)
  const closeExportModal = useGearStore((s) => s.closeExportModal)

  const isRack = params.gearType === 'rack'

  const [selectedFormat, setSelectedFormat] = useState<'step' | 'stl' | '3mf'>('step')
  const [selectedTarget, setSelectedTarget] = useState<'default' | 'assembly' | 'rack' | 'pinion'>('default')
  const [hasDonated, setHasDonated] = useState<boolean>(false)

  // Sincronizar formato y target inicial cuando se abre el modal
  useEffect(() => {
    if (exportStatus.pendingFormat) {
      setSelectedFormat(exportStatus.pendingFormat)
    }
  }, [exportStatus.pendingFormat, exportStatus.isModalOpen])

  useEffect(() => {
    if (exportStatus.pendingTarget) {
      setSelectedTarget(exportStatus.pendingTarget)
    }
  }, [exportStatus.pendingTarget, exportStatus.isModalOpen])

  if (!exportStatus.isModalOpen && !exportStatus.isExporting && exportStatus.progress !== 100 && !exportStatus.error) {
    return null
  }

  const gearTypeNames: Record<string, string> = {
    spur: 'Spur Gear',
    helical: 'Helical Gear',
    herringbone: 'Herringbone Gear',
    internal: 'Internal Ring Gear',
    rack: 'Rack',
    bevel: 'Straight Bevel',
  }

  const targetLabels: Record<string, string> = {
    default: isRack ? 'Rack Bar' : `${gearTypeNames[params.gearType] || params.gearType}`,
    assembly: isRack ? 'Rack + Pinion Assembly' : `Assembled Pair (z1 + z2)`,
    rack: 'Rack Bar',
    pinion: 'Conjugate Driving Pinion',
  }

  // Official Buy Me a Coffee link
  const bmcUrl = 'https://buymeacoffee.com/rocca022t'

  const handleStartDownload = async () => {
    try {
      setExportStatus({
        isExporting: true,
        progress: 5,
        message: 'Generating solid CAD geometry...',
        error: undefined,
      })

      await runExport({
        params,
        format: selectedFormat,
        target: selectedTarget,
        onProgress: (progress, message) => {
          setExportStatus({ progress, message })
        },
      })

      setExportStatus({
        isExporting: false,
        progress: 100,
        // Se conserva el último mensaje de runExport: en STEP incluye el
        // desglose de tiempos (kernel · build · encode); ver panel de éxito.
      })
    } catch (err: any) {
      console.error('Error exporting:', err)
      setExportStatus({
        isExporting: false,
        progress: 0,
        message: 'Error during export',
        error: err.message || 'Failed to generate CAD file.',
      })
    }
  }


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200/80 rounded-3xl w-full max-w-lg shadow-2xl p-6 sm:p-7 relative overflow-hidden flex flex-col max-h-[95vh] overflow-y-auto">
        {/* Top progress indicator bar */}
        {exportStatus.isExporting && (
          <div
            className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-300"
            style={{ width: `${Math.max(5, exportStatus.progress)}%` }}
          />
        )}
        {exportStatus.progress === 100 && (
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500 w-full transition-all duration-300" />
        )}
        {exportStatus.error && (
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-500 w-full transition-all duration-300" />
        )}

        {/* Close Button (✕) */}
        <button
          type="button"
          onClick={closeExportModal}
          disabled={exportStatus.isExporting}
          className={`absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center transition-colors text-sm font-bold ${
            exportStatus.isExporting
              ? 'text-slate-200 cursor-not-allowed'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
          title={exportStatus.isExporting ? 'Download in progress...' : 'Close window'}
        >
          ✕
        </button>

        {/* Header with BUILD GEARS logo */}
        <div className="mb-4 pr-6">
          <div className="flex items-center gap-1.5 mb-2 select-none">
            <span className="bg-[#ff5500] text-white font-black text-[11px] tracking-wide px-2 py-0.5 rounded-md uppercase leading-none">
              BUILD
            </span>
            <span className="font-black text-[11px] tracking-wide text-[#0b1329] uppercase leading-none">
              GEARS
            </span>
          </div>

          <h3 className="font-extrabold text-slate-900 text-base sm:text-lg leading-tight">
            {exportStatus.progress === 100
              ? 'Your CAD model has been downloaded!'
              : exportStatus.isExporting
              ? 'Generating and downloading file...'
              : 'Has BuildGears been helpful to you?'}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
            <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 font-bold uppercase text-[10px]">
              {selectedFormat.toUpperCase()}
            </span>
            <span>{targetLabels[selectedTarget] || targetLabels.default}</span>
          </div>
        </div>

        {/* Interactive Format & Target Selector */}
        {!exportStatus.isExporting && exportStatus.progress !== 100 && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 mb-3.5 space-y-2.5">
            {/* Format */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                <span>Download format:</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {selectedFormat === 'step'
                    ? 'Analytical B-Rep Solid (OpenCASCADE)'
                    : selectedFormat === 'stl'
                    ? '3D Polygon Mesh (Manifold-3D)'
                    : 'Modern 3MF Format'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-white rounded-xl border border-slate-200/70">
                <button
                  type="button"
                  onClick={() => setSelectedFormat('step')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    selectedFormat === 'step'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  STEP (.step)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFormat('stl')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    selectedFormat === 'stl'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  STL (.stl)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFormat('3mf')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    selectedFormat === '3mf'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  3MF (.3mf)
                </button>
              </div>
            </div>

            {/* Target component */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                <span>Component to export:</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {selectedTarget === 'assembly' ? 'Complete mated mechanism' : 'Single component'}
                </span>
              </div>
              {isRack ? (
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-white rounded-xl border border-slate-200/70">
                  <button
                    type="button"
                    onClick={() => setSelectedTarget('assembly')}
                    className={`py-1.5 px-1 text-[11px] font-bold rounded-lg transition-all text-center ${
                      selectedTarget === 'assembly'
                        ? 'bg-orange-50 text-orange-700 font-extrabold shadow-2xs border border-orange-300'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Assembly
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTarget('rack')}
                    className={`py-1.5 px-1 text-[11px] font-bold rounded-lg transition-all text-center ${
                      selectedTarget === 'rack' || selectedTarget === 'default'
                        ? 'bg-orange-50 text-orange-700 font-extrabold shadow-2xs border border-orange-300'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Rack Bar
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTarget('pinion')}
                    className={`py-1.5 px-1 text-[11px] font-bold rounded-lg transition-all text-center ${
                      selectedTarget === 'pinion'
                        ? 'bg-orange-50 text-orange-700 font-extrabold shadow-2xs border border-orange-300'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Pinion
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-white rounded-xl border border-slate-200/70">
                  <button
                    type="button"
                    onClick={() => setSelectedTarget('assembly')}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all text-center ${
                      selectedTarget === 'assembly'
                        ? 'bg-orange-50 text-orange-700 font-extrabold shadow-2xs border border-orange-300'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Assembled Pair
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTarget('default')}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all text-center ${
                      selectedTarget === 'default'
                        ? 'bg-orange-50 text-orange-700 font-extrabold shadow-2xs border border-orange-300'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Main Gear
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUPPORT / BUY ME A COFFEE BLOCK */}
        <div className="bg-[#fffdfa] border border-amber-200/80 rounded-2xl p-4 mb-4 shadow-2xs">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-800 text-base shadow-2xs">
              ☕
            </div>
            <div className="text-xs text-slate-600 leading-relaxed">
              BuildGears is <strong className="text-slate-900 font-bold">100% free and open source</strong>. If this tool has saved you CAD engineering time or helped your project, consider buying me a coffee to support development and keep the servers running.
            </div>
          </div>

          {/* Official Buy Me a Coffee Button */}
          <a
            href={bmcUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setHasDonated(true)}
            className="w-full py-2.5 px-4 rounded-xl bg-[#ffdd00] hover:bg-[#ffea33] text-slate-950 font-extrabold text-xs sm:text-sm shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 border border-amber-300 active:scale-[0.99] text-center"
          >
            <svg className="w-4 h-4 shrink-0 text-slate-950" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.216 6.415l-.132-.666c-.119-.598-.388-1.163-1.001-1.379-.197-.069-.42-.098-.57-.241-.152-.143-.196-.366-.231-.572-.065-.378-.125-.756-.192-1.133C18.007 1.94 17.585 1.5 17.094 1.5H3.906c-.491 0-.913.44-.996.924-.067.377-.127.755-.192 1.133-.035.206-.079.429-.231.572-.15.143-.373.172-.57.241-.613.216-.882.781-1.001 1.379l-.132.666C.247 9.112 1.554 11.5 4.3 11.5h.063c.52 3.12 3.14 5.5 6.387 5.5h2.5c3.247 0 5.867-2.38 6.387-5.5h.063c2.746 0 4.053-2.388 3.516-5.085zM18.8 9.5h-.735c.09-.64.135-1.305.135-2 0-.695-.045-1.36-.135-2h.735c1.1 0 1.62.9 1.4 2-.22 1.1-.74 2-1.4 2zM3.2 9.5c-.66 0-1.18-.9-.96-2 .22-1.1.74-2 1.84-2h.735c-.09.64-.135 1.305-.135 2 0 .695.045 1.36.135 2H3.2z" />
            </svg>
            <span>Buy me a coffee on Buy Me a Coffee</span>
          </a>

          {hasDonated ? (
            <p className="text-[11px] text-emerald-700 text-center font-bold mt-2 animate-in fade-in">
              Thank you so much for your generosity and supporting the project! ❤️
            </p>
          ) : (
            <p className="text-[10px] text-slate-400 text-center mt-2">
              Opens buymeacoffee.com/rocca022t (secure payment with card, PayPal or Apple Pay)
            </p>
          )}
        </div>

        {/* PROGRESS AREA OR DOWNLOAD INITIATION */}
        {exportStatus.isExporting ? (
          <div className="bg-orange-50/70 border border-orange-200 rounded-2xl p-4 space-y-3 animate-in fade-in">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span>{exportStatus.message || 'Processing CAD model...'}</span>
              </div>
              <span className="font-mono font-bold text-orange-600 text-sm">
                {exportStatus.progress}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2.5 bg-orange-100/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300 rounded-full"
                style={{ width: `${Math.max(5, exportStatus.progress)}%` }}
              />
            </div>

            {/* Advisory notice */}
            <div className="text-[11px] font-bold text-amber-900 bg-amber-100/70 py-2 px-3 rounded-xl border border-amber-200">
              Please do not close this window until the download is complete.
            </div>
          </div>
        ) : exportStatus.progress === 100 ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-2 animate-in fade-in">
            <h4 className="font-bold text-emerald-950 text-sm">
              CAD file downloaded successfully!
            </h4>
            {exportStatus.message && (
              <p className="text-[11px] font-mono text-emerald-800 bg-white/70 border border-emerald-200 rounded-lg px-2 py-1.5 break-words">
                {exportStatus.message}
              </p>
            )}
            <p className="text-xs text-emerald-700 leading-relaxed">
              The {selectedFormat.toUpperCase()} file is now in your downloads folder. If BuildGears saved you time, feel free to buy me a coffee above before leaving!
            </p>
            <button
              type="button"
              onClick={closeExportModal}
              className="mt-2 py-2 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors"
            >
              Close window
            </button>
          </div>
        ) : exportStatus.error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-3">
            <div className="text-rose-700 font-bold text-xs">
              {exportStatus.error}
            </div>
            <button
              type="button"
              onClick={handleStartDownload}
              className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors"
            >
              Retry download
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="relative flex py-1 items-center">
              <div className="grow border-t border-slate-200"></div>
              <span className="shrink mx-3 text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                Free Download
              </span>
              <div className="grow border-t border-slate-200"></div>
            </div>

            {/* MAIN DOWNLOAD BUTTON */}
            <button
              type="button"
              onClick={handleStartDownload}
              className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center text-center hover:shadow-lg active:scale-[0.99]"
            >
              Download {selectedFormat.toUpperCase()} ({selectedTarget === 'assembly' ? 'Assembly' : isRack && selectedTarget === 'pinion' ? 'Pinion' : isRack ? 'Rack' : 'Part'}) now (Free)
            </button>

            <p className="text-[10px] text-center text-slate-400">
              Direct analytical geometry generation with no registration or usage limits.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
