import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGearStore, createDefaultSessionConfig } from '../store/useGearStore'
import { calculateDimensions, generateInvoluteProfile } from './gearMath'
import { buildGearManifold } from './manifoldEngine'
import { getAssemblyLayout } from './exportParameters'

vi.mock('manifold-3d/manifold.wasm?url', () => ({
  default: process.cwd().replaceAll('\\', '/') + '/node_modules/manifold-3d/manifold.wasm',
}))
beforeEach(() => useGearStore.getState().resetAllGearConfigs())
describe('internal herringbone ring and pinion', () => {
  it('creates an inward-facing ring and a smaller double-helical mate', () => {
    const { gear1Params: ring, gear2Params: pinion } = createDefaultSessionConfig('internal_herringbone')
    expect(ring.gearType).toBe('internal_herringbone')
    expect(pinion.gearType).toBe('herringbone')
    expect(pinion.teeth).toBeLessThan(ring.teeth)
    expect(pinion.helixHand).toBe(ring.helixHand)
    const dims = calculateDimensions(ring, pinion)
    expect(dims.tipRadius).toBeLessThan(dims.pitchRadius)
    expect(dims.rootRadius).toBeGreaterThan(dims.pitchRadius)
    expect(dims.axialThrustRatio).toBe(0)
    expect(dims.bottomClearance).toBeCloseTo(ring.module * 0.25, 2)
    expect(dims.hasMeshInterference).toBe(false)
    const radii = generateInvoluteProfile(ring).map(([x, y]) => Math.hypot(x, y))
    expect(Math.min(...radii)).toBeCloseTo(dims.tipRadius, 4)
    expect(Math.max(...radii)).toBeCloseTo(dims.rootRadius, 4)
    expect(getAssemblyLayout(ring, pinion).centerDistance).toBeCloseTo(dims.pitchRadius - calculateDimensions(pinion).pitchRadius, 2)
  })

  it('synchronizes helix angle and SAME hand from either gear while preserving bore and hub', () => {
    const store = useGearStore.getState()
    store.setGearType('internal_herringbone')
    store.setGear2Enabled(true)
    store.setGearParam('helixHand', 'left')
    expect(useGearStore.getState().gear2Params.helixHand).toBe('left')
    store.selectGear(2)
    store.setGearParams({ boreDiameter: 8, bodyStyle: 'hub', hubDiameter: 22 })
    store.setGearParam('helixHand', 'right')
    store.setGearParam('helixAngle', 30)
    const state = useGearStore.getState()
    expect(state.gear1Params.helixHand).toBe('right')
    expect(state.gear1Params.helixAngle).toBe(30)
    expect(state.gear1Params.boreDiameter).toBe(0)
    expect(state.gear2Params.boreDiameter).toBe(8)
    const fromRing = calculateDimensions(state.gear1Params, state.gear2Params)
    const fromPinion = calculateDimensions(state.gear2Params, state.gear1Params)
    expect(fromPinion.workingCenterDistance).toBe(fromRing.workingCenterDistance)
    expect(fromPinion.operatingPitchRadius1).toBe(fromRing.operatingPitchRadius2)
  })

  it('limits pinion teeth and resets it to a matching double helix', () => {
    const store = useGearStore.getState()
    store.setGearType('internal_herringbone')
    store.setGear2Enabled(true)
    store.setGearParam('helixHand', 'left')
    store.setGearParam('helixAngle', 30)
    store.selectGear(2)
    store.setGearParam('teeth', 100)
    expect(useGearStore.getState().gear2Params.teeth).toBe(44)
    store.resetCurrentGear()
    const state = useGearStore.getState()
    expect(state.gear2Params.gearType).toBe('herringbone')
    expect(state.gear2Params.helixHand).toBe('left')
    expect(state.gear2Params.helixAngle).toBe(30)
  })

  it('matches profile shifts for the nominal internal center distance', () => {
    const store = useGearStore.getState()
    store.setGearType('internal_herringbone')
    store.setGear2Enabled(true)
    store.setGearParam('profileShift', 0.3)
    store.autoCompensateProfileShift()
    const { gear1Params: ring, gear2Params: pinion } = useGearStore.getState()
    expect(pinion.profileShift).toBe(0.3)
    const dims = calculateDimensions(ring, pinion)
    expect(dims.workingCenterDistance).toBe(dims.centerDistance)
  })

  it('restores its own session after switching to an external gear', () => {
    const store = useGearStore.getState()
    store.setGearType('internal_herringbone')
    store.setGearParam('outerRingDiameter', 190)
    store.setGear2Enabled(true)
    store.selectGear(2)
    store.setGearParam('boreDiameter', 9)
    store.setGearType('herringbone')
    store.setGearType('internal_herringbone')
    const state = useGearStore.getState()
    expect(state.selectedGear).toBe(2)
    expect(state.gear2Enabled).toBe(true)
    expect(state.gear1Params.outerRingDiameter).toBe(190)
    expect(state.gear2Params.boreDiameter).toBe(9)
  })

  it.each(['right', 'left'] as const)('generates valid hollow %s-hand solids that mesh inside the ring', async (hand) => {
    const { gear1Params: ring, gear2Params: pinion } = createDefaultSessionConfig('internal_herringbone')
    ring.helixHand = pinion.helixHand = hand
    const solid1 = await buildGearManifold(ring)
    const solid2 = await buildGearManifold(pinion)
    expect(solid1.status()).toBe('NoError')
    expect(solid2.status()).toBe('NoError')
    expect(solid1.volume()).toBeGreaterThan(0)
    expect(solid1.getMesh().numTri).toBeGreaterThan(0)
    expect(solid1.boundingBox().min[2]).toBeCloseTo(-ring.faceWidth / 2, 4)
    expect(solid1.boundingBox().max[2]).toBeCloseTo(ring.faceWidth / 2, 4)
    const radial = []
    const mesh = solid1.getMesh()
    for (let i = 0; i < mesh.vertProperties.length; i += mesh.numProp) radial.push(Math.hypot(mesh.vertProperties[i], mesh.vertProperties[i + 1]))
    expect(Math.min(...radial)).toBeGreaterThan(calculateDimensions(ring).tipRadius - 0.1)
    const positioned = solid2.translate([getAssemblyLayout(ring, pinion).centerDistance, 0, 0])
    const collision = solid1.intersect(positioned)
    expect(collision.volume()).toBeLessThan(solid2.volume() * 0.001)
    for (const angle of [1, 2, 3, 5]) {
      const rotatingRing = solid1.rotate([0, 0, angle])
      const rotatingPinion = solid2.rotate([0, 0, angle * ring.teeth / pinion.teeth])
        .translate([getAssemblyLayout(ring, pinion).centerDistance, 0, 0])
      const intersection = rotatingRing.intersect(rotatingPinion)
      expect(intersection.volume()).toBeLessThan(solid2.volume() * 0.001)
      intersection.delete(); rotatingPinion.delete(); rotatingRing.delete()
    }
    expect(positioned.boundingBox().max[0]).toBeLessThan((ring.outerRingDiameter || 170) / 2)
    collision.delete(); positioned.delete(); solid1.delete(); solid2.delete()
  })
})
