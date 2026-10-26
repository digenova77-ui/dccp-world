import * as THREE from 'three'
import { IRIS, RUNG_HEIGHT_M, rungIndex } from './ladder'
import { TOKENS } from './tokens'

function color(hex: string): number {
  return Number.parseInt(hex.slice(1), 16)
}

export function mount(
  canvas: HTMLCanvasElement,
  hooks: { onRung: (index: number) => void },
): { release: () => void; go: (index: number) => void; frameMs: () => number | null } {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const dense = dpr > 1
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !dense,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
    logarithmicDepthBuffer: true,
  })
  renderer.setPixelRatio(dpr)
  renderer.setClearColor(color(TOKENS.bg), 1)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 1e30)
  scene.add(camera)

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(40, 48),
    new THREE.MeshBasicMaterial({ color: color(TOKENS.gold) }),
  )
  floor.rotation.x = -Math.PI / 2
  scene.add(floor)

  const scale = 0.34
  const iris = new THREE.Group()
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(IRIS.shell * scale, 32, 20),
    new THREE.MeshBasicMaterial({
      color: color(TOKENS.unity),
      transparent: true,
      opacity: IRIS.shellOpacity,
      depthWrite: false,
      depthTest: false,
    }),
  )
  const coreGeo = new THREE.SphereGeometry(IRIS.core * scale, 20, 14)
  const coreMat = () =>
    new THREE.MeshBasicMaterial({ color: color(TOKENS.edge), depthTest: false })
  const left = new THREE.Mesh(coreGeo, coreMat())
  const right = new THREE.Mesh(coreGeo, coreMat())
  const half = (IRIS.gap / 2) * scale
  left.position.set(-half, 0, scale * 0.2)
  right.position.set(half, 0, scale * 0.2)
  shell.renderOrder = 2
  left.renderOrder = 3
  right.renderOrder = 3
  iris.add(shell, left, right)
  iris.position.set(-0.32, 0.02, -1.15)
  camera.add(iris)

  const logMin = Math.log(RUNG_HEIGHT_M[0])
  const logMax = Math.log(RUNG_HEIGHT_M[RUNG_HEIGHT_M.length - 1])
  let logH = logMin
  let target = logMin
  let shown = 0

  const placeCamera = (height: number) => {
    const span = logMax - logMin
    const t = span === 0 ? 0 : (Math.log(height) - logMin) / span
    const y = 1.65 * (1 - t) + height * t
    const z = 3 * (1 - t) + height * 0.25 * t
    camera.position.set(0, y, z)
    camera.lookAt(0, 1.2 * (1 - t), -12 * (1 - t))
  }
  placeCamera(RUNG_HEIGHT_M[0])

  const fit = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    camera.aspect = w / Math.max(1, h)
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
  }
  fit()

  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const samples: number[] = []
  let last = performance.now()
  let raf = 0
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    const dt = now - last
    last = now
    if (dt > 0 && dt < 250 && samples.length < 90) samples.push(dt)
    const step = still ? 1 : 0.08
    logH += (target - logH) * step
    const height = Math.exp(logH)
    placeCamera(height)
    const index = rungIndex(height)
    if (index !== shown) {
      shown = index
      hooks.onRung(index)
    }
    renderer.render(scene, camera)
  }
  raf = requestAnimationFrame(frame)
  window.addEventListener('resize', fit)

  const onWheel = (event: WheelEvent) => {
    event.preventDefault()
    target = Math.min(logMax, Math.max(logMin, target + event.deltaY * 0.0015))
  }
  canvas.addEventListener('wheel', onWheel, { passive: false })

  let pinch: number | null = null
  const pointers = new Map<number, { x: number; y: number }>()
  const pinchDistance = () => {
    const pts = [...pointers.values()]
    if (pts.length < 2) return null
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
  }
  const onPointerDown = (event: PointerEvent) => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    pinch = pinchDistance()
  }
  const onPointerMove = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const next = pinchDistance()
    if (pinch == null || next == null || pinch === 0) return
    const scale = pinch / next
    target = Math.min(logMax, Math.max(logMin, target + Math.log(scale)))
    pinch = next
  }
  const onPointerUp = (event: PointerEvent) => {
    pointers.delete(event.pointerId)
    pinch = pinchDistance()
  }
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerUp)

  return {
    go: (index: number) => {
      const i = Math.min(RUNG_HEIGHT_M.length - 1, Math.max(0, index))
      target = Math.log(RUNG_HEIGHT_M[i])
      if (still) {
        logH = target
        placeCamera(Math.exp(logH))
      }
    },
    frameMs: () => {
      if (samples.length < 30) return null
      const sorted = [...samples].sort((a, b) => a - b)
      return sorted[Math.floor(sorted.length / 2)]
    },
    release: () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', fit)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        mesh.geometry?.dispose()
        const mat = mesh.material
        if (Array.isArray(mat)) mat.forEach((item) => item.dispose())
        else mat?.dispose()
      })
      renderer.dispose()
    },
  }
}
