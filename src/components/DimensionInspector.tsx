import React from 'react'
import { useGearStore } from '../store/useGearStore'
import { calculateDimensions } from '../cad/gearMath'

export const DimensionInspector: React.FC = () => {
  const params = useGearStore((s) => s.params)
  const meshingPair = useGearStore((s) => s.meshingPair)
  const dims = calculateDimensions(params, meshingPair.enabled ? meshingPair.teeth2 : undefined)

  return (
    <div className="bg-white border-t border-slate-200 px-5 py-2.5 text-xs shrink-0 select-none">
      <div className="flex items-center justify-between mb-2">
        <div className="text-slate-700 font-bold uppercase tracking-wider text-[10px]">
          <span>
            Metrology & Calculated Dimensions · Profile:{' '}
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
              <span className="ml-2 text-slate-400">
                · Mechanism:{' '}
                <span className="text-slate-700 font-bold">
                  {params.rackToothType === 'herringbone'
                    ? 'Herringbone (Chevron) Rack & Pinion'
                    : params.rackToothType === 'helical'
                    ? 'Helical Rack & Pinion'
                    : 'Spur Rack & Pinion'}
                </span>
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-medium">
          {params.gearType === 'rack' && dims.pinionUndercutWarning ? (
            <span className="text-amber-600 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Pinion undercut risk (zp={params.rackPinionTeeth || 20} &lt; {dims.undercutLimitZ})
            </span>
          ) : (
            <span>
              {dims.axialThrustRatio === 0 ? 'Zero axial thrust (Fa = 0)' : 'Progressive helical meshing'}
            </span>
          )}
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
              <div className="bg-orange-50/70 p-2 rounded-lg border border-orange-200">
                <div className="text-orange-700 text-[10px] font-semibold">
                  <span>Center Distance (a{(meshingPair.previewDeltaA ?? 0) !== 0 ? ' + preview' : ''})</span>
                </div>
                <div className="text-xs font-mono font-bold text-orange-900 mt-0.5">
                  {dims.centerDistance != null ? (dims.centerDistance + (meshingPair.previewDeltaA ?? 0)).toFixed(3) : '—'} <span className="text-[10px] font-normal">mm</span>
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
