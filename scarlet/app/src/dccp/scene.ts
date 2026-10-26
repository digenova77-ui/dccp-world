import * as THREE from 'three'
import { IRIS, RUNG_HEIGHT_M, rungIndex } from './ladder'
import { createOpening } from './opening'
import { TOKENS } from './tokens'

function color(hex: string): number {
  return Number.parseInt(hex.slice(1), 16)
}

export function mount(
  canvas: HTMLCanvasElement,
  hooks: { onRung: (index: number) => void; onPerf?: (line: string) => void },
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
    new THREE.MeshBasicMaterial({ color: color(TOKENS.bg) }),
  )
  floor.rotation.x = -Math.PI / 2
  scene.add(floor)

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.15, 0.012, 8, 48),
    new THREE.MeshBasicMaterial({ color: color(TOKENS.gold) }),
  )
  ring.rotation.x = Math.PI / 2
  ring.position.y = 0.02
  scene.add(ring)

  const helix = new THREE.Group()
  const bead = new THREE.SphereGeometry(0.055, 8, 6)
  const strand = (hex: string, phase: number) => {
    const mesh = new THREE.InstancedMesh(bead.clone(), new THREE.MeshBasicMaterial({ color: color(hex) }), 36)
    const dummy = new THREE.Object3D()
    for (let i = 0; i < 36; i++) {
      const t = i / 35
      const a = phase + t * 3 * Math.PI * 2
      dummy.position.set(Math.cos(a) * 0.42, 0.2 + t * 2.2, Math.sin(a) * 0.42)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    return mesh
  }
  helix.add(strand(TOKENS.edge, 0), strand(TOKENS.dclm, Math.PI))
  bead.dispose()
  const barGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.72, 5)
  const barsFor = (hex: string, offset: number) => {
    const mesh = new THREE.InstancedMesh(barGeo.clone(), new THREE.MeshBasicMaterial({ color: color(hex) }), 9)
    const dummy = new THREE.Object3D()
    const from = new THREE.Vector3()
    const to = new THREE.Vector3()
    for (let n = 0; n < 9; n++) {
      const t = (offset + n * 2) / 17
      const a = t * 3 * Math.PI * 2
      const y = 0.2 + t * 2.2
      from.set(Math.cos(a) * 0.42, y, Math.sin(a) * 0.42)
      to.set(Math.cos(a + Math.PI) * 0.42, y, Math.sin(a + Math.PI) * 0.42)
      dummy.position.copy(from).lerp(to, 0.5)
      dummy.lookAt(to)
      dummy.rotateX(Math.PI / 2)
      dummy.updateMatrix()
      mesh.setMatrixAt(n, dummy.matrix)
    }
    return mesh
  }
  helix.add(barsFor(TOKENS.gold, 0), barsFor(TOKENS.dclm, 1))
  barGeo.dispose()
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 16, 12),
    new THREE.MeshBasicMaterial({
      color: color(TOKENS.dclm),
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
    }),
  )
  glow.position.y = 1.3
  helix.add(glow)
  scene.add(helix)

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
  const glowGeo = new THREE.SphereGeometry(IRIS.core * scale * 1.65, 14, 10)
  const glowMat = () =>
    new THREE.MeshBasicMaterial({
      color: color(TOKENS.edge),
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      depthTest: false,
    })
  const left = new THREE.Mesh(coreGeo, coreMat())
  const right = new THREE.Mesh(coreGeo, coreMat())
  const leftGlow = new THREE.Mesh(glowGeo, glowMat())
  const rightGlow = new THREE.Mesh(glowGeo, glowMat())
  const half = (IRIS.gap / 2) * scale
  left.position.set(-half, 0, scale * 0.2)
  right.position.set(half, 0, scale * 0.2)
  leftGlow.position.copy(left.position)
  rightGlow.position.copy(right.position)
  shell.renderOrder = 2
  leftGlow.renderOrder = 3
  rightGlow.renderOrder = 3
  left.renderOrder = 4
  right.renderOrder = 4
  iris.add(shell, leftGlow, rightGlow, left, right)
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
  const reveal: { mat: THREE.MeshBasicMaterial; to: number }[] = []
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    const mat = mesh.material
    if (!mat || Array.isArray(mat) || !(mat instanceof THREE.MeshBasicMaterial)) return
    reveal.push({ mat, to: mat.opacity })
    if (!still) {
      mat.transparent = true
      mat.opacity = 0
    }
  })
  const opening = still ? null : createOpening(scene, camera)
  let opened = opening == null
  const finishOpening = () => {
    if (opened) return
    opened = true
    opening?.skip()
    for (const row of reveal) row.mat.opacity = row.to
  }
  const samples: number[] = []
  const windowed = hooks.onPerf ? new Float64Array(300) : null
  let windowCount = 0
  let windowCursor = 0
  let windowSum = 0
  let last = performance.now()
  let raf = 0
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    const dt = now - last
    last = now
    if (dt > 0 && dt < 250 && samples.length < 90) samples.push(dt)
    if (!opened && opening) {
      const t = opening.step(now)
      for (const row of reveal) row.mat.opacity = row.to * t
      if (t >= 1) opened = true
    }
    if (opened) {
      const step = still ? 1 : 0.08
      logH += (target - logH) * step
      const height = Math.exp(logH)
      placeCamera(height)
      const index = rungIndex(height)
      if (index !== shown) {
        shown = index
        hooks.onRung(index)
      }
      if (!still) helix.rotation.y += 0.004
    }
    renderer.render(scene, camera)
    if (windowed && dt > 0 && dt < 250) {
      if (windowCount === 300) windowSum -= windowed[windowCursor]
      else windowCount += 1
      windowed[windowCursor] = dt
      windowSum += dt
      windowCursor = (windowCursor + 1) % 300
      let worst = 0
      for (let i = 0; i < windowCount; i++) if (windowed[i] > worst) worst = windowed[i]
      hooks.onPerf?.(
        `${Math.round(windowSum / windowCount)} ms avg · ${Math.round(worst)} ms worst · ${renderer.info.render.calls} draws · dpr ${renderer.getPixelRatio()}`,
      )
    }
  }
  raf = requestAnimationFrame(frame)
  window.addEventListener('resize', fit)

  const onWheel = (event: WheelEvent) => {
    event.preventDefault()
    if (!opened) {
      finishOpening()
      return
    }
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
    if (!opened) {
      finishOpening()
      return
    }
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
  const onKey = () => {
    if (!opened) finishOpening()
  }
  window.addEventListener('keydown', onKey)

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
      opening?.dispose()
      window.removeEventListener('resize', fit)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      window.removeEventListener('keydown', onKey)
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
