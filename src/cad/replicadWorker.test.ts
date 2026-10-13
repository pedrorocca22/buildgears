import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createDefaultSessionConfig } from '../store/useGearStore'
import type { GearParameters } from './types'
import type { StepQualityInfo } from './replicadClient'

// Use the installed kernel on disk while exercising the real worker handler in Node.
vi.mock('replicad-opencascadejs/wasm?url', () => ({
  default: process.cwd().replaceAll('\\', '/') + '/node_modules/replicad-opencascadejs/dist/replicad_single.wasm',
}))
const messages: any[] = []
const workerScope = { onmessage: null as any, postMessage: (message: any) => messages.push(message) }
beforeAll(async () => {
  vi.stubGlobal('self', workerScope)
  await import('./replicadWorker')
})
afterAll(() => vi.unstubAllGlobals())
async function exportQuality(params: GearParameters, gear2Params?: GearParameters): Promise<StepQualityInfo> {
  messages.length = 0
  await workerScope.onmessage({ data: { type: 'EXPORT_STEP', params, gear2Params,
    exportTarget: gear2Params ? 'assembly' : 'default', fileName: 'test.step' } })
  expect(messages.find(m => m.type === 'ERROR')).toBeUndefined()
  const ready = messages.find(m => m.type === 'STEP_READY')
  expect(ready).toBeDefined()
  expect(ready.blob.size).toBeGreaterThan(0)
  expect(ready.quality.ok).toBe(true)
  return ready.quality
}
describe('real OpenCASCADE assembly geometry', () => {
  it.each(['spur', 'internal', 'internal_helical', 'internal_herringbone'] as const)('%s pair contains the same geometry as both separately exported parts', async (type) => {
    const { gear1Params, gear2Params } = createDefaultSessionConfig(type)
    if (type === 'internal_herringbone' || type === 'internal_helical') {
      gear1Params.teeth = 32
      gear2Params.teeth = 16
      gear1Params.faceWidth = gear2Params.faceWidth = 12
    }
    gear2Params.bodyStyle = 'hub'
    gear2Params.boreDiameter = 8
    gear2Params.hubDiameter = 22
    gear2Params.hubOffset = 3
    gear2Params.hasKeyway = true
    const first = await exportQuality(gear1Params)
    const second = await exportQuality(gear2Params)
    const pair = await exportQuality(gear1Params, gear2Params)
    expect(pair.volumeMm3).toBeCloseTo(first.volumeMm3 + second.volumeMm3, 1)
    expect(pair.faces).toBe(first.faces + second.faces)
    expect(pair.solids).toBe(first.solids + second.solids)
  }, 90000)
})
