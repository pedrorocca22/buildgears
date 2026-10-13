import { afterEach, describe, expect, it, vi } from 'vitest'
import { exportGearToSTEP, resetWorker } from './replicadClient'
import { createDefaultSessionConfig } from '../store/useGearStore'

let payload: any
class FakeWorker {
  listeners = new Set<(event: MessageEvent) => void>()
  addEventListener(_type: string, listener: (event: MessageEvent) => void) { this.listeners.add(listener) }
  removeEventListener(_type: string, listener: (event: MessageEvent) => void) { this.listeners.delete(listener) }
  terminate() {}
  postMessage(message: any) {
    payload = structuredClone(message)
    for (const listener of this.listeners) listener({ data: {
      type: 'STEP_READY', blob: new Blob(), fileName: message.fileName, sizeBytes: 0,
    } } as MessageEvent)
  }
}
afterEach(() => { resetWorker(); vi.unstubAllGlobals() })
describe('STEP worker transport', () => {
  it('sends the actual independent Gear 2 parameters and teeth in the filename', async () => {
    vi.stubGlobal('Worker', FakeWorker)
    const { gear1Params, gear2Params } = createDefaultSessionConfig('helical')
    gear2Params.boreDiameter = 8
    gear2Params.bodyStyle = 'hub'
    gear2Params.hasKeyway = true
    gear2Params.profileShift = -0.2
    const result = await exportGearToSTEP(gear1Params, undefined, 'assembly', gear2Params)
    expect(payload.params).toEqual(gear1Params)
    expect(payload.gear2Params).toEqual(gear2Params)
    expect(result.fileName).toContain('z1_26_z2_17')
  })
})
