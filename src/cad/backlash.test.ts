import { describe, it, expect } from 'vitest'
import {
  pairGeometry,
  backlashAt,
  contactRatioAt,
  clearanceAt,
  tipFoulingAt,
  thermalBacklashShift,
  defaultMinBacklash,
  recommendedThinning,
  solveOptimalDistance,
} from './backlash'

const g26 = () => pairGeometry({ module: 2.5, teeth1: 26, teeth2: 17 });

describe('backlash engine v1', () => {
  it('a0 = 53.75 y holgura nominal ≈ 0.25·m', () => {
    const g = g26();
    expect(g.a0).toBeCloseTo(53.75, 6);
    expect(clearanceAt(g, g.a0)).toBeCloseTo(0.625, 2);
  });

  it('j crece 2·tan20° por mm de apertura', () => {
    const g = g26();
    const dj = backlashAt(g, g.a0 + 0.1, 0.1) - backlashAt(g, g.a0, 0.1);
    expect(dj).toBeCloseTo(2 * 0.1 * Math.tan((20 * Math.PI) / 180), 6);
  });

  it('ε decrece al abrir y la holgura crece', () => {
    const g = g26();
    expect(contactRatioAt(g, g.a0 + 0.5)).toBeLessThan(contactRatioAt(g, g.a0));
    expect(clearanceAt(g, g.a0 + 0.5)).toBeGreaterThan(clearanceAt(g, g.a0));
    expect(contactRatioAt(g, g.a0)).toBeGreaterThan(1.2);
  });

  it('26/17 sin agarre en a0; caso extremo sí agarra', () => {
    const g = g26();
    expect(tipFoulingAt(g, g.a0).fouls).toBe(false);
    const extreme = pairGeometry({ module: 2.5, teeth1: 8, teeth2: 80 });
    // Con gran apertura la punta alcanza zona no útil
    expect(tipFoulingAt(extreme, extreme.a0 + 6).fouls).toBe(true);
  });

  it('óptimo 26/17: abre lo justo para jMin', () => {
    const g = g26();
    const jMin = defaultMinBacklash(2.5, 'general'); // 0.125
    const r = solveOptimalDistance({ g, j0: 0.1, jMin });
    expect(r.feasible).toBe(true);
    expect(r.aOpt).toBeCloseTo(g.a0 + (jMin - 0.1) / (2 * Math.tan((20 * Math.PI) / 180)), 2);
    expect(r.jAtOpt).toBeGreaterThanOrEqual(jMin - 1e-9);
    expect(r.epsAtOpt).toBeGreaterThanOrEqual(1.2);
    expect(r.limiting).toBe('backlash');
  });

  it('si j0 ya sobra, cierra centros (deltaA < 0)', () => {
    const g = g26();
    const r = solveOptimalDistance({ g, j0: 0.3, jMin: 0.125 });
    expect(r.feasible).toBe(true);
    expect(r.deltaA).toBeLessThan(0);
    expect(r.jAtOpt).toBeGreaterThanOrEqual(0.125 - 1e-9);
  });

  it('inviable: 10/10 agarra (fouling); 20/20 viable', () => {
    const small = pairGeometry({ module: 1, teeth1: 10, teeth2: 10 });
    const rFoul = solveOptimalDistance({ g: small, j0: 0.05, jMin: 0.05 });
    expect(rFoul.feasible).toBe(false);
    expect(rFoul.limiting).toBe('fouling');
    const ok = pairGeometry({ module: 1, teeth1: 20, teeth2: 20 });
    const rOk = solveOptimalDistance({ g: ok, j0: 0.05, jMin: 0.05 });
    expect(rOk.feasible).toBe(true);
    const rContact = solveOptimalDistance({ g: ok, j0: 0.05, jMin: 0.05, minContactRatio: 3 });
    expect(rContact.feasible).toBe(false);
    expect(rContact.limiting).toBe('contact');
  });

  it('térmico: 0 sin ΔT; carcasa aluminio añade juego', () => {
    const g = g26();
    expect(thermalBacklashShift({ g })).toBe(0);
    const alu = thermalBacklashShift({ g, gearMaterial: 'steel', housingMaterial: 'aluminum', deltaT: 50 });
    expect(alu).toBeGreaterThan(0);
    // Acero/acero caliente: efecto casi nulo pero definido
    const steel = thermalBacklashShift({ g, gearMaterial: 'steel', housingMaterial: 'steel', deltaT: 50 });
    expect(Math.abs(steel)).toBeLessThan(Math.abs(alu));
  });

  it('thinning = j/2 y defaults proporcionales al módulo', () => {
    expect(recommendedThinning(0.1)).toBeCloseTo(0.05, 9);
    expect(defaultMinBacklash(2.5, 'general')).toBeCloseTo(0.125, 9);
    expect(defaultMinBacklash(2.5, 'precision')).toBeLessThan(defaultMinBacklash(2.5, 'heavy'));
  });
});
