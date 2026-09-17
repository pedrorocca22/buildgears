export type GearType =
  | 'spur'           // Cilíndrico recto
  | 'helical'        // Cilíndrico helicoidal
  | 'herringbone'    // Doble hélice / Espiga
  | 'internal'       // Corona interior
  | 'rack'           // Cremallera
  | 'bevel'          // Cónico recto

export type HelixHand = 'right' | 'left'

export type BodyStyle =
  | 'solid'          // Disco macizo
  | 'hub'            // Con núcleo / valona sobresaliente

export type ToothProfileType =
  | 'standard'    // Estándar ISO 53 / DIN 867 (ha*=1.0, hf*=1.25)
  | 'stub'        // Diente corto AGMA 201.02 / Fellows (ha*=0.8, hf*=1.0)
  | 'deep'        // Diente alto / alto contacto HCR (ha*=1.2, hf*=1.4)
  | 'cycloidal'   // Cicloidal relojero / micromecánica
  | 'custom'      // Coeficientes personalizados

export type RackToothType = 'spur' | 'helical' | 'herringbone'

export interface GearParameters {
  gearType: GearType
  // Dientes e involuta
  module: number          // Módulo normal m (mm), ej: 2.0
  teeth: number           // Número de dientes z, ej: 24
  pressureAngle: number   // Ángulo de presión en grados (14.5, 20, 25), ej: 20
  helixAngle: number      // Ángulo de hélice en grados beta (0 para recto, ej: 20 para helicoidal)
  helixHand: HelixHand    // Mano de la hélice ('right' | 'left')
  profileShift: number    // Desplazamiento de perfil x (coeficiente, ej: 0.0)
  backlash: number        // Juego entre dientes j (mm, ej: 0.05)
  addendumCoeff: number   // Coeficiente de cabeza ha* (estándar 1.0)
  dedendumCoeff: number   // Coeficiente de pie hf* (estándar 1.25)
  toothProfileType?: ToothProfileType // Tipo de diseño de diente (norma de perfil)
  
  faceWidth: number       // Anchura de cara / espesor b (mm), ej: 20
  hasToothChamfer?: boolean // Activar chaflán en caras frontal y posterior del dentado
  toothChamfer?: number    // Dimensión del chaflán c (mm, ej: 0.6)
  boreDiameter: number    // Diámetro del eje central d_eje (mm), ej: 15
  hasKeyway: boolean      // Activar chavetero normalizado DIN 6885
  keywayCustom?: boolean  // Habilitar parametrización manual personalizada del chavetero
  keywayWidth?: number    // Anchura chavetero b (mm)
  keywayDepth?: number    // Profundidad en el buje t_2 (mm)
  
  // Características del cuerpo (Buje)
  bodyStyle: BodyStyle
  hubDiameter: number     // Diámetro exterior del buje (mm)
  hubLength: number       // Longitud total del buje (mm)
  hubOffset: number       // Saliente del buje respecto a la cara (mm)
  hubBothSides?: boolean  // Habilitar buje en ambas caras (superior e inferior). Por defecto: false

  // Opciones para corona interior / aro exterior
  outerRingDiameter?: number // Diámetro exterior del aro de la corona interior

  // Opciones ampliadas para mecanismo de Piñón y Cremallera
  rackLength?: number          // Longitud total de la cremallera (mm, ej: 150)
  rackHeight?: number          // Altura de la barra desde la base a la línea primitiva (mm, ej: 25)
  rackMountingHoles?: boolean  // Mecanizar taladros de fijación
  rackScrewStandard?: 'M3' | 'M4' | 'M5' | 'M6' | 'M8' | 'M10' // Norma DIN 912 / ISO 4762
  rackHoleCount?: number       // Número de taladros a lo largo de la barra
  rackHolePosition?: 'bottom' | 'side' // Orientación: 'bottom' (base) o 'side' (lateral)
  rackToothType?: RackToothType // Tipo de dentado cinemático (spur, helical, herringbone)

  // Piñón motriz conjugado del mecanismo
  rackIncludePinion?: boolean    // Acoplar y mostrar piñón en el mecanismo
  rackPinionTeeth?: number       // Dientes del piñón motriz conjugado (z_p, ej: 20)
  rackPinionBore?: number        // Diámetro eje del piñón motriz (mm, ej: 14)
  rackPinionFaceWidth?: number   // Anchura de cara del piñón b_p (mm, ej: 20)
  rackPinionBodyStyle?: BodyStyle// Estilo cuerpo piñón: 'solid' | 'hub'
  rackPinionHubDiameter?: number // Diámetro buje del piñón (mm)
  rackPinionHubLength?: number   // Longitud buje del piñón (mm)
  rackPinionHubOffset?: number   // Saliente buje del piñón (mm)
  rackPinionHubBothSides?: boolean // Buje del piñón en ambas caras
  rackPinionHasKeyway?: boolean  // Chavetero DIN 6885 en piñón
  rackPinionKeywayCustom?: boolean // Parametrización manual de chavetero en piñón
  rackPinionKeywayWidth?: number   // Anchura chavetero en piñón b (mm)
  rackPinionKeywayDepth?: number   // Profundidad en buje piñón t_2 (mm)
  rackPinionHasToothChamfer?: boolean // Chaflán de dientes en piñón
  rackPinionToothChamfer?: number     // Dimensión de chaflán de dientes en piñón (mm)
  rackPinionProfileShift?: number// Desplazamiento de perfil x_p del piñón
  rackViewFocus?: 'both' | 'rack' | 'pinion' // Enfoque visual del mecanismo
}

