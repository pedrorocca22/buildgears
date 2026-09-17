import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useGearStore } from '../store/useGearStore'
import type { FlatColor } from '../store/useGearStore'
import { buildGearThreeGeometry } from '../cad/manifoldEngine'
import { calculateDimensions, getConjugatePinionParams } from '../cad/gearMath'
import { buildFloorDimensions } from '../cad/dimensionRenderer'

export const Viewport3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.Camera | null>(null)
  const perspCameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const orthoCameraRef = useRef<THREE.OrthographicCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const mainMeshRef = useRef<THREE.Mesh | null>(null)
  const pairMeshRef = useRef<THREE.Mesh | null>(null)
  const centerLineRef = useRef<THREE.Line | null>(null)
  const clippingPlaneRef = useRef<THREE.Plane | null>(null)
  const dimensionsGroupRef = useRef<THREE.Group | null>(null)

  const [, setTrianglesCount] = useState<number>(0)
  const [, setIsGenerating] = useState<boolean>(false)

  const gear1Params = useGearStore((s) => s.gear1Params)
  const gear2Params = useGearStore((s) => s.gear2Params)
  const gear2Enabled = useGearStore((s) => s.gear2Enabled)
  const motorized = useGearStore((s) => s.motorized)
  const motorRpm = useGearStore((s) => s.motorRpm)
  const setMotorized = useGearStore((s) => s.setMotorized)
  const setMotorRpm = useGearStore((s) => s.setMotorRpm)
  const meshingPair = useGearStore((s) => s.meshingPair)
  const viewSettings = useGearStore((s) => s.viewSettings)
  const setViewSetting = useGearStore((s) => s.setViewSetting)

  const isPairActive = gear1Params.gearType === 'rack' ? (gear1Params.rackIncludePinion !== false) : gear2Enabled
  const dims = calculateDimensions(gear1Params, isPairActive ? gear2Params.teeth : undefined)

  // Paleta de Colores Planos (sin efecto metálico)
  const flatColorHex: Record<FlatColor, number> = {
    mustard: 0xd99b1a,  // Amarillo mostaza de la imagen de referencia
    orange: 0xf97316,   // Naranja taller
    blue: 0x2563eb,     // Azul CAD
    white: 0xe2e8f0,    // Blanco cerámico
    charcoal: 0x334155, // Grafito mate
    green: 0x10b981,    // Verde menta
  }

  // Material mate con color plano (cero metalness, superficie limpia)
  const getFlatMaterial = (colorKey: FlatColor, isPair = false) => {
    const baseColor = isPair ? 0x3b82f6 : flatColorHex[colorKey]

    return new THREE.MeshStandardMaterial({
      color: baseColor,
      metalness: 0.0,      // Totalmente no-metálico, color plástico/arcilla plano
      roughness: 0.55,     // Acabado mate uniforme
      wireframe: viewSettings.wireframe,
      side: THREE.DoubleSide,
      flatShading: false,
      clippingPlanes: viewSettings.sectionCut && clippingPlaneRef.current ? [clippingPlaneRef.current] : [],
      clipShadows: true,
    })
  }

  // Inicialización del visor Three.js con iluminación de estudio clara
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Scene con fondo de estudio claro
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf6f8fb)
    sceneRef.current = scene

    // Perspective Camera (FOV 32° para perspectiva CAD natural y sin distorsión de ojo de pez)
    const aspect = width / height
    const perspCamera = new THREE.PerspectiveCamera(32, aspect, 1, 3000)
    perspCamera.position.set(0, -115, 95)
    perspCamera.up.set(0, 0, 1)
    perspCameraRef.current = perspCamera

    // Dimensiones iniciales para encuadrar la cámara ortográfica
    const maxDim = gear1Params.gearType === 'rack'
      ? Math.max(gear1Params.rackLength || 160, dims.tipDiameter || 60)
      : isPairActive
      ? (dims.centerDistance || 60) + (dims.tipDiameter || 60)
      : (dims.tipDiameter || 60)
    const frustumH = Math.max(75, maxDim * 1.35)

    // Orthographic Camera (Proyección plana 2D de ingeniería sin fuga de perspectiva)
    const orthoCamera = new THREE.OrthographicCamera(
      (-frustumH * aspect) / 2,
      (frustumH * aspect) / 2,
      frustumH / 2,
      -frustumH / 2,
      -1500,
      3000
    )
    orthoCamera.position.set(0, -115, 95)
    orthoCamera.up.set(0, 0, 1)
    orthoCameraRef.current = orthoCamera

    const initialCamera: THREE.Camera = viewSettings.cameraProjection === 'orthographic' ? orthoCamera : perspCamera
    cameraRef.current = initialCamera

    // Clipping Plane
    const clipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    clippingPlaneRef.current = clipPlane

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = false // Evitar sombras proyectadas sobre sí mismo que marquen el mallado
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.localClippingEnabled = true
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Controls
    const controls = new OrbitControls(initialCamera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.maxDistance = 1000
    controls.minDistance = 5
    controlsRef.current = controls

    // Iluminación suave y uniforme de estudio CAD para colores planos
    const ambLight = new THREE.AmbientLight(0xffffff, 1.3)
    scene.add(ambLight)

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2)
    keyLight.position.set(60, -80, 120)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 0.7)
    fillLight.position.set(-60, 80, 60)
    scene.add(fillLight)

    // Cuadrícula isométrica estilo estudio CAD claro
    const grid = new THREE.GridHelper(300, 30, 0xcfd8dc, 0xe2e8f0)
    grid.rotation.x = Math.PI / 2
    grid.position.z = -15
    grid.name = 'engineering-grid'
    scene.add(grid)

    // Grupo para cotas y medidas dinámicas en el piso
    const dimGroup = new THREE.Group()
    dimGroup.name = 'floor-dimensions'
    scene.add(dimGroup)
    dimensionsGroupRef.current = dimGroup

    // Bucle de renderizado y animación
    let animationFrameId: number
    let angleGear1 = 0

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)

      const storeState = useGearStore.getState()
      const isMotorRunning = storeState.motorized
      const isRack = storeState.gear1Params.gearType === 'rack'
      const pairActive = isRack ? (storeState.gear1Params.rackIncludePinion !== false) : storeState.gear2Enabled

      if (isMotorRunning && pairActive) {
        const deltaAngle = ((storeState.motorRpm * (2 * Math.PI)) / 60) * 0.016
        angleGear1 += deltaAngle

        if (isRack) {
          // Cinemática de Cremallera y Piñón:
          const pTeeth = storeState.gear1Params.rackPinionTeeth || 20
          const m = storeState.gear1Params.module
          const isHerringbone = storeState.gear1Params.rackToothType === 'herringbone'
          const isHelical = storeState.gear1Params.rackToothType === 'helical' || (!storeState.gear1Params.rackToothType && storeState.gear1Params.helixAngle && storeState.gear1Params.helixAngle > 0)
          const effBeta = (isHerringbone || isHelical) ? (storeState.gear1Params.helixAngle || 20) : 0
          const betaRad = effBeta * (Math.PI / 180)
          const mt = betaRad !== 0 ? m / Math.cos(betaRad) : m
          const rp = (mt * pTeeth) / 2
          const xp = storeState.gear1Params.rackPinionProfileShift || 0.0
          const operatingY = rp + xp * m

          const rLength = storeState.gear1Params.rackLength || 160
          const pitch = Math.PI * mt
          const toothCount = Math.max(3, Math.floor(rLength / pitch))
          const startX = -(toothCount * pitch) / 2
          const kClosest = Math.round(-startX / pitch)
          const xGapClosest = startX + kClosest * pitch
          const basePinionPhase = -Math.PI / 2 + (xGapClosest / rp)

          // Carrera armónica reversible centrada para visualización técnica continua
          const strokeLimit = Math.max(15, rLength / 2 - rp - 10)
          const linearDisp = strokeLimit * Math.sin(angleGear1 * 0.5)
          // Sentido cinemático coordinado: desplazamiento lineal a la derecha (+X)
          // requiere rotación anti-horaria (CCW, +theta) del piñón para que las velocidades tangenciales coincidan en signo
          const pinionAngle = basePinionPhase + (linearDisp / rp)

          if (mainMeshRef.current) {
            mainMeshRef.current.position.set(linearDisp, 0, 0)
            mainMeshRef.current.rotation.z = 0
          }

          if (pairMeshRef.current) {
            pairMeshRef.current.position.set(0, operatingY, 0)
            pairMeshRef.current.rotation.z = pinionAngle
          }
        } else {
          // Engranajes cilíndricos estándar acoplados en rotación conjugada
          if (mainMeshRef.current) {
            mainMeshRef.current.position.set(0, 0, 0)
            mainMeshRef.current.rotation.z = angleGear1
          }

          if (pairMeshRef.current) {
            const z1 = storeState.gear1Params.teeth
            const z2 = storeState.gear2Params.teeth
            const ratio = z1 / z2
            const effBeta = (storeState.gear1Params.gearType === 'helical' || storeState.gear1Params.gearType === 'herringbone') && storeState.gear1Params.helixAngle ? storeState.gear1Params.helixAngle : 0
            const betaRad = (effBeta * Math.PI) / 180
            const mt = betaRad !== 0 ? storeState.gear1Params.module / Math.cos(betaRad) : storeState.gear1Params.module
            const centerDist = (mt * (z1 + z2)) / 2
            const phaseOffset = Math.PI + Math.PI / z2

            pairMeshRef.current.position.set(centerDist, 0, 0)
            pairMeshRef.current.rotation.z = -angleGear1 * ratio + phaseOffset
          }
        }
      } else {
        // En reposo, restablecer posición recta y fase de engrane conjugado
        if (isRack) {
          if (mainMeshRef.current && mainMeshRef.current.position.x !== 0) {
            mainMeshRef.current.position.set(0, 0, 0)
          }
          if (pairMeshRef.current) {
            const pTeeth = storeState.gear1Params.rackPinionTeeth || 20
            const m = storeState.gear1Params.module
            const isHerringbone = storeState.gear1Params.rackToothType === 'herringbone'
            const isHelical = storeState.gear1Params.rackToothType === 'helical' || (!storeState.gear1Params.rackToothType && storeState.gear1Params.helixAngle && storeState.gear1Params.helixAngle > 0)
            const effBeta = (isHerringbone || isHelical) ? (storeState.gear1Params.helixAngle || 20) : 0
            const betaRad = effBeta * (Math.PI / 180)
            const mt = betaRad !== 0 ? m / Math.cos(betaRad) : m
            const rp = (mt * pTeeth) / 2
            const rLength = storeState.gear1Params.rackLength || 160
            const pitch = Math.PI * mt
            const toothCount = Math.max(3, Math.floor(rLength / pitch))
            const startX = -(toothCount * pitch) / 2
            const kClosest = Math.round(-startX / pitch)
            const xGapClosest = startX + kClosest * pitch
            const basePinionPhase = -Math.PI / 2 + (xGapClosest / rp)

            pairMeshRef.current.rotation.z = basePinionPhase
          }
        }
      }


      controls.update()
      const currentCamera = cameraRef.current || initialCamera
      renderer.render(scene, currentCamera)
    }
    animate()

    const handleResize = () => {
      if (!container || !renderer) return
      const w = container.clientWidth
      const h = container.clientHeight
      const asp = w / h
      if (perspCameraRef.current) {
        perspCameraRef.current.aspect = asp
        perspCameraRef.current.updateProjectionMatrix()
      }
      if (orthoCameraRef.current) {
        const curH = orthoCameraRef.current.top - orthoCameraRef.current.bottom
        orthoCameraRef.current.left = (-curH * asp) / 2
        orthoCameraRef.current.right = (curH * asp) / 2
        orthoCameraRef.current.updateProjectionMatrix()
      }
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  // Actualizar material cuando cambie el color plano o wireframe
  useEffect(() => {
    if (mainMeshRef.current) {
      mainMeshRef.current.material = getFlatMaterial(viewSettings.flatColor)
    }
    if (pairMeshRef.current) {
      pairMeshRef.current.material = getFlatMaterial(viewSettings.flatColor, true)
    }
  }, [viewSettings.flatColor, viewSettings.wireframe])

  // Plano de corte transversal
  useEffect(() => {
    if (clippingPlaneRef.current) {
      clippingPlaneRef.current.constant = viewSettings.sectionPosition * 40
    }
    if (mainMeshRef.current) {
      const mat = mainMeshRef.current.material as THREE.MeshStandardMaterial
      mat.clippingPlanes = viewSettings.sectionCut && clippingPlaneRef.current ? [clippingPlaneRef.current] : []
      mat.needsUpdate = true
    }
    if (pairMeshRef.current) {
      const mat = pairMeshRef.current.material as THREE.MeshStandardMaterial
      mat.clippingPlanes = viewSettings.sectionCut && clippingPlaneRef.current ? [clippingPlaneRef.current] : []
      mat.needsUpdate = true
    }
  }, [viewSettings.sectionCut, viewSettings.sectionPosition])

  // Generación geométrica con Manifold-3D WASM (Engranaje 1)
  useEffect(() => {
    let active = true
    setIsGenerating(true)

    const updateGeometry = async () => {
      try {
        const geom = await buildGearThreeGeometry(gear1Params)
        if (!active || !sceneRef.current) return

        if (mainMeshRef.current) {
          sceneRef.current.remove(mainMeshRef.current)
          mainMeshRef.current.traverse((child) => {
            if ((child as any).geometry) (child as any).geometry.dispose()
          })
        }

        const mat = getFlatMaterial(viewSettings.flatColor)
        const mesh = new THREE.Mesh(geom, mat)

        // Aristas geométricas vivas (> 28°) con línea sutil estilo software CAD
        const edgesGeom = new THREE.EdgesGeometry(geom, 28)
        const edgeMat = new THREE.LineBasicMaterial({
          color: 0x334155,
          transparent: true,
          opacity: 0.2,
          linewidth: 1,
        })
        const edgeLines = new THREE.LineSegments(edgesGeom, edgeMat)
        mesh.add(edgeLines)

        if (gear1Params.gearType === 'rack') {
          const focus = gear1Params.rackViewFocus || 'both'
          mesh.visible = focus === 'both' || focus === 'rack'
          if (pairMeshRef.current) {
            pairMeshRef.current.visible = (gear1Params.rackIncludePinion !== false) && (focus === 'both' || focus === 'pinion')
          }
        }

        sceneRef.current.add(mesh)
        mainMeshRef.current = mesh

        const tris = geom.index ? geom.index.count / 3 : geom.attributes.position.count / 3
        setTrianglesCount(Math.round(tris))
        setIsGenerating(false)
      } catch (err) {
        console.error('Error generando malla con Manifold-3D:', err)
        setIsGenerating(false)
      }
    }

    const timer = setTimeout(updateGeometry, 40)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [gear1Params, viewSettings.flatColor, viewSettings.wireframe])

  // Generación geométrica con Manifold-3D WASM (Engranaje 2 - Pareja Meshing / Piñón Conjugado)
  useEffect(() => {
    let active = true
    if (!sceneRef.current) return

    const isRack = gear1Params.gearType === 'rack'
    const shouldShowPair = isRack ? (gear1Params.rackIncludePinion !== false) : gear2Enabled

    if (!shouldShowPair) {
      if (pairMeshRef.current) {
        sceneRef.current.remove(pairMeshRef.current)
        pairMeshRef.current.traverse((child) => {
          if ((child as any).geometry) (child as any).geometry.dispose()
        })
        pairMeshRef.current = null
      }
      if (centerLineRef.current) {
        sceneRef.current.remove(centerLineRef.current)
        centerLineRef.current.geometry.dispose()
        centerLineRef.current = null
      }
      return
    }

    const updatePair = async () => {
      try {
        let pairParams: any
        let effDist = 50

        if (isRack) {
          const pairDims = calculateDimensions(gear1Params, gear1Params.rackPinionTeeth || 20)
          pairParams = getConjugatePinionParams(gear1Params)
          effDist = pairDims.pinionOperatingY || ((pairDims.circularPitch / Math.PI) * (gear1Params.rackPinionTeeth || 20) / 2)
        } else {
          const effBeta = (gear1Params.gearType === 'helical' || gear1Params.gearType === 'herringbone') && gear1Params.helixAngle ? gear1Params.helixAngle : 0
          const betaRad = (effBeta * Math.PI) / 180
          const mt = betaRad !== 0 ? gear1Params.module / Math.cos(betaRad) : gear1Params.module
          effDist = (mt * (gear1Params.teeth + gear2Params.teeth)) / 2
          pairParams = gear2Params
        }

        const geom = await buildGearThreeGeometry(pairParams)
        if (!active || !sceneRef.current) return

        if (pairMeshRef.current) {
          sceneRef.current.remove(pairMeshRef.current)
          pairMeshRef.current.traverse((child) => {
            if ((child as any).geometry) (child as any).geometry.dispose()
          })
        }

        const mat = getFlatMaterial(viewSettings.flatColor, true)
        const pairMesh = new THREE.Mesh(geom, mat)

        const edgesGeom = new THREE.EdgesGeometry(geom, 28)
        const edgeMat = new THREE.LineBasicMaterial({
          color: 0x1e3a8a,
          transparent: true,
          opacity: 0.2,
          linewidth: 1,
        })
        const edgeLines = new THREE.LineSegments(edgesGeom, edgeMat)
        pairMesh.add(edgeLines)

        if (isRack) {
          const rLen = gear1Params.rackLength || 160
          const pTeeth = gear1Params.rackPinionTeeth || 20
          const m = gear1Params.module
          const isHerringbone = gear1Params.rackToothType === 'herringbone'
          const isHelical = gear1Params.rackToothType === 'helical' || (!gear1Params.rackToothType && gear1Params.helixAngle && gear1Params.helixAngle > 0)
          const effBeta = (isHerringbone || isHelical) ? (gear1Params.helixAngle || 20) : 0
          const betaRad = effBeta * (Math.PI / 180)
          const mt = betaRad !== 0 ? m / Math.cos(betaRad) : m
          const rp = (mt * pTeeth) / 2
          const pitch = Math.PI * mt
          const toothCount = Math.max(3, Math.floor(rLen / pitch))
          const startX = -(toothCount * pitch) / 2
          const kClosest = Math.round(-startX / pitch)
          const xGapClosest = startX + kClosest * pitch
          const basePinionPhase = -Math.PI / 2 + (xGapClosest / rp)

          pairMesh.position.set(0, effDist, 0)
          pairMesh.rotation.z = basePinionPhase
          const focus = gear1Params.rackViewFocus || 'both'
          pairMesh.visible = (gear1Params.rackIncludePinion !== false) && (focus === 'both' || focus === 'pinion')
          if (mainMeshRef.current) {
            mainMeshRef.current.visible = focus === 'both' || focus === 'rack'
          }
        } else {
          pairMesh.position.set(effDist, 0, 0)
          const phaseOffset = Math.PI + Math.PI / gear2Params.teeth
          pairMesh.rotation.z = phaseOffset
        }
        sceneRef.current.add(pairMesh)
        pairMeshRef.current = pairMesh

        if (centerLineRef.current) {
          sceneRef.current.remove(centerLineRef.current)
          centerLineRef.current.geometry.dispose()
        }

        let lineGeom: THREE.BufferGeometry
        if (isRack) {
          const rLen = gear1Params.rackLength || 160
          lineGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-rLen / 2 - 10, 0, 0),
            new THREE.Vector3(rLen / 2 + 10, 0, 0),
          ])
        } else {
          lineGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(effDist, 0, 0),
          ])
        }
        const lineMat = new THREE.LineDashedMaterial({
          color: 0xf97316,
          dashSize: 2,
          gapSize: 1,
          linewidth: 2,
        })
        const line = new THREE.Line(lineGeom, lineMat)
        line.computeLineDistances()
        sceneRef.current.add(line)
        centerLineRef.current = line
      } catch (err) {
        console.error('Error generando pareja conjugada:', err)
      }
    }

    const timer = setTimeout(updatePair, 50)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [gear2Enabled, gear1Params, gear2Params, viewSettings.flatColor, viewSettings.wireframe])

  // Cotas y medidas dinámicas proyectadas en el piso (3D Floor Dimensions)
  useEffect(() => {
    if (!sceneRef.current || !dimensionsGroupRef.current) return
    const dimGroup = dimensionsGroupRef.current

    // Limpiar cotas y sprites previos
    while (dimGroup.children.length > 0) {
      const child = dimGroup.children[0]
      dimGroup.remove(child)
      child.traverse((node: any) => {
        if (node.geometry) node.geometry.dispose()
        if (node.material) {
          if (Array.isArray(node.material)) {
            node.material.forEach((m: any) => {
              if (m.map) m.map.dispose()
              m.dispose()
            })
          } else {
            if (node.material.map) node.material.map.dispose()
            node.material.dispose()
          }
        }
      })
    }

    // Ajustar posición del suelo de la cuadrícula al mismo nivel que la base del engranaje
    const fw = gear1Params.faceWidth || 20
    const floorZ = -((fw / 2) + 3)
    const grid = sceneRef.current.getObjectByName('engineering-grid')
    if (grid) {
      grid.position.z = floorZ
    }

    if (!viewSettings.showDimensions) return

    const calculatedDims = calculateDimensions(
      gear1Params,
      meshingPair.enabled ? meshingPair.teeth2 : undefined
    )

    const floorDims = buildFloorDimensions(gear1Params, meshingPair, calculatedDims)
    dimGroup.add(floorDims)
  }, [
    gear1Params,
    meshingPair.enabled,
    meshingPair.teeth2,
    meshingPair.previewDeltaA,
    viewSettings.showDimensions,
  ])

  // Helper para acotar distancias de cámara acordes al tamaño físico del engranaje
  const getCameraDistances = () => {
    const isPair = gear1Params.gearType === 'rack'
      ? (gear1Params.rackIncludePinion !== false)
      : gear2Enabled

    const maxDimension = gear1Params.gearType === 'rack'
      ? Math.max(gear1Params.rackLength || 160, dims.tipDiameter || 60)
      : isPair
      ? (dims.centerDistance || 60) + (dims.tipDiameter || 60)
      : (dims.tipDiameter || 60)

    const centerOffset = isPair ? (dims.centerDistance || 0) / 2 : 0
    const targetY = (gear1Params.gearType === 'rack' && isPair) ? ((dims.pinionOperatingY || 25) / 2) : 0
    const dist = Math.max(130, maxDimension * 1.6)
    const frustumH = Math.max(75, maxDimension * 1.35)

    return { centerOffset, targetY, dist, frustumH }
  }

  // Controles de cámara de la barra superior
  const setCameraView = (view: 'iso' | 'front' | 'top' | 'left' | 'right') => {
    if (!controlsRef.current || !containerRef.current || !perspCameraRef.current || !orthoCameraRef.current) return
    const container = containerRef.current
    const aspect = container.clientWidth / container.clientHeight
    const { centerOffset, targetY, dist, frustumH } = getCameraDistances()

    setViewSetting('cameraView', view)

    // Si la vista es técnica (top, front, left, right), activar automáticamente la cámara plana ortográfica
    // Si es 'iso', respetar la proyección elegida o default (ortográfica)
    const useOrtho = view !== 'iso' ? true : (viewSettings.cameraProjection === 'orthographic')
    setViewSetting('cameraProjection', useOrtho ? 'orthographic' : 'perspective')

    const targetCam: THREE.Camera = useOrtho ? orthoCameraRef.current : perspCameraRef.current

    if (useOrtho) {
      orthoCameraRef.current.left = (-frustumH * aspect) / 2
      orthoCameraRef.current.right = (frustumH * aspect) / 2
      orthoCameraRef.current.top = frustumH / 2
      orthoCameraRef.current.bottom = -frustumH / 2
      orthoCameraRef.current.zoom = 1
      orthoCameraRef.current.updateProjectionMatrix()
    } else {
      perspCameraRef.current.aspect = aspect
      perspCameraRef.current.updateProjectionMatrix()
    }

    switch (view) {
      case 'iso':
        targetCam.position.set(centerOffset + dist * 0.75, targetY - dist * 0.85, dist * 0.75)
        targetCam.up.set(0, 0, 1)
        break
      case 'front':
        targetCam.position.set(centerOffset, targetY - dist * 1.4, 0)
        targetCam.up.set(0, 0, 1)
        break
      case 'top':
        // Vista superior plana sin distorsión
        targetCam.position.set(centerOffset, targetY, dist * 1.4)
        targetCam.up.set(0, 1, 0) // +Y arriba en pantalla, +X a la derecha
        break
      case 'left':
        // Vista lateral izquierda plana
        targetCam.position.set(centerOffset - dist * 1.4, targetY, 0)
        targetCam.up.set(0, 0, 1)
        break
      case 'right':
        // Vista lateral derecha plana
        targetCam.position.set(centerOffset + dist * 1.4, targetY, 0)
        targetCam.up.set(0, 0, 1)
        break
    }

    targetCam.lookAt(centerOffset, targetY, 0)
    controlsRef.current.target.set(centerOffset, targetY, 0)
    controlsRef.current.object = targetCam
    controlsRef.current.update()
    cameraRef.current = targetCam
  }

  const toggleProjection = (mode: 'perspective' | 'orthographic') => {
    if (!controlsRef.current || !containerRef.current || !perspCameraRef.current || !orthoCameraRef.current) return
    const container = containerRef.current
    const aspect = container.clientWidth / container.clientHeight
    const { frustumH } = getCameraDistances()

    setViewSetting('cameraProjection', mode)

    const fromCam = cameraRef.current || perspCameraRef.current
    const toCam: THREE.Camera = mode === 'orthographic' ? orthoCameraRef.current : perspCameraRef.current

    if (fromCam === toCam) return

    toCam.position.copy(fromCam.position)
    toCam.up.copy(fromCam.up)
    toCam.lookAt(controlsRef.current.target)

    if (mode === 'orthographic') {
      orthoCameraRef.current.left = (-frustumH * aspect) / 2
      orthoCameraRef.current.right = (frustumH * aspect) / 2
      orthoCameraRef.current.top = frustumH / 2
      orthoCameraRef.current.bottom = -frustumH / 2
      orthoCameraRef.current.zoom = 1
      orthoCameraRef.current.updateProjectionMatrix()
    } else {
      perspCameraRef.current.aspect = aspect
      perspCameraRef.current.updateProjectionMatrix()
    }

    controlsRef.current.object = toCam
    controlsRef.current.update()
    cameraRef.current = toCam
  }

  const resetCameraCenter = () => {
    setCameraView('iso')
  }

  const colorsList: { id: FlatColor; label: string; bg: string }[] = [
    { id: 'mustard', label: 'Skåpa Yellow', bg: '#d99b1a' },
    { id: 'orange', label: 'Workshop Orange', bg: '#f97316' },
    { id: 'blue', label: 'CAD Blue', bg: '#2563eb' },
    { id: 'white', label: 'Ceramic White', bg: '#e2e8f0' },
    { id: 'charcoal', label: 'Matte Charcoal', bg: '#334155' },
    { id: 'green', label: 'Technical Green', bg: '#10b981' },
  ]

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[#f6f8fb]">
      {/* WebGL Canvas */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Camera & 3D Dimensions Controls */}
      <div className="absolute top-3.5 right-6 flex items-center bg-white/90 backdrop-blur-md px-1.5 py-1 rounded-full border border-slate-200/80 shadow-sm gap-0.5 text-xs">
        <button
          onClick={() => setViewSetting('showDimensions', !viewSettings.showDimensions)}
          className={`px-2.5 py-1 rounded-full font-semibold transition-all ${
            viewSettings.showDimensions
              ? 'bg-[#ea580c] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Show or hide 3D dimensions overlay on floor"
        >
          3D Dims
        </button>

        <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5" />

        {/* Selector de Modo de Proyección: Persp / Ortho */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-full">
          <button
            onClick={() => toggleProjection('perspective')}
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all ${
              (viewSettings.cameraProjection || 'perspective') === 'perspective'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Perspective Camera (3D depth)"
          >
            Persp
          </button>
          <button
            onClick={() => toggleProjection('orthographic')}
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all ${
              viewSettings.cameraProjection === 'orthographic'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Orthographic Camera (Flat 2D CAD projection, zero perspective distortion)"
          >
            Ortho
          </button>
        </div>

        <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5" />

        <button
          onClick={resetCameraCenter}
          className="px-2.5 py-1 rounded-full font-medium text-slate-600 hover:text-slate-900 transition-colors"
          title="Center camera on gear"
        >
          Center
        </button>

        <button
          onClick={() => setCameraView('iso')}
          className={`px-3 py-1 rounded-full font-semibold transition-all ${
            viewSettings.cameraView === 'iso'
              ? 'bg-[#0f172a] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Iso
        </button>

        <button
          onClick={() => setCameraView('front')}
          className={`px-2.5 py-1 rounded-full font-medium transition-all ${
            viewSettings.cameraView === 'front'
              ? 'bg-[#0f172a] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Front flat lateral elevation view"
        >
          Front
        </button>

        <button
          onClick={() => setCameraView('top')}
          className={`px-2.5 py-1 rounded-full font-medium transition-all ${
            viewSettings.cameraView === 'top'
              ? 'bg-[#0f172a] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Top flat plan view (2D engineering profile)"
        >
          Top
        </button>

        <button
          onClick={() => setCameraView('left')}
          className={`px-2.5 py-1 rounded-full font-medium transition-all ${
            viewSettings.cameraView === 'left'
              ? 'bg-[#0f172a] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Left flat lateral elevation view"
        >
          Left
        </button>

        <button
          onClick={() => setCameraView('right')}
          className={`px-2.5 py-1 rounded-full font-medium transition-all ${
            viewSettings.cameraView === 'right'
              ? 'bg-[#0f172a] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Right flat lateral elevation view"
        >
          Right
        </button>
      </div>

      {/* Flat Colors Palette */}
      <div className="absolute top-3.5 left-6 flex items-center bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200/80 shadow-sm gap-2 text-xs">
        <span className="text-[11px] font-medium text-slate-500 mr-0.5">Color:</span>
        <div className="flex items-center gap-1.5">
          {colorsList.map((c) => (
            <button
              key={c.id}
              onClick={() => setViewSetting('flatColor', c.id)}
              title={c.label}
              className={`w-4 h-4 rounded-full border transition-transform ${
                viewSettings.flatColor === c.id ? 'scale-125 border-slate-900 ring-2 ring-orange-500/40' : 'border-slate-300 hover:scale-110'
              }`}
              style={{ backgroundColor: c.bg }}
            />
          ))}
        </div>
      </div>

      {/* Section plane slider */}
      {viewSettings.sectionCut && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-xl bg-white/95 backdrop-blur-md border border-orange-300 shadow-xl">
          <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">Section Plane</span>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.02"
            value={viewSettings.sectionPosition}
            onChange={(e) => setViewSetting('sectionPosition', parseFloat(e.target.value))}
            className="w-36 accent-orange-500 cursor-pointer"
          />
          <span className="text-xs font-mono text-orange-600 font-bold w-8">{viewSettings.sectionPosition.toFixed(2)}</span>
        </div>
      )}

      {/* Motorized transmission controls HUD */}
      {isPairActive && (
        <div className="absolute bottom-12 right-6 flex items-center gap-3 px-3.5 py-2 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg">
          <button
            type="button"
            onClick={() => setMotorized(!motorized)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              motorized
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <span>{motorized ? '⏸ Motor ON' : '▶ Motor OFF'}</span>
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-mono">RPM</span>
            <input
              type="range"
              min="5"
              max="120"
              step="1"
              value={motorRpm}
              onChange={(e) => setMotorRpm(parseInt(e.target.value))}
              className="w-20 accent-orange-500 cursor-pointer"
            />
            <span className="text-xs font-mono text-orange-600 font-semibold">{motorRpm}</span>
          </div>
        </div>
      )}
    </div>
  )
}
