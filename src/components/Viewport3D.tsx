import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useGearStore } from '../store/useGearStore'
import type { FlatColor } from '../store/useGearStore'
import { buildGearThreeGeometry } from '../cad/manifoldEngine'
import { calculateDimensions, getConjugatePinionParams } from '../cad/gearMath'

export const Viewport3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const mainMeshRef = useRef<THREE.Mesh | null>(null)
  const pairMeshRef = useRef<THREE.Mesh | null>(null)
  const centerLineRef = useRef<THREE.Line | null>(null)
  const clippingPlaneRef = useRef<THREE.Plane | null>(null)

  const [trianglesCount, setTrianglesCount] = useState<number>(0)
  const [isGenerating, setIsGenerating] = useState<boolean>(false)

  const params = useGearStore((s) => s.params)
  const meshingPair = useGearStore((s) => s.meshingPair)
  const viewSettings = useGearStore((s) => s.viewSettings)
  const setViewSetting = useGearStore((s) => s.setViewSetting)
  const setMeshingPair = useGearStore((s) => s.setMeshingPair)

  const dims = calculateDimensions(params, meshingPair.enabled ? meshingPair.teeth2 : undefined)

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

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 1, 2000)
    camera.position.set(0, -95, 85)
    camera.up.set(0, 0, 1)
    cameraRef.current = camera

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
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.maxDistance = 1000
    controls.minDistance = 10
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

    // Bucle de renderizado y animación
    let animationFrameId: number
    let angleGear1 = 0

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)

      const storeState = useGearStore.getState()
      if (storeState.meshingPair.enabled && storeState.meshingPair.animate) {
        const deltaAngle = ((storeState.meshingPair.rpm * (2 * Math.PI)) / 60) * 0.016
        angleGear1 += deltaAngle

        if (storeState.params.gearType === 'rack') {
          // Cinemática de Cremallera y Piñón:
          // El piñón rueda a lo largo de la cremallera o la cremallera se desplaza en X
          const pTeeth = storeState.params.rackPinionTeeth || 20
          const m = storeState.params.module
          const isHerringbone = storeState.params.rackToothType === 'herringbone'
          const isHelical = storeState.params.rackToothType === 'helical' || (!storeState.params.rackToothType && storeState.params.helixAngle && storeState.params.helixAngle > 0)
          const effBeta = (isHerringbone || isHelical) ? (storeState.params.helixAngle || 20) : 0
          const betaRad = effBeta * (Math.PI / 180)
          const mt = betaRad !== 0 ? m / Math.cos(betaRad) : m
          const rp = (mt * pTeeth) / 2
          const xp = storeState.params.rackPinionProfileShift || 0.0
          const operatingY = rp + xp * m

          const rLength = storeState.params.rackLength || 160
          // Carrera armónica reversible centrada para visualización técnica continua
          const strokeLimit = Math.max(15, rLength / 2 - rp - 10)
          const linearDisp = strokeLimit * Math.sin(angleGear1 * 0.5)
          const pinionAngle = -linearDisp / rp

          if (mainMeshRef.current) {
            mainMeshRef.current.position.set(linearDisp, 0, 0)
            mainMeshRef.current.rotation.z = 0
          }

          if (pairMeshRef.current) {
            pairMeshRef.current.position.set(0, operatingY, 0)
            pairMeshRef.current.rotation.z = pinionAngle
          }
        } else {
          // Engranajes cilíndricos estándar
          if (mainMeshRef.current) {
            mainMeshRef.current.position.set(0, 0, 0)
            mainMeshRef.current.rotation.z = angleGear1
          }

          if (pairMeshRef.current) {
            const ratio = storeState.params.teeth / storeState.meshingPair.teeth2
            const phaseOffset = Math.PI / storeState.meshingPair.teeth2
            pairMeshRef.current.position.set(storeState.meshingPair.teeth2 ? calculateDimensions(storeState.params, storeState.meshingPair.teeth2).centerDistance || 50 : 50, 0, 0)
            pairMeshRef.current.rotation.z = -angleGear1 * ratio + phaseOffset
          }
        }
      } else {
        // Restablecer posición base cuando la animación está en pausa
        if (mainMeshRef.current && mainMeshRef.current.position.x !== 0) {
          mainMeshRef.current.position.set(0, 0, 0)
        }
      }


      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      if (!container || !renderer || !camera) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
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
        const geom = await buildGearThreeGeometry(params)
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

        if (params.gearType === 'rack') {
          const focus = params.rackViewFocus || 'both'
          mesh.visible = focus === 'both' || focus === 'rack'
          if (pairMeshRef.current) {
            pairMeshRef.current.visible = (params.rackIncludePinion !== false) && (focus === 'both' || focus === 'pinion')
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
  }, [params])

  // Generación geométrica con Manifold-3D WASM (Engranaje 2 - Pareja Meshing / Piñón Conjugado)
  useEffect(() => {
    let active = true
    if (!sceneRef.current) return

    const isRack = params.gearType === 'rack'
    const shouldShowPair = isRack ? (params.rackIncludePinion !== false) : meshingPair.enabled

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
        const pairDims = calculateDimensions(params, meshingPair.teeth2)
        const centerDist = pairDims.centerDistance || 50

        const pairParams: any = isRack
          ? getConjugatePinionParams(params)
          : {
              ...params,
              teeth: meshingPair.teeth2,
              helixHand: (params.helixHand === 'right' ? 'left' : 'right') as any,
              bodyStyle: params.bodyStyle || 'solid',
              hubDiameter: Math.min(params.hubDiameter, (pairDims.pitchDiameter * (meshingPair.teeth2 / params.teeth)) * 0.7),
              boreDiameter: params.boreDiameter > 0 ? Math.min(params.boreDiameter, 14) : 0,
              hasKeyway: false,
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
          const operatingY = pairDims.pinionOperatingY || ((pairDims.circularPitch / Math.PI) * (params.rackPinionTeeth || 20) / 2)
          pairMesh.position.set(0, operatingY, 0)
          const focus = params.rackViewFocus || 'both'
          pairMesh.visible = (params.rackIncludePinion !== false) && (focus === 'both' || focus === 'pinion')
          if (mainMeshRef.current) {
            mainMeshRef.current.visible = focus === 'both' || focus === 'rack'
          }
        } else {
          pairMesh.position.set(centerDist, 0, 0)
        }
        sceneRef.current.add(pairMesh)
        pairMeshRef.current = pairMesh

        if (centerLineRef.current) {
          sceneRef.current.remove(centerLineRef.current)
          centerLineRef.current.geometry.dispose()
        }

        if (meshingPair.showCenterLine) {
          let lineGeom: THREE.BufferGeometry
          if (isRack) {
            const rLen = params.rackLength || 160
            lineGeom = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(-rLen / 2 - 10, 0, 0),
              new THREE.Vector3(rLen / 2 + 10, 0, 0),
            ])
          } else {
            lineGeom = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(0, 0, 0),
              new THREE.Vector3(centerDist, 0, 0),
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
        }
      } catch (err) {
        console.error('Error generando pareja conjugada:', err)
      }
    }


    const timer = setTimeout(updatePair, 60)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [meshingPair.enabled, meshingPair.teeth2, meshingPair.showCenterLine, params])

  // Controles de cámara de la barra superior
  const setCameraView = (view: 'iso' | 'front' | 'top' | 'left' | 'right') => {
    if (!cameraRef.current || !controlsRef.current) return
    const d = 110
    setViewSetting('cameraView', view)

    switch (view) {
      case 'iso':
        cameraRef.current.position.set(d * 0.7, -d * 0.8, d * 0.7)
        break
      case 'front':
        cameraRef.current.position.set(0, -d * 1.2, 0)
        break
      case 'top':
        cameraRef.current.position.set(0, 0, d * 1.2)
        break
      case 'left':
        cameraRef.current.position.set(-d * 1.2, 0, 0)
        break
      case 'right':
        cameraRef.current.position.set(d * 1.2, 0, 0)
        break
    }
    const centerOffset = meshingPair.enabled ? (dims.centerDistance || 0) / 2 : 0
    controlsRef.current.target.set(centerOffset, 0, 0)
    controlsRef.current.update()
  }

  const resetCameraCenter = () => {
    if (!cameraRef.current || !controlsRef.current) return
    cameraRef.current.position.set(0, -95, 85)
    controlsRef.current.target.set(0, 0, 0)
    controlsRef.current.update()
    setViewSetting('cameraView', 'iso')
  }

  const colorsList: { id: FlatColor; label: string; bg: string }[] = [
    { id: 'mustard', label: 'Amarillo Skåpa', bg: '#d99b1a' },
    { id: 'orange', label: 'Naranja Taller', bg: '#f97316' },
    { id: 'blue', label: 'Azul CAD', bg: '#2563eb' },
    { id: 'white', label: 'Blanco Cerámico', bg: '#e2e8f0' },
    { id: 'charcoal', label: 'Grafito Mate', bg: '#334155' },
    { id: 'green', label: 'Verde Técnico', bg: '#10b981' },
  ]

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[#f6f8fb]">
      {/* Contenedor WebGL */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Píldoras de Cámara estilo SKÅDIS STUDIO */}
      <div className="absolute top-3.5 right-6 flex items-center bg-white/90 backdrop-blur-md px-1.5 py-1 rounded-full border border-slate-200/80 shadow-sm gap-0.5 text-xs">
        <button
          onClick={resetCameraCenter}
          className="px-2.5 py-1 rounded-full font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          Centrar
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
        >
          Frente
        </button>

        <button
          onClick={() => setCameraView('top')}
          className={`px-2.5 py-1 rounded-full font-medium transition-all ${
            viewSettings.cameraView === 'top'
              ? 'bg-[#0f172a] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
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
        >
          Izq.
        </button>

        <button
          onClick={() => setCameraView('right')}
          className={`px-2.5 py-1 rounded-full font-medium transition-all ${
            viewSettings.cameraView === 'right'
              ? 'bg-[#0f172a] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Der.
        </button>
      </div>

      {/* Selector de Colores Planos (Flat Colors) */}
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



      {/* Control flotante para corte transversal */}
      {viewSettings.sectionCut && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-xl bg-white/95 backdrop-blur-md border border-orange-300 shadow-xl">
          <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">Plano de Sección</span>
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

      {/* Control de animación si la pareja está activa */}
      {meshingPair.enabled && (
        <div className="absolute bottom-12 right-6 flex items-center gap-3 px-3.5 py-2 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg">
          <button
            onClick={() => setMeshingPair('animate', !meshingPair.animate)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
              meshingPair.animate ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <span>{meshingPair.animate ? 'Girando' : 'Pausado'}</span>
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-mono">RPM</span>
            <input
              type="range"
              min="5"
              max="120"
              step="5"
              value={meshingPair.rpm}
              onChange={(e) => setMeshingPair('rpm', parseInt(e.target.value))}
              className="w-20 accent-orange-500 cursor-pointer"
            />
            <span className="text-xs font-mono text-orange-600 font-semibold">{meshingPair.rpm}</span>
          </div>
        </div>
      )}

      {/* Banner inferior informativo estilo SKÅDIS */}
      <div className="absolute bottom-2 left-6 right-6 flex items-center justify-between text-[11px] text-slate-400 bg-white/60 backdrop-blur-xs py-1 px-3 rounded-lg border border-slate-200/50">
        <span>Creación: el visor muestra una sola pieza centrada. Guarda una variante o expórtala en formato STEP.</span>
        <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
          <span className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`} />
          <span>{isGenerating ? 'Calculando CSG...' : 'Manifold-3D WASM'}</span>
          <span>·</span>
          <span>{trianglesCount.toLocaleString()} tris</span>
        </div>
      </div>
    </div>
  )
}
