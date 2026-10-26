import * as THREE from 'three'
import { TOKENS } from './tokens'

/** Live opening. Points and sprites are generated here. Nothing is loaded. */
export const QUARKS = 3500
export const SPRITES = 36
const DURATION_MS = 2200

function unit(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function helixEnd(i: number, out: Float32Array, at: number) {
  const strand = i % 2
  const t = ((i % 72) / 71)
  const a = strand * Math.PI + t * 3 * Math.PI * 2
  out[at] = Math.cos(a) * 0.42
  out[at + 1] = 0.2 + t * 2.2
  out[at + 2] = Math.sin(a) * 0.42
}

export function createOpening(scene: THREE.Scene, camera: THREE.Object3D): {
  step: (now: number) => number
  skip: () => void
  dispose: () => void
} {
  const rand = unit(0x5c4c1e)
  const quarks = new Float32Array(QUARKS * 3)
  const quarkEnd = new Float32Array(QUARKS * 3)
  const quarkStart = new Float32Array(QUARKS * 3)
  for (let i = 0; i < QUARKS; i++) {
    const at = i * 3
    quarkStart[at] = (rand() - 0.5) * 8
    quarkStart[at + 1] = rand() * 6
    quarkStart[at + 2] = (rand() - 0.5) * 8
    quarks.set(quarkStart.subarray(at, at + 3), at)
    helixEnd(i, quarkEnd, at)
  }
  const quarkGeo = new THREE.BufferGeometry()
  quarkGeo.setAttribute('position', new THREE.BufferAttribute(quarks, 3))
  const quarkPoints = new THREE.Points(
    quarkGeo,
    new THREE.PointsMaterial({
      color: new THREE.Color(TOKENS.edge),
      size: 0.045,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  )
  scene.add(quarkPoints)

  const sprites = new Float32Array(SPRITES * 3)
  const spriteEnd = new Float32Array(SPRITES * 3)
  const spriteStart = new Float32Array(SPRITES * 3)
  const half = 0.0612
  for (let i = 0; i < SPRITES; i++) {
    const at = i * 3
    spriteStart[at] = (rand() - 0.5) * 1.4
    spriteStart[at + 1] = (rand() - 0.5) * 1.4
    spriteStart[at + 2] = -0.4 - rand()
    sprites.set(spriteStart.subarray(at, at + 3), at)
    const side = i % 2 === 0 ? -half : half
    spriteEnd[at] = side
    spriteEnd[at + 1] = 0
    spriteEnd[at + 2] = 0.068
  }
  const spriteGeo = new THREE.BufferGeometry()
  spriteGeo.setAttribute('position', new THREE.BufferAttribute(sprites, 3))
  const spritePoints = new THREE.Points(
    spriteGeo,
    new THREE.PointsMaterial({
      color: new THREE.Color(TOKENS.unity),
      size: 0.08,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    }),
  )
  camera.add(spritePoints)

  let start = 0
  let progress = 0
  let gone = false
  const place = (now: number) => {
    if (start === 0) start = now
    progress = Math.min(1, (now - start) / DURATION_MS)
    const ease = progress * progress * (3 - 2 * progress)
    for (let i = 0; i < quarks.length; i++) quarks[i] = quarkStart[i] + (quarkEnd[i] - quarkStart[i]) * ease
    for (let i = 0; i < sprites.length; i++) sprites[i] = spriteStart[i] + (spriteEnd[i] - spriteStart[i]) * ease
    quarkGeo.attributes.position.needsUpdate = true
    spriteGeo.attributes.position.needsUpdate = true
  }
  const dispose = () => {
    if (gone) return
    gone = true
    scene.remove(quarkPoints)
    camera.remove(spritePoints)
    quarkGeo.dispose()
    spriteGeo.dispose()
    ;(quarkPoints.material as THREE.Material).dispose()
    ;(spritePoints.material as THREE.Material).dispose()
  }
  return {
    step: (now: number) => {
      if (gone) return 1
      place(now)
      if (progress >= 1) dispose()
      return progress
    },
    skip: () => {
      progress = 1
      dispose()
    },
    dispose,
  }
}
