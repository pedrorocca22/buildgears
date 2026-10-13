import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGearStore } from '../store/useGearStore'
import { resolveExportParameters, getAssemblyLayout } from './exportParameters'
import { calculateDimensions } from './gearMath'
import { runExport } from './exportService'

const mocks = vi.hoisted(() => ({ build: vi.fn(), step: vi.fn(), download: vi.fn() }))
vi.mock('./manifoldEngine', () => ({ buildGearManifold: mocks.build }))
vi.mock('./replicadClient', () => ({ exportGearToSTEP: mocks.step, downloadBlob: mocks.download }))
vi.mock('canvas-confetti', () => ({ default: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  const store = useGearStore.getState()
  store.resetAllGearConfigs()
  store.setGear2Enabled(true)
  store.setGearParams({ teeth: 32, bodyStyle: 'hub', boreDiameter: 18, hasKeyway: true,
    keywayCustom: true, keywayWidth: 6, keywayDepth: 3, hubDiameter: 36,
    hubOffset: 7, hubBothSides: true, hasToothChamfer: true, toothChamfer: 0.8, profileShift: 0.3 })
  store.selectGear(2)
  store.setGearParams({ teeth: 19, bodyStyle: 'hub', boreDiameter: 8, hasKeyway: false,
    hubDiameter: 22, hubOffset: 2, hubBothSides: false, hasToothChamfer: false, profileShift: -0.1 })
})

describe('independent gear assembly exports', () => {
  it.each([1, 2] as const)('preserves both complete configurations with Gear %i selected', (selected) => {
    useGearStore.getState().selectGear(selected)
    const state = useGearStore.getState()
    const exported = resolveExportParameters(state, 'assembly')
    expect(exported.params).toEqual(state.gear1Params)
    expect(exported.gear2Params).toEqual(state.gear2Params)
    expect(exported.params.teeth).toBe(32)
    expect(exported.gear2Params?.teeth).toBe(19)
    expect(exported.params).not.toBe(state.gear1Params)
    expect(exported.gear2Params).not.toBe(state.gear2Params)
    expect(resolveExportParameters(state, 'default').params).toEqual(state.params)
  })

  it('calculates spacing from both profile shifts and the actual mate teeth', () => {
    const { gear1Params, gear2Params } = useGearStore.getState()
    const layout = getAssemblyLayout(gear1Params, gear2Params)
    expect(layout.centerDistance).toBe(calculateDimensions(gear1Params, gear2Params).workingCenterDistance)
    expect(layout.centerDistance).not.toBe(calculateDimensions(gear1Params, gear2Params.teeth).workingCenterDistance)
  })

  it('uses internal ring spacing instead of external gear spacing', () => {
    useGearStore.getState().setGearType('internal')
    const { gear1Params, gear2Params } = useGearStore.getState()
    expect(getAssemblyLayout(gear1Params, gear2Params).centerDistance).toBeCloseTo(
      gear1Params.module * (gear1Params.teeth - gear2Params.teeth) / 2, 3)
  })

  it.each(['stl', '3mf'] as const)('%s feeds each solid its own parameters with Gear 2 selected', async (format) => {
    const second = { translate: vi.fn().mockReturnThis() }
    const combined = { status: () => 'NoError', getMesh: () => ({ numTri: 0, triVerts: [], vertProperties: [] }) }
    const first = { add: vi.fn().mockReturnValue(combined) }
    mocks.build.mockResolvedValueOnce(first).mockResolvedValueOnce(second)
    const state = useGearStore.getState()
    const result = await runExport({ ...resolveExportParameters(state, 'assembly'),
      format, target: 'assembly', onProgress: vi.fn() })
    expect(mocks.build).toHaveBeenNthCalledWith(1, state.gear1Params)
    expect(mocks.build).toHaveBeenNthCalledWith(2, state.gear2Params)
    expect(second.translate).toHaveBeenCalledWith([getAssemblyLayout(state.gear1Params, state.gear2Params).centerDistance, 0, 0])
    expect(result.fileName).toContain('z1_32_z2_19')
    expect(mocks.download).toHaveBeenCalledOnce()
  })

  it('STEP forwards both configurations with Gear 2 selected', async () => {
    mocks.step.mockResolvedValue({ blob: new Blob(), fileName: 'assembly.step' })
    const state = useGearStore.getState()
    await runExport({ ...resolveExportParameters(state, 'assembly'),
      format: 'step', target: 'assembly', onProgress: vi.fn() })
    expect(mocks.step).toHaveBeenCalledWith(state.gear1Params, expect.any(Function), 'assembly', state.gear2Params)
  })

  it.each(['stl', 'step'] as const)('rejects missing Gear 2 rather than silently inventing a %s mate', async (format) => {
    await expect(runExport({ params: useGearStore.getState().gear1Params,
      target: 'assembly', format, onProgress: vi.fn() })).rejects.toThrow('Gear 2 parameters are required')
    expect(mocks.build).not.toHaveBeenCalled()
    expect(mocks.step).not.toHaveBeenCalled()
  })

  it('keeps rack assemblies using their dedicated pinion parameters', async () => {
    useGearStore.getState().setGearType('rack')
    mocks.step.mockResolvedValue({ blob: new Blob(), fileName: 'rack.step' })
    const params = useGearStore.getState().gear1Params
    await runExport({ params, target: 'assembly', format: 'step', onProgress: vi.fn() })
    expect(mocks.step).toHaveBeenCalledWith(params, expect.any(Function), 'assembly', undefined)
  })
})
