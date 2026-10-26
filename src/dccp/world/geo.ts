import * as THREE from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import type { City, Country } from '../data/types'
import { text3D } from './text3d'

export const EARTH_RADIUS = 10

/** Scale starts at the human and opens outward. Level 1 is the person. Level 5 is past the world. */
export type Tier = 'street' | 'civil' | 'cloud' | 'orbit' | 'cosmic'
export interface TierInfo { key: Tier; level: number; name: string; what: string; altitude: number }
export const TIERS: TierInfo[] = [
  { key: 'street', level: 1, name: 'Human', what: 'You. One decision. The body.', altitude: 1.1 },
  { key: 'civil', level: 2, name: 'City', what: 'The streets and the municipality', altitude: 3.6 },
  { key: 'cloud', level: 3, name: 'Country', what: 'Nations and companies', altitude: 11 },
  { key: 'orbit', level: 4, name: 'Planet', what: 'Earth as one, the ring around it', altitude: 34 },
  { key: 'cosmic', level: 5, name: 'Cosmic', what: 'The scale past the world', altitude: 88 },
]
export function tierOf(h: number): Tier {
  return h > 60 ? 'cosmic' : h > 20 ? 'orbit' : h > 6.5 ? 'cloud' : h > 2.2 ? 'civil' : 'street'
}
export const tierInfo = (t: Tier): TierInfo => TIERS.find(x => x.key === t)!

export function toVec(lat: number, lon: number, r: number, out = new THREE.Vector3()): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - lat)
  const theta = THREE.MathUtils.degToRad(lon + 180)
  return out.set(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta))
}
export function toLatLon(v: THREE.Vector3): { lat: number; lon: number } {
  const r = v.length() || 1
  const lat = 90 - THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(v.y / r, -1, 1)))
  let lon = THREE.MathUtils.radToDeg(Math.atan2(v.z, -v.x)) - 180
  if (lon < -180) lon += 360
  if (lon > 180) lon -= 360
  return { lat, lon }
}
/** Great-circle distance in degrees. */
export function arcDeg(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const r = Math.PI / 180
  const s = Math.sin(aLat * r) * Math.sin(bLat * r) + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.cos((aLon - bLon) * r)
  return Math.acos(THREE.MathUtils.clamp(s, -1, 1)) / r
}

/** Even-odd point-in-polygon across every ring (holes and enclaves handled by parity). */
export function inCountry(c: Country, lat: number, lon: number): boolean {
  const [x0, y0, x1, y1] = c.bbox
  if (lon < x0 - 0.01 || lon > x1 + 0.01 || lat < y0 - 0.01 || lat > y1 + 0.01) return false
  let inside = false
  for (const ring of c.rings) {
    const n = ring.length / 2
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = ring[i * 2], yi = ring[i * 2 + 1], xj = ring[j * 2], yj = ring[j * 2 + 1]
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi || 1e-12) + xi) inside = !inside
    }
  }
  return inside
}

export function asciiName(s: string): string {
  return s.normalize('NFKD').replace(/[^\x20-\x7e]/g, '').trim()
}

function ringSegments(ring: number[], r: number, out: number[]): void {
  const n = ring.length / 2
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const lon0 = ring[i * 2], lat0 = ring[i * 2 + 1], lon1 = ring[j * 2], lat1 = ring[j * 2 + 1]
    if (Math.abs(lon1 - lon0) > 180) continue // antimeridian wrap: skip, never draw across the globe
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(lon1 - lon0), Math.abs(lat1 - lat0)) / 1.5))
    for (let s = 0; s < steps; s++) {
      const t0 = s / steps, t1 = (s + 1) / steps
      toVec(lat0 + (lat1 - lat0) * t0, lon0 + (lon1 - lon0) * t0, r, a)
      toVec(lat0 + (lat1 - lat0) * t1, lon0 + (lon1 - lon0) * t1, r, b)
      out.push(a.x, a.y, a.z, b.x, b.y, b.z)
    }
  }
}

