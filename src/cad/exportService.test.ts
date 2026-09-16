import { describe, it, expect } from 'vitest'
import { formatStepBreakdown } from './exportService'
import type { StepStageTimings, StepQualityInfo } from './replicadClient'

const stages: StepStageTimings = {
  kernelMs: 0,
  curvesMs: 1,
  buildMs: 16544,
  encodeMs: 201,
  totalMs: 16859,
  hbExtrudeMs: 219,
  hbMirrorMs: 6,
  hbJoinMs: 16300,
}

const qualityExact: StepQualityInfo = {
  faces: 1204,
  solids: 1,
  volumeMm3: 45210.55,
  areaMm2: 18300.1,
  bboxMm: [[-40, -40, 0], [40, 40, 35]],
  meshTris: 2450,
  meshMs: 300,
  ok: true,
  warnings: [],
}

describe('formatStepBreakdown', () => {
  it('sin datos muestra mensaje base', () => {
    expect(formatStepBreakdown(undefined, null)).toBe('STEP model generated successfully!')
    expect(formatStepBreakdown(undefined, undefined)).toBe('STEP model generated successfully!')
  })
  it('incluye tiempos y sub-etapas hb', () => {
    const msg = formatStepBreakdown(stages, null)
    expect(msg).toContain('16859ms')
    expect(msg).toContain('build 16544')
    expect(msg).toContain('hb extr 219 / mirror 6 / join 16300')
  })
  it('QC: sólidos, caras, volumen y tris', () => {
    const msg = formatStepBreakdown(stages, qualityExact)
    expect(msg).toContain('QC solids 1 / faces 1204 / vol 45210.55mm³')
    expect(msg).toContain('tris 2450')
    expect(msg).not.toContain('⚠')
  })
  it('QC con warnings usa ⚠ y omite tris si no hay sonda', () => {
    const q: StepQualityInfo = { ...qualityExact, solids: 2, meshTris: null, ok: false, warnings: ['volumen no positivo: sólido sospechoso'] }
    const msg = formatStepBreakdown(undefined, q)
    expect(msg).toContain('solids 2')
    expect(msg).not.toContain('tris')
    expect(msg).toContain('⚠ volumen no positivo')
  })
})
