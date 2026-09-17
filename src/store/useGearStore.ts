import { create } from 'zustand'
import type { GearParameters, MeshingPairParameters, ExportStatus, GearType } from '../cad/types'

export type FlatColor = 'mustard' | 'orange' | 'blue' | 'white' | 'charcoal' | 'green'

export interface ViewSettings {
  wireframe: boolean
  showAxes: boolean
  showGrid: boolean
  flatColor: FlatColor
  showDimensions: boolean
  sectionCut: boolean
  sectionPosition: number // -1 a 1
  cameraView: 'iso' | 'front' | 'top' | 'left' | 'right'
  cameraProjection: 'perspective' | 'orthographic'
}

interface GearStoreState {
  params: GearParameters
  gear1Params: GearParameters
  gear2Params: GearParameters
  selectedGear: 1 | 2
  gear2Enabled: boolean
  motorized: boolean
  motorRpm: number

  meshingPair: MeshingPairParameters
  viewSettings: ViewSettings
  exportStatus: ExportStatus

  // Acciones
  selectGear: (id: 1 | 2) => void
  setGear2Enabled: (enabled: boolean) => void
  setMotorized: (motorized: boolean) => void
  setMotorRpm: (rpm: number) => void
  setGearParam: <K extends keyof GearParameters>(key: K, value: GearParameters[K]) => void
  setGearParams: (partial: Partial<GearParameters>) => void
  setGearType: (type: GearType) => void
  setMeshingPair: <K extends keyof MeshingPairParameters>(key: K, value: MeshingPairParameters[K]) => void
  setViewSetting: <K extends keyof ViewSettings>(key: K, value: ViewSettings[K]) => void
  setExportStatus: (status: Partial<ExportStatus>) => void
  openExportModal: (format: 'stl' | '3mf' | 'step', target?: 'default' | 'rack' | 'pinion' | 'assembly') => void
  closeExportModal: () => void
  loadPreset: (presetName: 'default_spur' | 'fast_helical' | 'heavy_herringbone' | 'spoke_drive' | 'planetary_sun' | 'precision_rack') => void
  resetCurrentGear: () => void
}

const defaultParams: GearParameters = {
  gearType: 'spur',
  module: 2.5,
  teeth: 26,
  pressureAngle: 20,
  helixAngle: 20,
  helixHand: 'right',
  profileShift: 0.0,
  backlash: 0.05,
  addendumCoeff: 1.0,
  dedendumCoeff: 1.25,
  faceWidth: 20,
  hasToothChamfer: false,
  toothChamfer: 0.6,
  boreDiameter: 0,
  hasKeyway: false,
  bodyStyle: 'solid',
  hubDiameter: 34,
  hubLength: 26,
  hubOffset: 4,
  hubBothSides: false,
  outerRingDiameter: 85,
  rackLength: 160,
  rackHeight: 25,
  rackMountingHoles: true,
  rackScrewStandard: 'M5',
  rackHoleCount: 3,
  rackHolePosition: 'bottom',
  rackToothType: 'spur',
  rackIncludePinion: true,
  rackPinionTeeth: 20,
  rackPinionBore: 0,
  rackPinionFaceWidth: 20,
  rackPinionBodyStyle: 'solid',
  rackPinionHubDiameter: 28,
  rackPinionHubLength: 26,
  rackPinionHubOffset: 4,
  rackPinionHubBothSides: false,
  rackPinionHasKeyway: false,
  rackPinionHasToothChamfer: false,
  rackPinionToothChamfer: 0.6,
  rackPinionProfileShift: 0.0,
  rackViewFocus: 'both',
}

const defaultGear2Params: GearParameters = {
  ...defaultParams,
  teeth: 17,
  helixHand: 'left',
  bodyStyle: 'solid',
  boreDiameter: 0,
  hubDiameter: 26,
  hubLength: 26,
  hubOffset: 4,
  hubBothSides: false,
  hasKeyway: false,
}

// Función auxiliar para adaptar un engranaje receptor ante cambios en el engranaje emisor
function adaptConjugateParams(
  sender: GearParameters,
  receiver: GearParameters,
  modifiedKey: keyof GearParameters,
  newValue: any
): GearParameters {
  const adapted = { ...receiver }

  switch (modifiedKey) {
    case 'module':
      adapted.module = newValue as number
      break
    case 'pressureAngle':
      adapted.pressureAngle = newValue as number
      break
    case 'gearType': {
      const gType = newValue as GearType
      adapted.gearType = gType
      if (gType === 'helical' || gType === 'herringbone') {
        adapted.helixAngle = sender.helixAngle || 20
        adapted.helixHand = sender.helixHand === 'right' ? 'left' : 'right'
      } else if (gType === 'spur') {
        adapted.helixAngle = 0
      }
      break
    }
    case 'helixAngle':
      adapted.helixAngle = newValue as number
      break
    case 'helixHand':
      adapted.helixHand = (newValue === 'right' ? 'left' : 'right') as any
      break
    case 'toothProfileType':
      adapted.toothProfileType = newValue as any
      if (newValue === 'stub') {
        adapted.addendumCoeff = 0.8
        adapted.dedendumCoeff = 1.0
      } else if (newValue === 'deep') {
        adapted.addendumCoeff = 1.2
        adapted.dedendumCoeff = 1.4
      } else if (newValue === 'standard') {
        adapted.addendumCoeff = 1.0
        adapted.dedendumCoeff = 1.25
      } else if (newValue === 'cycloidal') {
        adapted.addendumCoeff = 1.0
        adapted.dedendumCoeff = 1.2
      }
      break
    case 'addendumCoeff':
      adapted.addendumCoeff = newValue as number
      break
    case 'dedendumCoeff':
      adapted.dedendumCoeff = newValue as number
      break
    case 'backlash':
      adapted.backlash = newValue as number
      break
    case 'faceWidth':
      adapted.faceWidth = newValue as number
      break
  }

  return adapted
}

