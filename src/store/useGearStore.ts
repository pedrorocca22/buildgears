import { create } from 'zustand'
import type { GearParameters, MeshingPairParameters, ExportStatus, GearType } from '../cad/types'

export type FlatColor = 'mustard' | 'orange' | 'blue' | 'white' | 'charcoal' | 'green'

export interface ViewSettings {
  wireframe: boolean
  showAxes: boolean
  showGrid: boolean
  flatColor: FlatColor
  showDimensions: boolean
  showContactZone: boolean
  sectionCut: boolean
  sectionPosition: number // -1 a 1
  cameraView: 'iso' | 'front' | 'top' | 'left' | 'right'
  cameraProjection: 'perspective' | 'orthographic'
}

export interface GearTypeSessionConfig {
  gear1Params: GearParameters
  gear2Params: GearParameters
  selectedGear: 1 | 2
  gear2Enabled: boolean
}

interface GearStoreState {
  params: GearParameters
  gear1Params: GearParameters
  gear2Params: GearParameters
  selectedGear: 1 | 2
  gear2Enabled: boolean
  motorized: boolean
  motorRpm: number

  gearTypeConfigs: Record<GearType, GearTypeSessionConfig>

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
  resetAllGearConfigs: () => void
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
  outerRingDiameter: 95,
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

export function createDefaultSessionConfig(type: GearType): GearTypeSessionConfig {
  switch (type) {
    case 'spur': {
      const g1: GearParameters = {
        ...defaultParams,
        gearType: 'spur',
        module: 2.5,
        teeth: 26,
        pressureAngle: 20,
        helixAngle: 0,
        faceWidth: 20,
        bodyStyle: 'solid',
        boreDiameter: 0,
        hasKeyway: false,
      }
      const g2: GearParameters = {
        ...defaultGear2Params,
        gearType: 'spur',
        module: 2.5,
        teeth: 17,
        pressureAngle: 20,
        helixAngle: 0,
        faceWidth: 20,
        bodyStyle: 'solid',
        boreDiameter: 0,
        hasKeyway: false,
      }
      return {
        gear1Params: g1,
        gear2Params: g2,
        selectedGear: 1,
        gear2Enabled: false,
      }
    }

    case 'helical': {
      const g1: GearParameters = {
        ...defaultParams,
        gearType: 'helical',
        module: 2.5,
        teeth: 26,
        pressureAngle: 20,
        helixAngle: 20,
        helixHand: 'right',
        faceWidth: 22,
        bodyStyle: 'solid',
        boreDiameter: 0,
        hasKeyway: false,
      }
      const g2: GearParameters = {
        ...defaultGear2Params,
        gearType: 'helical',
        module: 2.5,
        teeth: 17,
        pressureAngle: 20,
        helixAngle: 20,
        helixHand: 'left',
        faceWidth: 22,
        bodyStyle: 'solid',
        boreDiameter: 0,
        hasKeyway: false,
      }
      return {
        gear1Params: g1,
        gear2Params: g2,
        selectedGear: 1,
        gear2Enabled: false,
      }
    }

    case 'herringbone': {
      const g1: GearParameters = {
        ...defaultParams,
        gearType: 'herringbone',
        module: 2.5,
        teeth: 26,
        pressureAngle: 20,
        helixAngle: 25,
        helixHand: 'right',
        faceWidth: 30,
        bodyStyle: 'solid',
        boreDiameter: 0,
        hasKeyway: false,
      }
      const g2: GearParameters = {
        ...defaultGear2Params,
        gearType: 'herringbone',
        module: 2.5,
        teeth: 17,
        pressureAngle: 20,
        helixAngle: 25,
        helixHand: 'left',
        faceWidth: 30,
        bodyStyle: 'solid',
        boreDiameter: 0,
        hasKeyway: false,
      }
      return {
        gear1Params: g1,
        gear2Params: g2,
        selectedGear: 1,
        gear2Enabled: false,
      }
    }

    case 'internal': {
      const g1: GearParameters = {
        ...defaultParams,
        gearType: 'internal',
        module: 2.5,
        teeth: 30,
        pressureAngle: 20,
        helixAngle: 0,
        faceWidth: 20,
        outerRingDiameter: 95,
        bodyStyle: 'solid',
        boreDiameter: 0,
        hasKeyway: false,
      }
      const g2: GearParameters = {
        ...defaultGear2Params,
        gearType: 'spur',
        module: 2.5,
        teeth: 14,
        pressureAngle: 20,
        helixAngle: 0,
        faceWidth: 20,
        bodyStyle: 'solid',
        boreDiameter: 0,
        hubDiameter: 24,
        hubLength: 24,
        hubOffset: 4,
        hasKeyway: false,
      }
      return {
        gear1Params: g1,
        gear2Params: g2,
        selectedGear: 1,
        gear2Enabled: false,
      }
    }

    case 'rack': {
      const g1: GearParameters = {
        ...defaultParams,
        gearType: 'rack',
        module: 2.5,
        pressureAngle: 20,
        helixAngle: 0,
        faceWidth: 20,
        rackLength: 160,
        rackHeight: 25,
        rackToothType: 'spur',
        rackMountingHoles: true,
        rackScrewStandard: 'M5',
        rackHoleCount: 3,
        rackHolePosition: 'bottom',
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
      const g2: GearParameters = {
        ...defaultGear2Params,
        gearType: 'spur',
        module: 2.5,
        teeth: 20,
        pressureAngle: 20,
        helixAngle: 0,
        faceWidth: 20,
        bodyStyle: 'solid',
        boreDiameter: 0,
        hasKeyway: false,
      }
      return {
        gear1Params: g1,
        gear2Params: g2,
        selectedGear: 1,
        gear2Enabled: false,
      }
    }

    case 'bevel': {
      const g1: GearParameters = {
        ...defaultParams,
        gearType: 'bevel',
        module: 2.5,
        teeth: 24,
        pressureAngle: 20,
        helixAngle: 0,
        faceWidth: 16,
        bodyStyle: 'solid',
        boreDiameter: 0,
        hubDiameter: 30,
        hubLength: 24,
        hubOffset: 4,
        hasKeyway: false,
      }
      const g2: GearParameters = {
        ...defaultGear2Params,
        gearType: 'bevel',
        module: 2.5,
        teeth: 24,
        pressureAngle: 20,
        helixAngle: 0,
        faceWidth: 16,
        bodyStyle: 'solid',
        boreDiameter: 0,
        hubDiameter: 30,
        hubLength: 24,
        hubOffset: 4,
        hasKeyway: false,
      }
      return {
        gear1Params: g1,
        gear2Params: g2,
        selectedGear: 1,
        gear2Enabled: false,
      }
    }
  }
}

export function createInitialGearTypeConfigs(): Record<GearType, GearTypeSessionConfig> {
  return {
    spur: createDefaultSessionConfig('spur'),
    helical: createDefaultSessionConfig('helical'),
    herringbone: createDefaultSessionConfig('herringbone'),
    internal: createDefaultSessionConfig('internal'),
    rack: createDefaultSessionConfig('rack'),
    bevel: createDefaultSessionConfig('bevel'),
  }
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
      if (gType === 'internal') {
        adapted.gearType = 'spur'
        adapted.helixAngle = 0
        if (adapted.teeth >= sender.teeth) {
          adapted.teeth = Math.min(14, Math.max(8, Math.floor(sender.teeth * 0.5)))
        }
      } else if (sender.gearType === 'internal') {
        adapted.gearType = gType
        if (gType === 'helical' || gType === 'herringbone') {
          adapted.helixAngle = sender.helixAngle || 20
          adapted.helixHand = sender.helixHand === 'right' ? 'left' : 'right'
        } else if (gType === 'spur') {
          adapted.helixAngle = 0
        }
      } else {
        adapted.gearType = gType
        if (gType === 'helical' || gType === 'herringbone') {
          adapted.helixAngle = sender.helixAngle || 20
          adapted.helixHand = sender.helixHand === 'right' ? 'left' : 'right'
        } else if (gType === 'spur') {
          adapted.helixAngle = 0
        }
      }
      break
    }
    case 'teeth': {
      const z = newValue as number
      if (sender.gearType === 'internal') {
        if (adapted.teeth >= z) {
          adapted.teeth = Math.max(8, z - 4)
        }
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

const initialConfigs = createInitialGearTypeConfigs()

export const useGearStore = create<GearStoreState>((set) => ({
  gearTypeConfigs: initialConfigs,
  params: initialConfigs.spur.gear1Params,
  gear1Params: initialConfigs.spur.gear1Params,
  gear2Params: initialConfigs.spur.gear2Params,
  selectedGear: initialConfigs.spur.selectedGear,
  gear2Enabled: initialConfigs.spur.gear2Enabled,
  motorized: false,
  motorRpm: 25,

  meshingPair: {
    enabled: false,
    teeth2: initialConfigs.spur.gear2Params.teeth,
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
    showContactZone: true,
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
    set((state) => {
      const currentType = state.gear1Params.gearType
      return {
        selectedGear: id,
        params: id === 1 ? state.gear1Params : state.gear2Params,
        gearTypeConfigs: {
          ...state.gearTypeConfigs,
          [currentType]: {
            gear1Params: state.gear1Params,
            gear2Params: state.gear2Params,
            selectedGear: id,
            gear2Enabled: state.gear2Enabled,
          },
        },
      }
    }),

  setGear2Enabled: (enabled) =>
    set((state) => {
      const nextSelected = enabled ? state.selectedGear : 1
      let nextG2 = { ...state.gear2Params }
      if (enabled && state.gear1Params.gearType === 'internal') {
        nextG2.gearType = 'spur'
        if (nextG2.teeth >= state.gear1Params.teeth) {
          nextG2.teeth = Math.min(14, Math.max(8, Math.floor(state.gear1Params.teeth * 0.5)))
        }
      }
      const currentType = state.gear1Params.gearType
      return {
        gear2Enabled: enabled,
        selectedGear: nextSelected,
        gear2Params: nextG2,
        params: nextSelected === 1 ? state.gear1Params : nextG2,
        meshingPair: {
          ...state.meshingPair,
          enabled,
          teeth2: nextG2.teeth,
        },
        gearTypeConfigs: {
          ...state.gearTypeConfigs,
          [currentType]: {
            gear1Params: state.gear1Params,
            gear2Params: nextG2,
            selectedGear: nextSelected,
            gear2Enabled: enabled,
          },
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
      if (key === 'gearType') {
        const targetType = value as GearType
        const currentType = state.gear1Params.gearType
        if (currentType === targetType) return state

        const currentConfig: GearTypeSessionConfig = {
          gear1Params: state.gear1Params,
          gear2Params: state.gear2Params,
          selectedGear: state.selectedGear,
          gear2Enabled: state.gear2Enabled,
        }

        const targetConfig = state.gearTypeConfigs[targetType] || createDefaultSessionConfig(targetType)

        return {
          gearTypeConfigs: {
            ...state.gearTypeConfigs,
            [currentType]: currentConfig,
            [targetType]: targetConfig,
          },
          gear1Params: targetConfig.gear1Params,
          gear2Params: targetConfig.gear2Params,
          selectedGear: targetConfig.selectedGear,
          gear2Enabled: targetConfig.gear2Enabled,
          params: targetConfig.selectedGear === 1 ? targetConfig.gear1Params : targetConfig.gear2Params,
          meshingPair: {
            ...state.meshingPair,
            enabled: targetConfig.gear2Enabled,
            teeth2: targetConfig.gear2Params.teeth,
          },
        }
      }

      const isG1 = state.selectedGear === 1
      const active = isG1 ? state.gear1Params : state.gear2Params
      const other = isG1 ? state.gear2Params : state.gear1Params

      // Si Gear 1 es internal y estamos editando Gear 2 (piñón interno engranado):
      let safeValue = value
      if (!isG1 && state.gear1Params.gearType === 'internal') {
        if (key === 'gearType' && value === 'internal') {
          // El piñón interno no puede ser corona interior
          return state
        }
        if (key === 'teeth') {
          safeValue = Math.min(Number(value), Math.max(8, state.gear1Params.teeth - 4)) as any
        }
      }

      const updatedActive = { ...active, [key]: safeValue }
      const updatedOther = adaptConjugateParams(updatedActive, other, key, safeValue)

      const newG1 = isG1 ? updatedActive : updatedOther
      const newG2 = isG1 ? updatedOther : updatedActive
      const currentType = newG1.gearType

      return {
        gear1Params: newG1,
        gear2Params: newG2,
        params: isG1 ? newG1 : newG2,
        meshingPair: {
          ...state.meshingPair,
          teeth2: newG2.teeth,
        },
        gearTypeConfigs: {
          ...state.gearTypeConfigs,
          [currentType]: {
            gear1Params: newG1,
            gear2Params: newG2,
            selectedGear: state.selectedGear,
            gear2Enabled: state.gear2Enabled,
          },
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
      const currentType = newG1.gearType

      return {
        gear1Params: newG1,
        gear2Params: newG2,
        params: isG1 ? newG1 : newG2,
        meshingPair: {
          ...state.meshingPair,
          teeth2: newG2.teeth,
        },
        gearTypeConfigs: {
          ...state.gearTypeConfigs,
          [currentType]: {
            gear1Params: newG1,
            gear2Params: newG2,
            selectedGear: state.selectedGear,
            gear2Enabled: state.gear2Enabled,
          },
        },
      }
    }),

  setGearType: (type) =>
    set((state) => {
      const currentType = state.gear1Params.gearType
      if (currentType === type) return state

      const currentConfig: GearTypeSessionConfig = {
        gear1Params: state.gear1Params,
        gear2Params: state.gear2Params,
        selectedGear: state.selectedGear,
        gear2Enabled: state.gear2Enabled,
      }

      const targetConfig = state.gearTypeConfigs[type] || createDefaultSessionConfig(type)

      return {
        gearTypeConfigs: {
          ...state.gearTypeConfigs,
          [currentType]: currentConfig,
          [type]: targetConfig,
        },
        gear1Params: targetConfig.gear1Params,
        gear2Params: targetConfig.gear2Params,
        selectedGear: targetConfig.selectedGear,
        gear2Enabled: targetConfig.gear2Enabled,
        params: targetConfig.selectedGear === 1 ? targetConfig.gear1Params : targetConfig.gear2Params,
        meshingPair: {
          ...state.meshingPair,
          enabled: targetConfig.gear2Enabled,
          teeth2: targetConfig.gear2Params.teeth,
        },
      }
    }),

  setMeshingPair: (key, value) =>
    set((state) => {
      const newMeshingPair = { ...state.meshingPair, [key]: value }
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

      const currentType = state.gear1Params.gearType
      return {
        meshingPair: newMeshingPair,
        gear2Enabled: nextGear2Enabled,
        motorized: nextMotorized,
        motorRpm: nextMotorRpm,
        gear2Params: nextGear2,
        params: state.selectedGear === 2 ? nextGear2 : state.gear1Params,
        gearTypeConfigs: {
          ...state.gearTypeConfigs,
          [currentType]: {
            gear1Params: state.gear1Params,
            gear2Params: nextGear2,
            selectedGear: state.selectedGear,
            gear2Enabled: nextGear2Enabled,
          },
        },
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
      const currentType = state.gear1Params.gearType
      if (state.selectedGear === 1) {
        const fresh = createDefaultSessionConfig(currentType)
        return {
          gear1Params: fresh.gear1Params,
          gear2Params: fresh.gear2Params,
          selectedGear: 1,
          gear2Enabled: fresh.gear2Enabled,
          params: fresh.gear1Params,
          gearTypeConfigs: {
            ...state.gearTypeConfigs,
            [currentType]: fresh,
          },
          meshingPair: {
            ...state.meshingPair,
            enabled: fresh.gear2Enabled,
            teeth2: fresh.gear2Params.teeth,
          },
        }
      } else {
        const fresh = createDefaultSessionConfig(currentType)
        let resetG2 = fresh.gear2Params
        resetG2 = {
          ...resetG2,
          module: state.gear1Params.module,
          pressureAngle: state.gear1Params.pressureAngle,
          toothProfileType: state.gear1Params.toothProfileType,
          addendumCoeff: state.gear1Params.addendumCoeff,
          dedendumCoeff: state.gear1Params.dedendumCoeff,
        }
        if (currentType === 'helical' || currentType === 'herringbone') {
          resetG2.helixAngle = state.gear1Params.helixAngle
          resetG2.helixHand = state.gear1Params.helixHand === 'right' ? 'left' : 'right'
          resetG2.faceWidth = state.gear1Params.faceWidth
        } else if (currentType === 'internal') {
          resetG2.gearType = 'spur'
          resetG2.helixAngle = 0
          resetG2.faceWidth = state.gear1Params.faceWidth
          if (resetG2.teeth >= state.gear1Params.teeth) {
            resetG2.teeth = Math.min(14, Math.max(8, Math.floor(state.gear1Params.teeth * 0.5)))
          }
        }
        return {
          gear2Params: resetG2,
          params: resetG2,
          meshingPair: {
            ...state.meshingPair,
            teeth2: resetG2.teeth,
          },
          gearTypeConfigs: {
            ...state.gearTypeConfigs,
            [currentType]: {
              gear1Params: state.gear1Params,
              gear2Params: resetG2,
              selectedGear: 2,
              gear2Enabled: state.gear2Enabled,
            },
          },
        }
      }
    }),

  resetAllGearConfigs: () =>
    set(() => {
      const initial = createInitialGearTypeConfigs()
      return {
        gearTypeConfigs: initial,
        gear1Params: initial.spur.gear1Params,
        gear2Params: initial.spur.gear2Params,
        selectedGear: 1,
        gear2Enabled: false,
        params: initial.spur.gear1Params,
        meshingPair: {
          enabled: false,
          teeth2: initial.spur.gear2Params.teeth,
          showCenterLine: true,
          animate: false,
          rpm: 25,
          previewDeltaA: null,
        },
      }
    }),

  loadPreset: (presetName) => {
    let targetType: GearType = 'spur'
    let presetG1: Partial<GearParameters> = {}
    switch (presetName) {
      case 'default_spur':
        targetType = 'spur'
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
        targetType = 'helical'
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
        targetType = 'herringbone'
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
        targetType = 'spur'
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
        targetType = 'internal'
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
        targetType = 'rack'
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
      const currentType = state.gear1Params.gearType
      const currentConfig: GearTypeSessionConfig = {
        gear1Params: state.gear1Params,
        gear2Params: state.gear2Params,
        selectedGear: state.selectedGear,
        gear2Enabled: state.gear2Enabled,
      }

      const baseConfig =
        currentType === targetType
          ? {
              gear1Params: state.gear1Params,
              gear2Params: state.gear2Params,
              selectedGear: state.selectedGear,
              gear2Enabled: state.gear2Enabled,
            }
          : state.gearTypeConfigs[targetType] || createDefaultSessionConfig(targetType)

      const newG1: GearParameters = { ...baseConfig.gear1Params, ...presetG1 }
      let newG2: GearParameters = { ...baseConfig.gear2Params }
      for (const [k, v] of Object.entries(presetG1)) {
        newG2 = adaptConjugateParams(newG1, newG2, k as keyof GearParameters, v)
      }

      const nextTargetConfig: GearTypeSessionConfig = {
        gear1Params: newG1,
        gear2Params: newG2,
        selectedGear: 1,
        gear2Enabled: baseConfig.gear2Enabled,
      }

      const updatedConfigs = {
        ...state.gearTypeConfigs,
        [currentType]: currentConfig,
        [targetType]: nextTargetConfig,
      }

      return {
        gearTypeConfigs: updatedConfigs,
        gear1Params: newG1,
        gear2Params: newG2,
        selectedGear: 1,
        params: newG1,
        meshingPair: {
          ...state.meshingPair,
          teeth2: newG2.teeth,
        },
      }
    })
  },
}))

