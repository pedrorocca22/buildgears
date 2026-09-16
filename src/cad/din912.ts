/**
 * Dimensiones según norma DIN 912 / ISO 4762 para tornillos de cabeza cilíndrica con hexágono interior (Allen).
 * Ajuste de agujero pasante medio según ISO 273.
 */

export type DIN912Metric = 'M3' | 'M4' | 'M5' | 'M6' | 'M8' | 'M10'

export interface DIN912Dimensions {
  nominal: DIN912Metric
  throughHoleDia: number     // Diámetro taladro pasante (mm, ISO 273 medio)
  counterboreDia: number     // Diámetro cajera cilíndrica d2 (mm, DIN 974-1)
  counterboreDepth: number   // Profundidad mínima de cajera t1 (mm, altura cabeza k + tolerancia)
  nominalScrewDia: number    // Diámetro nominal del tornillo d (mm)
  headHeight: number         // Altura de la cabeza k (mm)
}

export const DIN912_STANDARDS: Record<DIN912Metric, DIN912Dimensions> = {
  M3: {
    nominal: 'M3',
    nominalScrewDia: 3.0,
    throughHoleDia: 3.4,
    counterboreDia: 6.0,
    counterboreDepth: 3.4,
    headHeight: 3.0,
  },
  M4: {
    nominal: 'M4',
    nominalScrewDia: 4.0,
    throughHoleDia: 4.5,
    counterboreDia: 8.0,
    counterboreDepth: 4.4,
    headHeight: 4.0,
  },
  M5: {
    nominal: 'M5',
    nominalScrewDia: 5.0,
    throughHoleDia: 5.5,
    counterboreDia: 10.0,
    counterboreDepth: 5.4,
    headHeight: 5.0,
  },
  M6: {
    nominal: 'M6',
    nominalScrewDia: 6.0,
    throughHoleDia: 6.6,
    counterboreDia: 11.0,
    counterboreDepth: 6.4,
    headHeight: 6.0,
  },
  M8: {
    nominal: 'M8',
    nominalScrewDia: 8.0,
    throughHoleDia: 9.0,
    counterboreDia: 15.0,
    counterboreDepth: 8.6,
    headHeight: 8.0,
  },
  M10: {
    nominal: 'M10',
    nominalScrewDia: 10.0,
    throughHoleDia: 11.0,
    counterboreDia: 18.0,
    counterboreDepth: 10.6,
    headHeight: 10.0,
  },
}

export function getDIN912Screw(metric: DIN912Metric): DIN912Dimensions {
  return DIN912_STANDARDS[metric] || DIN912_STANDARDS.M5
}
