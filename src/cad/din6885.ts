// Tabla estándar DIN 6885-1 para chaveteros paralelos en ejes métricos
export interface DIN6885Keyway {
  b: number   // Anchura del chavetero (mm)
  h: number   // Altura de la chaveta (mm)
  t1: number  // Profundidad en el eje (mm)
  t2: number  // Profundidad en el cubo/buje (mm)
}

export function getDIN6885Keyway(shaftDiameter: number): DIN6885Keyway {
  const d = Math.max(1, shaftDiameter)

  if (d < 3)    return { b: 0.8, h: 0.8, t1: 0.5, t2: 0.4 }
  if (d < 6)    return { b: 1.5, h: 1.5, t1: 0.9, t2: 0.7 }
  if (d <= 8)   return { b: 2,  h: 2,  t1: 1.2, t2: 1.0 }
  if (d <= 10)  return { b: 3,  h: 3,  t1: 1.8, t2: 1.4 }
  if (d <= 12)  return { b: 4,  h: 4,  t1: 2.5, t2: 1.8 }
  if (d <= 17)  return { b: 5,  h: 5,  t1: 3.0, t2: 2.3 }
  if (d <= 22)  return { b: 6,  h: 6,  t1: 3.5, t2: 2.8 }
  if (d <= 30)  return { b: 8,  h: 7,  t1: 4.0, t2: 3.3 }
  if (d <= 38)  return { b: 10, h: 8,  t1: 5.0, t2: 3.3 }
  if (d <= 44)  return { b: 12, h: 8,  t1: 5.0, t2: 3.3 }
  if (d <= 50)  return { b: 14, h: 9,  t1: 5.5, t2: 3.8 }
  if (d <= 58)  return { b: 16, h: 10, t1: 6.0, t2: 4.3 }
  if (d <= 65)  return { b: 18, h: 11, t1: 7.0, t2: 4.4 }
  if (d <= 75)  return { b: 20, h: 12, t1: 7.5, t2: 4.9 }
  if (d <= 85)  return { b: 22, h: 14, t1: 9.0, t2: 5.4 }
  if (d <= 95)  return { b: 25, h: 14, t1: 9.0, t2: 5.4 }
  if (d <= 110) return { b: 28, h: 16, t1: 10.0, t2: 6.4 }
  return { b: Math.round(d * 0.25), h: Math.round(d * 0.15), t1: Number((d * 0.09).toFixed(1)), t2: Number((d * 0.06).toFixed(1)) }
}
