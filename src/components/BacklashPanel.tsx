import React, { useState } from 'react'
import type { GearParameters } from '../cad/types'
import {
  pairGeometry,
  solveOptimalDistance,
  thermalBacklashShift,
  defaultMinBacklash,
  recommendedThinning,
  THERMAL_EXPANSION,
  type GearMaterial,
} from '../cad/backlash'

interface Props {
  params: GearParameters
  teeth2: number
  onApplyThinning: (v: number) => void
  previewDeltaA: number | null
  onPreview: (d: number | null) => void
}

function profileCoeffs(t?: GearParameters['toothProfileType']): { ha: number; hf: number } {
  if (t === 'stub') return { ha: 0.8, hf: 1.0 }
  if (t === 'deep') return { ha: 1.2, hf: 1.4 }
  if (t === 'cycloidal') return { ha: 1.0, hf: 1.2 }
  return { ha: 1.0, hf: 1.25 }
}

const EXTERNAL = ['spur', 'helical', 'herringbone'] as const

/**
 * Panel compacto del motor de backlash: separación óptima a_opt entre el
 * mínimo juego exigido y el movimiento fluido (ε, agarre, holgura).
 * Solo pares externos (la corona interior queda fuera del v1).
 */
export const BacklashPanel: React.FC<Props> = ({ params, teeth2, onApplyThinning, previewDeltaA, onPreview }) => {
  if (!(EXTERNAL as readonly string[]).includes(params.gearType)) return null

  return <BacklashBody params={params} teeth2={teeth2} onApplyThinning={onApplyThinning} previewDeltaA={previewDeltaA} onPreview={onPreview} />
}

const BacklashBody: React.FC<Props> = ({ params, teeth2, onApplyThinning, previewDeltaA, onPreview }) => {
  const effBeta =
    params.gearType === 'helical' || params.gearType === 'herringbone' ? params.helixAngle || 0 : 0
  const { ha, hf } = profileCoeffs(params.toothProfileType)
  const g = pairGeometry({
    module: params.module,
    teeth1: params.teeth,
    teeth2,
    pressureAngleDeg: params.pressureAngle,
    helixAngleDeg: effBeta,
    shift1: params.profileShift ?? 0,
    shift2: 0,
    haCoeff: params.addendumCoeff ?? ha,
    hfCoeff: params.dedendumCoeff ?? hf,
  })
  const j0 = 2 * (params.backlash ?? 0.05)

  const [jMinOv, setJMinOv] = useState<number | null>(null)
  const [deltaT, setDeltaT] = useState(0)
  const [gearMat, setGearMat] = useState<GearMaterial>('steel')
  const [housingMat, setHousingMat] = useState<GearMaterial>('steel')

  const jMin = jMinOv ?? defaultMinBacklash(params.module)
  const th = thermalBacklashShift({ g, gearMaterial: gearMat, housingMaterial: housingMat, deltaT: deltaT })
  const r = solveOptimalDistance({ g, j0, jMin, thermalShift: th })

  const materials = Object.keys(THERMAL_EXPANSION) as GearMaterial[]

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold uppercase tracking-wide text-sky-900">
          Optimal backlash gap
        </span>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${r.feasible ? 'text-emerald-700 bg-emerald-100 border border-emerald-300' : 'text-amber-700 bg-amber-100 border border-amber-300'}`}>
          {r.feasible ? 'FEASIBLE' : 'CHECK'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5 font-mono text-center">
        <div className="bg-white border border-sky-100 rounded-lg p-1.5">
          <div className="text-[9px] text-slate-400 font-sans">a_opt</div>
          <div className="text-xs font-extrabold text-slate-900">{r.aOpt.toFixed(2)}<span className="text-[9px] font-normal"> mm</span></div>
          <div className="text-[9px] text-slate-400">Δa {r.deltaA >= 0 ? '+' : ''}{r.deltaA.toFixed(3)}</div>
          {r.feasible && (
            previewDeltaA !== null ? (
              <button
                type="button"
                onClick={() => onPreview(null)}
                className="mt-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-slate-200 text-slate-700 hover:bg-slate-300"
                title="Volver a la distancia estándar"
              >
                Reset view
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onPreview(r.deltaA)}
                className="mt-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-sky-600 text-white hover:bg-sky-700"
                title="Mueve la pareja en el visor a a_opt sin tocar la geometría"
              >
                Preview gap
              </button>
            )
          )}
        </div>
        <div className="bg-white border border-sky-100 rounded-lg p-1.5">
          <div className="text-[9px] text-slate-400 font-sans">j / ε</div>
          <div className="text-xs font-extrabold text-slate-900">{r.jAtOpt.toFixed(3)} / {r.epsAtOpt.toFixed(2)}</div>
          <div className="text-[9px] text-slate-400">c {r.clearanceAtOpt.toFixed(2)} mm</div>
        </div>
        <div className="bg-white border border-sky-100 rounded-lg p-1.5">
          <div className="text-[9px] text-slate-400 font-sans">Thinning/gear</div>
          <div className="text-xs font-extrabold text-slate-900">{recommendedThinning(r.jMinAssembly).toFixed(3)}</div>
          <button
            type="button"
            onClick={() => onApplyThinning(recommendedThinning(r.jMinAssembly))}
            className="mt-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-sky-600 text-white hover:bg-sky-700"
            title="Aplica el adelgazamiento para lograr jMin montando en a0"
          >
            Apply
          </button>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-0.5">
          <span className="text-[10px] text-slate-600">Min backlash jMin</span>
          <span className="font-mono text-[10px] font-bold text-slate-900">{jMin.toFixed(3)} mm</span>
        </div>
        <input
          type="range"
          min="0"
          max={Number((0.15 * params.module).toFixed(3))}
          step="0.005"
          value={jMin}
          onChange={(e) => setJMinOv(parseFloat(e.target.value))}
          className="w-full accent-sky-600 cursor-pointer"
        />
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-[10px]">
        <label className="text-slate-600">Gear
          <select value={gearMat} onChange={(e) => setGearMat(e.target.value as GearMaterial)} className="ml-1 border border-slate-200 rounded-md px-1 py-0.5 bg-white font-mono text-[10px]">
            {materials.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="text-slate-600">Hous.
          <select value={housingMat} onChange={(e) => setHousingMat(e.target.value as GearMaterial)} className="ml-1 border border-slate-200 rounded-md px-1 py-0.5 bg-white font-mono text-[10px]">
            {materials.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="text-slate-600">ΔT
          <span className="font-mono font-bold text-slate-900"> {deltaT}°</span>
          <input type="range" min="0" max="80" step="5" value={deltaT} onChange={(e) => setDeltaT(parseInt(e.target.value))} className="w-full accent-sky-600 cursor-pointer" />
        </label>
      </div>
      {(th !== 0 || deltaT > 0) && (
        <div className="text-[9px] font-mono text-slate-500">
          Thermal Δj {th >= 0 ? '+' : ''}{th.toFixed(4)} mm → jMin in cold {r.jMinAssembly.toFixed(3)} mm
        </div>
      )}
      {!r.feasible && (
        <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">{r.message}</div>
      )}
    </div>
  )
}
