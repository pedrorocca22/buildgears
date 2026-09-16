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
            Metrología & Dimensiones Calculadas · Perfil:{' '}
            <span className="text-orange-600">
              {params.toothProfileType === 'stub'
                ? 'Diente Corto (Stub AGMA)'
                : params.toothProfileType === 'deep'
                ? 'Diente Alto (HCR)'
                : params.toothProfileType === 'cycloidal'
                ? 'Cicloidal (NIHS)'
                : 'ISO 53 Estándar'}
            </span>
            {params.gearType === 'rack' && (
              <span className="ml-2 text-slate-400">
                · Mecanismo:{' '}
                <span className="text-slate-700 font-bold">
                  {params.rackToothType === 'herringbone'
                    ? 'Piñón & Cremallera Espiga (Chevron)'
                    : params.rackToothType === 'helical'
                    ? 'Piñón & Cremallera Helicoidal'
                    : 'Piñón & Cremallera Recta'}
                </span>
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-medium">
          {params.gearType === 'rack' && dims.pinionUndercutWarning ? (
            <span className="text-amber-600 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Riesgo socavado en piñón (zp={params.rackPinionTeeth || 20} &lt; {dims.undercutLimitZ})
            </span>
          ) : (
            <span>
              {dims.axialThrustRatio === 0 ? 'Empuje axial nulo (Fa = 0)' : 'Marcha helicoidal progresiva'}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {params.gearType === 'rack' ? (
          <>
            <div className="bg-[#f8fafc] p-2 rounded-lg border border-slate-200/80">
              <div className="text-slate-400 text-[10px]">Longitud Barra (L)</div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                {params.rackLength || 160} <span className="text-[10px] font-normal text-slate-400">mm</span>
              </div>
            </div>

            <div className="bg-[#f8fafc] p-2 rounded-lg border border-slate-200/80">
              <div className="text-slate-400 text-[10px]">Cota Montaje (H_mont)</div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5" title="Distancia desde la base de la cremallera al centro del eje del piñón">
                {dims.mountingDistance} <span className="text-[10px] font-normal text-slate-400">mm</span>
              </div>
            </div>

            <div className="bg-[#f8fafc] p-2 rounded-lg border border-slate-200/80">
              <div className="text-slate-400 text-[10px]">Paso Circular (p)</div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                {dims.circularPitch} <span className="text-[10px] font-normal text-slate-400">mm</span>
              </div>
            </div>

            <div className="bg-[#f8fafc] p-2 rounded-lg border border-slate-200/80">
              <div className="text-slate-400 text-[10px]">Dientes Cremallera</div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                {dims.rackToothCount} <span className="text-[10px] font-normal text-slate-400">uds.</span>
              </div>
            </div>

            <div className="bg-[#f8fafc] p-2 rounded-lg border border-slate-200/80">
              <div className="text-slate-400 text-[10px]">Piñón Motriz (zp / dp)</div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                {params.rackPinionTeeth || 20}z · Ø{(dims.pinionPitchRadius ? (dims.pinionPitchRadius * 2).toFixed(1) : '0')} <span className="text-[10px] font-normal text-slate-400">mm</span>
              </div>
            </div>

            <div className="bg-orange-50/80 p-2 rounded-lg border border-orange-200">
              <div className="text-orange-700 text-[10px] font-semibold">
                <span>Avance / Vuelta</span>
              </div>
              <div className="text-xs font-mono font-extrabold text-orange-900 mt-0.5">
                {dims.feedPerRev} <span className="text-[10px] font-normal text-orange-700">mm</span>
              </div>
            </div>

            <div className="bg-[#f8fafc] p-2 rounded-lg border border-slate-200/80">
              <div className="text-slate-400 text-[10px]">Velocidad Lineal</div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                {dims.linearVelocity} <span className="text-[10px] font-normal text-slate-400">mm/s</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-[#f8fafc] p-2 rounded-lg border border-slate-200/80">
              <div className="text-slate-400 text-[10px]">Diámetro Primitivo (d)</div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                {dims.pitchDiameter} <span className="text-[10px] font-normal text-slate-400">mm</span>
              </div>
            </div>

            <div className="bg-[#f8fafc] p-2 rounded-lg border border-slate-200/80">
              <div className="text-slate-400 text-[10px]">Diámetro Exterior (da)</div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                {dims.tipDiameter} <span className="text-[10px] font-normal text-slate-400">mm</span>
              </div>
            </div>

            <div className="bg-[#f8fafc] p-2 rounded-lg border border-slate-200/80">
              <div className="text-slate-400 text-[10px]">Diámetro Raíz (df)</div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                {dims.rootDiameter} <span className="text-[10px] font-normal text-slate-400">mm</span>
              </div>
            </div>

            <div className="bg-[#f8fafc] p-2 rounded-lg border border-slate-200/80">
              <div className="text-slate-400 text-[10px]">Diámetro Base (db)</div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                {dims.baseDiameter} <span className="text-[10px] font-normal text-slate-400">mm</span>
              </div>
            </div>

            <div className="bg-[#f8fafc] p-2 rounded-lg border border-slate-200/80">
              <div className="text-slate-400 text-[10px]">Paso Circular (p)</div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                {dims.circularPitch} <span className="text-[10px] font-normal text-slate-400">mm</span>
              </div>
            </div>

            <div className="bg-[#f8fafc] p-2 rounded-lg border border-slate-200/80">
              <div className="text-slate-400 text-[10px]">Espesor Diente (s)</div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                {dims.normalToothThickness} <span className="text-[10px] font-normal text-slate-400">mm</span>
              </div>
            </div>

            {meshingPair.enabled ? (
              <div className="bg-orange-50/70 p-2 rounded-lg border border-orange-200">
                <div className="text-orange-700 text-[10px] font-semibold">
                  <span>Distancia Centros (a)</span>
                </div>
                <div className="text-xs font-mono font-bold text-orange-900 mt-0.5">
                  {dims.centerDistance} <span className="text-[10px] font-normal">mm</span>
                </div>
              </div>
            ) : (
              <div className="bg-[#f8fafc] p-2 rounded-lg border border-slate-200/80">
                <div className="text-slate-400 text-[10px]">Torsión Hélice (β)</div>
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
