import * as THREE from 'three'
import type { GearParameters, MeshingPairParameters, CalculatedDimensions } from './types'

/**
 * Crea una textura de Canvas para una etiqueta de cota técnica en 3D
 */
function createTextSprite(
  text: string,
  subText?: string,
  isHighlight = false
): THREE.Sprite {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.Sprite()

  canvas.width = 512
  canvas.height = 128

  const padX = 14
  const padY = 14
  const w = canvas.width - padX * 2
  const h = canvas.height - padY * 2
  const r = 24

  // Fondo estilo pill redondeado
  ctx.beginPath()
  ctx.moveTo(padX + r, padY)
  ctx.lineTo(padX + w - r, padY)
  ctx.arcTo(padX + w, padY, padX + w, padY + r, r)
  ctx.lineTo(padX + w, padY + h - r)
  ctx.arcTo(padX + w, padY + h, padX + w - r, padY + h, r)
  ctx.lineTo(padX + r, padY + h)
  ctx.arcTo(padX, padY + h, padX, padY + h - r, r)
  ctx.lineTo(padX, padY + r)
  ctx.arcTo(padX, padY, padX + r, padY, r)
  ctx.closePath()

  // Relleno de la etiqueta
  ctx.fillStyle = isHighlight ? 'rgba(255, 247, 237, 0.96)' : 'rgba(255, 255, 255, 0.96)'
  ctx.fill()

  // Borde técnico
  ctx.lineWidth = 4
  ctx.strokeStyle = isHighlight ? '#ea580c' : '#cbd5e1'
  ctx.stroke()

  // Texto centrado
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  if (subText) {
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillStyle = isHighlight ? '#9a3412' : '#0f172a'
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 - 14)

    ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillStyle = isHighlight ? '#c2410c' : '#64748b'
    ctx.fillText(subText, canvas.width / 2, canvas.height / 2 + 24)
  } else {
    ctx.font = 'bold 40px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillStyle = isHighlight ? '#c2410c' : '#0f172a'
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter

  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  })

  const sprite = new THREE.Sprite(spriteMaterial)
  sprite.scale.set(24, 6, 1)
  sprite.renderOrder = 999
  return sprite
}

/**
 * Genera una línea de cota con líneas auxiliares de referencia y marcas a 45° estilo CAD
 */
function createDimensionLine(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  extP1: THREE.Vector3,
  extP2: THREE.Vector3,
  options?: { color?: number; arrowSize?: number }
): THREE.Group {
  const group = new THREE.Group()
  const color = options?.color ?? 0x64748b
  const arrowSize = options?.arrowSize ?? 2.5

  const lineMat = new THREE.LineBasicMaterial({
    color,
    linewidth: 1,
    transparent: true,
    opacity: 0.85,
    depthTest: false,
  })

  // Líneas auxiliares de referencia
  const extGeom1 = new THREE.BufferGeometry().setFromPoints([extP1, p1])
  const extGeom2 = new THREE.BufferGeometry().setFromPoints([extP2, p2])
  group.add(new THREE.Line(extGeom1, lineMat))
  group.add(new THREE.Line(extGeom2, lineMat))

  // Línea de cota principal
  const mainGeom = new THREE.BufferGeometry().setFromPoints([p1, p2])
  group.add(new THREE.Line(mainGeom, lineMat))

  // Marcas de cota estilo CAD a 45°
  const dir = new THREE.Vector3().subVectors(p2, p1).normalize()
  const perp = new THREE.Vector3(-dir.y, dir.x, 0).normalize()

  const t1A = p1.clone().add(dir.clone().multiplyScalar(arrowSize * 0.7)).add(perp.clone().multiplyScalar(arrowSize * 0.7))
  const t1B = p1.clone().add(dir.clone().multiplyScalar(-arrowSize * 0.7)).add(perp.clone().multiplyScalar(-arrowSize * 0.7))
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([t1A, t1B]), lineMat))

  const t2A = p2.clone().add(dir.clone().multiplyScalar(arrowSize * 0.7)).add(perp.clone().multiplyScalar(arrowSize * 0.7))
  const t2B = p2.clone().add(dir.clone().multiplyScalar(-arrowSize * 0.7)).add(perp.clone().multiplyScalar(-arrowSize * 0.7))
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([t2A, t2B]), lineMat))

  return group
}

