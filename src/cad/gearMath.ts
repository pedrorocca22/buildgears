import type { GearParameters, CalculatedDimensions } from './types'

export function calculateDimensions(
  params: GearParameters,
  teeth2?: number
): CalculatedDimensions {
  const {
    module: mn,
    teeth: z,
    pressureAngle: alphaDeg,
    helixAngle: betaDeg,
    profileShift: x,
    faceWidth: b,
    gearType,
  } = params

  // Determinar coeficientes según el tipo de diseño de diente (norma de perfil)
  let haCoeff = params.addendumCoeff ?? 1.0
  let hfCoeff = params.dedendumCoeff ?? 1.25

  if (params.toothProfileType === 'stub') {
    haCoeff = 0.8
    hfCoeff = 1.0
  } else if (params.toothProfileType === 'deep') {
    haCoeff = 1.2
    hfCoeff = 1.4
  } else if (params.toothProfileType === 'cycloidal') {
    haCoeff = 1.0
    hfCoeff = 1.2
  } else if (params.toothProfileType === 'standard') {
    haCoeff = 1.0
    hfCoeff = 1.25
  }

  const alphaRad = (alphaDeg * Math.PI) / 180

  // Ángulo de hélice efectivo
  let effectiveBetaDeg = 0
  if (gearType === 'helical' || gearType === 'herringbone') {
    effectiveBetaDeg = betaDeg
  } else if (gearType === 'rack') {
    if (params.rackToothType === 'helical' || params.rackToothType === 'herringbone') {
      effectiveBetaDeg = betaDeg || 20
    }
  }

  const betaRad = (effectiveBetaDeg * Math.PI) / 180

  // Módulo aparente / frontal
  const mt = betaRad !== 0 ? mn / Math.cos(betaRad) : mn
  // Ángulo de presión aparente
  const alphaT = betaRad !== 0 ? Math.atan(Math.tan(alphaRad) / Math.cos(betaRad)) : alphaRad

  const d = mt * z
  const rp = d / 2
  const rb = rp * Math.cos(alphaT)
  const db = rb * 2

  const ha = (haCoeff + x) * mn
  const hf = (hfCoeff - x) * mn

  const ra = rp + ha
  const da = ra * 2
  const rf = Math.max(0.5, rp - hf)
  const df = rf * 2

  const circularPitch = Math.PI * mt
  const normalToothThickness = mn * (Math.PI / 2 + 2 * x * Math.tan(alphaRad))

  // Ángulo de torsión helicoidal sobre la cara
  const twistAngleDeg =
    betaRad !== 0
      ? (360 * b * Math.tan(betaRad)) / (Math.PI * d) * (params.helixHand === 'left' ? -1 : 1)
      : 0

  // Métricas de socavado (Undercutting)
  const sinAlpha = Math.sin(alphaRad)
  const undercutLimitZ = Math.ceil((2 * haCoeff) / Math.max(0.01, sinAlpha * sinAlpha))
  const recommendedShift = Math.max(0, Number(((undercutLimitZ - z) / undercutLimitZ * haCoeff).toFixed(2)))
  const hasUndercutWarning = z < undercutLimitZ && x < (recommendedShift * 0.8)

  // Empuje axial (0% si es recto o doble hélice espiga con anulación)
  const isHerringbone = gearType === 'herringbone' || (gearType === 'rack' && params.rackToothType === 'herringbone')
  const isSpur = gearType === 'spur' || (gearType === 'rack' && (params.rackToothType === 'spur' || !params.rackToothType && !effectiveBetaDeg))
  const axialThrustRatio = isHerringbone || isSpur || effectiveBetaDeg === 0 ? 0 : Number(Math.sin(betaRad).toFixed(3))

  let centerDistance: number | undefined = undefined
  let gearRatio: number | undefined = undefined

  // Métricas específicas si es mecanismo de cremallera y piñón
  const rLength = params.rackLength || 150
  const rHeight = params.rackHeight || 25
  const rackToothCount = Math.floor(rLength / circularPitch)
  const rackTotalHeight = rHeight + ha

  const pTeeth = params.rackPinionTeeth || (teeth2 && teeth2 > 0 ? teeth2 : 20)
  const xp = params.rackPinionProfileShift || 0.0
  const pinionPitchRadius = Number(((mt * pTeeth) / 2).toFixed(3))
  const pinionTipRadius = Number((pinionPitchRadius + (haCoeff + xp) * mn).toFixed(3))
  const pinionRootRadius = Number(Math.max(0.5, pinionPitchRadius - (hfCoeff - xp) * mn).toFixed(3))

  // Posición operativa Y del centro del piñón respecto a la línea primitiva de la cremallera (Y=0)
  // Bajo la ley de engrane conjugado con desplazamiento x_p: Y = r_p + x_p * m
  const pinionOperatingY = Number((pinionPitchRadius + xp * mn).toFixed(3))
  // Distancia de montaje desde la base de la barra (Y = -rHeight) al centro del eje del piñón
  const mountingDistance = Number((rHeight + pinionOperatingY).toFixed(3))

  const pinionRecommendedShift = Math.max(0, Number(((undercutLimitZ - pTeeth) / undercutLimitZ * haCoeff).toFixed(2)))
  const pinionUndercutWarning = pTeeth < undercutLimitZ && xp < (pinionRecommendedShift * 0.8)

  const feedPerRev = Number((Math.PI * mt * pTeeth).toFixed(3)) // mm por revolución
  const linearVelocity = Number(((feedPerRev * 25) / 60).toFixed(2)) // mm/s a 25 RPM

  if (gearType === 'rack') {
    centerDistance = pinionOperatingY
    gearRatio = pTeeth
  } else if (teeth2 && teeth2 > 0) {
    centerDistance = (mt * (z + teeth2)) / 2
    gearRatio = teeth2 / z
  }

  return {
    pitchDiameter: Number(d.toFixed(3)),
    pitchRadius: Number(rp.toFixed(3)),
    baseDiameter: Number(db.toFixed(3)),
    baseRadius: Number(rb.toFixed(3)),
    tipDiameter: Number(da.toFixed(3)),
    tipRadius: Number(ra.toFixed(3)),
    rootDiameter: Number(df.toFixed(3)),
    rootRadius: Number(rf.toFixed(3)),
    circularPitch: Number(circularPitch.toFixed(3)),
    normalToothThickness: Number(normalToothThickness.toFixed(3)),
    centerDistance: centerDistance ? Number(centerDistance.toFixed(3)) : undefined,
    gearRatio: gearRatio ? Number(gearRatio.toFixed(3)) : undefined,
    twistAngleDeg: Number(twistAngleDeg.toFixed(2)),
    undercutLimitZ,
    hasUndercutWarning,
    recommendedShift,
    axialThrustRatio,
    rackToothCount,
    rackTotalHeight: Number(rackTotalHeight.toFixed(3)),
    feedPerRev,
    linearVelocity,
    pinionPitchRadius,
    pinionTipRadius,
    pinionRootRadius,
    pinionOperatingY,
    mountingDistance,
    pinionUndercutWarning,
    pinionRecommendedShift,
  }
}