/** A soft round dot, so cities read as lights rather than squares. */
function dotTexture(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const x = c.getContext('2d')!
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32)
  gr.addColorStop(0, 'rgba(255,255,255,1)')
  gr.addColorStop(0.45, 'rgba(255,255,255,0.95)')
  gr.addColorStop(0.7, 'rgba(255,255,255,0.25)')
  gr.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = gr
  x.fillRect(0, 0, 64, 64)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export class GeoLayer {
  readonly group = new THREE.Group()
  readonly byA3 = new Map<string, Country>()
  selected: Country | null = null
  selectedCity: City | null = null
  private borders: THREE.LineSegments
  private borderMat: THREE.LineBasicMaterial
  private outline: THREE.LineSegments | null = null
  private outlineGlow: THREE.LineSegments | null = null
  private nameLabel: THREE.Mesh | null = null
  private cityPoints: THREE.Points
  private cityMat: THREE.PointsMaterial
  private cityLabels = new Map<string, THREE.Mesh>()
  private shownCities: City[] = []
  private lastLook = new THREE.Vector3(1e9, 0, 0)
  private cityMarker: THREE.Mesh
  private countryHeat: THREE.InstancedMesh
  private regionHeat: THREE.InstancedMesh
  private heatMat: THREE.MeshBasicMaterial
  private regionMat: THREE.MeshBasicMaterial
  private regionCountry: string | null = null
  private heatSpin = new THREE.Object3D()
  private heatColor = new THREE.Color()
  private tmp = new THREE.Vector3()
  private opacity = 0

  constructor(private font: Font, readonly countries: Country[], readonly cities: City[]) {
    for (const c of countries) this.byA3.set(c.a3, c)
    const pos: number[] = []
    for (const c of countries) for (const ring of c.rings) ringSegments(ring, EARTH_RADIUS * 1.0022, pos)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    this.borderMat = new THREE.LineBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })
    this.borders = new THREE.LineSegments(g, this.borderMat)
    this.borders.name = 'borders'
    this.borders.renderOrder = 2
    this.group.add(this.borders)
    // Cities: one point each, brighter for capitals; only appear from the civic layer down.
    const cp = new Float32Array(cities.length * 3)
    const cc = new Float32Array(cities.length * 3)
    const col = new THREE.Color()
    cities.forEach((c, i) => {
      toVec(c.lat, c.lon, EARTH_RADIUS * 1.003, this.tmp)
      cp.set([this.tmp.x, this.tmp.y, this.tmp.z], i * 3)
      col.setHex(c.capital ? 0xffd166 : 0xe6fffb)
      cc.set([col.r, col.g, col.b], i * 3)
    })
    const pg = new THREE.BufferGeometry()
    pg.setAttribute('position', new THREE.BufferAttribute(cp, 3))
    pg.setAttribute('color', new THREE.BufferAttribute(cc, 3))
    this.cityMat = new THREE.PointsMaterial({ map: dotTexture(), alphaTest: 0.05, size: 0.09, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })
    this.cityPoints = new THREE.Points(pg, this.cityMat)
    this.cityPoints.name = 'cities'
    this.group.add(this.cityPoints)
    this.cityMarker = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffd166, toneMapped: false, transparent: true, opacity: 0.95 }))
    this.cityMarker.visible = false
    this.group.add(this.cityMarker)
    const pops = countries.map(c => Math.log10(Math.max(c.pop, 1)))
    const popMin = Math.min(...pops)
    const popMax = Math.max(...pops)
    const disc = new THREE.CircleGeometry(1, 20)
    this.heatMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.42, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
    this.countryHeat = new THREE.InstancedMesh(disc, this.heatMat, countries.length)
    this.countryHeat.name = 'country-heat'
    this.countryHeat.renderOrder = 2
    countries.forEach((c, i) => {
      const t = (pops[i] - popMin) / (popMax - popMin || 1)
      toVec(c.label[1], c.label[0], EARTH_RADIUS * 1.006, this.tmp)
      this.heatSpin.position.copy(this.tmp)
      this.heatSpin.lookAt(this.tmp.clone().multiplyScalar(2))
      const span = Math.max(c.bbox[2] - c.bbox[0], c.bbox[3] - c.bbox[1])
      this.heatSpin.scale.setScalar(THREE.MathUtils.clamp(span * 0.012, 0.1, 0.62))
      this.heatSpin.updateMatrix()
      this.countryHeat.setMatrixAt(i, this.heatSpin.matrix)
      this.heatColor.setHSL(0.5 - t * 0.46, 0.8, 0.48)
      this.countryHeat.setColorAt(i, this.heatColor)
    })
    this.countryHeat.instanceMatrix.needsUpdate = true
    if (this.countryHeat.instanceColor) this.countryHeat.instanceColor.needsUpdate = true
    this.group.add(this.countryHeat)
    this.regionMat = this.heatMat.clone()
    this.regionMat.opacity = 0.7
    this.regionHeat = new THREE.InstancedMesh(disc, this.regionMat, 40)
    this.regionHeat.name = 'region-heat'
    this.regionHeat.renderOrder = 2
    this.regionHeat.visible = false
    this.group.add(this.regionHeat)
  }

  countryAt(lat: number, lon: number): Country | null {
    let best: Country | null = null
    let area = Infinity
    for (const c of this.countries) {
      if (!inCountry(c, lat, lon)) continue
      const a = (c.bbox[2] - c.bbox[0]) * (c.bbox[3] - c.bbox[1])
      if (a < area) { area = a; best = c }
    }
    return best
  }

  /** Nearest city within maxDeg of the point (used only at the civic and street layers). */
  cityNear(lat: number, lon: number, maxDeg: number): City | null {
    let best: City | null = null
    let d = maxDeg
    for (const c of this.cities) {
      if (Math.abs(c.lat - lat) > maxDeg + 0.5) continue
      const x = arcDeg(lat, lon, c.lat, c.lon)
      if (x < d) { d = x; best = c }
    }
    return best
  }

  citiesOf(a3: string): City[] {
    return this.cities.filter(c => c.a3 === a3)
  }

  select(c: Country | null): void {
    for (const o of [this.outline, this.outlineGlow]) if (o) { this.group.remove(o); o.geometry.dispose(); (o.material as THREE.Material).dispose() }
    if (this.nameLabel) { this.group.remove(this.nameLabel); (this.nameLabel.material as THREE.Material).dispose(); this.nameLabel = null }
    this.outline = this.outlineGlow = null
    this.selected = c
    if (!c) return
    const pos: number[] = []
    for (const ring of c.rings) ringSegments(ring, EARTH_RADIUS * 1.004, pos)
    const mk = (r: number, color: number, opacity: number): THREE.LineSegments => {
      const g = new THREE.BufferGeometry()
      const scaled = new Float32Array(pos.length)
      for (let i = 0; i < pos.length; i++) scaled[i] = pos[i] * r
      g.setAttribute('position', new THREE.BufferAttribute(scaled, 3))
      const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }))
      l.renderOrder = 3
      return l
    }
    this.outline = mk(1, 0xffd166, 1)
    this.outlineGlow = mk(1.0035, 0x5eead4, 0.55)
    this.group.add(this.outline, this.outlineGlow)
    const span = Math.max(2, Math.min(40, Math.max(c.bbox[2] - c.bbox[0], c.bbox[3] - c.bbox[1])))
    const size = THREE.MathUtils.clamp(span * 0.012, 0.07, 0.16)
    const label = text3D(this.font, asciiName(c.name).toUpperCase() || c.a3, { size, emissive: 0xffd166, emissiveIntensity: 0.65 })
    label.name = 'geolabel'
    toVec(c.label[1], c.label[0], EARTH_RADIUS + size * 1.6, label.position)
    label.userData.lift = size * 1.6
    this.nameLabel = label
    this.group.add(label)
  }

  pin(lat: number, lon: number): void {
    this.cityMarker.visible = true
    toVec(lat, lon, EARTH_RADIUS * 1.004, this.cityMarker.position)
    this.cityMarker.lookAt(this.cityMarker.position.clone().multiplyScalar(2))
  }

  markCity(c: City | null): void {
    this.selectedCity = c
    this.cityMarker.visible = !!c
    if (!c) return
    toVec(c.lat, c.lon, EARTH_RADIUS * 1.004, this.cityMarker.position)
    this.cityMarker.lookAt(this.cityMarker.position.clone().multiplyScalar(2))
  }

  focusFor(lat: number, lon: number, altitude: number): { anchor: THREE.Vector3; camera: THREE.Vector3 } {
    const anchor = toVec(lat, lon, EARTH_RADIUS)
    const n = anchor.clone().normalize()
    // Look slightly north-up and tilted so the horizon reads at low altitude.
    const north = new THREE.Vector3(0, 1, 0).sub(n.clone().multiplyScalar(n.y)).normalize()
    const tilt = altitude < 3 ? 0.9 : altitude < 8 ? 0.45 : 0.15
    const camera = anchor.clone().add(n.clone().multiplyScalar(altitude)).sub(north.multiplyScalar(altitude * tilt))
    return { anchor, camera }
  }

  countryAltitude(c: Country): number {
    const span = Math.max(c.bbox[2] - c.bbox[0], c.bbox[3] - c.bbox[1])
    return THREE.MathUtils.clamp(span * 0.32, 4, 17)
  }

  /** Per frame: fade layers by altitude, show the few nearest city names, keep labels facing the visitor. */
  update(camera: THREE.Camera, lookAt: THREE.Vector3, dt: number): void {
    const h = camera.position.length() - EARTH_RADIUS
    const tier = tierOf(h)
    const far = tier === 'orbit' || tier === 'cosmic'
    const target = tier === 'cosmic' ? 0.08 : tier === 'orbit' ? Math.max(0, Math.min(0.28, (26 - h) / 30)) : tier === 'cloud' ? 0.62 : 0.78
    this.opacity += (target - this.opacity) * Math.min(1, dt * 4)
    this.borderMat.opacity = this.opacity
    this.borders.visible = this.opacity > 0.01
    const cityTarget = tier === 'civil' || tier === 'street' ? 1 : tier === 'cloud' && h < 9 ? 0.5 : 0
    this.cityMat.opacity += (cityTarget - this.cityMat.opacity) * Math.min(1, dt * 4)
    this.cityPoints.visible = this.cityMat.opacity > 0.02
    this.cityMat.size = THREE.MathUtils.clamp(h * 0.025, 0.03, 0.12)
    if (this.nameLabel) {
      this.nameLabel.visible = far || tier === 'cloud'
      this.nameLabel.quaternion.copy(camera.quaternion)
    }
    // City names: only the nearest handful, only near the ground.
    if (this.cityPoints.visible && lookAt.distanceToSquared(this.lastLook) > 0.04) {
      this.lastLook.copy(lookAt)
      const ll = toLatLon(lookAt)
      const radius = tier === 'street' ? 4 : 9
      const near = this.cities
        .filter(c => Math.abs(c.lat - ll.lat) < radius + 1 && arcDeg(ll.lat, ll.lon, c.lat, c.lon) < radius)
        .sort((a, b) => b.capital - a.capital || b.pop - a.pop)
        .slice(0, tier === 'street' ? 3 : 4)
      this.shownCities = near
      const keep = new Set(near.map(c => `${c.a3}:${c.name}`))
      for (const [k, m] of this.cityLabels) if (!keep.has(k)) { this.group.remove(m); (m.material as THREE.Material).dispose(); this.cityLabels.delete(k) }
      for (const c of near) {
        const k = `${c.a3}:${c.name}`
        if (this.cityLabels.has(k)) continue
        const size = c.capital ? 0.09 : 0.07
        const m = text3D(this.font, asciiName(c.name) || c.a3, { size, depth: size * 0.25, emissive: c.capital ? 0xffd166 : 0x5eead4, emissiveIntensity: 0.6 })
        m.name = 'geolabel'
        toVec(c.lat, c.lon, EARTH_RADIUS + size * 2.2, m.position)
        this.cityLabels.set(k, m)
        this.group.add(m)
      }
    }
    if (!this.cityPoints.visible && this.cityLabels.size) {
      for (const m of this.cityLabels.values()) { this.group.remove(m); (m.material as THREE.Material).dispose() }
      this.cityLabels.clear()
      this.lastLook.set(1e9, 0, 0)
    }
    // Names keep a steady on-screen size: full size from the civic layer, shrinking as you stand among them.
    for (const m of this.cityLabels.values()) {
      m.quaternion.copy(camera.quaternion)
      const dist = camera.position.distanceTo(m.position)
      m.scale.setScalar(THREE.MathUtils.clamp(dist * 0.035, 0.18, 0.42))
    }
    const countryScope = tier === 'cloud' || tier === 'orbit'
    this.countryHeat.visible = countryScope
    this.heatMat.opacity = tier === 'orbit' ? 0.22 : 0.5
    const here = tier === 'civil' ? this.countryAt(toLatLon(lookAt).lat, toLatLon(lookAt).lon) : null
    this.regionHeat.visible = tier === 'civil'
    if (tier === 'civil') this.paintRegion(here?.a3 ?? null)
    else this.regionCountry = null
    if (this.cityMarker.visible) this.cityMarker.rotateZ(dt * 0.8)
  }

  /** City discs for the country under the camera. Population from the map, not a live count. */
  private paintRegion(a3: string | null): void {
    if (a3 === this.regionCountry) return
    this.regionCountry = a3
    const cities = a3 ? this.cities.filter(c => c.a3 === a3).sort((a, b) => b.pop - a.pop).slice(0, this.regionHeat.count) : []
    const logs = cities.map(c => Math.log10(Math.max(c.pop, 1)))
    const min = Math.min(...logs, 0)
    const max = Math.max(...logs, 1)
    for (let i = 0; i < this.regionHeat.count; i++) {
      const c = cities[i]
      if (!c) {
        this.heatSpin.scale.setScalar(0)
        this.heatSpin.updateMatrix()
        this.regionHeat.setMatrixAt(i, this.heatSpin.matrix)
        continue
      }
      const t = (Math.log10(Math.max(c.pop, 1)) - min) / (max - min || 1)
      toVec(c.lat, c.lon, EARTH_RADIUS * 1.01, this.tmp)
      this.heatSpin.position.copy(this.tmp)
      this.heatSpin.lookAt(this.tmp.clone().multiplyScalar(2))
      this.heatSpin.scale.setScalar(0.06 + t * 0.2)
      this.heatSpin.updateMatrix()
      this.regionHeat.setMatrixAt(i, this.heatSpin.matrix)
      this.heatColor.setHSL(0.5 - t * 0.46, 0.85, 0.55)
      this.regionHeat.setColorAt(i, this.heatColor)
    }
    this.regionHeat.instanceMatrix.needsUpdate = true
    if (this.regionHeat.instanceColor) this.regionHeat.instanceColor.needsUpdate = true
  }

  get visibleCities(): City[] { return this.shownCities }
}
