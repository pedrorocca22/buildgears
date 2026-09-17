import { describe, it, expect, beforeEach } from 'vitest'
import { useGearStore } from '../store/useGearStore'
import { calculateDimensions, getConjugatePinionParams } from './gearMath'

describe('Dual Gear Conjugate System & Motorization', () => {
  beforeEach(() => {
    // Reset all gear type configurations to clean initial state
    useGearStore.getState().resetAllGearConfigs()
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

  it('synchronizes herringbone angle and inverts helix hand for external herringbone meshing', () => {
    const store = useGearStore.getState()
    store.setGear2Enabled(true)
    store.selectGear(1)

    store.setGearParam('gearType', 'herringbone')
    store.setGearParam('helixAngle', 30)
    store.setGearParam('helixHand', 'right')

    const state = useGearStore.getState()
    expect(state.gear1Params.gearType).toBe('herringbone')
    expect(state.gear2Params.gearType).toBe('herringbone')
    expect(state.gear1Params.helixAngle).toBe(30)
    expect(state.gear2Params.helixAngle).toBe(30)
    expect(state.gear1Params.helixHand).toBe('right')
    expect(state.gear2Params.helixHand).toBe('left') // Opposite hand for herringbone chevrons to nest!
  })

  it('preserves the SAME helix hand for rack and pinion in helical and herringbone modes', () => {
    const store = useGearStore.getState()
    store.selectGear(1)
    store.setGearParam('gearType', 'rack')

    // Helical rack with Right Hand
    store.setGearParam('rackToothType', 'helical')
    store.setGearParam('helixAngle', 20)
    store.setGearParam('helixHand', 'right')

    let state = useGearStore.getState()
    let pinion = getConjugatePinionParams(state.gear1Params)
    expect(pinion.gearType).toBe('helical')
    expect(pinion.helixAngle).toBe(20)
    expect(pinion.helixHand).toBe('right') // MUST be the SAME hand as the rack for parallel teeth!

    // Helical rack with Left Hand
    store.setGearParam('helixHand', 'left')
    state = useGearStore.getState()
    pinion = getConjugatePinionParams(state.gear1Params)
    expect(pinion.helixHand).toBe('left') // Matching left hand

    // Herringbone rack
    store.setGearParam('rackToothType', 'herringbone')
    store.setGearParam('helixAngle', 25)
    store.setGearParam('helixHand', 'right')
    state = useGearStore.getState()
    pinion = getConjugatePinionParams(state.gear1Params)
    expect(pinion.gearType).toBe('herringbone')
    expect(pinion.helixAngle).toBe(25)
    expect(pinion.helixHand).toBe('right') // Matching hand for V-chevrons to nest
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

  it('configures a small internal spur pinion when Gear 1 is an Internal Ring Gear', () => {
    const store = useGearStore.getState()
    store.selectGear(1)
    store.setGearParam('gearType', 'internal')
    store.setGearParam('teeth', 30)
    store.setGearParam('module', 2.0)

    // Enable Gear 2 (the conjugate planet/pinion)
    store.setGear2Enabled(true)

    const state = useGearStore.getState()
    expect(state.gear1Params.gearType).toBe('internal')
    expect(state.gear2Params.gearType).toBe('spur') // Internal pinion MUST be spur, not internal ring!
    expect(state.gear2Params.teeth).toBeLessThan(state.gear1Params.teeth) // Must fit inside the ring!

    // Internal center distance: a = m * (z1 - z2) / 2
    // with z1 = 30, z2 = 14: a = 2.0 * (30 - 14) / 2 = 16.0 mm
    const dims = calculateDimensions(state.gear1Params, state.gear2Params.teeth)
    const expectedCenterDist = Math.abs((2.0 * (state.gear1Params.teeth - state.gear2Params.teeth)) / 2)
    expect(dims.centerDistance).toBeCloseTo(expectedCenterDist, 2)

    // Pinion teeth clamping: Gear 2 cannot exceed z1 - 4
    store.selectGear(2)
    store.setGearParam('teeth', 50) // Attempt to set larger than ring
    const clampedState = useGearStore.getState()
    expect(clampedState.gear2Params.teeth).toBeLessThanOrEqual(state.gear1Params.teeth - 4)
  })

  it('isolates gear type configurations: switching to helical does not inherit spur modifications', () => {
    const store = useGearStore.getState()
    store.selectGear(1)

    // Customize Spur gear
    store.setGearParam('teeth', 45)
    store.setGearParam('module', 3.5)
    store.setGearParam('boreDiameter', 18)
    store.setGearParam('bodyStyle', 'hub')
    store.setGearParam('hubDiameter', 44)
    store.setGear2Enabled(true)
    store.selectGear(2)
    store.setGearParam('teeth', 30)

    let state = useGearStore.getState()
    expect(state.gear1Params.gearType).toBe('spur')
    expect(state.gear1Params.teeth).toBe(45)
    expect(state.gear1Params.module).toBe(3.5)
    expect(state.gear1Params.boreDiameter).toBe(18)
    expect(state.gear2Enabled).toBe(true)
    expect(state.gear2Params.teeth).toBe(30)

    // Switch to Helical Gear via setGearType
    store.setGearType('helical')
    state = useGearStore.getState()

    // Helical MUST NOT inherit the spur's custom properties
    expect(state.gear1Params.gearType).toBe('helical')
    expect(state.gear1Params.teeth).toBe(26) // Default helical teeth, NOT 45!
    expect(state.gear1Params.module).toBe(2.5) // Default helical module, NOT 3.5!
    expect(state.gear1Params.boreDiameter).toBe(0) // Default helical bore, NOT 18!
    expect(state.gear1Params.bodyStyle).toBe('solid') // Default helical bodyStyle, NOT hub!
    expect(state.gear2Enabled).toBe(false) // Helical gear 2 not enabled by spur!
  })

  it('persists session modifications when switching back and forth between gear types', () => {
    const store = useGearStore.getState()
    store.selectGear(1)

    // 1. Customize Spur
    store.setGearParam('teeth', 42)
    store.setGearParam('module', 3.0)
    store.setGearParam('faceWidth', 24)

    // 2. Switch to Helical and customize Helical
    store.setGearType('helical')
    store.setGearParam('helixAngle', 32)
    store.setGearParam('faceWidth', 28)

    // 3. Switch to Rack and customize Rack
    store.setGearType('rack')
    store.setGearParam('rackLength', 240)
    store.setGearParam('rackHeight', 35)

    // 4. Switch back to Spur -> MUST retain all Spur customizations
    store.setGearType('spur')
    let state = useGearStore.getState()
    expect(state.gear1Params.gearType).toBe('spur')
    expect(state.gear1Params.teeth).toBe(42)
    expect(state.gear1Params.module).toBe(3.0)
    expect(state.gear1Params.faceWidth).toBe(24)

    // 5. Switch back to Helical -> MUST retain all Helical customizations
    store.setGearType('helical')
    state = useGearStore.getState()
    expect(state.gear1Params.gearType).toBe('helical')
    expect(state.gear1Params.helixAngle).toBe(32)
    expect(state.gear1Params.faceWidth).toBe(28)

    // 6. Switch back to Rack -> MUST retain all Rack customizations
    store.setGearType('rack')
    state = useGearStore.getState()
    expect(state.gear1Params.gearType).toBe('rack')
    expect(state.gear1Params.rackLength).toBe(240)
    expect(state.gear1Params.rackHeight).toBe(35)
  })
})