/**
 * Genera el polígono 2D cerrado [x, y] del contorno del engranaje con perfil de involuta exacto
 * o perfil cicloidal según la configuración de diseño de diente.
 */
export function generateInvoluteProfile(
  params: GearParameters,
  pointsPerFlank = 10
): [number, number][] {
  const {
    module: mn,
    teeth: z,
    pressureAngle: alphaDeg,
    helixAngle: betaDeg,
    profileShift: x = 0.0,
    backlash = 0.05,
    gearType,
    toothProfileType = 'standard',
  } = params

  let haCoeff = params.addendumCoeff ?? 1.0
  let hfCoeff = params.dedendumCoeff ?? 1.25

  if (toothProfileType === 'stub') {
    haCoeff = 0.8
    hfCoeff = 1.0
  } else if (toothProfileType === 'deep') {
    haCoeff = 1.2
    hfCoeff = 1.4
  } else if (toothProfileType === 'cycloidal') {
    haCoeff = 1.0
    hfCoeff = 1.2
  } else if (toothProfileType === 'standard') {
    haCoeff = 1.0
    hfCoeff = 1.25
  }

  const alphaRad = (alphaDeg * Math.PI) / 180
  const betaRad = (gearType === 'helical' || gearType === 'herringbone' ? (betaDeg * Math.PI) / 180 : 0)

  const mt = betaRad !== 0 ? mn / Math.cos(betaRad) : mn
  const alphaT = betaRad !== 0 ? Math.atan(Math.tan(alphaRad) / Math.cos(betaRad)) : alphaRad

  const rp = (mt * z) / 2
  const rb = rp * Math.cos(alphaT)
  const ra = rp + (haCoeff + x) * mn
  const rf = Math.max(0.5, rp - (hfCoeff - x) * mn)

  // Espesor angular en el radio primitivo
  const st = mt * (Math.PI / 2 + 2 * x * Math.tan(alphaT)) - backlash
  const halfToothAngle = st / (2 * rp)

  const toothPoints: [number, number][] = []

  if (toothProfileType === 'cycloidal') {
    // Generación de perfil cicloidal (Relojería / Micromecánica NIHS):
    // Dedendo: Flancos rectos radiales de rf a rp
    // Adendo: Ojiva/arco epicicloidal redondeado de rp a ra
    const rSteps = pointsPerFlank
    // Flanco derecho (subiendo de rf a ra)
    // 1. Dedendo radial
    toothPoints.push([rf * Math.cos(-halfToothAngle), rf * Math.sin(-halfToothAngle)])
    toothPoints.push([rp * Math.cos(-halfToothAngle), rp * Math.sin(-halfToothAngle)])

    // 2. Adendo epicicloidal
    for (let i = 1; i <= rSteps; i++) {
      const t = i / rSteps
      const r = rp + t * (ra - rp)
      const archTheta = halfToothAngle * (1 - 0.78 * Math.pow(t, 1.35))
      toothPoints.push([r * Math.cos(-archTheta), r * Math.sin(-archTheta)])
    }

    // Flanco izquierdo (bajando de ra a rf)
    const leftFlank: [number, number][] = []
    for (let i = 1; i <= rSteps; i++) {
      const t = i / rSteps
      const r = rp + t * (ra - rp)
      const archTheta = halfToothAngle * (1 - 0.78 * Math.pow(t, 1.35))
      leftFlank.push([r * Math.cos(archTheta), r * Math.sin(archTheta)])
    }
    leftFlank.reverse()
    toothPoints.push(...leftFlank)

    toothPoints.push([rp * Math.cos(halfToothAngle), rp * Math.sin(halfToothAngle)])
    toothPoints.push([rf * Math.cos(halfToothAngle), rf * Math.sin(halfToothAngle)])
  } else {
    // Perfil estándar de Involuta de círculo
    const invAlphaT = Math.tan(alphaT) - alphaT
    const rStart = Math.max(rb, rf)

    const flankRadii: number[] = []
    for (let i = 0; i <= pointsPerFlank; i++) {
      const t = i / pointsPerFlank
      flankRadii.push(rStart + t * (ra - rStart))
    }

    // Flanco derecho (subiendo de rf a ra)
    // Si rf < rb, añadimos el punto en el radio de pie sobre el radio base
    if (rf < rb) {
      const theta = -(halfToothAngle + invAlphaT)
      toothPoints.push([rf * Math.cos(theta), rf * Math.sin(theta)])
    }

    // Involuta flanco derecho
    for (const r of flankRadii) {
      const alphaR = Math.acos(Math.min(1.0, rb / r))
      const invAlphaR = Math.tan(alphaR) - alphaR
      const theta = -(halfToothAngle + invAlphaT - invAlphaR)
      toothPoints.push([r * Math.cos(theta), r * Math.sin(theta)])
    }

    // Flanco izquierdo (bajando de ra a rf)
    const leftFlankPoints: [number, number][] = []
    for (const r of flankRadii) {
      const alphaR = Math.acos(Math.min(1.0, rb / r))
      const invAlphaR = Math.tan(alphaR) - alphaR
      const theta = halfToothAngle + invAlphaT - invAlphaR
      leftFlankPoints.push([r * Math.cos(theta), r * Math.sin(theta)])
    }
    leftFlankPoints.reverse()
    toothPoints.push(...leftFlankPoints)

    if (rf < rb) {
      const theta = halfToothAngle + invAlphaT
      toothPoints.push([rf * Math.cos(theta), rf * Math.sin(theta)])
    }
  }

  // Ahora ensamblamos los z dientes rotándolos y uniendo los fondos de diente (root land)
  const fullContour: [number, number][] = []
  const anglePerTooth = (2 * Math.PI) / z

  for (let i = 0; i < z; i++) {
    const currentAngle = i * anglePerTooth
    const cosA = Math.cos(currentAngle)
    const sinA = Math.sin(currentAngle)

    // Puntos del diente rotado
    for (const [xPt, yPt] of toothPoints) {
      fullContour.push([
        xPt * cosA - yPt * sinA,
        xPt * sinA + yPt * cosA,
      ])
    }

    // Arco de unión entre este diente y el siguiente en el círculo de pie (rf)
    const nextAngle = (i + 1) * anglePerTooth
    const rootArcPoints = 4
    const angleEndThisTooth = currentAngle + (toothPoints[toothPoints.length - 1] ? Math.atan2(toothPoints[toothPoints.length - 1][1], toothPoints[toothPoints.length - 1][0]) : 0)
    const angleStartNextTooth = nextAngle + (toothPoints[0] ? Math.atan2(toothPoints[0][1], toothPoints[0][0]) : 0)

    for (let k = 1; k < rootArcPoints; k++) {
      const t = k / rootArcPoints
      const arcAngle = angleEndThisTooth + t * (angleStartNextTooth - angleEndThisTooth)
      fullContour.push([
        rf * Math.cos(arcAngle),
        rf * Math.sin(arcAngle),
      ])
    }
  }

  return ensureCounterClockwise(fullContour)
}

