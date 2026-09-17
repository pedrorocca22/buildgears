import React from 'react'
import { useGearStore } from '../store/useGearStore'
import { calculateDimensions } from '../cad/gearMath'

export const DimensionInspector: React.FC = () => {
  const params = useGearStore((s) => s.params)
  const gear1Params = useGearStore((s) => s.gear1Params)
  const gear2Params = useGearStore((s) => s.gear2Params)
  const gear2Enabled = useGearStore((s) => s.gear2Enabled)
  const selectedGear = useGearStore((s) => s.selectedGear)
  const meshingPair = useGearStore((s) => s.meshingPair)

  const isRack = gear1Params.gearType === 'rack'
  const isPairActive = isRack ? (gear1Params.rackIncludePinion !== false) : gear2Enabled
  const matingGear = isRack
    ? (gear1Params.rackPinionTeeth || 20)
    : isPairActive
    ? (selectedGear === 1 ? gear2Params : gear1Params)
    : undefined

  const dims = calculateDimensions(params, matingGear)

  return (
    <div className="bg-white border-t border-slate-200 px-5 py-2.5 text-xs shrink-0 select-none">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="text-slate-700 font-bold uppercase tracking-wider text-[10px] flex items-center gap-2">
          <span>
            Metrology ·{' '}
            <span className="text-orange-600">
              {params.toothProfileType === 'stub'
                ? 'Stub Tooth (AGMA)'
                : params.toothProfileType === 'deep'
                ? 'High Contact Ratio (HCR)'
                : params.toothProfileType === 'cycloidal'
                ? 'Cycloidal (NIHS)'
                : 'ISO 53 Standard'}
            </span>
            {params.gearType === 'rack' && (
              <span className="ml-1 text-slate-400 font-normal">
                · Mechanism: <span className="text-slate-700 font-bold">{params.rackToothType || 'Spur'}</span>
              </span>
            )}
          </span>
        </div>

        {/* Diagnostic Badges & Health Indicators */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          {/* Contact Ratio Indicator */}
          {dims.contactRatio != null && (
            <span
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold border ${
                dims.contactRatioStatus === 'optimal'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : dims.contactRatioStatus === 'acceptable'
                  ? 'bg-teal-50 text-teal-800 border-teal-200'
                  : dims.contactRatioStatus === 'marginal'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse'
              }`}
              title={`Contact Ratio ε_α = ${dims.contactRatio}. ${
                dims.contactRatioStatus === 'optimal'
                  ? 'Smooth, continuous tooth handover (ε_α ≥ 1.4).'
                  : dims.contactRatioStatus === 'acceptable'
                  ? 'Acceptable industrial meshing (1.2 ≤ ε_α < 1.4).'
                  : dims.contactRatioStatus === 'marginal'
                  ? 'Marginal: risk of tooth impact noise.'
                  : 'Critical: contact interrupted between teeth!'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  dims.contactRatioStatus === 'optimal' || dims.contactRatioStatus === 'acceptable'
                    ? 'bg-emerald-500'
                    : dims.contactRatioStatus === 'marginal'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
              />
              ε_α: {dims.contactRatio}
              {dims.totalContactRatio != null && ` (ε_γ: ${dims.totalContactRatio})`} · {dims.contactRatioStatus}
            </span>
          )}

          {/* Top Land Thickness Indicator */}
          <span
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold border ${
              dims.topLandStatus === 'safe'
                ? 'bg-slate-50 text-slate-700 border-slate-200'
                : dims.topLandStatus === 'warning'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse'
            }`}
            title={`Top Land Thickness s_a = ${dims.topLandThickness} mm. Recommended minimum: 0.25*m = ${dims.minRecommendedTopLand} mm.`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                dims.topLandStatus === 'safe'
                  ? 'bg-emerald-500'
                  : dims.topLandStatus === 'warning'
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
            />
            s_a: {dims.topLandThickness} mm {dims.topLandStatus === 'safe' ? '(Crest Safe)' : '(Pointed Tip Risk)'}
          </span>

          {/* Hunting Tooth Uniform Wear Indicator */}
          {dims.huntingToothStatus && (
            <span
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold border ${
                dims.huntingToothStatus === 'optimal'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
              title={
                dims.huntingToothStatus === 'optimal'
                  ? 'Hunting Tooth Active: gcd(z1, z2) = 1. Every tooth contacts all mating teeth for perfectly uniform wear.'
                  : `Cyclic Repeat: gcd(z1, z2) = ${dims.gcdTeeth}. Local imperfections repeat every ${Math.round((params.teeth || 20) / (dims.gcdTeeth || 1))} cycles.`
              }
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  dims.huntingToothStatus === 'optimal' ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
              />
              {dims.huntingToothStatus === 'optimal' ? 'Uniform Wear (gcd=1)' : `Repeat Cycle (gcd=${dims.gcdTeeth})`}
            </span>
          )}

          {/* Physical Mesh Collision Alert */}
          {dims.hasMeshInterference && (
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-rose-600 text-white border border-rose-700 shadow-xs animate-pulse"
              title={dims.meshInterferenceMessage}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              Collision (+{dims.toothOverlapInterference}mm overlap)
            </span>
          )}

          {/* Operating Center Distance aw */}
          {dims.workingCenterDistanceOffset != null && Math.abs(dims.workingCenterDistanceOffset) > 0.01 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full font-mono bg-blue-50 text-blue-800 border border-blue-200">
              aw: {dims.workingCenterDistance} mm (Δa: {dims.workingCenterDistanceOffset > 0 ? `+${dims.workingCenterDistanceOffset}` : dims.workingCenterDistanceOffset} mm)
            </span>
          )}

          {/* Hertz Contact Stress */}
          {dims.hertzStressMPa != null && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full font-mono bg-slate-50 text-slate-700 border border-slate-200" title={`Hertz Contact Stress: ${dims.hertzStressMPa} MPa, Max sliding: ${dims.maxSlidingVelocity ?? 0.15} m/s`}>
              σ_H: {dims.hertzStressMPa} MPa
            </span>
          )}

          {/* Internal Gear Trochoidal Interference Warning */}
          {dims.internalInterferenceWarning && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-rose-50 text-rose-800 border border-rose-200 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Internal tip interference (Δz &lt; 8)
            </span>
          )}

          {/* Undercut Alert */}
          {dims.hasUndercutWarning && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Root undercut (z &lt; {dims.undercutLimitZ})
            </span>
          )}

          {params.gearType === 'rack' && dims.pinionUndercutWarning && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Pinion undercut (zp &lt; {dims.undercutLimitZ})
            </span>
          )}

          {/* Axial Thrust */}
          <span className="text-slate-400 font-normal ml-1">
            {dims.axialThrustRatio === 0 ? '· Fa = 0' : `· Fa: ${(dims.axialThrustRatio * 100).toFixed(0)}%`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {params.gearType === 'rack' ? (
          <>
            <div className="bg-[#f8fafc] p-2 rounded-lg border border-slate-200/80">
              <div className="text-slate-400 text-[10px]">Bar Length (L)</div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                {params.rackLength || 160} <span className="text-[10px] font-normal text-slate-400">mm</span>
              </div>
            </div>

            <div className="bg-[#f8fafc] p-2 rounded-lg border border-slate-200/80">
              <div className="text-slate-400 text-[10px]">Mounting Height (H_mount)</div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5" title="Distance from rack base to pinion shaft center">
                {dims.mountingDistance} <span className="text-[10px] font-normal text-slate-400">mm</span>
              </div>
            </div>

            <div className="bg-[#f8fafc] p-2 rounded-lg border border-slate-200/80">
              <div className="text-slate-400 text-[10px]">Circular Pitch (p)</div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                {dims.circularPitch} <span className="text-[10px] font-normal text-slate-400">mm</span>
              </div>
            </div>

            <div className="bg-[#f8fafc] p-2 rounded-lg border border-slate-200/80">
              <div className="text-slate-400 text-[10px]">Rack Teeth</div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                {dims.rackToothCount} <span className="text-[10px] font-normal text-slate-400">teeth</span>
              </div>
            </div>

            <div className="bg-[#f8fafc] p-2 rounded-lg border border-slate-200/80">
              <div className="text-slate-400 text-[10px]">Driving Pinion (zp / dp)</div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                {params.rackPinionTeeth || 20}z · Ø{(dims.pinionPitchRadius ? (dims.pinionPitchRadius * 2).toFixed(1) : '0')} <span className="text-[10px] font-normal text-slate-400">mm</span>
              </div>
            </div>

            <div className="bg-orange-50/80 p-2 rounded-lg border border-orange-200">
              <div className="text-orange-700 text-[10px] font-semibold">
                <span>Lead / Revolution</span>
              </div>
              <div className="text-xs font-mono font-extrabold text-orange-900 mt-0.5">
                {dims.feedPerRev} <span className="text-[10px] font-normal text-orange-700">mm</span>
              </div>
            </div>

            <div className="bg-[#f8fafc] p-2 rounded-lg border border-slate-200/80">
              <div className="text-slate-400 text-[10px]">Linear Velocity</div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                {dims.linearVelocity} <span className="text-[10px] font-normal text-slate-400">mm/s</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-[#f8fafc] p-2 rounded-lg border border-slate-200/80">
              <div className="text-slate-400 text-[10px]">Pitch Diameter (d)</div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                {dims.pitchDiameter} <span className="text-[10px] font-normal text-slate-400">mm</span>
              </div>
            </div>

            <div className="bg-[#f8fafc] p-2 rounded-lg border border-slate-200/80">
              <div className="text-slate-400 text-[10px]">Tip Diameter (da)</div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                {dims.tipDiameter} <span className="text-[10px] font-normal text-slate-400">mm</span>
              </div>
            </div>

            <div className="bg-[#f8fafc] p-2 rounded-lg border border-slate-200/80">
              <div className="text-slate-400 text-[10px]">Root Diameter (df)</div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                {dims.rootDiameter} <span className="text-[10px] font-normal text-slate-400">mm</span>
              </div>
            </div>

            <div className="bg-[#f8fafc] p-2 rounded-lg border border-slate-200/80">
              <div className="text-slate-400 text-[10px]">Base Diameter (db)</div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                {dims.baseDiameter} <span className="text-[10px] font-normal text-slate-400">mm</span>
              </div>
            </div>

            <div className="bg-[#f8fafc] p-2 rounded-lg border border-slate-200/80">
              <div className="text-slate-400 text-[10px]">Circular Pitch (p)</div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                {dims.circularPitch} <span className="text-[10px] font-normal text-slate-400">mm</span>
              </div>
            </div>

            <div className="bg-[#f8fafc] p-2 rounded-lg border border-slate-200/80">
              <div className="text-slate-400 text-[10px]">Tooth Thickness (s)</div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                {dims.normalToothThickness} <span className="text-[10px] font-normal text-slate-400">mm</span>
              </div>
            </div>

            {meshingPair.enabled ? (
              <div className={`p-2 rounded-lg border ${
                dims.hasMeshInterference
                  ? 'bg-rose-50 border-rose-300 text-rose-950'
                  : 'bg-orange-50/70 border-orange-200'
              }`}>
                <div className={`${dims.hasMeshInterference ? 'text-rose-700 font-bold' : 'text-orange-700'} text-[10px] font-semibold flex items-center justify-between`}>
                  <span>{dims.workingCenterDistanceOffset && Math.abs(dims.workingCenterDistanceOffset) > 0.01 ? 'Dist. Operativa (aw)' : 'Center Dist (a)'}</span>
                  {dims.hasMeshInterference && <span className="text-[8.5px] bg-rose-600 text-white px-1 rounded font-bold animate-pulse">COLLISION</span>}
                </div>
                <div className={`text-xs font-mono font-bold ${dims.hasMeshInterference ? 'text-rose-950' : 'text-orange-900'} mt-0.5`}>
                  {(dims.workingCenterDistance || dims.centerDistance != null)
                    ? ((dims.workingCenterDistance || dims.centerDistance!) + (meshingPair.previewDeltaA ?? 0)).toFixed(3)
                    : '—'}{' '}
                  <span className="text-[10px] font-normal">mm</span>
                </div>
              </div>
            ) : (
              <div className="bg-[#f8fafc] p-2 rounded-lg border border-slate-200/80">
                <div className="text-slate-400 text-[10px]">Helix Twist (β)</div>
                <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                  {dims.twistAngleDeg}°
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  )
}
