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
}

interface GearStoreState {
  activeTopTab: 'design' | 'assembly'
  params: GearParameters
  meshingPair: MeshingPairParameters
  viewSettings: ViewSettings
  exportStatus: ExportStatus

  // Acciones
  setActiveTopTab: (tab: 'design' | 'assembly') => void
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
  webThickness: 8,
  holeCount: 5,
  holeDiameter: 8,
  holeCircleRadius: 21,
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
  rackPinionHasKeyway: false,
  rackPinionHasToothChamfer: false,
  rackPinionToothChamfer: 0.6,
  rackPinionProfileShift: 0.0,
  rackViewFocus: 'both',
}


export const useGearStore = create<GearStoreState>((set) => ({
  activeTopTab: 'design',

  params: defaultParams,

  meshingPair: {
    enabled: false,
    teeth2: 17,
    showCenterLine: true,
    animate: true,
    rpm: 25,
  },

  viewSettings: {
    wireframe: false,
    showAxes: false,
    showGrid: true,
    flatColor: 'mustard', // Color plano por defecto igual que en la imagen de referencia
    showDimensions: true,
    sectionCut: false,
    sectionPosition: 0,
    cameraView: 'iso',
  },

  exportStatus: {
    isExporting: false,
    progress: 0,
    message: '',
    isModalOpen: false,
    pendingFormat: 'step',
    pendingTarget: 'default',
  },

  setActiveTopTab: (tab) =>
    set({
      activeTopTab: tab,
      meshingPair: {
        ...useGearStore.getState().meshingPair,
        enabled: tab === 'assembly',
      },
    }),

  setGearParam: (key, value) =>
    set((state) => ({
      params: { ...state.params, [key]: value },
    })),

  setGearParams: (partial) =>
    set((state) => ({
      params: { ...state.params, ...partial },
    })),

  setGearType: (type) =>
    set((state) => ({
      params: { ...state.params, gearType: type },
    })),

  setMeshingPair: (key, value) =>
    set((state) => ({
      meshingPair: { ...state.meshingPair, [key]: value },
    })),

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
    set((state) => ({
      params: { ...defaultParams, gearType: state.params.gearType },
    })),

  loadPreset: (presetName) => {
    switch (presetName) {
      case 'default_spur':
        set((state) => ({
          params: {
            ...state.params,
            gearType: 'spur',
            module: 2.5,
            teeth: 26,
            pressureAngle: 20,
            faceWidth: 20,
            bodyStyle: 'solid',
            boreDiameter: 0,
            hasKeyway: false,
          },
        }))
        break
      case 'fast_helical':
        set((state) => ({
          params: {
            ...state.params,
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
          },
        }))
        break
      case 'heavy_herringbone':
        set((state) => ({
          params: {
            ...state.params,
            gearType: 'herringbone',
            module: 3.0,
            teeth: 24,
            helixAngle: 30,
            faceWidth: 35,
            bodyStyle: 'spoke',
            holeCount: 6,
            holeDiameter: 10,
            holeCircleRadius: 26,
            boreDiameter: 25,
            hasKeyway: true,
          },
        }))
        break
      case 'spoke_drive':
        set((state) => ({
          params: {
            ...state.params,
            gearType: 'spur',
            module: 3.5,
            teeth: 36,
            faceWidth: 28,
            bodyStyle: 'spoke',
            holeCount: 6,
            holeDiameter: 14,
            holeCircleRadius: 42,
            boreDiameter: 28,
            hasKeyway: true,
          },
        }))
        break
      case 'planetary_sun':
        set((state) => ({
          params: {
            ...state.params,
            gearType: 'internal',
            module: 2.0,
            teeth: 42,
            faceWidth: 18,
            outerRingDiameter: 105,
            boreDiameter: 0,
            hasKeyway: false,
          },
        }))
        break
      case 'precision_rack':
        set((state) => ({
          params: {
            ...state.params,
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
          },
        }))
        break
    }
  },
}))

