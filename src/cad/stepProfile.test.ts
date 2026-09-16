import { describe, it, expect } from 'vitest'
import { generateInvoluteProfile, generateRackProfile } from './gearMath'
import type { GearParameters } from './types'

// Baseline de complejidad del sketch 2D que alimenta al kernel OpenCASCADE.
// El coste de los booleanos B-Rep escala con nº de aristas: este test fija el
// orden de magnitud esperado por tipo para detectar regresiones de perfil.

function base(over: Partial<GearParameters> = {}): GearParameters {
  return {
    gearType: 'spur',
    module: 2.5,
    teeth: 26,
    pressureAngle: 20,
    helixAngle: 0,
    helixHand: 'right',
    profileShift: 0,
    backlash: 0.05,
    addendumCoeff: 1.0,
    dedendumCoeff: 1.25,
    faceWidth: 20,
    boreDiameter: 0,
    hasKeyway: false,
    bodyStyle: 'solid',
    hubDiameter: 34,
    hubLength: 26,
    hubOffset: 4,
    webThickness: 8,
    holeCount: 5,
    holeDiameter: 8,
    holeCircleRadius: 21,
    ...over,
  }
}

function signedArea(pts: [number, number][]): number {
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    a += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1]
  }
  return a / 2
}

describe('STEP profile complexity baseline', () => {
  it('spur 26: manifold(10) vs worker(4) — el worker usa ~40% de puntos', () => {
    const t0 = performance.now()
    const full = generateInvoluteProfile(base(), 10)
    const tFull = performance.now() - t0
    const light = generateInvoluteProfile(base(), 4)
    expect(tFull).toBeLessThan(100)
    expect(signedArea(full)).toBeGreaterThan(0)
    expect(signedArea(light)).toBeGreaterThan(0)
    // Orden de magnitud: z=26, ~22 pts/diente a ppf=10
    expect(full.length).toBeGreaterThan(400)
    expect(full.length).toBeLessThan(900)
    expect(light.length).toBeLessThan(full.length * 0.6)
  })

  it('helicoidal usa el mismo perfil 2D que el recto', () => {
    const spurPts = generateInvoluteProfile(base(), 4)
    const helPts = generateInvoluteProfile(base({ gearType: 'helical', helixAngle: 20 }), 4)
    // El twist va en la extrusión, no en el sketch: mismo nº de puntos
    expect(helPts.length).toBe(spurPts.length)
  })

  it('cremallera L160/m2.5 y L180/m2.0 en tiempos despreciables', () => {
    const t0 = performance.now()
    const r1 = generateRackProfile(base({ gearType: 'rack' }), 160, 25)
    const r2 = generateRackProfile(base({ gearType: 'rack', module: 2.0 }), 180, 25)
    expect(performance.now() - t0).toBeLessThan(50)
    expect(signedArea(r1)).toBeGreaterThan(0)
    expect(signedArea(r2)).toBeGreaterThan(0)
    // ~6 pts/diente: L160/m2.5 → ~20 dientes → ~120 pts
    expect(r1.length).toBeGreaterThan(80)
    expect(r1.length).toBeLessThan(220)
    expect(r2.length).toBeGreaterThan(r1.length) // más dientes a igual longitud
  })

  it('helicoidal/espiga pesada z60 m4: acota el peor caso del sketch', () => {
    const t0 = performance.now()
    const pts = generateInvoluteProfile(base({ teeth: 60, module: 4, gearType: 'herringbone', helixAngle: 30 }), 3)
    expect(performance.now() - t0).toBeLessThan(100)
    expect(signedArea(pts)).toBeGreaterThan(0)
    expect(pts.length).toBeLessThan(1500)
  })
})
