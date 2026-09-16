/**
 * Motor de cálculo de backlash v1: separación óptima entre engranajes.
 *
 * Objetivo: la menor distancia `a` que garantiza el backlash mínimo exigido
 * (juego para lubricación, tolerancias y térmico) manteniendo movimiento
 * fluido: recubrimiento ε ≥ ε_min, sin agarre de cabeza y holgura de fondo.
 *
 * Solo pares externos coplanares (spur/helical/herringbone). Puro y testeado.
 */

export type BacklashApplication = 'precision' | 'general' | 'heavy'

export type GearMaterial = 'steel' | 'castIron' | 'aluminum' | 'bronze' | 'brass' | 'nylon'

/** Coeficiente de dilatación lineal (1/°C). Valores típicos de manual. */
export const THERMAL_EXPANSION: Record<GearMaterial, number> = {
  steel: 12e-6,
  castIron: 10.5e-6,
  aluminum: 23e-6,
  bronze: 18e-6,
  brass: 19e-6,
  nylon: 80e-6,
}

export interface PairGeometry {
  module: number
  teeth1: number
  teeth2: number
  alphaT: number // rad, ángulo de presión transversal
  mt: number // módulo transversal
  rp1: number
  rb1: number
  ra1: number
  rf1: number
  rp2: number
  rb2: number
  ra2: number
  rf2: number
  a0: number // distancia estándar con shifts
}

/** Geometría conjugada a partir de parámetros de par externo. */
export function pairGeometry(o: {
  module: number
  teeth1: number
  teeth2: number
  pressureAngleDeg?: number
  helixAngleDeg?: number
  shift1?: number
  shift2?: number
  haCoeff?: number
  hfCoeff?: number
}): PairGeometry {
  const m = o.module
  const alphaN = ((o.pressureAngleDeg ?? 20) * Math.PI) / 180
  const beta = ((o.helixAngleDeg ?? 0) * Math.PI) / 180
  const mt = beta !== 0 ? m / Math.cos(beta) : m
  const alphaT = beta !== 0 ? Math.atan(Math.tan(alphaN) / Math.cos(beta)) : alphaN
  const ha = (o.haCoeff ?? 1.0) * m
  const hf = (o.hfCoeff ?? 1.25) * m
  const x1 = o.shift1 ?? 0
  const x2 = o.shift2 ?? 0
  const rp1 = (mt * o.teeth1) / 2
  const rp2 = (mt * o.teeth2) / 2
  const rb1 = rp1 * Math.cos(alphaT)
  const rb2 = rp2 * Math.cos(alphaT)
  return {
    module: m,
    teeth1: o.teeth1,
    teeth2: o.teeth2,
    alphaT,
    mt,
    rp1, rb1,
    ra1: rp1 + ha + x1 * m,
    rf1: Math.max(0.5, rp1 - hf + x1 * m),
    rp2, rb2,
    ra2: rp2 + ha + x2 * m,
    rf2: Math.max(0.5, rp2 - hf + x2 * m),
    a0: (mt * (o.teeth1 + o.teeth2)) / 2 + m * (x1 + x2),
  }
}

/**
 * Backlash circunferencial a distancia `a`:
 * j(a) = j0 + 2·(a − a0)·tan(αt). Abrir centros aumenta juego, cerrar lo reduce.
 */
export function backlashAt(g: PairGeometry, a: number, j0: number): number {
  return j0 + 2 * (a - g.a0) * Math.tan(g.alphaT)
}

/** Grado de recubrimiento transversal a distancia `a` (ra/rb fijos). */
export function contactRatioAt(g: PairGeometry, a: number): number {
  const t1 = Math.sqrt(Math.max(0, g.ra1 * g.ra1 - g.rb1 * g.rb1))
  const t2 = Math.sqrt(Math.max(0, g.ra2 * g.ra2 - g.rb2 * g.rb2))
  const pb = Math.PI * g.mt * Math.cos(g.alphaT)
  if (pb <= 0) return 0
  return (t1 + t2 - a * Math.sin(g.alphaT)) / pb
}

/** Holgura de fondo mínima (cabeza de uno contra raíz del otro). */
export function clearanceAt(g: PairGeometry, a: number): number {
  return Math.min(a - g.ra1 - g.rf2, a - g.ra2 - g.rf1)
}

export interface FoulingCheck {
  fouls: boolean
  /** Margen en mm por lado (> 0 = sin agarre). */
  margin1: number
  margin2: number
}

/**
 * Agarre de cabeza: la punta de un engranaje no debe contactar por debajo
 * del inicio del flanco útil (involuta desde max(rf, rb)) del conjugado.
 * Margen = inicio_útil − inicio_contacto en la línea de engrane.
 */
export function tipFoulingAt(g: PairGeometry, a: number): FoulingCheck {
  const start1 = Math.sqrt(Math.max(0, Math.max(g.rf1, g.rb1) ** 2 - g.rb1 * g.rb1))
  const start2 = Math.sqrt(Math.max(0, Math.max(g.rf2, g.rb2) ** 2 - g.rb2 * g.rb2))
  const tip2reach = Math.sqrt(Math.max(0, g.ra2 * g.ra2 - g.rb2 * g.rb2))
  const tip1reach = Math.sqrt(Math.max(0, g.ra1 * g.ra1 - g.rb1 * g.rb1))
  const along = a * Math.sin(g.alphaT)
  const margin1 = along - tip2reach - start1
  const margin2 = along - tip1reach - start2
  return { fouls: margin1 < 0 || margin2 < 0, margin1, margin2 }
}

