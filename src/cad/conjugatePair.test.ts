import { describe, it, expect, beforeEach } from 'vitest'
import { useGearStore } from '../store/useGearStore'
import { calculateDimensions } from './gearMath'

describe('Dual Gear Conjugate System & Motorization', () => {
  beforeEach(() => {
    // Reset to defaults
    useGearStore.getState().selectGear(1)
    useGearStore.getState().resetCurrentGear()
    useGearStore.getState().selectGear(2)
    useGearStore.getState().resetCurrentGear()
    useGearStore.getState().selectGear(1)
    useGearStore.getState().setGear2Enabled(false)
    useGearStore.getState().setMotorized(false)
    useGearStore.getState().setMotorRpm(25)
  })

  it('enables Gear 2 and preserves independent teeth with calculated center distance', () => {
    const store = useGearStore.getState()
    store.setGear2Enabled(true)

    const state = useGearStore.getState()
    expect(state.gear2Enabled).toBe(true)
    expect(state.gear1Params.teeth).toBe(26)
    expect(state.gear2Params.teeth).toBe(17)

    const dims = calculateDimensions(state.gear1Params, state.gear2Params.teeth)
    // a = m * (z1 + z2) / 2 = 2.5 * (26 + 17) / 2 = 53.75 mm
    expect(dims.centerDistance).toBeCloseTo(53.75, 2)
    expect(dims.gearRatio).toBeCloseTo(17 / 26, 3)
  })

  it('adapts module from Gear 1 to Gear 2 automatically', () => {
    const store = useGearStore.getState()
    store.setGear2Enabled(true)
    store.selectGear(1)

    // Change module on Gear 1 to 3.0
    store.setGearParam('module', 3.0)

    const state = useGearStore.getState()
    expect(state.gear1Params.module).toBe(3.0)
    expect(state.gear2Params.module).toBe(3.0)
    expect(state.params.module).toBe(3.0)

    // New center distance: 3.0 * (26 + 17) / 2 = 64.5 mm
    const dims = calculateDimensions(state.gear1Params, state.gear2Params.teeth)
    expect(dims.centerDistance).toBeCloseTo(64.5, 2)
  })

  it('adapts module from Gear 2 to Gear 1 automatically when editing Gear 2', () => {
    const store = useGearStore.getState()
    store.setGear2Enabled(true)
    store.selectGear(2)

    // Change module on Gear 2 to 2.0
    store.setGearParam('module', 2.0)

    const state = useGearStore.getState()
    expect(state.gear2Params.module).toBe(2.0)
    expect(state.gear1Params.module).toBe(2.0)
    expect(state.params.module).toBe(2.0)
  })

  it('preserves independent teeth counts when changing teeth on either gear', () => {
    const store = useGearStore.getState()
    store.setGear2Enabled(true)
    store.selectGear(2)

    // Modify Gear 2 teeth to 34
    store.setGearParam('teeth', 34)

    let state = useGearStore.getState()
    expect(state.gear2Params.teeth).toBe(34)
    expect(state.gear1Params.teeth).toBe(26) // Gear 1 untouched!

    // Switch to Gear 1 and modify teeth to 40
    store.selectGear(1)
    store.setGearParam('teeth', 40)

    state = useGearStore.getState()
    expect(state.gear1Params.teeth).toBe(40)
    expect(state.gear2Params.teeth).toBe(34) // Gear 2 untouched!

    // Center distance: 2.5 * (40 + 34) / 2 = 92.5 mm
    const dims = calculateDimensions(state.gear1Params, state.gear2Params.teeth)
    expect(dims.centerDistance).toBeCloseTo(92.5, 2)
  })

  it('synchronizes helical angle and inverts helix hand for external conjugate meshing', () => {
    const store = useGearStore.getState()
    store.setGear2Enabled(true)
    store.selectGear(1)

    store.setGearParam('gearType', 'helical')
    store.setGearParam('helixAngle', 25)
    store.setGearParam('helixHand', 'right')

    const state = useGearStore.getState()
    expect(state.gear1Params.gearType).toBe('helical')
    expect(state.gear2Params.gearType).toBe('helical')
    expect(state.gear1Params.helixAngle).toBe(25)
    expect(state.gear2Params.helixAngle).toBe(25)
    expect(state.gear1Params.helixHand).toBe('right')
    expect(state.gear2Params.helixHand).toBe('left') // Opposite hand for mating!
  })

  it('keeps physical body features independent between gears', () => {
    const store = useGearStore.getState()
    store.setGear2Enabled(true)

    // Gear 1 has 20mm bore, hub style, keyway
    store.selectGear(1)
    store.setGearParam('boreDiameter', 20)
    store.setGearParam('bodyStyle', 'hub')
    store.setGearParam('hubDiameter', 38)
    store.setGearParam('hasKeyway', true)

    // Gear 2 has 12mm bore, solid body, no keyway
    store.selectGear(2)
    store.setGearParam('boreDiameter', 12)
    store.setGearParam('bodyStyle', 'solid')
    store.setGearParam('hasKeyway', false)

    const state = useGearStore.getState()
    expect(state.gear1Params.boreDiameter).toBe(20)
    expect(state.gear1Params.bodyStyle).toBe('hub')
    expect(state.gear1Params.hubDiameter).toBe(38)
    expect(state.gear1Params.hasKeyway).toBe(true)

    expect(state.gear2Params.boreDiameter).toBe(12)
    expect(state.gear2Params.bodyStyle).toBe('solid')
    expect(state.gear2Params.hasKeyway).toBe(false)
  })

  it('controls motorization and computes live output RPM', () => {
    const store = useGearStore.getState()
    store.setGear2Enabled(true)
    store.setMotorized(true)
    store.setMotorRpm(60)

    const state = useGearStore.getState()
    expect(state.motorized).toBe(true)
    expect(state.motorRpm).toBe(60)

    // Gear 1: 26 teeth, Gear 2: 17 teeth
    // Output RPM = 60 * 26 / 17 = 91.76 RPM
    const speedG2 = (state.motorRpm * state.gear1Params.teeth) / state.gear2Params.teeth
    expect(speedG2).toBeCloseTo(91.76, 1)
  })
})
