import React from 'react'
import { useGearStore } from '../store/useGearStore'
import { getDIN6885Keyway } from '../cad/din6885'
import { getDIN912Screw } from '../cad/din912'
import { calculateDimensions } from '../cad/gearMath'
import { BacklashPanel } from './BacklashPanel'

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
    ? 'Herringbone Rack & Pinion'
    : params.rackToothType === 'helical'
    ? 'Helical Rack & Pinion'
    : 'Spur Rack & Pinion'

  const gearTitleMap: Record<string, string> = {
    spur: 'Spur Gear',
    helical: 'Helical Gear',
    herringbone: 'Herringbone Gear',
    internal: 'Internal Ring Gear',
    rack: rackToothTitle,
    bevel: 'Bevel Gear',
  }

  // Unified modal trigger for download
  const handleExportSTEP = (target: 'default' | 'rack' | 'pinion' | 'assembly' = 'default') => {
    openExportModal('step', target)
  }

  const handleExportSTL = (target: 'default' | 'rack' | 'pinion' | 'assembly' = 'default') => {
    openExportModal('stl', target)
  }

  return (
    <aside className="w-84 bg-[#fbfcfd] border-l border-slate-200 flex flex-col h-full select-none shrink-0 text-slate-800">
      {/* Parametric object header */}
      <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold text-slate-900 leading-tight">
            {gearTitleMap[params.gearType] || 'Gear'}
          </h2>
          <p className="text-[10px] text-slate-400">
            {isRack ? 'Coupled Kinematic Mechanism' : 'Parametric CAD / CNC Model'}
          </p>
        </div>

        <button
          onClick={resetCurrentGear}
          title="Reset to default parameters"
          className="px-2 py-1 rounded-md text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Controls container with scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
        {/* RACK & PINION VIEWPORT FOCUS */}
        {isRack && (
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-800">3D Viewport Focus</span>
              <span className="text-[9.5px] text-slate-400 font-mono">
                {params.rackViewFocus === 'pinion' ? 'Pinion Only' : params.rackViewFocus === 'rack' ? 'Rack Only' : 'Assembly'}
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
                Assembly
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
                Rack
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
                Pinion
              </button>
            </div>
          </div>
        )}

        {/* SECTION 1: SHARED CONJUGATE PHYSICS / KINEMATIC PROFILE */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5">
              <span>{isRack ? '1 · Shared Conjugate Physics' : '1 · Teeth & Kinematic Profile'}</span>
            </div>
            {isRack && (
              <span className="text-[9px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">
                Willis' Law
              </span>
            )}
          </div>

          {/* Rack tooth type selector */}
          {isRack && (
            <div>
              <span className="text-[11px] font-medium text-slate-700 block mb-1.5">Coupled Kinematic Gearing</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'spur', label: 'Spur', desc: 'Fa = 0 N' },
                  { id: 'helical', label: 'Helical', desc: 'Quiet' },
                  { id: 'herringbone', label: 'Herringbone', desc: 'Fa = 0 · Chevron' },
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

          {/* Tooth Profile Standard Selector */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[11px] font-medium text-slate-700">Tooth Standard</span>
              <span className="text-[10px] text-orange-600 font-bold">
                {params.toothProfileType === 'stub'
                  ? 'Stub AGMA'
                  : params.toothProfileType === 'deep'
                  ? 'Deep HCR'
                  : params.toothProfileType === 'cycloidal'
                  ? 'Cycloidal NIHS'
                  : params.toothProfileType === 'custom'
                  ? 'Custom'
                  : 'ISO 53'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'standard', label: 'ISO 53' },
                { id: 'stub', label: 'Stub' },
                { id: 'deep', label: 'Deep HCR' },
                { id: 'cycloidal', label: 'Cycloidal' },
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
              {(params.toothProfileType || 'standard') === 'standard' && 'ISO 53 / DIN 867 standard. Exact conjugate involute between flat and evolute flanks.'}
              {params.toothProfileType === 'stub' && 'AGMA 201.02 stub tooth (+30% root bending fatigue strength).'}
              {params.toothProfileType === 'deep' && 'High contact ratio (HCR) deep tooth (ε > 2.0). Ultra-quiet rolling mesh.'}
              {params.toothProfileType === 'cycloidal' && 'Horological cycloidal profile (DIN 58400 / NIHS). Pure rolling without sliding.'}
            </p>
          </div>

          {/* Shared Normal Module (mn) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-medium text-slate-700">Normal Module (m_n)</span>
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
                  Changing the module updates rack pitch (<b>{dims.circularPitch} mm</b>) and pinion diameter (<b>{(dims.pinionPitchRadius ? dims.pinionPitchRadius * 2 : 0).toFixed(1)} mm</b>) in real time.
                </span>
              </div>
            )}
          </div>

          {/* Pressure Angle */}
          <div>
            <span className="text-[11px] font-medium text-slate-700 block mb-1.5">Normal Pressure Angle (α_n)</span>
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

          {/* Helix Angle (for helical, helical rack, or herringbone) */}
          {(isHelical || (isRack && params.rackToothType !== 'spur')) && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-medium text-slate-700">
                  {isHerringbone ? 'Herringbone Chevron Angle (β)' : 'Helix Angle (β)'}
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
                  <span className="font-semibold">Zero net axial force (Fa = 0)</span>
                  <span className="font-bold text-emerald-600 text-[9px] uppercase tracking-wide">Self-Centering V-Chevron</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500">Rack helix hand:</span>
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
                      Right Hand (RH)
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
                      Left Hand (LH)
                    </button>
                  </div>
                  {isRack && (
                    <p className="text-[9.5px] text-slate-400 leading-tight pt-1">
                      * Pinion automatically adopts the complementary opposite hand ({params.helixHand === 'right' ? 'LH' : 'RH'}) for a 180° conjugate mesh.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Non-rack standard teeth count & profile shift */}
          {!isRack && (
            <>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-medium text-slate-700">Number of Teeth (z)</span>
                  <span className="font-mono text-xs font-bold text-slate-900">{params.teeth} teeth</span>
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
                  <span>8 teeth</span>
                  <span>120 teeth</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-medium text-slate-700">Profile Shift (x)</span>
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
                      Root undercut risk (z &lt; {dims.undercutLimitZ})
                    </div>
                    <button
                      type="button"
                      onClick={() => setGearParam('profileShift', dims.recommendedShift)}
                      className="mt-1 w-full py-1 px-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] shadow-xs transition-colors"
                    >
                      Auto-correct to x = +{dims.recommendedShift.toFixed(2)}
                    </button>
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-medium text-slate-700">Face Width (b)</span>
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

              {/* Parametric Tooth Chamfer (45°) */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-800 block">Tooth Chamfer (45°)</span>
                    <span className="text-[10px] text-slate-400">Bevel on front and rear axial faces</span>
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
                      <span className="text-[10px] text-slate-600">Chamfer Size (c)</span>
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
                      <span className="text-slate-500 font-medium">45° deburring bevel</span>
                      <span>{Math.min(3.0, Number((params.faceWidth * 0.35).toFixed(1)))} mm</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* SECTION 2: GEAR RACK BAR */}
        {isRack && (
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 border-b border-slate-100 pb-2">
              <span>2 · Gear Rack Bar</span>
            </div>

            {/* Total Bar Length (L) */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-medium text-slate-700">Total Bar Length (L)</span>
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

            {/* Bar Height (H) */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-medium text-slate-700">Bar Height (H)</span>
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

            {/* Rack Width (b_rack) */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-medium text-slate-700">Rack Width (b_rack)</span>
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

            {/* Tooth Chamfer (45°) */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-800 block">Tooth Chamfer (45°)</span>
                  <span className="text-[10px] text-slate-400">Chamfer along bar axial edges</span>
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
                    <span className="text-[10px] text-slate-600">Chamfer Size (c)</span>
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
                    <span className="text-slate-500 font-medium">45° tooth chamfer</span>
                    <span>{Math.min(3.0, Number((params.faceWidth * 0.35).toFixed(1)))} mm</span>
                  </div>
                </div>
              )}
            </div>

            {/* Mounting Holes */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-800 block">Mounting Holes</span>
                  <span className="text-[10px] text-slate-400">Counterbored for DIN 912 socket head screws</span>
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
                    <span className="text-[11px] font-medium text-slate-700 block mb-1">Screw Thread Size</span>
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
                    <span className="text-[11px] font-medium text-slate-700 block mb-1">Mounting Orientation</span>
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
                        Bottom (Base)
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
                        Side (Face)
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-medium text-slate-700">Number of Holes</span>
                      <span className="font-mono text-xs font-bold text-slate-900">{params.rackHoleCount || 3} holes</span>
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
                      <span>Through drill:</span>
                      <span className="font-bold text-slate-800">Ø {dinScrew.throughHoleDia} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span>DIN 912 counterbore:</span>
                      <span className="font-bold text-slate-800">Ø {dinScrew.counterboreDia} mm (h={dinScrew.counterboreDepth}mm)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 3: CONJUGATE DRIVE PINION */}
        {isRack && (
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <span>3 · Conjugate Drive Pinion</span>
              </div>
              <span className="text-[9px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">
                zp = {params.rackPinionTeeth || 20}
              </span>
            </div>

            {/* Include Pinion in Mechanism */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-800 block">Include Pinion in Mechanism</span>
                <span className="text-[10px] text-slate-400">Calculates and positions the mating pinion</span>
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
                {/* Pinion Teeth (z_p) */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-medium text-slate-700">Pinion Teeth (z_p)</span>
                    <span className="font-mono text-xs font-bold text-slate-900">{params.rackPinionTeeth || 20} teeth</span>
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
                    <span>10 teeth</span>
                    <span>60 teeth</span>
                  </div>
                </div>

                {/* Pinion Profile Shift (x_p) */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-1">
                    <div>
                      <span className="text-[11px] font-medium text-slate-700 block">Pinion Profile Shift (x_p)</span>
                      <span className="text-[9.5px] text-slate-400">Corrects undercut and shifts operating Y axis</span>
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

                  {/* Pinion root undercut warning */}
                  {dims.pinionUndercutWarning && (
                    <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[10px] space-y-1.5">
                      <div className="font-bold text-amber-800">
                        Pinion root undercut risk (zp &lt; {dims.undercutLimitZ})
                      </div>
                      <div className="text-slate-600 text-[9.5px]">
                        With {params.rackPinionTeeth || 20} teeth, undercut occurs unless an x_p shift is applied.
                      </div>
                      <button
                        type="button"
                        onClick={() => setGearParam('rackPinionProfileShift', dims.pinionRecommendedShift)}
                        className="w-full py-1 px-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] shadow-xs transition-colors"
                      >
                        Auto-correct pinion profile to x_p = +{(dims.pinionRecommendedShift || 0).toFixed(2)}
                      </button>
                    </div>
                  )}
                </div>

                {/* Pinion Center Bore */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-800 block">Pinion Center Bore</span>
                      <span className="text-[10px] text-slate-400">
                        {(params.rackPinionBore ?? 0) > 0
                          ? `Shaft Ø ${params.rackPinionBore} mm`
                          : 'Solid (no center bore)'}
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
                        <span className="text-[10px] text-slate-600">Pinion Bore Diameter (d)</span>
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

                {/* Pinion Width (b_pinion) */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-medium text-slate-700">Pinion Width (b_pinion)</span>
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
                      Sync with rack ({params.faceWidth} mm)
                    </button>
                    <span>80 mm</span>
                  </div>
                </div>

                {/* Tooth Chamfer (45°) */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-800 block">Tooth Chamfer (45°)</span>
                      <span className="text-[10px] text-slate-400">Chamfer on pinion axial faces</span>
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
                        <span className="text-[10px] text-slate-600">Pinion Chamfer Size (c)</span>
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
                        <span className="text-slate-500 font-medium">45° deburring bevel</span>
                        <span>{Math.min(3.0, Number(((params.rackPinionFaceWidth || params.faceWidth) * 0.35).toFixed(1)))} mm</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pinion Body Style */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="text-[11px] font-medium text-slate-700 block">Pinion Body Style</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'solid', label: 'Solid Flat' },
                      { id: 'hub', label: 'With Hub' },
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
                        <span className="text-[10px] text-slate-600">Hub Diameter</span>
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
                        <span className="text-[10px] text-slate-600">Hub Offset</span>
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

                {/* Pinion Keyway */}
                {(params.rackPinionBore ?? 0) > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-800 block">Pinion Keyway</span>
                        <span className="text-[10px] text-slate-400">
                          {params.rackPinionKeywayCustom ? 'Custom manual dimensions' : 'Standard automatic dimensions'}
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
                            Keyway Design
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
                                <span className="text-slate-700 font-medium">Keyway width (b)</span>
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
                                <span className="text-slate-700 font-medium">Hub keyway depth (t₂)</span>
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
                                Reset to DIN 6885 standard
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

        {/* SECTION 2 & 3 FOR NORMAL GEARS */}
        {!isRack && (
          <>
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 border-b border-slate-100 pb-2">
                <span>2 · Shaft Bore & DIN 6885 Keyway</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  params.boreDiameter > 0
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {params.boreDiameter > 0 ? `Ø ${params.boreDiameter} mm` : 'Solid'}
                </span>
              </div>

              {/* Center shaft bore toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-800 block">Center Shaft Bore</span>
                  <span className="text-[10px] text-slate-400">
                    {params.boreDiameter > 0 ? 'Cylindrical through hole' : 'Disabled (solid blind gear)'}
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
                      <span className="text-[11px] font-medium text-slate-700">Shaft Bore Diameter (d)</span>
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
                        <span className="text-[11px] font-semibold text-slate-800 block">DIN 6885-1 Keyway</span>
                        <span className="text-[10px] text-slate-400">
                          {params.keywayCustom ? 'Custom manual dimensions' : 'Standard automatic dimensions'}
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
                        {/* Keyway selector: DIN 6885 vs Manual */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider">
                            Keyway Design
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
                            {/* Keyway width (b) */}
                            <div>
                              <div className="flex justify-between items-center mb-0.5 text-[10px]">
                                <span className="text-slate-700 font-medium">Keyway width (b)</span>
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

                            {/* Hub keyway depth (t2) */}
                            <div>
                              <div className="flex justify-between items-center mb-0.5 text-[10px]">
                                <span className="text-slate-700 font-medium">Hub keyway depth (t₂)</span>
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
                                Reset to DIN 6885 standard
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
                  <span>No center bore. Continuous solid core.</span>
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 border-b border-slate-100 pb-2">
                <span>3 · Body & Weight Reduction</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  params.bodyStyle === 'solid'
                    ? 'bg-slate-100 text-slate-600'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {params.bodyStyle === 'solid' ? 'Solid' : params.bodyStyle === 'hub' ? 'Hub' : 'Spokes'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'solid', label: 'Solid' },
                  { id: 'hub', label: 'With Hub' },
                  { id: 'spoke', label: 'Spoke Cutouts' },
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
                  <span>Continuous solid body without cutouts or voids.</span>
                </div>
              )}

              {params.bodyStyle === 'hub' && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-700">Hub Diameter</span>
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
                    <span className="text-[11px] text-slate-700">Spoke Cutouts</span>
                    <span className="font-mono text-xs font-bold text-slate-900">{params.holeCount} holes</span>
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
                    <span className="text-[11px] text-slate-700">Cutout Diameter</span>
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

        {/* SECTION 4: KINEMATICS & ASSEMBLY */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 border-b border-slate-100 pb-2">
            <span>{isRack ? '4 · Kinematics & Assembly' : '4 · Kinematic Meshing Pair'}</span>
          </div>

          {/* In rack: Highlight card for mounting dimensions and kinematics */}
          {isRack && (
            <div className="bg-orange-50/70 border border-orange-200/90 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-orange-800">
                  Mounting Dimensions
                </span>
                <span className="text-[9px] font-mono text-slate-500">Pitch Tangency</span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <div className="bg-white p-2 rounded-lg border border-orange-100">
                  <div className="text-[9.5px] text-slate-400">Mounting Distance (H_mont):</div>
                  <div className="font-extrabold text-orange-950 text-sm">{dims.mountingDistance} mm</div>
                  <div className="text-[8.5px] text-slate-400">Rack base → pinion center</div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-orange-100">
                  <div className="text-[9.5px] text-slate-400">Feed per Rev:</div>
                  <div className="font-extrabold text-orange-950 text-sm">{dims.feedPerRev} mm</div>
                  <div className="text-[8.5px] text-slate-400">π · d_p per revolution</div>
                </div>
              </div>

              <div className="flex justify-between items-baseline font-mono text-[10px] text-slate-600 pt-1 border-t border-orange-200/60">
                <span>Linear speed ({meshingPair.rpm} RPM):</span>
                <span className="font-bold text-slate-900">{dims.linearVelocity} mm/s</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-800 block">
                {isRack ? 'Simulate Linear Actuator' : 'Couple Mating Gear'}
              </span>
              <span className="text-[10px] text-slate-400">
                {isRack ? 'Animates conjugate linear translation' : 'Inspect mesh & center distance'}
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
                  <span className="text-[11px] text-slate-700">Pinion Speed</span>
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
                    <span className="text-[11px] text-slate-700">Mating Gear Teeth (z2)</span>
                    <span className="font-mono text-xs font-bold text-slate-900">{meshingPair.teeth2} teeth</span>
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

              {!isRack && (
                <BacklashPanel
                  params={params}
                  teeth2={meshingPair.teeth2}
                  onApplyThinning={(v) => setGearParam('backlash', v)}
                  previewDeltaA={meshingPair.previewDeltaA ?? null}
                  onPreview={(d) => setMeshingPair('previewDeltaA', d)}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* FIXED BOTTOM ACTIONS */}
      <div className="p-3 border-t border-slate-200 bg-white space-y-2 shrink-0">
        {/* Row 1: STEP & STL */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleExportSTEP(isRack && params.rackViewFocus === 'pinion' ? 'pinion' : 'default')}
            disabled={exportStatus.isExporting}
            className="py-2.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white font-bold text-xs shadow-xs transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download analytic STEP CAD model (ISO 10303 - B-Rep)"
          >
            Download STEP
          </button>

          <button
            type="button"
            onClick={() => handleExportSTL(isRack && params.rackViewFocus === 'pinion' ? 'pinion' : 'default')}
            disabled={exportStatus.isExporting}
            className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-bold text-xs shadow-xs transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download 3D mesh STL file for 3D printing"
          >
            Download STL
          </button>
        </div>

        {/* Row 2: Download Full Assembly */}
        <button
          type="button"
          onClick={() => handleExportSTEP('assembly')}
          disabled={exportStatus.isExporting}
          className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] border border-slate-300 text-slate-800 font-bold text-xs shadow-2xs transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed"
          title={
            isRack
              ? 'Download complete assembly (Rack + Pinion)'
              : 'Download complete assembly (Gear 1 + Gear 2 coupled)'
          }
        >
          Download Assembly
        </button>
      </div>
    </aside>
  )
}
