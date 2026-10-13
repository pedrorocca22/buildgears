import type { GearParameters } from './types'
import { calculateDimensions } from './gearMath'

/** Assembly identity must not depend on the gear selected in the editor. */
export function resolveExportParameters(
  state: { params: GearParameters; gear1Params: GearParameters; gear2Params: GearParameters },
  target: string,
): { params: GearParameters; gear2Params?: GearParameters } {
  return target === 'assembly'
    ? { params: { ...state.gear1Params }, gear2Params: { ...state.gear2Params } }
    : { params: { ...state.params } }
}

export function getAssemblyLayout(params: GearParameters, gear2Params?: GearParameters) {
  if (!gear2Params) throw new Error('Gear 2 parameters are required for assembly export')
  const dims = calculateDimensions(params, gear2Params)
  const centerDistance = dims.workingCenterDistance ?? dims.centerDistance
  if (centerDistance === undefined) throw new Error('Cannot calculate gear pair center distance')
  return { gear2Params, centerDistance }
}