/**
 * Deriva térmica del backlash (mm, con signo): > 0 el calor AÑADE juego
 * (domina la carcasa), < 0 lo COME (dominan los dientes).
 */
export function thermalBacklashShift(o: {
  g: PairGeometry
  gearMaterial?: GearMaterial
  housingMaterial?: GearMaterial
  deltaT?: number // °C sobre ambiente de montaje
}): number {
  const g = o.g
  const dT = o.deltaT ?? 0
  if (dT === 0) return 0
  const ag = THERMAL_EXPANSION[o.gearMaterial ?? 'steel']
  const ah = THERMAL_EXPANSION[o.housingMaterial ?? 'steel']
  const s = (Math.PI * g.module) / 2 // espesor aprox por diente
  const teethLoss = (ag * s + ag * s) * dT
  const housingGain = 2 * Math.tan(g.alphaT) * ah * g.a0 * dT
  return housingGain - teethLoss
}

/**
 * j mínimo por defecto (regla práctica ajustable, no norma):
 * precision 0.03·m, general 0.05·m, heavy 0.08·m.
 */
export function defaultMinBacklash(module: number, app: BacklashApplication = 'general'): number {
  const k = app === 'precision' ? 0.03 : app === 'heavy' ? 0.08 : 0.05
  return Number((k * module).toFixed(4))
}

/** Adelgazamiento por rueda (reparto igual) para lograr j objetivo. */
export function recommendedThinning(jTarget: number): number {
  return Number((Math.max(0, jTarget) / 2).toFixed(4))
}

export interface OptimalDistanceInput {
  g: PairGeometry
  /** Backlash total existente a a0 (2× adelgazamiento por rueda aprox). */
  j0: number
  /** Backlash mínimo de servicio exigido (a temp. de trabajo). */
  jMin: number
  minContactRatio?: number // defecto 1.2
  minClearanceCoeff?: number // c ≥ coef·m, defecto 0.1
  thermalShift?: number // Δj térmico (se descuenta de jMin en frío)
}

export interface OptimalDistanceResult {
  feasible: boolean
  a0: number
  aOpt: number
  deltaA: number // aOpt − a0 (calce + = abrir, − = cerrar)
  jAtOpt: number
  epsAtOpt: number
  clearanceAtOpt: number
  jMinAssembly: number // exigencia trasladada a frío
  limiting: 'backlash' | 'contact' | 'fouling' | 'clearance' | 'none'
  message: string
}

/**
 * Busca la MENOR distancia `a` que cumple j ≥ jMinAssembly con movimiento
 * fluido (ε, agarre, holgura). Si ni en a0 se cumple ε, es inviable por diseño.
 */
export function solveOptimalDistance(input: OptimalDistanceInput): OptimalDistanceResult {
  const { g, j0 } = input
  const epsMin = input.minContactRatio ?? 1.2
  const cMin = (input.minClearanceCoeff ?? 0.1) * g.module
  const jMinAssembly = input.jMin - (input.thermalShift ?? 0)

  const m = g.module
  const lo = g.a0 - 1.5 * m
  const hi = g.a0 + 3 * m
  const step = 0.005 * m

  const okAt = (a: number) =>
    backlashAt(g, a, j0) >= jMinAssembly - 1e-9 &&
    contactRatioAt(g, a) >= epsMin &&
    !tipFoulingAt(g, a).fouls &&
    clearanceAt(g, a) >= cMin

  // ¿Viable en a0? Si ε ya falla en a0, ningún a mayor lo arregla.
  if (contactRatioAt(g, g.a0) < epsMin || tipFoulingAt(g, g.a0).fouls || clearanceAt(g, g.a0) < cMin) {
    const eps0 = contactRatioAt(g, g.a0)
    return {
      feasible: false,
      a0: g.a0,
      aOpt: g.a0,
      deltaA: 0,
      jAtOpt: backlashAt(g, g.a0, j0),
      epsAtOpt: eps0,
      clearanceAtOpt: clearanceAt(g, g.a0),
      jMinAssembly,
      limiting: eps0 < epsMin ? 'contact' : tipFoulingAt(g, g.a0).fouls ? 'fouling' : 'clearance',
      message: 'Inviable en a0: el par no rueda fluido ni con juego cero (revisar z/módulo).',
    }
  }

  for (let a = lo; a <= hi + 1e-12; a += step) {
    if (okAt(a)) {
      return {
        feasible: true,
        a0: g.a0,
        aOpt: Number(a.toFixed(3)),
        deltaA: Number((a - g.a0).toFixed(3)),
        jAtOpt: Number(backlashAt(g, a, j0).toFixed(4)),
        epsAtOpt: Number(contactRatioAt(g, a).toFixed(3)),
        clearanceAtOpt: Number(clearanceAt(g, a).toFixed(3)),
        jMinAssembly: Number(jMinAssembly.toFixed(4)),
        limiting: 'backlash',
        message: 'Óptimo: mínimo juego que cumple la exigencia con movimiento fluido.',
      }
    }
  }

  return {
    feasible: false,
    a0: g.a0,
    aOpt: Number(hi.toFixed(3)),
    deltaA: Number((hi - g.a0).toFixed(3)),
    jAtOpt: Number(backlashAt(g, hi, j0).toFixed(4)),
    epsAtOpt: Number(contactRatioAt(g, hi).toFixed(3)),
    clearanceAtOpt: Number(clearanceAt(g, hi).toFixed(3)),
    jMinAssembly: Number(jMinAssembly.toFixed(4)),
    limiting: 'none',
    message: 'jMin inalcanzable en el rango: aumentar adelgazamiento (thinning).',
  }
}
