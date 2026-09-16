import React, { useState } from 'react'
import { useGearStore } from '../store/useGearStore'
import { getDIN6885Keyway } from '../cad/din6885'
import {
  Sliders,
  Disc,
  CircleDot,
  Layers,
  Wrench,
  Sparkles,
} from 'lucide-react'

export const Sidebar: React.FC = () => {
  const params = useGearStore((s) => s.params)
  const setGearParam = useGearStore((s) => s.setGearParam)
  const meshingPair = useGearStore((s) => s.meshingPair)
  const setMeshingPair = useGearStore((s) => s.setMeshingPair)
  const loadPreset = useGearStore((s) => s.loadPreset)

  const [activeTab, setActiveTab] = useState<'teeth' | 'bore' | 'body' | 'meshing' | 'presets'>('teeth')

  const isHelical = params.gearType === 'helical' || params.gearType === 'herringbone'
  const isRack = params.gearType === 'rack'

  const standardKeyway = getDIN6885Keyway(params.boreDiameter)

  return (
    <aside className="w-80 md:w-88 bg-[#121824] border-r border-white/10 flex flex-col h-full select-none text-slate-200">
      {/* Selector de pestañas */}
      <div className="flex border-b border-white/10 bg-[#0f141d] p-1 gap-1">
        <button
          onClick={() => setActiveTab('teeth')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'teeth' ? 'bg-[#1e293b] text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:bg-white/5'
          }`}
          title="Parámetros del Diente e Involuta"
        >
          <Disc className="w-3.5 h-3.5" />
          <span>Dientes</span>
        </button>

        <button
          onClick={() => setActiveTab('bore')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'bore' ? 'bg-[#1e293b] text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:bg-white/5'
          }`}
          title="Taladro de Eje y Chavetero"
        >
          <CircleDot className="w-3.5 h-3.5" />
          <span>Eje</span>
        </button>

        <button
          onClick={() => setActiveTab('body')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'body' ? 'bg-[#1e293b] text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:bg-white/5'
          }`}
          title="Cuerpo, Buje y Aligeramientos"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Cuerpo</span>
        </button>

        <button
          onClick={() => setActiveTab('meshing')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'meshing' ? 'bg-[#1e293b] text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:bg-white/5'
          }`}
          title="Engrane y Cinemática Conjugada"
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Engrane</span>
        </button>
      </div>

      {/* Contenido de la pestaña con scroll suave */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* PESTAÑA 1: DIENTES E INVOLUTA */}
        {activeTab === 'teeth' && (
          <div className="space-y-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              <span>Geometría del Diente</span>
            </div>

            {/* Módulo (m) */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-300">Módulo Normal (m)</span>
                <span className="font-mono text-cyan-400 font-bold">{params.module} mm</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="8.0"
                step="0.1"
                value={params.module}
                onChange={(e) => setGearParam('module', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0.5 mm</span>
                <span>8.0 mm</span>
              </div>
            </div>

            {/* Número de dientes (z) */}
            {!isRack && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-300">Número de Dientes (z)</span>
                  <span className="font-mono text-cyan-400 font-bold">{params.teeth}</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="120"
                  step="1"
                  value={params.teeth}
                  onChange={(e) => setGearParam('teeth', parseInt(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>8</span>
                  <span>120 dientes</span>
                </div>
              </div>
            )}

            {/* Ángulo de Presión (alpha) */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-300">Ángulo de Presión (α)</span>
                <span className="font-mono text-cyan-400 font-bold">{params.pressureAngle}°</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                {[14.5, 20.0, 25.0].map((deg) => (
                  <button
                    key={deg}
                    onClick={() => setGearParam('pressureAngle', deg)}
                    className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      params.pressureAngle === deg
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-[#182233] border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>

            {/* Ángulo de Hélice (beta) - Solo para helicoidal o espiga */}
            {isHelical && (
              <div className="p-3 bg-[#182233] rounded-xl border border-cyan-500/20 space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-200">Ángulo de Hélice (β)</span>
                    <span className="font-mono text-cyan-400 font-bold">{params.helixAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="45"
                    step="1"
                    value={params.helixAngle}
                    onChange={(e) => setGearParam('helixAngle', parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <span className="font-semibold text-slate-300 block mb-1">Sentido de Hélice</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setGearParam('helixHand', 'right')}
                      className={`py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        params.helixHand === 'right'
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                          : 'bg-[#0f141d] border-white/5 text-slate-400'
                      }`}
                    >
                      Derecha (RH)
                    </button>
                    <button
                      onClick={() => setGearParam('helixHand', 'left')}
                      className={`py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        params.helixHand === 'left'
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                          : 'bg-[#0f141d] border-white/5 text-slate-400'
                      }`}
                    >
                      Izquierda (LH)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Anchura de cara / Espesor (b) */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-300">Anchura de Cara (b)</span>
                <span className="font-mono text-cyan-400 font-bold">{params.faceWidth} mm</span>
              </div>
              <input
                type="range"
                min="5"
                max="80"
                step="1"
                value={params.faceWidth}
                onChange={(e) => setGearParam('faceWidth', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Desplazamiento de perfil (x) */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-300">Corrección de Perfil (x)</span>
                <span className="font-mono text-cyan-400 font-bold">{params.profileShift.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="-0.5"
                max="0.5"
                step="0.05"
                value={params.profileShift}
                onChange={(e) => setGearParam('profileShift', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Juego entre dientes / Backlash (j) */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-300">Juego / Backlash (j)</span>
                <span className="font-mono text-cyan-400 font-bold">{params.backlash} mm</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.4"
                step="0.01"
                value={params.backlash}
                onChange={(e) => setGearParam('backlash', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* PESTAÑA 2: EJE Y CHAVETERO */}
        {activeTab === 'bore' && (
          <div className="space-y-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <CircleDot className="w-3.5 h-3.5" />
              <span>Mecanizado del Eje y Chavetero</span>
            </div>

            {/* Diámetro de Taladro (Bore) */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-300">Diámetro del Eje (d_eje)</span>
                <span className="font-mono text-cyan-400 font-bold">{params.boreDiameter} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                step="1"
                value={params.boreDiameter}
                onChange={(e) => setGearParam('boreDiameter', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0 mm (Ciego)</span>
                <span>60 mm</span>
              </div>
            </div>

            {/* Chavetero DIN 6885 */}
            {params.boreDiameter > 6 && (
              <div className="p-3 bg-[#182233] rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-200 block">Chavetero DIN 6885-1</span>
                    <span className="text-[10px] text-slate-400">Normalizado según Ø del eje</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={params.hasKeyway}
                    onChange={(e) => setGearParam('hasKeyway', e.target.checked)}
                    className="w-4 h-4 rounded accent-cyan-500 cursor-pointer"
                  />
                </div>

                {params.hasKeyway && (
                  <div className="space-y-2 pt-2 border-t border-white/5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Ancho chaveta (b):</span>
                      <span className="font-mono text-slate-200 font-semibold">{standardKeyway.b} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Altura chaveta (h):</span>
                      <span className="font-mono text-slate-200 font-semibold">{standardKeyway.h} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Profundidad en buje (t2):</span>
                      <span className="font-mono text-cyan-300 font-semibold">{standardKeyway.t2} mm</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 3: CUERPO Y ALIGERAMIENTOS */}
        {activeTab === 'body' && (
          <div className="space-y-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Configuración del Cuerpo</span>
            </div>

            {/* Estilo del cuerpo */}
            <div>
              <span className="font-semibold text-slate-300 block mb-1.5">Diseño del Cuerpo</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'solid', label: 'Macizo' },
                  { id: 'hub', label: 'Con Buje' },
                  { id: 'spoke', label: 'Aligerado' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setGearParam('bodyStyle', st.id as any)}
                    className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      params.bodyStyle === st.id
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-[#182233] border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Opciones de Buje (Hub) */}
            {(params.bodyStyle === 'hub' || params.bodyStyle === 'spoke') && (
              <div className="p-3 bg-[#182233] rounded-xl border border-white/10 space-y-3">
                <span className="font-semibold text-slate-200 block text-xs">Dimensiones del Buje</span>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-400">Diámetro Buje (Ø)</span>
                    <span className="font-mono text-cyan-400 font-semibold">{params.hubDiameter} mm</span>
                  </div>
                  <input
                    type="range"
                    min={params.boreDiameter + 4}
                    max="100"
                    step="1"
                    value={params.hubDiameter}
                    onChange={(e) => setGearParam('hubDiameter', parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-400">Saliente Lateral</span>
                    <span className="font-mono text-cyan-400 font-semibold">{params.hubOffset} mm</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={params.hubOffset}
                    onChange={(e) => setGearParam('hubOffset', parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Opciones de Aligeramiento (Spoke / Web holes) */}
            {params.bodyStyle === 'spoke' && (
              <div className="p-3 bg-[#182233] rounded-xl border border-white/10 space-y-3">
                <span className="font-semibold text-slate-200 block text-xs">Orificios de Aligeramiento</span>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-400">Cantidad de Agujeros</span>
                    <span className="font-mono text-cyan-400 font-semibold">{params.holeCount}</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="8"
                    step="1"
                    value={params.holeCount}
                    onChange={(e) => setGearParam('holeCount', parseInt(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-400">Diámetro Agujero (Ø)</span>
                    <span className="font-mono text-cyan-400 font-semibold">{params.holeDiameter} mm</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="25"
                    step="1"
                    value={params.holeDiameter}
                    onChange={(e) => setGearParam('holeDiameter', parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-400">Radio de Distribución</span>
                    <span className="font-mono text-cyan-400 font-semibold">{params.holeCircleRadius} mm</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="80"
                    step="1"
                    value={params.holeCircleRadius}
                    onChange={(e) => setGearParam('holeCircleRadius', parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 4: ENGRANE Y CINEMÁTICA CONJUGADA */}
        {activeTab === 'meshing' && (
          <div className="space-y-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" />
              <span>Simulación de Pareja Cinemática</span>
            </div>

            <div className="p-3 bg-[#102a27]/60 rounded-xl border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-emerald-300 block">Acoplar Segundo Engranaje</span>
                  <span className="text-[10px] text-slate-400">Verifica distancia y engrane</span>
                </div>
                <input
                  type="checkbox"
                  checked={meshingPair.enabled}
                  onChange={(e) => setMeshingPair('enabled', e.target.checked)}
                  className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                />
              </div>

              {meshingPair.enabled && (
                <div className="space-y-3 pt-2 border-t border-emerald-500/20">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-slate-300">Dientes Engranaje 2 (z2)</span>
                      <span className="font-mono text-emerald-400 font-bold">{meshingPair.teeth2}</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="60"
                      step="1"
                      value={meshingPair.teeth2}
                      onChange={(e) => setMeshingPair('teeth2', parseInt(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-slate-300">Velocidad de Giro</span>
                      <span className="font-mono text-emerald-400 font-bold">{meshingPair.rpm} RPM</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="120"
                      step="5"
                      value={meshingPair.rpm}
                      onChange={(e) => setMeshingPair('rpm', parseInt(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400 text-[11px]">Mostrar Línea de Centros</span>
                    <input
                      type="checkbox"
                      checked={meshingPair.showCenterLine}
                      onChange={(e) => setMeshingPair('showCenterLine', e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Presets Rápidos */}
            <div className="pt-2">
              <span className="font-semibold text-slate-300 block mb-2 text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Presets de Configuración Rápida</span>
              </span>
              <div className="space-y-1.5">
                <button
                  onClick={() => loadPreset('default_spur')}
                  className="w-full text-left px-3 py-2 rounded-lg bg-[#182233] hover:bg-[#1f2b40] border border-white/5 text-xs text-slate-300 transition-colors"
                >
                  <div className="font-semibold text-cyan-300">Engranaje Recto Estándar</div>
                  <div className="text-[10px] text-slate-400">m=2.5, z=26, chavetero DIN 6885</div>
                </button>
                <button
                  onClick={() => loadPreset('fast_helical')}
                  className="w-full text-left px-3 py-2 rounded-lg bg-[#182233] hover:bg-[#1f2b40] border border-white/5 text-xs text-slate-300 transition-colors"
                >
                  <div className="font-semibold text-cyan-300">Helicoidal de Alta Velocidad</div>
                  <div className="text-[10px] text-slate-400">m=2.0, z=32, β=22°, con buje</div>
                </button>
                <button
                  onClick={() => loadPreset('heavy_herringbone')}
                  className="w-full text-left px-3 py-2 rounded-lg bg-[#182233] hover:bg-[#1f2b40] border border-white/5 text-xs text-slate-300 transition-colors"
                >
                  <div className="font-semibold text-cyan-300">Doble Hélice / Espiga Reforzada</div>
                  <div className="text-[10px] text-slate-400">m=3.0, z=24, β=30°, aligerado</div>
                </button>
                <button
                  onClick={() => loadPreset('spoke_drive')}
                  className="w-full text-left px-3 py-2 rounded-lg bg-[#182233] hover:bg-[#1f2b40] border border-white/5 text-xs text-slate-300 transition-colors"
                >
                  <div className="font-semibold text-cyan-300">Rueda Con Aligeramiento</div>
                  <div className="text-[10px] text-slate-400">m=3.5, z=36, 6 orificios web</div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