/**
 * Garantiza que un polígono 2D cerrado tenga orientación anti-horaria (CCW).
 * En Manifold-3D, las secciones 2D DEBEN ser CCW para extrusiones válidas con FillRule.Positive.
 */
export function ensureCounterClockwise(points: [number, number][]): [number, number][] {
  if (points.length < 3) return points
  let signedArea = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    signedArea += points[i][0] * points[j][1] - points[j][0] * points[i][1]
  }
  if (signedArea < 0) {
    return [...points].reverse()
  }
  return points
}

/**
 * Genera el contorno 2D de una cremallera normalizada (ISO 53 / DIN 867).
 * La línea primitiva de referencia se sitúa exactamente en Y = 0.
 * La base de la barra se extiende hasta Y = -rackHeight.
 */
export function generateRackProfile(
  params: GearParameters,
  rackLength = 150,
  rackHeight = 25
): [number, number][] {

  const {
    module: mn,
    pressureAngle: alphaDeg,
    helixAngle: betaDeg,
    gearType,
    backlash = 0.05,
    rackToothType,
    toothProfileType = 'standard',
  } = params

  let haCoeff = params.addendumCoeff ?? 1.0
  let hfCoeff = params.dedendumCoeff ?? 1.25

  if (toothProfileType === 'stub') {
    haCoeff = 0.8
    hfCoeff = 1.0
  } else if (toothProfileType === 'deep') {
    haCoeff = 1.2
    hfCoeff = 1.4
  } else if (toothProfileType === 'cycloidal') {
    haCoeff = 1.0
    hfCoeff = 1.2
  } else if (toothProfileType === 'standard') {
    haCoeff = 1.0
    hfCoeff = 1.25
  }

  const alphaRad = (alphaDeg * Math.PI) / 180
  let effectiveBeta = 0
  if (rackToothType === 'helical' || rackToothType === 'herringbone') {
    effectiveBeta = betaDeg || 20
  } else if (gearType === 'helical' || (gearType === 'rack' && betaDeg > 0 && rackToothType !== 'spur')) {
    effectiveBeta = betaDeg
  }
  const betaRad = (effectiveBeta * Math.PI) / 180

  // Módulo y ángulo de presión en el plano transversal (si hay hélice)
  const mt = betaRad !== 0 ? mn / Math.cos(betaRad) : mn
  const alphaT = betaRad !== 0 ? Math.atan(Math.tan(alphaRad) / Math.cos(betaRad)) : alphaRad

  const pitch = Math.PI * mt
  const ha = haCoeff * mn
  const hf = hfCoeff * mn
  const tanAlpha = Math.tan(alphaT)

  // Espesor y hueco en la línea primitiva (Y = 0)
  const s = Math.max(0.2 * pitch, pitch / 2 - backlash / 2)

  // Número entero de dientes completos que caben centrados
  const toothCount = Math.max(3, Math.floor(rackLength / pitch))
  const totalTeethSpan = toothCount * pitch
  const startX = -totalTeethSpan / 2
  const halfL = rackLength / 2

  const points: [number, number][] = []

  // Esquina inferior izquierda de la barra
  points.push([-halfL, -rackHeight])

  // Subida por el lateral izquierdo hasta el fondo de raíz
  points.push([-halfL, -hf])

  // Tramo plano inicial antes del primer diente si rackLength > totalTeethSpan
  if (startX > -halfL) {
    points.push([startX, -hf])
  }

  // Radio de acuerdo en pie de diente (DIN 867: rf ≈ 0.38 * mn)
  const rf = Math.min(0.35 * mn, (pitch / 4) * 0.6)

  // Generación de cada diente
  for (let i = 0; i < toothCount; i++) {
    const xCenter = startX + (i + 0.5) * pitch

    // Puntos característicos del diente
    // Flanco izquierdo: sube desde -hf hasta +ha
    const xLeftRoot = xCenter - s / 2 - hf * tanAlpha
    const xLeftTip = xCenter - s / 2 + ha * tanAlpha

    // Flanco derecho: baja desde +ha hasta -hf
    const xRightTip = xCenter + s / 2 - ha * tanAlpha
    const xRightRoot = xCenter + s / 2 + hf * tanAlpha

    // Transición suave en el pie izquierdo (radio de acuerdo)
    if (rf > 0.1) {
      const xBlend = xLeftRoot - rf * (1 - Math.sin(alphaT))
      points.push([xBlend, -hf])
      points.push([xLeftRoot, -hf + rf * (1 - Math.cos(alphaT))])
    } else {
      points.push([xLeftRoot, -hf])
    }

    // Flanco izquierdo recto a ángulo de presión
    points.push([xLeftTip, ha])

    // Cresta superior plana
    points.push([Math.max(xLeftTip + 0.1, xRightTip), ha])

    // Flanco derecho recto
    points.push([xRightRoot, -hf])

    // Transición suave en el pie derecho
    if (rf > 0.1 && i < toothCount - 1) {
      const xBlendRight = xRightRoot + rf * (1 - Math.sin(alphaT))
      points.push([xBlendRight, -hf])
    }
  }

  const endTeethX = startX + totalTeethSpan

  // Tramo plano final después del último diente hasta el extremo derecho
  if (halfL > endTeethX) {
    points.push([halfL, -hf])
  }

  // Lateral derecho bajando hasta la esquina inferior derecha
  points.push([halfL, -rackHeight])

  return ensureCounterClockwise(points)
}

