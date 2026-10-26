import * as THREE from 'three'

const ease = (x: number): number => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

/** Curved (hyperbolic-style) camera flights between anchors. Pausable; never blocks input. */
export class Flight {
  active = false
  private t = 0
  private dur = 1.8
  private p0 = new THREE.Vector3()
  private p1 = new THREE.Vector3()
  private pc = new THREE.Vector3()
  private l0 = new THREE.Vector3()
  private l1 = new THREE.Vector3()
  private done: (() => void) | null = null

  constructor(private camera: THREE.PerspectiveCamera, private target: THREE.Vector3) {}

  to(cam: THREE.Vector3, look: THREE.Vector3, instant: boolean, onDone?: () => void): void {
    this.done = onDone ?? null
    if (instant) {
      this.camera.position.copy(cam)
      this.target.copy(look)
      this.active = false
      this.finish()
      return
    }
    this.p0.copy(this.camera.position)
    this.p1.copy(cam)
    this.l0.copy(this.target)
    this.l1.copy(look)
    const dist = this.p0.distanceTo(this.p1)
    // Control point pushed away from the world centre: the path bows outward instead of cutting through Earth.
    this.pc.copy(this.p0).add(this.p1).multiplyScalar(0.5)
    const out = this.pc.clone().normalize()
    if (out.lengthSq() < 1e-6) out.set(0, 1, 0)
    this.pc.addScaledVector(out, dist * 0.45)
    this.dur = THREE.MathUtils.clamp(0.9 + dist / 28, 1.1, 3.2)
    this.t = 0
    this.active = true
  }

  pause(): void {
    if (!this.active) return
    this.active = false
    this.done = null
  }

  private finish(): void {
    const d = this.done
    this.done = null
    try { d?.() } catch (e) { console.warn('flight callback failed', e) }
  }

  update(dt: number): void {
    if (!this.active) return
    this.t = Math.min(1, this.t + dt / this.dur)
    const k = ease(this.t)
    const a = 1 - k
    this.camera.position.set(
      a * a * this.p0.x + 2 * a * k * this.pc.x + k * k * this.p1.x,
      a * a * this.p0.y + 2 * a * k * this.pc.y + k * k * this.p1.y,
      a * a * this.p0.z + 2 * a * k * this.pc.z + k * k * this.p1.z,
    )
    this.target.lerpVectors(this.l0, this.l1, k)
    if (this.t >= 1) {
      this.active = false
      this.finish()
    }
  }
}
