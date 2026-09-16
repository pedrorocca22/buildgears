import React from 'react'
import { useGearStore } from '../store/useGearStore'
import { getDIN6885Keyway } from '../cad/din6885'
import { getDIN912Screw } from '../cad/din912'
import { calculateDimensions } from '../cad/gearMath'

export const RightSidebar: React.FC = () => {
  const params = useGearStore((s) => s.params)
  const setGearParam = useGearStore((s) => s.setGearParam)
  const meshingPair = useGearStore((s) => s.meshingPair)
  const setMeshingPair = useGearStore((s) => s.setMeshingPair)
  const resetCurrentGear = useGearStore((s) => s.resetCurrentGear)
  const exportStatus = useGearStore((s) => s.exportStatus)
  const openExportModal = useGearStore((s) => s.openExportModal)

  const isHerringbone = params.gearType === 'herringbone' || (params.gearType === 'rack' && params.rackToothType === 'herringbone')
  const isHelical = params.gearType === 'helical' || params.gearType === 'herringbone' || (params.gearType === 'rack' && (params.rackToothType === 'helical' || params.rackToothType === 'herringbone'))
  const isRack = params.gearType === 'rack'
  const standardKeyway = getDIN6885Keyway(params.boreDiameter > 0 ? params.boreDiameter : 18)
  const pinionKeyway = getDIN6885Keyway(params.rackPinionBore && params.rackPinionBore > 0 ? params.rackPinionBore : 14)
  const dinScrew = getDIN912Screw(params.rackScrewStandard || 'M5')
  const dims = calculateDimensions(params, meshingPair.enabled ? meshingPair.teeth2 : undefined)

  const rackToothTitle = params.rackToothType === 'herringbone'
    ? 'Piñón & Cremallera Espiga'
    : params.rackToothType === 'helical'
    ? 'Piñón & Cremallera Helicoidal'
    : 'Piñón & Cremallera Recta'

  const gearTitleMap: Record<string, string> = {
    spur: 'Engranaje Recto',
    helical: 'Engranaje Helicoidal',
    herringbone: 'Engranaje Espiga',
    internal: 'Corona Interior',
    rack: rackToothTitle,
    bevel: 'Engranaje Cónico',
  }

  // Apertura del modal unificado de apoyo y descarga
  const handleExportSTEP = (target: 'default' | 'rack' | 'pinion' | 'assembly' = 'default') => {
    openExportModal('step', target)
  }

  const handleExportSTL = (target: 'default' | 'rack' | 'pinion' | 'assembly' = 'default') => {
    openExportModal('stl', target)
  }

  return (
    <aside className="w-84 bg-[#fbfcfd] border-l border-slate-200 flex flex-col h-full select-none shrink-0 text-slate-800">
      {/* Cabecera del objeto paramétrico estilo CAD Studio */}
      <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold text-slate-900 leading-tight">
            {gearTitleMap[params.gearType] || 'Engranaje'}
          </h2>
          <p className="text-[10px] text-slate-400">
            {isRack ? 'Mecanismo Cinemático Acoplado' : 'Objeto paramétrico para CAD / CNC'}
          </p>
        </div>

        <button
          onClick={resetCurrentGear}
          title="Restablecer valores por defecto"
          className="px-2 py-1 rounded-md text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          Restablecer
        </button>
      </div>

      {/* Contenedor de controles con scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
        {/* CONTROLES ESPECÍFICOS DE PIÑÓN & CREMALLERA */}
        {isRack && (
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-800">Visualización 3D en Pantalla</span>
              <span className="text-[9.5px] text-slate-400 font-mono">
                {params.rackViewFocus === 'pinion' ? 'Solo Piñón' : params.rackViewFocus === 'rack' ? 'Solo Cremallera' : 'Conjunto'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setGearParam('rackViewFocus', 'both')}
                className={`py-1 rounded-md text-[10px] font-bold transition-all ${
                  (params.rackViewFocus || 'both') === 'both'
                    ? 'bg-white text-orange-600 shadow-2xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Conjunto
              </button>
              <button
                type="button"
                onClick={() => setGearParam('rackViewFocus', 'rack')}
                className={`py-1 rounded-md text-[10px] font-bold transition-all ${
                  params.rackViewFocus === 'rack'
                    ? 'bg-white text-orange-600 shadow-2xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cremallera
              </button>
              <button
                type="button"
                onClick={() => setGearParam('rackViewFocus', 'pinion')}
                className={`py-1 rounded-md text-[10px] font-bold transition-all ${
                  params.rackViewFocus === 'pinion'
                    ? 'bg-white text-orange-600 shadow-2xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Piñón
              </button>
            </div>
          </div>
        )}

        {/* SECCIÓN 1: FÍSICA CONJUGADA COMPARTIDA (LEY DE WILLIS / ISO 53) */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5">
              <span>{isRack ? '1 · Física Conjugada Compartida' : '1 · Dientes y Perfil Cinemático'}</span>
            </div>
            {isRack && (
              <span className="text-[9px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">
                Ley de Willis
              </span>
            )}
          </div>

          {/* Si es cremallera: Selector de Dentado Cinemático */}
          {isRack && (
            <div>
              <span className="text-[11px] font-medium text-slate-700 block mb-1.5">Dentado Cinemático Acoplado</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'spur', label: 'Recto', desc: 'Fa = 0 N' },
                  { id: 'helical', label: 'Helicoidal', desc: 'Silencioso' },
                  { id: 'herringbone', label: 'Espiga (V)', desc: 'Fa = 0 · Chevron' },
                ].map((item) => {
                  const currentToothType = params.rackToothType || (params.helixAngle && params.helixAngle > 0 ? 'helical' : 'spur')
                  const isCurrent = currentToothType === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setGearParam('rackToothType', item.id as any)
                        if (item.id !== 'spur' && (!params.helixAngle || params.helixAngle === 0)) {
                          setGearParam('helixAngle', 20)
                        }
                      }}
                      className={`py-1.5 px-1 rounded-lg text-center border transition-all ${
                        isCurrent
                          ? 'bg-orange-50 border-orange-400 text-orange-600 font-bold shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-[11px] font-bold leading-tight">{item.label}</div>
                      <div className="text-[9px] opacity-80 mt-0.5">{item.desc}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Selector de Norma / Tipo de Perfil de Diente */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[11px] font-medium text-slate-700">Norma del Diente (Ambos)</span>
              <span className="text-[10px] text-orange-600 font-bold">
                {params.toothProfileType === 'stub'
                  ? 'Stub AGMA'
                  : params.toothProfileType === 'deep'
                  ? 'Alto HCR'
                  : params.toothProfileType === 'cycloidal'
                  ? 'Cicloidal NIHS'
                  : params.toothProfileType === 'custom'
                  ? 'Personalizado'
                  : 'ISO 53'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'standard', label: 'ISO 53' },
                { id: 'stub', label: 'Stub Corto' },
                { id: 'deep', label: 'Alto HCR' },
                { id: 'cycloidal', label: 'Cicloidal' },
              ].map((tp) => (
                <button
                  key={tp.id}
                  type="button"
                  onClick={() => setGearParam('toothProfileType', tp.id as any)}
                  className={`py-1 px-1 rounded-md text-[10px] font-medium border transition-all text-center ${
                    (params.toothProfileType || 'standard') === tp.id
                      ? 'bg-orange-50 border-orange-400 text-orange-600 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tp.label}
                </button>
              ))}
            </div>
            <p className="text-[9.5px] text-slate-400 mt-1 leading-tight">
              {(params.toothProfileType || 'standard') === 'standard' && 'Estándar ISO 53 / DIN 867. Involuta conjugada exacta entre flancos planos y evolventes.'}
              {params.toothProfileType === 'stub' && 'Diente corto AGMA 201.02 (+30% resistencia a flexión en raíz de piñón y cremallera).'}
              {params.toothProfileType === 'deep' && 'Diente alto de contacto extendido (ε > 2.0). Marcha de rodadura ultra silenciosa.'}
              {params.toothProfileType === 'cycloidal' && 'Perfil cicloidal horológico (DIN 58400 / NIHS). Rodadura pura sin deslizamiento en piñones.'}
            </p>
          </div>

          {/* Módulo Normal Compartido (mn) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-medium text-slate-700">Módulo Normal (m_n)</span>
              <span className="font-mono text-xs font-bold text-slate-900">{params.module} mm</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="8.0"
              step="0.1"
              value={params.module}
              onChange={(e) => setGearParam('module', parseFloat(e.target.value))}
              className="w-full accent-orange-500 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
              <span>0.5 mm</span>
              <span>8.0 mm</span>
            </div>
            {isRack && (
              <div className="mt-1.5 p-2 rounded-lg bg-orange-50/70 border border-orange-200/80 text-[9.5px] text-orange-950">
                <span>
                  Al cambiar el módulo, el paso de la cremallera (<b>{dims.circularPitch} mm</b>) y el diámetro del piñón (<b>{(dims.pinionPitchRadius ? dims.pinionPitchRadius * 2 : 0).toFixed(1)} mm</b>) se adaptan en tiempo real.
                </span>
              </div>
            )}
          </div>

          {/* Ángulo de Presión */}
          <div>
            <span className="text-[11px] font-medium text-slate-700 block mb-1.5">Ángulo de Presión Normal (α_n)</span>
            <div className="grid grid-cols-3 gap-1.5">
              {[14.5, 20.0, 25.0].map((deg) => (
                <button
                  key={deg}
                  type="button"
                  onClick={() => setGearParam('pressureAngle', deg)}
                  className={`py-1 rounded-lg text-xs font-medium border transition-all ${
                    params.pressureAngle === deg
                      ? 'bg-orange-50 border-orange-400 text-orange-600 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>

          {/* Ángulo de Hélice (para helicoidales o cremallera helicoidal / espiga) */}
          {(isHelical || (isRack && params.rackToothType !== 'spur')) && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-medium text-slate-700">
                  {isHerringbone ? 'Ángulo Chevron Espiga (β)' : 'Inclinación Hélice (β)'}
                </span>
                <span className="font-mono text-xs font-bold text-slate-900">{params.helixAngle || 20}°</span>
              </div>
              <input
                type="range"
                min="10"
                max="45"
                step="1"
                value={params.helixAngle || 20}
                onChange={(e) => setGearParam('helixAngle', parseFloat(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                <span>10°</span>
                <span>45°</span>
              </div>

              {isHerringbone ? (
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] flex items-center justify-between">
                  <span className="font-semibold">Fuerza axial nula (Fa = 0)</span>
                  <span className="font-bold text-emerald-600 text-[9px] uppercase tracking-wide">V-Chevron Autocentrante</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500">Sentido de hélice en cremallera:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setGearParam('helixHand', 'right')}
                      className={`py-1 rounded-md text-[11px] border transition-colors ${
                        params.helixHand === 'right'
                          ? 'bg-orange-50 border-orange-400 text-orange-600 font-bold'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      Derecha (RH)
                    </button>
                    <button
                      type="button"
                      onClick={() => setGearParam('helixHand', 'left')}
                      className={`py-1 rounded-md text-[11px] border transition-colors ${
                        params.helixHand === 'left'
                          ? 'bg-orange-50 border-orange-400 text-orange-600 font-bold'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      Izquierda (LH)
                    </button>
                  </div>
                  {isRack && (
                    <p className="text-[9.5px] text-slate-400 leading-tight pt-1">
                      * El piñón adopta automáticamente la hélice opuesta complementaria ({params.helixHand === 'right' ? 'LH' : 'RH'}) para garantizar acoplamiento de flancos a 180°.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Si NO es cremallera: Controles estándar de Dientes y Desplazamiento */}
          {!isRack && (
            <>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-medium text-slate-700">Número de Dientes (z)</span>
                  <span className="font-mono text-xs font-bold text-slate-900">{params.teeth} uds.</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="120"
                  step="1"
                  value={params.teeth}
                  onChange={(e) => setGearParam('teeth', parseInt(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                  <span>8 uds.</span>
                  <span>120 uds.</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-medium text-slate-700">Desplazamiento Perfil (x)</span>
                  <span className="font-mono text-xs font-bold text-slate-900">
                    {params.profileShift > 0 ? `+${params.profileShift.toFixed(2)}` : params.profileShift.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="-0.5"
                  max="0.8"
                  step="0.05"
                  value={params.profileShift}
                  onChange={(e) => setGearParam('profileShift', parseFloat(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer"
                />

                {dims.hasUndercutWarning && (
                  <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[10px] space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Riesgo de socavado en raíz (z &lt; {dims.undercutLimitZ})
                    </div>
                    <button
                      type="button"
                      onClick={() => setGearParam('profileShift', dims.recommendedShift)}
                      className="mt-1 w-full py-1 px-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] shadow-xs transition-colors"
                    >
                      Auto-corregir a x = +{dims.recommendedShift.toFixed(2)}
                    </button>
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-medium text-slate-700">Anchura de Cara (b)</span>
                  <span className="font-mono text-xs font-bold text-slate-900">{params.faceWidth} mm</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="80"
                  step="1"
                  value={params.faceWidth}
                  onChange={(e) => setGearParam('faceWidth', parseFloat(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>

              {/* Chaflán Paramétrico de Dientes (45°) */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-800 block">Chaflán de Dientes (45°)</span>
                    <span className="text-[10px] text-slate-400">Bisel en caras frontal y posterior</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGearParam('hasToothChamfer', !params.hasToothChamfer)}
                    className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                      params.hasToothChamfer ? 'bg-orange-500' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        params.hasToothChamfer ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {params.hasToothChamfer && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-600">Tamaño Chaflán (c)</span>
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {(params.toothChamfer || 0.6).toFixed(1)} mm
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max={Math.min(3.0, Number((params.faceWidth * 0.35).toFixed(1)))}
                      step="0.1"
                      value={params.toothChamfer || 0.6}
                      onChange={(e) => setGearParam('toothChamfer', parseFloat(e.target.value))}
                      className="w-full accent-orange-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400">
                      <span>0.1 mm</span>
                      <span className="text-slate-500 font-medium">Bisel 45° anti-rebabas</span>
                      <span>{Math.min(3.0, Number((params.faceWidth * 0.35).toFixed(1)))} mm</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* SECCIÓN 2: BARRA DE CREMALLERA */}
        {isRack && (
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 border-b border-slate-100 pb-2">
              <span>2 · Barra de Cremallera</span>
            </div>

            {/* Longitud de Barra (L) */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-medium text-slate-700">Longitud Total Barra (L)</span>
                <span className="font-mono text-xs font-bold text-slate-900">{params.rackLength || 160} mm</span>
              </div>
              <input
                type="range"
                min="60"
                max="400"
                step="5"
                value={params.rackLength || 160}
                onChange={(e) => setGearParam('rackLength', parseFloat(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                <span>60 mm</span>
                <span>400 mm</span>
              </div>
            </div>

            {/* Altura de Barra (H) */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-medium text-slate-700">Altura de Barra (H)</span>
                <span className="font-mono text-xs font-bold text-slate-900">{params.rackHeight || 25} mm</span>
              </div>
              <input
                type="range"
                min="15"
                max="60"
                step="1"
                value={params.rackHeight || 25}
                onChange={(e) => setGearParam('rackHeight', parseFloat(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                <span>15 mm</span>
                <span>60 mm</span>
              </div>
            </div>

            {/* Anchura de Cara (b) de la barra */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-medium text-slate-700">Anchura Barra (b_rack)</span>
                <span className="font-mono text-xs font-bold text-slate-900">{params.faceWidth} mm</span>
              </div>
              <input
                type="range"
                min="5"
                max="80"
                step="1"
                value={params.faceWidth}
                onChange={(e) => setGearParam('faceWidth', parseFloat(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
              />
            </div>

            {/* Chaflán Paramétrico de Dientes de Cremallera (45°) */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-800 block">Chaflán de Dientes (45°)</span>
                  <span className="text-[10px] text-slate-400">Bisel en extremos axiales de la barra</span>
                </div>
                <button
                  type="button"
                  onClick={() => setGearParam('hasToothChamfer', !params.hasToothChamfer)}
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                    params.hasToothChamfer ? 'bg-orange-500' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      params.hasToothChamfer ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {params.hasToothChamfer && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-600">Tamaño Chaflán (c)</span>
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {(params.toothChamfer || 0.6).toFixed(1)} mm
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max={Math.min(3.0, Number((params.faceWidth * 0.35).toFixed(1)))}
                    step="0.1"
                    value={params.toothChamfer || 0.6}
                    onChange={(e) => setGearParam('toothChamfer', parseFloat(e.target.value))}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400">
                    <span>0.1 mm</span>
                    <span className="text-slate-500 font-medium">Bisel 45° en dientes</span>
                    <span>{Math.min(3.0, Number((params.faceWidth * 0.35).toFixed(1)))} mm</span>
                  </div>
                </div>
              )}
            </div>

            {/* Fijaciones DIN 912 */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-800 block">Taladros de Fijación</span>
                  <span className="text-[10px] text-slate-400">Cajeras para tornillos Allen DIN 912</span>
                </div>
                <button
                  type="button"
                  onClick={() => setGearParam('rackMountingHoles', !params.rackMountingHoles)}
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                    params.rackMountingHoles ? 'bg-orange-500' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      params.rackMountingHoles ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {params.rackMountingHoles && (
                <div className="space-y-3 pt-1">
                  <div>
                    <span className="text-[11px] font-medium text-slate-700 block mb-1">Métrica del Tornillo</span>
                    <div className="grid grid-cols-6 gap-1">
                      {(['M3', 'M4', 'M5', 'M6', 'M8', 'M10'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setGearParam('rackScrewStandard', m)}
                          className={`py-1 rounded-md text-[10px] font-bold border transition-all ${
                            (params.rackScrewStandard || 'M5') === m
                              ? 'bg-orange-50 border-orange-400 text-orange-600 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-medium text-slate-700 block mb-1">Orientación de Fijación</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setGearParam('rackHolePosition', 'bottom')}
                        className={`py-1 rounded-md text-[10px] font-medium border transition-colors ${
                          (params.rackHolePosition || 'bottom') === 'bottom'
                            ? 'bg-orange-50 border-orange-400 text-orange-600 font-bold'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        Inferior (Base)
                      </button>
                      <button
                        type="button"
                        onClick={() => setGearParam('rackHolePosition', 'side')}
                        className={`py-1 rounded-md text-[10px] font-medium border transition-colors ${
                          params.rackHolePosition === 'side'
                            ? 'bg-orange-50 border-orange-400 text-orange-600 font-bold'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        Lateral (Canto)
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-medium text-slate-700">Número de Taladros</span>
                      <span className="font-mono text-xs font-bold text-slate-900">{params.rackHoleCount || 3} uds.</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="8"
                      step="1"
                      value={params.rackHoleCount || 3}
                      onChange={(e) => setGearParam('rackHoleCount', parseInt(e.target.value))}
                      className="w-full accent-orange-500 cursor-pointer"
                    />
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-[10px] font-mono text-slate-600 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Broca pasante:</span>
                      <span className="font-bold text-slate-800">Ø {dinScrew.throughHoleDia} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cajera DIN 912:</span>
                      <span className="font-bold text-slate-800">Ø {dinScrew.counterboreDia} mm (h={dinScrew.counterboreDepth}mm)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECCIÓN 3: PIÑÓN MOTRIZ ACOPLADO (PARÁMETROS Y MODIFICACIONES) */}
        {isRack && (
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <span>3 · Piñón Motriz Conjugado</span>
              </div>
              <span className="text-[9px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">
                zp = {params.rackPinionTeeth || 20}
              </span>
            </div>

            {/* Toggle de Inclusión del Piñón */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-800 block">Acoplar Piñón al Mecanismo</span>
                <span className="text-[10px] text-slate-400">Calcula y posiciona el piñón conjugado</span>
              </div>
              <button
                type="button"
                onClick={() => setGearParam('rackIncludePinion', params.rackIncludePinion === false)}
                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                  params.rackIncludePinion !== false ? 'bg-orange-500' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    params.rackIncludePinion !== false ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {params.rackIncludePinion !== false && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                {/* Dientes del piñón (zp) */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-medium text-slate-700">Dientes del Piñón (z_p)</span>
                    <span className="font-mono text-xs font-bold text-slate-900">{params.rackPinionTeeth || 20} uds.</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    step="1"
                    value={params.rackPinionTeeth || 20}
                    onChange={(e) => setGearParam('rackPinionTeeth', parseInt(e.target.value))}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                    <span>10 uds.</span>
                    <span>60 uds.</span>
                  </div>
                </div>

                {/* Desplazamiento de Perfil del Piñón (x_p) */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-1">
                    <div>
                      <span className="text-[11px] font-medium text-slate-700 block">Desplazamiento Perfil Piñón (x_p)</span>
                      <span className="text-[9.5px] text-slate-400">Corrige socavado y desplaza cota operativa Y</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {(params.rackPinionProfileShift || 0) > 0 ? `+${(params.rackPinionProfileShift || 0).toFixed(2)}` : (params.rackPinionProfileShift || 0).toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-0.5"
                    max="0.8"
                    step="0.05"
                    value={params.rackPinionProfileShift || 0}
                    onChange={(e) => setGearParam('rackPinionProfileShift', parseFloat(e.target.value))}
                    className="w-full accent-orange-500 cursor-pointer"
                  />

                  {/* Alerta de socavado en piñón si zp < z_min */}
                  {dims.pinionUndercutWarning && (
                    <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[10px] space-y-1.5">
                      <div className="font-bold text-amber-800">
                        Riesgo de socavado en raíz del piñón (zp &lt; {dims.undercutLimitZ})
                      </div>
                      <div className="text-slate-600 text-[9.5px]">
                        Con {params.rackPinionTeeth || 20} dientes se produce entalladura si no se aplica corrección x_p.
                      </div>
                      <button
                        type="button"
                        onClick={() => setGearParam('rackPinionProfileShift', dims.pinionRecommendedShift)}
                        className="w-full py-1 px-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] shadow-xs transition-colors"
                      >
                        Auto-corregir perfil piñón a x_p = +{(dims.pinionRecommendedShift || 0).toFixed(2)}
                      </button>
                    </div>
                  )}
                </div>

                {/* Eje del Piñón (Bore) con interruptor Activar / Desactivar */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-800 block">Taladro Central en Piñón</span>
                      <span className="text-[10px] text-slate-400">
                        {(params.rackPinionBore ?? 0) > 0
                          ? `Eje Ø ${params.rackPinionBore} mm`
                          : 'Macizo (sin taladro ni agujero central)'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if ((params.rackPinionBore ?? 0) > 0) {
                          setGearParam('rackPinionBore', 0)
                          setGearParam('rackPinionHasKeyway', false)
                        } else {
                          setGearParam('rackPinionBore', 14)
                        }
                      }}
                      className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                        (params.rackPinionBore ?? 0) > 0 ? 'bg-orange-500' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          (params.rackPinionBore ?? 0) > 0 ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {(params.rackPinionBore ?? 0) > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-600">Diámetro Eje Piñón (d_eje)</span>
                        <span className="font-mono text-xs font-bold text-slate-900">{params.rackPinionBore} mm</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="40"
                        step="0.5"
                        value={params.rackPinionBore || 14}
                        onChange={(e) => setGearParam('rackPinionBore', parseFloat(e.target.value))}
                        className="w-full accent-orange-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[8px] text-slate-400 mt-0.5">
                        <span>1 mm</span>
                        <span>40 mm</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Anchura de Cara Piñón (b_pinion) */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-medium text-slate-700">Anchura Piñón (b_pinion)</span>
                    <span className="font-mono text-xs font-bold text-slate-900">{params.rackPinionFaceWidth || params.faceWidth} mm</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="80"
                    step="1"
                    value={params.rackPinionFaceWidth || params.faceWidth}
                    onChange={(e) => setGearParam('rackPinionFaceWidth', parseFloat(e.target.value))}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                    <button
                      type="button"
                      onClick={() => setGearParam('rackPinionFaceWidth', params.faceWidth)}
                      className="text-orange-600 hover:underline"
                    >
                      Sincronizar con cremallera ({params.faceWidth} mm)
                    </button>
                    <span>80 mm</span>
                  </div>
                </div>

                {/* Chaflán Paramétrico de Dientes del Piñón (45°) */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-800 block">Chaflán de Dientes (45°)</span>
                      <span className="text-[10px] text-slate-400">Bisel caras axiales del piñón</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGearParam('rackPinionHasToothChamfer', !params.rackPinionHasToothChamfer)}
                      className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                        params.rackPinionHasToothChamfer ? 'bg-orange-500' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          params.rackPinionHasToothChamfer ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {params.rackPinionHasToothChamfer && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-600">Tamaño Chaflán Piñón (c)</span>
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {(params.rackPinionToothChamfer || 0.6).toFixed(1)} mm
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max={Math.min(3.0, Number(((params.rackPinionFaceWidth || params.faceWidth) * 0.35).toFixed(1)))}
                        step="0.1"
                        value={params.rackPinionToothChamfer || 0.6}
                        onChange={(e) => setGearParam('rackPinionToothChamfer', parseFloat(e.target.value))}
                        className="w-full accent-orange-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-slate-400">
                        <span>0.1 mm</span>
                        <span className="text-slate-500 font-medium">Bisel 45° anti-rebabas</span>
                        <span>{Math.min(3.0, Number(((params.rackPinionFaceWidth || params.faceWidth) * 0.35).toFixed(1)))} mm</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Estilo del cuerpo del piñón: Macizo / Buje */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="text-[11px] font-medium text-slate-700 block">Cuerpo del Piñón</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'solid', label: 'Macizo Plano' },
                      { id: 'hub', label: 'Con Buje' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setGearParam('rackPinionBodyStyle', st.id as any)}
                        className={`py-1 rounded-md text-[10px] font-medium border transition-all ${
                          (params.rackPinionBodyStyle || 'solid') === st.id
                            ? 'bg-orange-50 border-orange-400 text-orange-600 font-bold shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  {(params.rackPinionBodyStyle || 'solid') === 'hub' && (
                    <div className="space-y-2 pt-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-600">Diámetro Buje</span>
                        <span className="font-mono text-[11px] font-bold text-slate-800">
                          {params.rackPinionHubDiameter || 28} mm
                        </span>
                      </div>
                      <input
                        type="range"
                        min={Math.max((params.rackPinionBore || 2) + 2, 4)}
                        max={Math.max((params.rackPinionBore || 10) + 10, ((dims.pinionPitchRadius || 25) * 2) - 4)}
                        step="1"
                        value={params.rackPinionHubDiameter || 28}
                        onChange={(e) => setGearParam('rackPinionHubDiameter', parseFloat(e.target.value))}
                        className="w-full accent-orange-500 cursor-pointer"
                      />

                      <div className="flex justify-between items-center pt-1">
                        <span className="text-[10px] text-slate-600">Saliente Buje</span>
                        <span className="font-mono text-[11px] font-bold text-slate-800">
                          {params.rackPinionHubOffset || 4} mm
                        </span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="20"
                        step="1"
                        value={params.rackPinionHubOffset || 4}
                        onChange={(e) => setGearParam('rackPinionHubOffset', parseFloat(e.target.value))}
                        className="w-full accent-orange-500 cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* Chavetero DIN 6885 en piñón con parametrización completa */}
                {(params.rackPinionBore ?? 0) > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-800 block">Chavetero en Piñón</span>
                        <span className="text-[10px] text-slate-400">
                          {params.rackPinionKeywayCustom ? 'Parametrización manual activa' : 'Dimensiones automáticas normalizadas'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setGearParam('rackPinionHasKeyway', !params.rackPinionHasKeyway)}
                        className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                          params.rackPinionHasKeyway ? 'bg-orange-500' : 'bg-slate-300'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            params.rackPinionHasKeyway ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {params.rackPinionHasKeyway && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider">
                            Diseño del Chavetero
                          </span>
                          <div className="flex bg-slate-200/80 p-0.5 rounded-md text-[10px]">
                            <button
                              type="button"
                              onClick={() => {
                                setGearParam('rackPinionKeywayCustom', false)
                                setGearParam('rackPinionKeywayWidth', undefined)
                                setGearParam('rackPinionKeywayDepth', undefined)
                              }}
                              className={`px-2 py-0.5 rounded font-medium transition-all ${
                                !params.rackPinionKeywayCustom
                                  ? 'bg-white text-orange-600 font-bold shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              DIN 6885
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setGearParam('rackPinionKeywayCustom', true)
                                if (params.rackPinionKeywayWidth === undefined) setGearParam('rackPinionKeywayWidth', pinionKeyway.b)
                                if (params.rackPinionKeywayDepth === undefined) setGearParam('rackPinionKeywayDepth', pinionKeyway.t2)
                              }}
                              className={`px-2 py-0.5 rounded font-medium transition-all ${
                                params.rackPinionKeywayCustom
                                  ? 'bg-white text-orange-600 font-bold shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Manual
                            </button>
                          </div>
                        </div>

                        {params.rackPinionKeywayCustom ? (
                          <div className="space-y-2 pt-1 border-t border-slate-200/60">
                            <div>
                              <div className="flex justify-between items-center mb-0.5 text-[10px]">
                                <span className="text-slate-700 font-medium">Anchura chaveta (b)</span>
                                <span className="font-mono font-bold text-orange-600">
                                  {(params.rackPinionKeywayWidth ?? pinionKeyway.b).toFixed(1)} mm
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0.5"
                                max={Math.max(10, params.rackPinionBore || 14)}
                                step="0.1"
                                value={params.rackPinionKeywayWidth ?? pinionKeyway.b}
                                onChange={(e) => setGearParam('rackPinionKeywayWidth', parseFloat(e.target.value))}
                                className="w-full accent-orange-500 cursor-pointer h-1.5"
                              />
                              <div className="flex justify-between text-[8px] text-slate-400 mt-0.5">
                                <span>0.5 mm</span>
                                <span>DIN: {pinionKeyway.b} mm</span>
                                <span>{Math.max(10, params.rackPinionBore || 14)} mm</span>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between items-center mb-0.5 text-[10px]">
                                <span className="text-slate-700 font-medium">Profundidad en cubo (t₂)</span>
                                <span className="font-mono font-bold text-orange-600">
                                  {(params.rackPinionKeywayDepth ?? pinionKeyway.t2).toFixed(1)} mm
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0.2"
                                max={Math.max(5, Number(((params.rackPinionBore || 14) * 0.7).toFixed(1)))}
                                step="0.1"
                                value={params.rackPinionKeywayDepth ?? pinionKeyway.t2}
                                onChange={(e) => setGearParam('rackPinionKeywayDepth', parseFloat(e.target.value))}
                                className="w-full accent-orange-500 cursor-pointer h-1.5"
                              />
                              <div className="flex justify-between text-[8px] text-slate-400 mt-0.5">
                                <span>0.2 mm</span>
                                <span>DIN: {pinionKeyway.t2} mm</span>
                                <span>{Math.max(5, Number(((params.rackPinionBore || 14) * 0.7).toFixed(1)))} mm</span>
                              </div>
                            </div>

                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setGearParam('rackPinionKeywayWidth', pinionKeyway.b)
                                  setGearParam('rackPinionKeywayDepth', pinionKeyway.t2)
                                }}
                                className="text-[9px] text-orange-600 hover:underline font-medium"
                              >
                                Restablecer a norma DIN 6885
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center font-mono text-[10px] text-slate-600 bg-white border border-slate-200/80 rounded-md p-2">
                            <span>b: <strong className="text-slate-800">{pinionKeyway.b} mm</strong></span>
                            <span>h: <strong className="text-slate-800">{pinionKeyway.h} mm</strong></span>
                            <span>t₁: <strong className="text-slate-800">{pinionKeyway.t1} mm</strong></span>
                            <span>t₂: <strong className="text-orange-600">{pinionKeyway.t2} mm</strong></span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SECCIÓN 2 & 3 PARA ENGRANAJES NORMALES */}
        {!isRack && (
          <>
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 border-b border-slate-100 pb-2">
                <span>2 · Eje y Chavetero DIN 6885</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  params.boreDiameter > 0
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {params.boreDiameter > 0 ? `Ø ${params.boreDiameter} mm` : 'Macizo'}
                </span>
              </div>

              {/* Interruptor de activación del taladro central */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-800 block">Taladro Central (Eje)</span>
                  <span className="text-[10px] text-slate-400">
                    {params.boreDiameter > 0 ? 'Perforación pasante cilíndrica' : 'Desactivado (engranaje macizo ciego)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (params.boreDiameter > 0) {
                      setGearParam('boreDiameter', 0)
                      setGearParam('hasKeyway', false)
                    } else {
                      setGearParam('boreDiameter', 18)
                    }
                  }}
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                    params.boreDiameter > 0 ? 'bg-orange-500' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      params.boreDiameter > 0 ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {params.boreDiameter > 0 ? (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-medium text-slate-700">Diámetro del Eje (d)</span>
                      <span className="font-mono text-xs font-bold text-slate-900">{params.boreDiameter} mm</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="60"
                      step="0.5"
                      value={params.boreDiameter}
                      onChange={(e) => setGearParam('boreDiameter', parseFloat(e.target.value))}
                      className="w-full accent-orange-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                      <span>1 mm</span>
                      <span>60 mm</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-800 block">Chavetero DIN 6885-1</span>
                        <span className="text-[10px] text-slate-400">
                          {params.keywayCustom ? 'Parametrización manual activa' : 'Dimensiones automáticas normalizadas'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setGearParam('hasKeyway', !params.hasKeyway)}
                        className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                          params.hasKeyway ? 'bg-orange-500' : 'bg-slate-300'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            params.hasKeyway ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {params.hasKeyway && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-2.5">
                        {/* Selector de modo: Automático DIN 6885 vs Manual */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider">
                            Diseño del Chavetero
                          </span>
                          <div className="flex bg-slate-200/80 p-0.5 rounded-md text-[10px]">
                            <button
                              type="button"
                              onClick={() => {
                                setGearParam('keywayCustom', false)
                                setGearParam('keywayWidth', undefined)
                                setGearParam('keywayDepth', undefined)
                              }}
                              className={`px-2 py-0.5 rounded font-medium transition-all ${
                                !params.keywayCustom
                                  ? 'bg-white text-orange-600 font-bold shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              DIN 6885
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setGearParam('keywayCustom', true)
                                if (params.keywayWidth === undefined) setGearParam('keywayWidth', standardKeyway.b)
                                if (params.keywayDepth === undefined) setGearParam('keywayDepth', standardKeyway.t2)
                              }}
                              className={`px-2 py-0.5 rounded font-medium transition-all ${
                                params.keywayCustom
                                  ? 'bg-white text-orange-600 font-bold shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Manual
                            </button>
                          </div>
                        </div>

                        {params.keywayCustom ? (
                          <div className="space-y-2 pt-1 border-t border-slate-200/60">
                            {/* Anchura de chavetero (b) */}
                            <div>
                              <div className="flex justify-between items-center mb-0.5 text-[10px]">
                                <span className="text-slate-700 font-medium">Anchura del chavetero (b)</span>
                                <span className="font-mono font-bold text-orange-600">
                                  {(params.keywayWidth ?? standardKeyway.b).toFixed(1)} mm
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0.5"
                                max={Math.max(12, params.boreDiameter)}
                                step="0.1"
                                value={params.keywayWidth ?? standardKeyway.b}
                                onChange={(e) => setGearParam('keywayWidth', parseFloat(e.target.value))}
                                className="w-full accent-orange-500 cursor-pointer h-1.5"
                              />
                              <div className="flex justify-between text-[8px] text-slate-400 mt-0.5">
                                <span>0.5 mm</span>
                                <span>DIN: {standardKeyway.b} mm</span>
                                <span>{Math.max(12, params.boreDiameter)} mm</span>
                              </div>
                            </div>

                            {/* Profundidad en el buje (t2) */}
                            <div>
                              <div className="flex justify-between items-center mb-0.5 text-[10px]">
                                <span className="text-slate-700 font-medium">Profundidad en cubo/buje (t₂)</span>
                                <span className="font-mono font-bold text-orange-600">
                                  {(params.keywayDepth ?? standardKeyway.t2).toFixed(1)} mm
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0.2"
                                max={Math.max(6, Number((params.boreDiameter * 0.7).toFixed(1)))}
                                step="0.1"
                                value={params.keywayDepth ?? standardKeyway.t2}
                                onChange={(e) => setGearParam('keywayDepth', parseFloat(e.target.value))}
                                className="w-full accent-orange-500 cursor-pointer h-1.5"
                              />
                              <div className="flex justify-between text-[8px] text-slate-400 mt-0.5">
                                <span>0.2 mm</span>
                                <span>DIN: {standardKeyway.t2} mm</span>
                                <span>{Math.max(6, Number((params.boreDiameter * 0.7).toFixed(1)))} mm</span>
                              </div>
                            </div>

                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setGearParam('keywayWidth', standardKeyway.b)
                                  setGearParam('keywayDepth', standardKeyway.t2)
                                }}
                                className="text-[9px] text-orange-600 hover:underline font-medium"
                              >
                                Restablecer a norma DIN 6885
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center font-mono text-[10px] text-slate-600 bg-white border border-slate-200/80 rounded-md p-2">
                            <span>b: <strong className="text-slate-800">{standardKeyway.b} mm</strong></span>
                            <span>h: <strong className="text-slate-800">{standardKeyway.h} mm</strong></span>
                            <span>t₁: <strong className="text-slate-800">{standardKeyway.t1} mm</strong></span>
                            <span>t₂: <strong className="text-orange-600">{standardKeyway.t2} mm</strong></span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-lg p-2.5 text-[10px] text-slate-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                  <span>Sin perforación central. Núcleo 100% macizo continuo.</span>
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 border-b border-slate-100 pb-2">
                <span>3 · Cuerpo y Aligeramientos</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  params.bodyStyle === 'solid'
                    ? 'bg-slate-100 text-slate-600'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {params.bodyStyle === 'solid' ? 'Macizo' : params.bodyStyle === 'hub' ? 'Buje' : 'Aligerado'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'solid', label: 'Macizo' },
                  { id: 'hub', label: 'Con Buje' },
                  { id: 'spoke', label: 'Aligerado' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setGearParam('bodyStyle', st.id as any)}
                    className={`py-1 rounded-md text-[11px] font-medium border transition-all ${
                      params.bodyStyle === st.id
                        ? 'bg-orange-50 border-orange-400 text-orange-600 font-bold shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {params.bodyStyle === 'solid' && (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-lg p-2.5 text-[10px] text-slate-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                  <span>Cuerpo sólido continuo sin sustracciones ni orificios.</span>
                </div>
              )}

              {params.bodyStyle === 'hub' && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-700">Diámetro Buje</span>
                    <span className="font-mono text-xs font-bold text-slate-900">{params.hubDiameter} mm</span>
                  </div>
                  <input
                    type="range"
                    min={Math.max(params.boreDiameter + 2, 4)}
                    max="90"
                    step="1"
                    value={params.hubDiameter}
                    onChange={(e) => setGearParam('hubDiameter', parseFloat(e.target.value))}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                </div>
              )}

              {params.bodyStyle === 'spoke' && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-700">Orificios aligeramiento</span>
                    <span className="font-mono text-xs font-bold text-slate-900">{params.holeCount} uds.</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="8"
                    step="1"
                    value={params.holeCount}
                    onChange={(e) => setGearParam('holeCount', parseInt(e.target.value))}
                    className="w-full accent-orange-500 cursor-pointer"
                  />

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[11px] text-slate-700">Diámetro orificio</span>
                    <span className="font-mono text-xs font-bold text-slate-900">{params.holeDiameter} mm</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="25"
                    step="1"
                    value={params.holeDiameter}
                    onChange={(e) => setGearParam('holeDiameter', parseFloat(e.target.value))}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* SECCIÓN 4: SIMULACIÓN CINEMÁTICA Y MONTAJE */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 border-b border-slate-100 pb-2">
            <span>{isRack ? '4 · Cinemática & Montaje del Conjunto' : '4 · Pareja Cinemática'}</span>
          </div>

          {/* En cremallera: Tarjeta destacada de cotas de montaje y cinemática */}
          {isRack && (
            <div className="bg-orange-50/70 border border-orange-200/90 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-orange-800">
                  Cotas Físicas de Montaje
                </span>
                <span className="text-[9px] font-mono text-slate-500">Contacto Tangencial</span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <div className="bg-white p-2 rounded-lg border border-orange-100">
                  <div className="text-[9.5px] text-slate-400">Cota Montaje (H_mont):</div>
                  <div className="font-extrabold text-orange-950 text-sm">{dims.mountingDistance} mm</div>
                  <div className="text-[8.5px] text-slate-400">Base cremallera → eje piñón</div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-orange-100">
                  <div className="text-[9.5px] text-slate-400">Avance / Vuelta:</div>
                  <div className="font-extrabold text-orange-950 text-sm">{dims.feedPerRev} mm</div>
                  <div className="text-[8.5px] text-slate-400">π · dp por revolución</div>
                </div>
              </div>

              <div className="flex justify-between items-baseline font-mono text-[10px] text-slate-600 pt-1 border-t border-orange-200/60">
                <span>Velocidad lineal ({meshingPair.rpm} RPM):</span>
                <span className="font-bold text-slate-900">{dims.linearVelocity} mm/s</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-800 block">
                {isRack ? 'Simular Movimiento Actuador' : 'Acoplar segundo engranaje'}
              </span>
              <span className="text-[10px] text-slate-400">
                {isRack ? 'Anima el desplazamiento lineal conjugado' : 'Comprueba engrane y distancia'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMeshingPair('enabled', !meshingPair.enabled)}
              className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                meshingPair.enabled ? 'bg-orange-500' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  meshingPair.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {meshingPair.enabled && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] text-slate-700">Velocidad del Piñón</span>
                  <span className="font-mono text-xs font-bold text-slate-900">{meshingPair.rpm} RPM</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="80"
                  step="1"
                  value={meshingPair.rpm}
                  onChange={(e) => setMeshingPair('rpm', parseInt(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>

              {!isRack && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] text-slate-700">Dientes Engranaje 2 (z2)</span>
                    <span className="font-mono text-xs font-bold text-slate-900">{meshingPair.teeth2} uds.</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    step="1"
                    value={meshingPair.teeth2}
                    onChange={(e) => setMeshingPair('teeth2', parseInt(e.target.value))}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ÁREA FIJA INFERIOR DE ACCIONES DE EXPORTACIÓN UNIFICADA */}
      <div className="p-3 border-t border-slate-200 bg-white space-y-2 shrink-0">
        {/* Fila 1: Descarga individual STEP y STL */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleExportSTEP(isRack && params.rackViewFocus === 'pinion' ? 'pinion' : 'default')}
            disabled={exportStatus.isExporting}
            className="py-2.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white font-bold text-xs shadow-xs transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed"
            title="Descargar modelo CAD analítico STEP (ISO 10303 - B-Rep)"
          >
            Descargar STEP
          </button>

          <button
            type="button"
            onClick={() => handleExportSTL(isRack && params.rackViewFocus === 'pinion' ? 'pinion' : 'default')}
            disabled={exportStatus.isExporting}
            className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-bold text-xs shadow-xs transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed"
            title="Descargar archivo de malla 3D STL para impresión"
          >
            Descargar STL
          </button>
        </div>

        {/* Fila 2: Descargar Conjunto Completo */}
        <button
          type="button"
          onClick={() => handleExportSTEP('assembly')}
          disabled={exportStatus.isExporting}
          className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] border border-slate-300 text-slate-800 font-bold text-xs shadow-2xs transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed"
          title={
            isRack
              ? 'Descargar conjunto ensamblado completo (Cremallera + Piñón)'
              : 'Descargar conjunto ensamblado completo (Engranaje 1 + Engranaje 2 acoplados)'
          }
        >
          Descargar Conjunto
        </button>
      </div>
    </aside>
  )
}