export interface GearPairState {
  gear2Enabled: boolean
  selectedGear: 1 | 2
  motorized: boolean
  motorRpm: number
}

export interface MeshingPairParameters {
  enabled: boolean        // Activar visualización de pareja engranada
  teeth2: number          // Dientes del segundo engranaje
  showCenterLine: boolean // Mostrar línea y distancia entre centros
  animate: boolean        // Rotación continua
  rpm: number             // Velocidad de giro del engranaje 1 (RPM)
  previewDeltaA: number | null // Calce de preview sobre la distancia (mm, null = estándar)
}

export interface CalculatedDimensions {
  pitchDiameter: number       // d = m * z
  pitchRadius: number         // r = d / 2
  baseDiameter: number        // d_b = d * cos(alpha)
  baseRadius: number          // r_b = d_b / 2
  tipDiameter: number         // d_a = d + 2*(ha + x)*m
  tipRadius: number           // r_a = d_a / 2
  rootDiameter: number        // d_f = d - 2*(hf - x)*m
  rootRadius: number          // r_f = d_f / 2
  circularPitch: number       // p = pi * m
  normalToothThickness: number// s
  centerDistance?: number     // a = (d1 + d2) / 2
  gearRatio?: number          // i = z2 / z1
  twistAngleDeg: number       // Torsión angular total sobre la anchura b

  // Métricas de socavado y diseño de diente
  undercutLimitZ: number      // Dientes mínimos sin socavado z_min
  hasUndercutWarning: boolean // Alerta si z < z_min y x es bajo
  recommendedShift: number    // Desplazamiento mínimo recomendado para eliminar socavado
  axialThrustRatio: number    // Porcentaje de empuje axial (0 para recto/espiga, sin(beta) para helicoidal)

  // Nuevas métricas cinemáticas y buenas prácticas mecánicas
  contactRatio?: number       // Ratio de contacto transversal ε_α
  contactRatioStatus?: 'optimal' | 'acceptable' | 'marginal' | 'critical' // Estado cinemático
  overlapRatio?: number       // Ratio de recubrimiento helicoidal ε_β
  totalContactRatio?: number  // Ratio total de contacto ε_γ = ε_α + ε_β
  topLandThickness: number    // Espesor de la cresta en la punta s_a (mm)
  topLandStatus: 'safe' | 'warning' | 'critical' // Estado de seguridad de cresta
  minRecommendedTopLand: number // Espesor mínimo recomendado (0.25 * m)
  maxSafeShift?: number       // Desplazamiento máximo antes de que la punta se vuelva crítica
  internalInterferenceWarning?: boolean // Alerta de interferencia trocoidal (z1 - z2 < 8)
  huntingToothStatus?: 'optimal' | 'cyclic' // 'optimal' si gcd(z1, z2) = 1 (desgaste uniforme)
  gcdTeeth?: number           // Máximo común divisor de dientes

  // Métricas específicas de mecanismo de cremallera y piñón
  rackToothCount?: number     // Dientes útiles mecanizados en la longitud
  rackTotalHeight?: number    // Altura total hasta cresta de diente
  feedPerRev?: number         // Avance lineal por vuelta de piñón (mm/rev)
  linearVelocity?: number     // Velocidad lineal a las RPM dadas (mm/s)

  // Métricas físicas conjugadas del piñón
  pinionPitchRadius?: number  // r_p del piñón
  pinionTipRadius?: number    // r_a del piñón
  pinionRootRadius?: number   // r_f del piñón
  pinionOperatingY?: number   // Distancia de rodadura operativa Y = r_p + x_p * m
  mountingDistance?: number   // Distancia de montaje Base cremallera -> Eje piñón (H_rack + Y)
  pinionUndercutWarning?: boolean // true si z_p sufre de socavado
  pinionRecommendedShift?: number // Corrección recomendada para el piñón
}

export interface ExportStatus {
  isExporting: boolean
  progress: number // 0-100
  message: string
  error?: string
  lastDownloadUrl?: string
  lastFileName?: string
  isModalOpen?: boolean
  pendingFormat?: 'stl' | '3mf' | 'step'
  pendingTarget?: 'default' | 'rack' | 'pinion' | 'assembly'
}


