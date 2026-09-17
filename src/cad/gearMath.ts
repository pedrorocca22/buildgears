import type { GearParameters, CalculatedDimensions } from './types'

/**
 * Resuelve la función de involuta inversa inv(alpha) = tan(alpha) - alpha = invVal
 * utilizando el método de Newton-Raphson de convergencia de orden superior.
 * Retorna el ángulo alpha en radianes con precisión absoluta < 1e-12.
 */
export function solveInvolute(invVal: number): number {
  if (invVal <= 0) return 0
  // Aproximación inicial cúbica: inv(alpha) ≈ alpha^3 / 3 => alpha ≈ (3 * invVal)^(1/3)
  let alpha = Math.cbrt(3 * invVal)
  for (let i = 0; i < 8; i++) {
    const tanA = Math.tan(alpha)
    const f = tanA - alpha - invVal
    const fPrime = tanA * tanA // d/dalpha (tan(alpha) - alpha) = sec^2(alpha) - 1 = tan^2(alpha)
    if (Math.abs(fPrime) < 1e-12) break
    const delta = f / fPrime
    alpha -= delta
    if (Math.abs(delta) < 1e-12) break
  }
  return alpha
}

export function calculateDimensions(
  params: GearParameters,
  mating?: number | Partial<GearParameters>
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

  const matingTeeth = typeof mating === 'number' ? mating : mating?.teeth
  const matingShift = typeof mating === 'object' && mating != null ? (mating.profileShift ?? 0.0) : 0.0
  const matingHaCoeff = typeof mating === 'object' && mating != null ? (mating.addendumCoeff ?? 1.0) : 1.0
  const matingHfCoeff = typeof mating === 'object' && mating != null ? (mating.dedendumCoeff ?? 1.25) : 1.25
  const teeth2 = matingTeeth

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

  // 1. Espesor en cresta de cabeza (Top Land Thickness s_a)
  let topLandThickness = 0
  let topLandStatus: 'safe' | 'warning' | 'critical' = 'safe'
  const minRecommendedTopLand = Number((0.25 * mn).toFixed(3))

  if (gearType !== 'rack') {
    // Presión transversal aparente en el diámetro de cabeza (da = 2 * ra)
    const cosAlphaAt = ra > rb ? rb / ra : 1.0
    const alphaAt = Math.acos(Math.min(1.0, Math.max(0.0, cosAlphaAt)))
    const invAlphaT = Math.tan(alphaT) - alphaT
    const invAlphaAt = Math.tan(alphaAt) - alphaAt
    // Espesor en el diámetro primitivo
    const normalPitchThickness = mn * (Math.PI / 2 + 2 * x * Math.tan(alphaRad)) - (params.backlash ?? 0.05) / 2
    const transversePitchThickness = normalPitchThickness / (betaRad !== 0 ? Math.cos(betaRad) : 1)
    // Espesor en la punta según la función de involuta
    const sat = da * (transversePitchThickness / d + invAlphaT - invAlphaAt)
    const san = sat * (betaRad !== 0 ? Math.cos(betaRad) : 1)
    topLandThickness = Math.max(0, Number(san.toFixed(3)))

    if (topLandThickness >= minRecommendedTopLand) {
      topLandStatus = 'safe'
    } else if (topLandThickness >= 0.12 * mn) {
      topLandStatus = 'warning'
    } else {
      topLandStatus = 'critical'
    }
  } else {
    // En cremallera: el espesor en la cresta es s_a = p/2 - 2 * ha * tan(alpha)
    const rackNormalPitch = Math.PI * mn
    const rackTipThick = rackNormalPitch / 2 - 2 * ha * Math.tan(alphaRad)
    topLandThickness = Math.max(0, Number(rackTipThick.toFixed(3)))
    topLandStatus = topLandThickness >= minRecommendedTopLand ? 'safe' : topLandThickness >= 0.12 * mn ? 'warning' : 'critical'
  }

  // 2. Variables cinemáticas conjugadas
  let contactRatio: number | undefined = undefined
  let contactRatioStatus: 'optimal' | 'acceptable' | 'marginal' | 'critical' | undefined = undefined
  let overlapRatio: number | undefined = undefined
  let totalContactRatio: number | undefined = undefined

  const pbt = Math.PI * mt * Math.cos(alphaT) // Paso base aparente

  let centerDistance: number | undefined = undefined
  let workingCenterDistance: number | undefined = undefined
  let workingCenterDistanceOffset: number | undefined = undefined
  let operatingPressureAngleDeg: number | undefined = undefined
  let operatingPitchRadius1: number | undefined = undefined
  let operatingPitchRadius2: number | undefined = undefined
  let bottomClearance: number | undefined = undefined
  let toothOverlapInterference: number | undefined = undefined
  let hasMeshInterference = false
  let meshInterferenceMessage: string | undefined = undefined
  let hertzStressMPa: number | undefined = undefined
  let maxSlidingVelocity: number | undefined = undefined
  let gearRatio: number | undefined = undefined

  // Métricas específicas si es mecanismo de cremallera y piñón
  const rLength = params.rackLength || 150
  const rHeight = params.rackHeight || 25
  const rackToothCount = Math.floor(rLength / circularPitch)
  const rackTotalHeight = rHeight + ha

  const pTeeth = params.rackPinionTeeth || (teeth2 && teeth2 > 0 ? teeth2 : 20)
  const xp = params.rackPinionProfileShift ?? matingShift ?? 0.0
  const pinionPitchRadius = Number(((mt * pTeeth) / 2).toFixed(3))
  const pinionTipRadius = Number((pinionPitchRadius + (haCoeff + xp) * mn).toFixed(3))
  const pinionRootRadius = Number(Math.max(0.5, pinionPitchRadius - (hfCoeff - xp) * mn).toFixed(3))

  // Posición operativa Y del centro del piñón respecto a la línea primitiva de la cremallera (Y=0)
  const pinionOperatingY = Number((pinionPitchRadius + xp * mn).toFixed(3))
  const mountingDistance = Number((rHeight + pinionOperatingY).toFixed(3))

  const pinionRecommendedShift = Math.max(0, Number(((undercutLimitZ - pTeeth) / undercutLimitZ * haCoeff).toFixed(2)))
  const pinionUndercutWarning = pTeeth < undercutLimitZ && xp < (pinionRecommendedShift * 0.8)

  const feedPerRev = Number((Math.PI * mt * pTeeth).toFixed(3)) // mm por revolución
  const linearVelocity = Number(((feedPerRev * 25) / 60).toFixed(2)) // mm/s a 25 RPM

  if (gearType === 'rack') {
    centerDistance = pinionOperatingY
    workingCenterDistance = pinionOperatingY
    workingCenterDistanceOffset = Number((xp * mn).toFixed(3))
    operatingPressureAngleDeg = alphaDeg
    gearRatio = pTeeth

    // Contact ratio para piñón y cremallera:
    // Trayectoria activa de contacto: g_alpha = sqrt(rap^2 - rbp^2) - rpp * sin(alphaT) + (ha_rack) / sin(alphaT)
    const rbp = pinionPitchRadius * Math.cos(alphaT)
    const termPinion = Math.sqrt(Math.max(0, pinionTipRadius * pinionTipRadius - rbp * rbp)) - pinionPitchRadius * Math.sin(alphaT)
    const termRack = (haCoeff * mn) / Math.max(0.01, Math.sin(alphaT))
    const gAlpha = termPinion + termRack
    contactRatio = Number((Math.max(0, gAlpha) / pbt).toFixed(2))

    bottomClearance = Number((rHeight - pinionTipRadius).toFixed(3))
  } else if (teeth2 && teeth2 > 0) {
    const z2 = teeth2
    const x2 = matingShift
    const rp2 = (mt * z2) / 2
    const rb2 = rp2 * Math.cos(alphaT)
    const ha2 = (matingHaCoeff + x2) * mn
    const hf2 = (matingHfCoeff - x2) * mn
    const ra2 = rp2 + ha2
    const rf2 = Math.max(0.5, rp2 - hf2)

    if (gearType === 'internal') {
      const aNominal = Math.abs((mt * (z - teeth2)) / 2)
      centerDistance = aNominal
      gearRatio = teeth2 / z

      const invAlphaT = Math.tan(alphaT) - alphaT
      const sumX = x - x2
      const invAlphaWt = invAlphaT + (2 * sumX / Math.max(1, z - z2)) * Math.tan(alphaRad)
      const alphaWt = invAlphaWt > 0 ? solveInvolute(invAlphaWt) : alphaT
      const cosAlphaWt = Math.cos(alphaWt)
      const aWorking = cosAlphaWt > 0.01 ? (aNominal * Math.cos(alphaT)) / cosAlphaWt : aNominal

      workingCenterDistance = Number(aWorking.toFixed(3))
      workingCenterDistanceOffset = Number((aWorking - aNominal).toFixed(3))
      operatingPressureAngleDeg = Number(((alphaWt * 180) / Math.PI).toFixed(2))
      operatingPitchRadius1 = Number((aWorking * (z / Math.max(1, z - z2))).toFixed(3))
      operatingPitchRadius2 = Number((aWorking * (z2 / Math.max(1, z - z2))).toFixed(3))

      const raInternal = Math.max(0.5, rp - ha)
      const gAlpha = Math.sqrt(Math.max(0, ra2 * ra2 - rb2 * rb2)) -
                     Math.sqrt(Math.max(0, raInternal * raInternal - rb * rb)) +
                     (rp - rp2) * Math.sin(alphaWt)
      contactRatio = Number((Math.max(0, gAlpha) / pbt).toFixed(2))
      bottomClearance = Number((rp - ha - rf2).toFixed(3))
    } else {
      const aNominal = (mt * (z + teeth2)) / 2
      centerDistance = aNominal
      gearRatio = teeth2 / z

      // Cinemática operativa según ISO 21771 / DIN 3960
      const invAlphaT = Math.tan(alphaT) - alphaT
      const sumX = x + x2
      const invAlphaWt = invAlphaT + (2 * sumX / (z + z2)) * Math.tan(alphaRad)
      const alphaWt = invAlphaWt > 0 ? solveInvolute(invAlphaWt) : alphaT
      const cosAlphaWt = Math.cos(alphaWt)
      const aWorking = cosAlphaWt > 0.01 ? (aNominal * Math.cos(alphaT)) / cosAlphaWt : aNominal

      workingCenterDistance = Number(aWorking.toFixed(3))
      workingCenterDistanceOffset = Number((aWorking - aNominal).toFixed(3))
      operatingPressureAngleDeg = Number(((alphaWt * 180) / Math.PI).toFixed(2))
      operatingPitchRadius1 = Number((aWorking * (z / (z + z2))).toFixed(3))
      operatingPitchRadius2 = Number((aWorking * (z2 / (z + z2))).toFixed(3))

      // Trayectoria activa de contacto g_alpha y ratio de contacto operativo:
      const gAlpha = Math.sqrt(Math.max(0, ra * ra - rb * rb)) +
                     Math.sqrt(Math.max(0, ra2 * ra2 - rb2 * rb2)) -
                     aWorking * Math.sin(alphaWt)
      contactRatio = Number((Math.max(0, gAlpha) / pbt).toFixed(2))

      // Holguras de fondo:
      const cNom1 = aNominal - ra - rf2
      const cNom2 = aNominal - ra2 - rf
      const cWork1 = aWorking - ra - rf2
      const cWork2 = aWorking - ra2 - rf

      // Espesores de diente y solapamiento circunferencial en primitivo nominal:
      const backlash = params.backlash ?? 0.05
      const st1 = (mn * (Math.PI / 2 + 2 * x * Math.tan(alphaRad)) - backlash / 2) / (betaRad !== 0 ? Math.cos(betaRad) : 1)
      const st2 = (mn * (Math.PI / 2 + 2 * x2 * Math.tan(alphaRad)) - backlash / 2) / (betaRad !== 0 ? Math.cos(betaRad) : 1)
      const pitchOverlap = (st1 + st2) - circularPitch

      // Detección de interferencia y colisión física:
      // Si sumX > 0 y los engranajes se posicionan rígidamente a la distancia nominal a:
      if (pitchOverlap > 0.02 || cNom1 < 0.02 * mn || cNom2 < 0.02 * mn) {
        hasMeshInterference = true
        toothOverlapInterference = Math.max(0, Number(pitchOverlap.toFixed(3)))
        bottomClearance = Number(Math.min(cNom1, cNom2).toFixed(3))
        meshInterferenceMessage = `Penetración física detectada: Solapamiento de flancos Δs = +${Math.max(0, pitchOverlap).toFixed(2)} mm y holgura de fondo c = ${Math.min(cNom1, cNom2).toFixed(2)} mm. Requiere compensar V-0 (x2 = -${x.toFixed(2)}) o montar a distancia operativa aw = ${aWorking.toFixed(2)} mm.`
      } else {
        bottomClearance = Number(Math.min(cWork1, cWork2).toFixed(3))
        toothOverlapInterference = 0
      }

      // Estimación de esfuerzo de contacto de Hertz (ISO 6336 simplificado):
      const torqueRef = 50 // N·m de referencia estándar
      const ftNom = (2 * torqueRef) / (Math.max(0.01, d) / 1000) // N
      const u = z2 / z
      const zH = Math.sqrt(Math.max(0.1, (2 * Math.cos(betaRad)) / Math.max(0.01, Math.sin(2 * alphaWt))))
      const zE = 189.8 // sqrt(MPa) para acero/acero
      const zEps = Math.sqrt(Math.max(0.1, (4 - Math.min(2.5, contactRatio ?? 1.4)) / 3))
      const zBeta = Math.sqrt(Math.cos(betaRad))
      const bEff = Math.max(5, b)
      const hertzCalc = zH * zE * zEps * zBeta * Math.sqrt(Math.max(0, (ftNom / (bEff * (d / 2) * 2)) * ((u + 1) / u)))
      hertzStressMPa = Number(Math.min(2500, Math.max(50, hertzCalc)).toFixed(0))

      // Velocidad máxima de deslizamiento relativo en cresta a 25 RPM:
      const omega1 = (25 * 2 * Math.PI) / 60
      const vSlideCalc = (omega1 / 1000) * Math.abs(Math.sqrt(Math.max(0, ra * ra - rb * rb)) - (operatingPitchRadius1 || rp) * Math.sin(alphaWt)) * (1 + z / z2)
      maxSlidingVelocity = Number(vSlideCalc.toFixed(2))
    }
  }

  if (contactRatio != null) {
    if (hasMeshInterference) {
      contactRatioStatus = 'critical'
    } else if (contactRatio >= 1.4) {
      contactRatioStatus = 'optimal'
    } else if (contactRatio >= 1.2) {
      contactRatioStatus = 'acceptable'
    } else if (contactRatio >= 1.0) {
      contactRatioStatus = 'marginal'
    } else {
      contactRatioStatus = 'critical'
    }

    if (betaRad !== 0) {
      overlapRatio = Number(((b * Math.sin(betaRad)) / (Math.PI * mn)).toFixed(2))
      totalContactRatio = Number((contactRatio + overlapRatio).toFixed(2))
    }
  }

  // 3. Alerta de interferencia trocoidal en coronas interiores
  let internalInterferenceWarning = false
  if (gearType === 'internal' && teeth2 && teeth2 > 0) {
    const deltaZ = z - teeth2
    if (deltaZ < 8) {
      internalInterferenceWarning = true
    }
  }

  // 4. Hunting Tooth / Desgaste Uniforme
  let huntingToothStatus: 'optimal' | 'cyclic' | undefined = undefined
  let gcdTeeth: number | undefined = undefined
  if (teeth2 && teeth2 > 0 && gearType !== 'rack') {
    const g = gcd(z, teeth2)
    gcdTeeth = g
    huntingToothStatus = g === 1 ? 'optimal' : 'cyclic'
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

    // Diagnósticos cinemáticos avanzados
    contactRatio,
    contactRatioStatus,
    overlapRatio,
    totalContactRatio,
    topLandThickness,
    topLandStatus,
    minRecommendedTopLand,
    internalInterferenceWarning,
    huntingToothStatus,
    gcdTeeth,

    // Cinemática operativa ISO 21771 / DIN 3960 y colisión
    workingCenterDistance,
    workingCenterDistanceOffset,
    operatingPressureAngleDeg,
    operatingPitchRadius1,
    operatingPitchRadius2,
    bottomClearance,
    toothOverlapInterference,
    hasMeshInterference,
    meshInterferenceMessage,
    hertzStressMPa,
    maxSlidingVelocity,

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

export function gcd(a: number, b: number): number {
  let x = Math.round(Math.abs(a))
  let y = Math.round(Math.abs(b))
  while (y) {
    const t = y
    y = x % y
    x = t
  }
  return x || 1
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
    helixHand: params.helixHand || 'right',
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
    hubBothSides: params.rackPinionHubBothSides ?? false,
    profileShift: params.rackPinionProfileShift || 0.0,
  }
}