/**
 * Genera la proyección circular sobre el plano del piso
 */
function createCircleProjection(
  radius: number,
  center: THREE.Vector3,
  options?: { color?: number; dashed?: boolean }
): THREE.Line {
  const segments = 64
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2
    points.push(
      new THREE.Vector3(
        center.x + Math.cos(theta) * radius,
        center.y + Math.sin(theta) * radius,
        center.z
      )
    )
  }
  const geom = new THREE.BufferGeometry().setFromPoints(points)

  if (options?.dashed) {
    const mat = new THREE.LineDashedMaterial({
      color: options.color ?? 0xf97316,
      dashSize: 2.5,
      gapSize: 1.5,
      transparent: true,
      opacity: 0.65,
      depthTest: false,
    })
    const line = new THREE.Line(geom, mat)
    line.computeLineDistances()
    return line
  } else {
    const mat = new THREE.LineBasicMaterial({
      color: options?.color ?? 0xcfd8dc,
      transparent: true,
      opacity: 0.5,
      depthTest: false,
    })
    return new THREE.Line(geom, mat)
  }
}

/**
 * Construye el conjunto completo de cotas dinámicas en el piso para la escena 3D
 */
export function buildFloorDimensions(
  params: GearParameters,
  meshingPair: MeshingPairParameters,
  dims: CalculatedDimensions
): THREE.Group {
  const group = new THREE.Group()
  group.name = 'floor-dimensions-content'

  const fw = params.faceWidth || 20
  const floorZ = -((fw / 2) + 3)
  const isRack = params.gearType === 'rack'

  if (isRack) {
    const rLen = params.rackLength || 160
    const rH = params.rackHeight || 25
    const focus = params.rackViewFocus || 'both'
    const showRack = focus === 'both' || focus === 'rack'
    const showPinion = params.rackIncludePinion !== false && (focus === 'both' || focus === 'pinion')

    if (showRack) {
      // 1. Cota de Longitud Total de Cremallera (L)
      const dimY = -rH - 18
      group.add(
        createDimensionLine(
          new THREE.Vector3(-rLen / 2, dimY, floorZ),
          new THREE.Vector3(rLen / 2, dimY, floorZ),
          new THREE.Vector3(-rLen / 2, -rH, floorZ),
          new THREE.Vector3(rLen / 2, -rH, floorZ),
          { color: 0x0f172a, arrowSize: 3 }
        )
      )
      const spriteL = createTextSprite(`L = ${rLen} mm`, 'Rack Length', true)
      spriteL.position.set(0, dimY, floorZ + 0.8)
      group.add(spriteL)

      // 2. Cota de Altura de la Barra (H)
      const dimX = -rLen / 2 - 18
      group.add(
        createDimensionLine(
          new THREE.Vector3(dimX, -rH, floorZ),
          new THREE.Vector3(dimX, 0, floorZ),
          new THREE.Vector3(-rLen / 2, -rH, floorZ),
          new THREE.Vector3(-rLen / 2, 0, floorZ),
          { color: 0x64748b, arrowSize: 2.5 }
        )
      )
      const spriteH = createTextSprite(`H = ${rH} mm`, 'Base Height')
      spriteH.position.set(dimX, -rH / 2, floorZ + 0.8)
      group.add(spriteH)

      // 3. Cota de Ancho / Espesor de Cara (b)
      const dimXRight = rLen / 2 + 18
      const spriteB = createTextSprite(`b = ${fw} mm`, 'Face Width')
      spriteB.position.set(dimXRight, -rH / 2, floorZ + 0.8)
      group.add(spriteB)
    }

    if (showPinion) {
      const pTeeth = params.rackPinionTeeth || 20
      const pRadius = dims.pinionPitchRadius || 20
      const opY = dims.pinionOperatingY || pRadius
      const pTipRadius = dims.pinionTipRadius || pRadius + params.module

      // Círculos del piñón proyectados en el piso
      group.add(createCircleProjection(pRadius, new THREE.Vector3(0, opY, floorZ), { color: 0xf97316, dashed: true }))
      group.add(createCircleProjection(pTipRadius, new THREE.Vector3(0, opY, floorZ), { color: 0xcfd8dc, dashed: false }))

      // Cota de diámetro del piñón
      const pDimY = opY + pTipRadius + 18
      group.add(
        createDimensionLine(
          new THREE.Vector3(-pTipRadius, pDimY, floorZ),
          new THREE.Vector3(pTipRadius, pDimY, floorZ),
          new THREE.Vector3(-pTipRadius, opY, floorZ),
          new THREE.Vector3(pTipRadius, opY, floorZ),
          { color: 0xf97316, arrowSize: 2.5 }
        )
      )
      const spritePinion = createTextSprite(
        `Ø da = ${(pTipRadius * 2).toFixed(1)} mm`,
        `Pinion (zp=${pTeeth}, d=${(pRadius * 2).toFixed(1)} mm)`,
        true
      )
      spritePinion.position.set(0, pDimY, floorZ + 0.8)
      group.add(spritePinion)

      // Cota de distancia de montaje Y (desde base de cremallera al eje del piñón)
      const mX = pTipRadius + 22
      group.add(
        createDimensionLine(
          new THREE.Vector3(mX, -rH, floorZ),
          new THREE.Vector3(mX, opY, floorZ),
          new THREE.Vector3(0, -rH, floorZ),
          new THREE.Vector3(0, opY, floorZ),
          { color: 0x0284c7, arrowSize: 2.5 }
        )
      )
      const spriteMount = createTextSprite(
        `Mounting = ${(rH + opY).toFixed(1)} mm`,
        'Base to Pinion Axis'
      )
      spriteMount.position.set(mX, (-rH + opY) / 2, floorZ + 0.8)
      group.add(spriteMount)
    }
  } else {
    // Engranajes cilíndricos estándar (Spur, Helical, Herringbone, Internal, Bevel)
    const isPairActive = meshingPair.enabled
    const da1 = dims.tipDiameter
    const d1 = dims.pitchDiameter
    const ra1 = da1 / 2
    const r1 = d1 / 2

    // Proyecciones circulares del engranaje 1
    group.add(createCircleProjection(r1, new THREE.Vector3(0, 0, floorZ), { color: 0xf97316, dashed: true }))
    group.add(createCircleProjection(ra1, new THREE.Vector3(0, 0, floorZ), { color: 0xcfd8dc, dashed: false }))

    if (params.boreDiameter > 0) {
      group.add(createCircleProjection(params.boreDiameter / 2, new THREE.Vector3(0, 0, floorZ), { color: 0x94a3b8, dashed: false }))
    }

    if (!isPairActive) {
      // 1. Cota Inferior: Diámetro Exterior (da)
      const dimYBottom = -(ra1 + 20)
      group.add(
        createDimensionLine(
          new THREE.Vector3(-ra1, dimYBottom, floorZ),
          new THREE.Vector3(ra1, dimYBottom, floorZ),
          new THREE.Vector3(-ra1, 0, floorZ),
          new THREE.Vector3(ra1, 0, floorZ),
          { color: 0x0f172a, arrowSize: 3 }
        )
      )
      const spriteDa = createTextSprite(
        `Ø da = ${da1.toFixed(1)} mm`,
        `Tip / Outer (z=${params.teeth})`,
        true
      )
      spriteDa.position.set(0, dimYBottom, floorZ + 0.8)
      group.add(spriteDa)

      // 2. Cota Superior: Diámetro Primitivo (d)
      const dimYTop = +(ra1 + 20)
      group.add(
        createDimensionLine(
          new THREE.Vector3(-r1, dimYTop, floorZ),
          new THREE.Vector3(r1, dimYTop, floorZ),
          new THREE.Vector3(-r1, 0, floorZ),
          new THREE.Vector3(r1, 0, floorZ),
          { color: 0xf97316, arrowSize: 2.5 }
        )
      )
      const spriteD = createTextSprite(
        `Ø d = ${d1.toFixed(1)} mm`,
        `Pitch (m=${params.module})`
      )
      spriteD.position.set(0, dimYTop, floorZ + 0.8)
      group.add(spriteD)

      // 3. Cota Lateral Izquierda: Diámetro de Eje si existe
      if (params.boreDiameter > 0) {
        const dimXBore = -(ra1 + 22)
        const rbore = params.boreDiameter / 2
        group.add(
          createDimensionLine(
            new THREE.Vector3(dimXBore, -rbore, floorZ),
            new THREE.Vector3(dimXBore, rbore, floorZ),
            new THREE.Vector3(0, -rbore, floorZ),
            new THREE.Vector3(0, rbore, floorZ),
            { color: 0x0284c7, arrowSize: 2 }
          )
        )
        const spriteBore = createTextSprite(`Ø bore = ${params.boreDiameter} mm`)
        spriteBore.position.set(dimXBore, 0, floorZ + 0.8)
        group.add(spriteBore)
      }

      // 4. Cota Lateral Derecha: Espesor de Cara (b)
      const dimXFace = +(ra1 + 22)
      const spriteFace = createTextSprite(`b = ${fw} mm`, 'Face Width')
      spriteFace.position.set(dimXFace, 0, floorZ + 0.8)
      group.add(spriteFace)
    } else {
      // Modo Pareja Ensamblada
      const z2 = meshingPair.teeth2 || 24
      const d2 = Number((params.module * z2).toFixed(2))
      const da2 = Number((d2 + 2 * params.module).toFixed(2))
      const ra2 = da2 / 2
      const r2 = d2 / 2
      const centerDist = (dims.centerDistance || (d1 + d2) / 2) + (meshingPair.previewDeltaA ?? 0)

      // Círculos proyectados del engranaje 2
      group.add(createCircleProjection(r2, new THREE.Vector3(centerDist, 0, floorZ), { color: 0x2563eb, dashed: true }))
      group.add(createCircleProjection(ra2, new THREE.Vector3(centerDist, 0, floorZ), { color: 0xcfd8dc, dashed: false }))

      // Cota Superior Principal: Distancia entre Centros (a)
      const maxRa = Math.max(ra1, ra2)
      const dimYTop = +(maxRa + 24)
      group.add(
        createDimensionLine(
          new THREE.Vector3(0, dimYTop, floorZ),
          new THREE.Vector3(centerDist, dimYTop, floorZ),
          new THREE.Vector3(0, 0, floorZ),
          new THREE.Vector3(centerDist, 0, floorZ),
          { color: 0xea580c, arrowSize: 3.5 }
        )
      )
      const spriteDist = createTextSprite(
        `a = ${centerDist.toFixed(1)} mm`,
        'Center Distance',
        true
      )
      spriteDist.position.set(centerDist / 2, dimYTop, floorZ + 0.8)
      group.add(spriteDist)

      // Cota Inferior Engranaje 1
      const dimYBot1 = -(ra1 + 20)
      group.add(
        createDimensionLine(
          new THREE.Vector3(-r1, dimYBot1, floorZ),
          new THREE.Vector3(r1, dimYBot1, floorZ),
          new THREE.Vector3(-r1, 0, floorZ),
          new THREE.Vector3(r1, 0, floorZ),
          { color: 0x0f172a, arrowSize: 2.5 }
        )
      )
      const spriteG1 = createTextSprite(
        `Ø d1 = ${d1.toFixed(1)} mm`,
        `Gear 1 (z1=${params.teeth})`
      )
      spriteG1.position.set(0, dimYBot1, floorZ + 0.8)
      group.add(spriteG1)

      // Cota Inferior Engranaje 2
      const dimYBot2 = -(ra2 + 20)
      group.add(
        createDimensionLine(
          new THREE.Vector3(centerDist - r2, dimYBot2, floorZ),
          new THREE.Vector3(centerDist + r2, dimYBot2, floorZ),
          new THREE.Vector3(centerDist - r2, 0, floorZ),
          new THREE.Vector3(centerDist + r2, 0, floorZ),
          { color: 0x2563eb, arrowSize: 2.5 }
        )
      )
      const spriteG2 = createTextSprite(
        `Ø d2 = ${d2.toFixed(1)} mm`,
        `Gear 2 (z2=${z2})`
      )
      spriteG2.position.set(centerDist, dimYBot2, floorZ + 0.8)
      group.add(spriteG2)
    }
  }

  return group
}