/**
 * Obtiene los parámetros completos del piñón motriz conjugado para el mecanismo de cremallera y piñón.
 * Garantiza estrictamente la ley de Willis: mismo módulo normal m_n, mismo ángulo de presión alpha_n,
 * misma norma de perfil de diente (ISO, Stub, HCR, Cicloidal) y cinemática conjugada complementaria.
 */
export function getConjugatePinionParams(params: GearParameters): GearParameters {
  const isHerringbone = params.rackToothType === 'herringbone'
  const isHelical = params.rackToothType === 'helical' || (!params.rackToothType && params.helixAngle && params.helixAngle > 0)
  const pinionGearType = isHerringbone ? 'herringbone' : isHelical ? 'helical' : 'spur'
  const effAngle = (isHerringbone || isHelical) ? (params.helixAngle || 20) : 0

  return {
    ...params,
    gearType: pinionGearType,
    teeth: params.rackPinionTeeth || 20,
    helixAngle: effAngle,
    helixHand: (params.helixHand === 'right' ? 'left' : 'right'),
    faceWidth: params.rackPinionFaceWidth || params.faceWidth,
    boreDiameter: params.rackPinionBore ?? 0,
    hasKeyway: Boolean(params.rackPinionHasKeyway),
    keywayCustom: params.rackPinionKeywayCustom,
    keywayWidth: params.rackPinionKeywayWidth,
    keywayDepth: params.rackPinionKeywayDepth,
    hasToothChamfer: params.rackPinionHasToothChamfer ?? params.hasToothChamfer ?? false,
    toothChamfer: params.rackPinionToothChamfer ?? params.toothChamfer ?? 0.6,
    bodyStyle: params.rackPinionBodyStyle || 'solid',
    hubDiameter: params.rackPinionHubDiameter || Math.max(22, (params.rackPinionTeeth || 20) * params.module * 0.45),
    hubLength: params.rackPinionHubLength || 26,
    hubOffset: params.rackPinionHubOffset || 4,
    profileShift: params.rackPinionProfileShift || 0.0,
  }
}