export const useGearStore = create<GearStoreState>((set) => ({
  params: defaultParams,
  gear1Params: defaultParams,
  gear2Params: defaultGear2Params,
  selectedGear: 1,
  gear2Enabled: false,
  motorized: false,
  motorRpm: 25,

  meshingPair: {
    enabled: false,
    teeth2: 17,
    showCenterLine: true,
    animate: false,
    rpm: 25,
    previewDeltaA: null,
  },

  viewSettings: {
    wireframe: false,
    showAxes: false,
    showGrid: true,
    flatColor: 'mustard',
    showDimensions: false,
    sectionCut: false,
    sectionPosition: 0,
    cameraView: 'iso',
    cameraProjection: 'orthographic',
  },

  exportStatus: {
    isExporting: false,
    progress: 0,
    message: '',
    isModalOpen: false,
    pendingFormat: 'step',
    pendingTarget: 'default',
  },

  selectGear: (id) =>
    set((state) => ({
      selectedGear: id,
      params: id === 1 ? state.gear1Params : state.gear2Params,
    })),

  setGear2Enabled: (enabled) =>
    set((state) => {
      const nextSelected = enabled ? state.selectedGear : 1
      return {
        gear2Enabled: enabled,
        selectedGear: nextSelected,
        params: nextSelected === 1 ? state.gear1Params : state.gear2Params,
        meshingPair: {
          ...state.meshingPair,
          enabled,
          teeth2: state.gear2Params.teeth,
        },
      }
    }),

  setMotorized: (motorized) =>
    set((state) => ({
      motorized,
      meshingPair: {
        ...state.meshingPair,
        animate: motorized,
      },
    })),

  setMotorRpm: (rpm) =>
    set((state) => ({
      motorRpm: rpm,
      meshingPair: {
        ...state.meshingPair,
        rpm,
      },
    })),

  setGearParam: (key, value) =>
    set((state) => {
      const isG1 = state.selectedGear === 1
      const active = isG1 ? state.gear1Params : state.gear2Params
      const other = isG1 ? state.gear2Params : state.gear1Params

      const updatedActive = { ...active, [key]: value }
      const updatedOther = adaptConjugateParams(updatedActive, other, key, value)

      const newG1 = isG1 ? updatedActive : updatedOther
      const newG2 = isG1 ? updatedOther : updatedActive

      return {
        gear1Params: newG1,
        gear2Params: newG2,
        params: isG1 ? newG1 : newG2,
        meshingPair: {
          ...state.meshingPair,
          teeth2: newG2.teeth,
        },
      }
    }),

  setGearParams: (partial) =>
    set((state) => {
      const isG1 = state.selectedGear === 1
      let active = { ...(isG1 ? state.gear1Params : state.gear2Params), ...partial }
      let other = { ...(isG1 ? state.gear2Params : state.gear1Params) }

      for (const [k, v] of Object.entries(partial)) {
        other = adaptConjugateParams(active, other, k as keyof GearParameters, v)
      }

      const newG1 = isG1 ? active : other
      const newG2 = isG1 ? other : active

      return {
        gear1Params: newG1,
        gear2Params: newG2,
        params: isG1 ? newG1 : newG2,
        meshingPair: {
          ...state.meshingPair,
          teeth2: newG2.teeth,
        },
      }
    }),

  setGearType: (type) => {
    useGearStore.getState().setGearParam('gearType', type)
  },

  setMeshingPair: (key, value) =>
    set((state) => {
      const newMeshingPair = { ...state.meshingPair, [key]: value }
      // Sincronizar hacia Gear 2 y motorización si se modifica meshingPair directamente
      let nextGear2 = state.gear2Params
      let nextGear2Enabled = state.gear2Enabled
      let nextMotorized = state.motorized
      let nextMotorRpm = state.motorRpm

      if (key === 'enabled') {
        nextGear2Enabled = Boolean(value)
      } else if (key === 'animate') {
        nextMotorized = Boolean(value)
      } else if (key === 'rpm') {
        nextMotorRpm = Number(value)
      } else if (key === 'teeth2') {
        nextGear2 = { ...nextGear2, teeth: Number(value) }
      }

      return {
        meshingPair: newMeshingPair,
        gear2Enabled: nextGear2Enabled,
        motorized: nextMotorized,
        motorRpm: nextMotorRpm,
        gear2Params: nextGear2,
        params: state.selectedGear === 2 ? nextGear2 : state.gear1Params,
      }
    }),

  setViewSetting: (key, value) =>
    set((state) => ({
      viewSettings: { ...state.viewSettings, [key]: value },
    })),

  setExportStatus: (status) =>
    set((state) => ({
      exportStatus: { ...state.exportStatus, ...status },
    })),

  openExportModal: (format, target = 'default') =>
    set((state) => ({
      exportStatus: {
        ...state.exportStatus,
        isModalOpen: true,
        pendingFormat: format,
        pendingTarget: target,
        isExporting: false,
        progress: 0,
        message: '',
        error: undefined,
      },
    })),

  closeExportModal: () =>
    set((state) => ({
      exportStatus: {
        ...state.exportStatus,
        isModalOpen: false,
        isExporting: false,
        progress: 0,
        message: '',
        error: undefined,
      },
    })),

  resetCurrentGear: () =>
    set((state) => {
      if (state.selectedGear === 1) {
        const resetG1: GearParameters = { ...defaultParams, gearType: state.gear1Params.gearType }
        const updatedG2 = adaptConjugateParams(resetG1, state.gear2Params, 'module', resetG1.module)
        return {
          gear1Params: resetG1,
          gear2Params: updatedG2,
          params: resetG1,
        }
      } else {
        const resetG2: GearParameters = {
          ...defaultGear2Params,
          module: state.gear1Params.module,
          pressureAngle: state.gear1Params.pressureAngle,
          helixAngle: state.gear1Params.helixAngle,
          helixHand: state.gear1Params.helixHand === 'right' ? 'left' : 'right',
          gearType: state.gear1Params.gearType,
          toothProfileType: state.gear1Params.toothProfileType,
          addendumCoeff: state.gear1Params.addendumCoeff,
          dedendumCoeff: state.gear1Params.dedendumCoeff,
        }
        return {
          gear2Params: resetG2,
          params: resetG2,
          meshingPair: {
            ...state.meshingPair,
            teeth2: resetG2.teeth,
          },
        }
      }
    }),

  loadPreset: (presetName) => {
    let presetG1: Partial<GearParameters> = {}
    switch (presetName) {
      case 'default_spur':
        presetG1 = {
          gearType: 'spur',
          module: 2.5,
          teeth: 26,
          pressureAngle: 20,
          faceWidth: 20,
          bodyStyle: 'solid',
          boreDiameter: 0,
          hasKeyway: false,
        }
        break
      case 'fast_helical':
        presetG1 = {
          gearType: 'helical',
          module: 2.0,
          teeth: 32,
          helixAngle: 22,
          helixHand: 'right',
          pressureAngle: 20,
          faceWidth: 25,
          bodyStyle: 'hub',
          hubDiameter: 36,
          hubOffset: 6,
          boreDiameter: 20,
          hasKeyway: true,
        }
        break
      case 'heavy_herringbone':
        presetG1 = {
          gearType: 'herringbone',
          module: 3.0,
          teeth: 24,
          helixAngle: 30,
          faceWidth: 35,
          bodyStyle: 'hub',
          hubDiameter: 38,
          hubLength: 35,
          hubOffset: 5,
          boreDiameter: 25,
          hasKeyway: true,
        }
        break
      case 'spoke_drive':
        presetG1 = {
          gearType: 'spur',
          module: 3.5,
          teeth: 36,
          faceWidth: 28,
          bodyStyle: 'hub',
          hubDiameter: 48,
          hubLength: 30,
          hubOffset: 4,
          boreDiameter: 28,
          hasKeyway: true,
        }
        break
      case 'planetary_sun':
        presetG1 = {
          gearType: 'internal',
          module: 2.0,
          teeth: 42,
          faceWidth: 18,
          outerRingDiameter: 105,
          boreDiameter: 0,
          hasKeyway: false,
        }
        break
      case 'precision_rack':
        presetG1 = {
          gearType: 'rack',
          module: 2.0,
          pressureAngle: 20,
          helixAngle: 0,
          faceWidth: 20,
          rackLength: 180,
          rackHeight: 25,
          rackMountingHoles: true,
          rackScrewStandard: 'M5',
          rackHoleCount: 4,
          rackHolePosition: 'bottom',
          rackPinionTeeth: 24,
          rackPinionBore: 0,
          rackPinionBodyStyle: 'solid',
          rackPinionHasKeyway: false,
        }
        break
    }

    set((state) => {
      const newG1: GearParameters = { ...state.gear1Params, ...presetG1 }
      let newG2: GearParameters = { ...state.gear2Params }
      for (const [k, v] of Object.entries(presetG1)) {
        newG2 = adaptConjugateParams(newG1, newG2, k as keyof GearParameters, v)
      }
      return {
        gear1Params: newG1,
        gear2Params: newG2,
        params: state.selectedGear === 1 ? newG1 : newG2,
        meshingPair: {
          ...state.meshingPair,
          teeth2: newG2.teeth,
        },
      }
    })
  },
}))
