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
  const [selectedAmount, setSelectedAmount] = useState<number | 'custom'>(5)
  const [customAmount, setCustomAmount] = useState<string>('15')
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
    spur: 'Cilíndrico Recto',
    helical: 'Helicoidal',
    herringbone: 'Espiga (Doble Hélice)',
    internal: 'Corona Interior',
    rack: 'Cremallera',
    bevel: 'Cónico Recto',
  }

  const targetLabels: Record<string, string> = {
    default: isRack ? 'Barra de Cremallera' : `Engranaje ${gearTypeNames[params.gearType] || params.gearType}`,
    assembly: isRack ? 'Conjunto Cremallera + Piñón' : `Conjunto Ensamblado (Pareja z1 + z2)`,
    rack: 'Barra de Cremallera',
    pinion: 'Piñón Motriz Conjugado',
  }

  const currentAmountValue = selectedAmount === 'custom'
    ? Math.max(1, parseFloat(customAmount) || 5)
    : selectedAmount

  // Enlace a Buy Me a Coffee
  const bmcUrl = `https://buymeacoffee.com/buildgears`

  const handleStartDownload = async () => {
    try {
      setExportStatus({
        isExporting: true,
        progress: 5,
        message: 'Iniciando generación de sólidos...',
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
        message: '¡Descarga completada con éxito!',
      })
    } catch (err: any) {
      console.error('Error al exportar:', err)
      setExportStatus({
        isExporting: false,
        progress: 0,
        message: 'Error durante la exportación',
        error: err.message || 'No se pudo generar el archivo CAD.',
      })
    }
  }

  const handleOpenBMC = () => {
    setHasDonated(true)
    window.open(bmcUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200/80 rounded-3xl w-full max-w-lg shadow-2xl p-6 sm:p-7 relative overflow-hidden flex flex-col max-h-[95vh] overflow-y-auto">
        {/* Barra superior indicadora de progreso */}
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

        {/* Botón Cerrar (✕) - Deshabilitado mientras se descarga */}
        <button
          type="button"
          onClick={closeExportModal}
          disabled={exportStatus.isExporting}
          className={`absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center transition-colors text-sm font-bold ${
            exportStatus.isExporting
              ? 'text-slate-200 cursor-not-allowed'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
          title={exportStatus.isExporting ? 'Descarga en curso...' : 'Cerrar ventana'}
        >
          ✕
        </button>

        {/* Encabezado con logo estilo SKADIS STUDIO */}
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
              ? '¡Tu modelo CAD ha sido descargado!'
              : exportStatus.isExporting
              ? 'Generando y descargando archivo...'
              : '¿Te ha sido útil BuildGears?'}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
            <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 font-bold uppercase text-[10px]">
              {selectedFormat.toUpperCase()}
            </span>
            <span>{targetLabels[selectedTarget] || targetLabels.default}</span>
          </div>
        </div>

        {/* Selector interactivo de Formato y Pieza (Solo visible antes de iniciar descarga) */}
        {!exportStatus.isExporting && exportStatus.progress !== 100 && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 mb-3.5 space-y-2.5">
            {/* Formato */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                <span>Formato de descarga:</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {selectedFormat === 'step'
                    ? 'Sólido analítico B-Rep (OpenCASCADE)'
                    : selectedFormat === 'stl'
                    ? 'Malla poligonal 3D (Manifold-3D)'
                    : 'Formato 3MF moderno'}
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

            {/* Contenido / Pieza */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                <span>Pieza a exportar:</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {selectedTarget === 'assembly' ? 'Mecanismo completo acoplado' : 'Pieza única'}
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
                    Conjunto
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
                    Cremallera
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
                    Piñón
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
                    Conjunto Ensamblado
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
                    Engranaje Principal
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BLOQUE DE APOYO / BUY ME A COFFEE */}
        <div className="bg-[#fffdfa] border border-amber-200/70 rounded-2xl p-4 mb-4 shadow-2xs">
          <p className="text-xs text-slate-600 leading-relaxed mb-3">
            BuildGears es <strong className="text-slate-900 font-bold">100% gratuito y de código abierto</strong>. Si esta herramienta te ha ahorrado tiempo de ingeniería CAD o te sirve para tu proyecto, considera invitar a un café para apoyar el desarrollo y mantener los servidores activos.
          </p>

          {/* Selector de Valores de Referencia: 2€, 5€, 10€ y Monto Libre */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { amount: 2, label: '2 €', sub: '1 café' },
              { amount: 5, label: '5 €', sub: '2 cafés', popular: true },
              { amount: 10, label: '10 €', sub: 'Gran apoyo' },
            ].map((item) => (
              <button
                key={item.amount}
                type="button"
                onClick={() => setSelectedAmount(item.amount)}
                className={`py-2 px-1.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                  selectedAmount === item.amount
                    ? 'border-orange-500 bg-orange-50/80 text-orange-950 font-bold shadow-xs ring-1 ring-orange-500'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs sm:text-sm font-extrabold">{item.label}</div>
                <div className="text-[9px] text-slate-400 font-medium tracking-tight mt-0.5">
                  {item.sub}
                </div>
              </button>
            ))}

            {/* Opción Otro Importe */}
            <button
              type="button"
              onClick={() => setSelectedAmount('custom')}
              className={`py-2 px-1.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                selectedAmount === 'custom'
                  ? 'border-orange-500 bg-orange-50/80 text-orange-950 font-bold shadow-xs ring-1 ring-orange-500'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="text-xs font-bold">Otro</div>
              <div className="text-[9px] text-slate-400 font-medium mt-0.5">Libre</div>
            </button>
          </div>

          {/* Input para importe libre si está seleccionado */}
          {selectedAmount === 'custom' && (
            <div className="flex items-center gap-2 mb-3 p-2 bg-white rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700 pl-1">Monto personalizado:</span>
              <div className="relative flex-1">
                <input
                  type="number"
                  min="1"
                  max="500"
                  step="1"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full text-right pr-6 py-1 font-mono font-bold text-sm text-slate-900 border border-slate-200 rounded-lg focus:outline-hidden focus:border-orange-500"
                />
                <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-bold">€</span>
              </div>
            </div>
          )}

          {/* Botón Invitar a un Café */}
          <button
            type="button"
            onClick={handleOpenBMC}
            className="w-full py-2.5 px-4 rounded-xl bg-[#ffdd00] hover:bg-[#ffea33] text-slate-900 font-extrabold text-xs sm:text-sm shadow-xs transition-all text-center border border-amber-300"
          >
            Invitar a un café ({currentAmountValue} €) en Buy Me a Coffee
          </button>
          {hasDonated && (
            <p className="text-[11px] text-emerald-700 text-center font-medium mt-1.5">
              ¡Muchísimas gracias por tu apoyo al proyecto!
            </p>
          )}
        </div>

        {/* ÁREA DE PROGRESO DE DESCARGA O BOTÓN DE INICIO */}
        {exportStatus.isExporting ? (
          <div className="bg-orange-50/70 border border-orange-200 rounded-2xl p-4 space-y-3 animate-in fade-in">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span>{exportStatus.message || 'Procesando modelo CAD...'}</span>
              </div>
              <span className="font-mono font-bold text-orange-600 text-sm">
                {exportStatus.progress}%
              </span>
            </div>

            {/* Barra de progreso */}
            <div className="w-full h-2.5 bg-orange-100/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300 rounded-full"
                style={{ width: `${Math.max(5, exportStatus.progress)}%` }}
              />
            </div>

            {/* LEYENDA OBLIGATORIA SOLICITADA POR EL USUARIO */}
            <div className="text-[11px] font-bold text-amber-900 bg-amber-100/70 py-2 px-3 rounded-xl border border-amber-200">
              Por favor, no cierres esta ventana hasta que se complete la descarga.
            </div>
          </div>
        ) : exportStatus.progress === 100 ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-2 animate-in fade-in">
            <h4 className="font-bold text-emerald-950 text-sm">
              ¡Archivo descargado con éxito!
            </h4>
            <p className="text-xs text-emerald-700 leading-relaxed">
              El archivo {selectedFormat.toUpperCase()} ya está en tu carpeta de descargas. Si BuildGears te ha ahorrado tiempo, ¡puedes invitar a un café arriba antes de salir!
            </p>
            <button
              type="button"
              onClick={closeExportModal}
              className="mt-2 py-2 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors"
            >
              Cerrar ventana
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
              Reintentar descarga
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="relative flex py-1 items-center">
              <div className="grow border-t border-slate-200"></div>
              <span className="shrink mx-3 text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                Descarga Gratuita
              </span>
              <div className="grow border-t border-slate-200"></div>
            </div>

            {/* BOTÓN PRINCIPAL DE DESCARGA */}
            <button
              type="button"
              onClick={handleStartDownload}
              className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center text-center hover:shadow-lg active:scale-[0.99]"
            >
              Descargar {selectedFormat.toUpperCase()} ({selectedTarget === 'assembly' ? 'Conjunto' : isRack && selectedTarget === 'pinion' ? 'Piñón' : isRack ? 'Cremallera' : 'Pieza'}) ahora (Gratis)
            </button>

            <p className="text-[10px] text-center text-slate-400">
              Generación analítica directa sin registro ni limitaciones de uso.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
