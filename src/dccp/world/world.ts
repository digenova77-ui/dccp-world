import * as THREE from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import type { Grade, ModuleIntegrity, Registry } from '../data/types'
import type { FeedStatus, FeedValues } from '../live/feeds'
import type { Target } from '../iris/brain'
import { text3D, textPlate } from './text3d'
import { rememberConstruct, type ConstructScene } from '../rte/construct'
import { truthMeshScene } from '../cosmos/history'
import { AXIS_NAMES, CORNER_INPUTS, fmtCoord, ORIGIN, step } from '../explorer/pyramid'
import { GeoLayer, tierOf, type Tier } from './geo'

export const EARTH_R = 10
/** Fixed orbit shell for the ISS around the core (Bot World HUD re-home). */
export const ISS_ORBIT_R = 17.5
export const GRADE_COLOR: Record<Grade, number> = { 'AT BENCHMARK': 0xffd166, NEAR: 0x14b8a6, GAPPED: 0xf59e0b, THIN: 0xef4444, UNGRADED: 0x5b6b7a }
const GRADE_HEIGHT: Record<Grade, number> = { 'AT BENCHMARK': 2.6, NEAR: 1.9, GAPPED: 1.25, THIN: 0.7, UNGRADED: 0.25 }
export const SECTOR_COLOR: Record<string, number> = { water: 0x38bdf8, energy: 0xfacc15, climate: 0x34d399, food: 0xfb923c, pandemic: 0xf472b6, pharmacology: 0xa78bfa }
const STATUS_COLOR = (s: string): number => (s.startsWith('APPROVED') ? 0x22c55e : s.startsWith('DRAFT') ? 0xf59e0b : s.startsWith('LANDED') ? 0x14b8a6 : 0xa855f7)

export function latLonToVec(lat: number, lon: number, r: number, out = new THREE.Vector3()): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - lat)
  const theta = THREE.MathUtils.degToRad(lon + 180)
  return out.set(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta))
}

/** Approximate subsolar point (declination + hour angle; equation of time ignored, ±4°). */
export function subsolar(date: Date): { lat: number; lon: number } {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0)
  const doy = (date.getTime() - start) / 86_400_000
  const lat = -23.44 * Math.cos(((2 * Math.PI) / 365) * (doy + 10))
  const hours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600
  let lon = -(hours - 12) * 15
  if (lon < -180) lon += 360
  if (lon > 180) lon -= 360
  return { lat, lon }
}

export interface Focus { anchor: THREE.Vector3; camera: THREE.Vector3 }
interface Pickable { target: Target; object: THREE.Object3D; label: string; focus: () => Focus }

export class World {
  readonly root = new THREE.Group()
  readonly pickables: Pickable[] = []
  readonly sunDir = new THREE.Vector3(1, 0, 0)
  sector = 'water'
  private pillars = new Map<string, THREE.Mesh>()
  private sectorTokens = new Map<string, THREE.Group>()
  private chambers = new Map<string, THREE.Group>()
  private estates = new THREE.Group()
  private quakes!: THREE.InstancedMesh
  private quakeData: { lat: number; lon: number; mag: number }[] = []
  /** Re-homed (Bot World HUD): quake instances render as a disc under the 'quakes' instrument slot, not on a globe. */
  private quakeCenter = new THREE.Vector3()
  private iss = new THREE.Group()
  private issTarget = new THREE.Vector3()
  private issTrail!: THREE.Line
  private issTrailPts: THREE.Vector3[] = []
  private dclmNodes: THREE.Mesh[] = []
  private dclmCore = new THREE.Group()
  /** Slow-turning ambience on the landing-card cluster. Honours the reduced-motion factor in update(). */
  private landingOrbits: THREE.Object3D[] = []
  private pipeMat!: THREE.ShaderMaterial
  private instruments = new Map<string, { group: THREE.Group; anchor: THREE.Vector3; facing: THREE.Vector3; plate?: THREE.Group; rendered: number; alt: string }>()
  private detail?: THREE.Group
  private sunSprite!: THREE.Sprite
  private universalCore!: THREE.Mesh
  private construct = new THREE.Group()
  private spur: THREE.Mesh | null = null
  private tmp = new THREE.Vector3()
  private labels: THREE.Object3D[] | null = null
  private qa = new THREE.Quaternion()
  private qb = new THREE.Quaternion()
  private yAxis = new THREE.Vector3(0, 1, 0)
  private wp = new THREE.Vector3()
  private dummy = new THREE.Object3D()
  readonly geo: GeoLayer
  /** Kind of the place the visitor last chose; keeps its cluster unfolded at any altitude. */
  focusKind: string | null = null
  tier: Tier = 'orbit'
  /** Bot World HUD structures: swarm orbit spinners (drift animated in update). */
  private swarmSpinners: THREE.Object3D[] = []
  private core!: THREE.Mesh
  private coreHeart!: THREE.Sprite
  private unityRing!: THREE.Mesh
  private marker!: THREE.Mesh
  private markerAt: THREE.Vector3 | null = null
  private labelSize = new Map<THREE.Object3D, number>()
  private labelTick = 0
  private box = new THREE.Box3()
  private sz = new THREE.Vector3()

  constructor(private font: Font, private reg: Registry, private integrity: ModuleIntegrity[], private quality: 'low' | 'medium' | 'high') {
    this.buildSky()
    this.buildCore()
    // Instruments first: the quake/ISS feeds re-home onto their instrument anchors.
    this.buildInstruments()
    // buildPillars() is geography-bound (lat/lon jurisdiction markers on the old globe) — held off-scene.
    this.buildSectorTokens()
    this.buildEstates()
    this.buildQuakes()
    this.buildIss()
    this.buildUnityRing()
    this.buildRteRoot()
    this.buildDclm()
    this.buildResearch()
    this.buildPipe()
    this.buildLandingCosmos()
    this.buildLandingOntario()
    this.buildLandingTiers()
    this.buildLandingDclm()
    this.buildSwarms()
    this.buildTree()
    this.buildPyramid()
    this.geo = new GeoLayer(this.font, this.reg.countries.countries, this.reg.cities.cities)
    // Bot World HUD: the geography layer stays on disk (frozen history) but is NOT added to the scene.
    // this.root.add(this.geo.group)
    this.marker = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 64), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }))
    this.marker.visible = false
    this.root.add(this.marker)
    this.setSector('water')
  }

  private add(target: Target, object: THREE.Object3D, label: string, focus: () => Focus): void {
    object.traverse(o => { o.userData.pick = target })
    this.pickables.push({ target, object, label, focus })
  }

  findPickable(target: Target): Pickable | undefined {
    return this.pickables.find(p => p.target.kind === target.kind && p.target.key === target.key)
  }

  // ---------- sky ----------
  private buildSky(): void {
    const n = this.quality === 'low' ? 3500 : 8000
    const pos = new Float32Array(n * 3)
    const col = new Float32Array(n * 3)
    const c = new THREE.Color()
    let seed = 1234567
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < n; i++) {
      const u = rnd() * 2 - 1
      const th = rnd() * Math.PI * 2
      const r = 420 + rnd() * 160
      const s = Math.sqrt(1 - u * u)
      // Concentrate a faint galactic band.
      const band = rnd() < 0.35 ? 0.18 : 1
      pos.set([r * s * Math.cos(th), r * u * band, r * s * Math.sin(th)], i * 3)
      c.setHSL(0.55 + rnd() * 0.15, 0.4, 0.6 + rnd() * 0.4)
      col.set([c.r, c.g, c.b], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    const stars = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }))
    stars.rotation.z = 0.5
    this.root.add(stars)
    const cv = document.createElement('canvas')
    cv.width = cv.height = 128
    const x = cv.getContext('2d')!
    const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64)
    gr.addColorStop(0, 'rgba(255,250,230,1)')
    gr.addColorStop(0.2, 'rgba(255,220,150,0.8)')
    gr.addColorStop(1, 'rgba(255,180,80,0)')
    x.fillStyle = gr
    x.fillRect(0, 0, 128, 128)
    const tex = new THREE.CanvasTexture(cv)
    this.sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
    this.sunSprite.scale.setScalar(60)
    this.root.add(this.sunSprite)
    this.root.add(new THREE.AmbientLight(0x6b7f99, 0.55))
    const key = new THREE.DirectionalLight(0xfff1dc, 1.6)
    key.name = 'sun'
    this.root.add(key)
    const rim = new THREE.DirectionalLight(0x14b8a6, 0.5)
    rim.position.set(-30, 10, -20)
    this.root.add(rim)
  }

  // ---------- the core: the data center alive (replaces the Earth globe) ----------
  private buildCore(): void {
    const geo = new THREE.IcosahedronGeometry(EARTH_R, 1)
    const mat = new THREE.MeshStandardMaterial({ color: 0x0b1118, metalness: 0.85, roughness: 0.28, emissive: 0x0d2b2b, emissiveIntensity: 0.5, flatShading: true })
    const core = new THREE.Mesh(geo, mat)
    core.name = 'core'
    this.core = core
    this.root.add(core)
    // Circuit-root emissive detail: the tessellation edges glow faint teal over the dark crystal.
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo, 12),
      new THREE.LineBasicMaterial({ color: 0x14b8a6, transparent: true, opacity: 0.28, toneMapped: false }),
    )
    edges.scale.setScalar(1.004)
    core.add(edges)
    // White glow at the heart of the data center.
    const cv = document.createElement('canvas')
    cv.width = cv.height = 128
    const x = cv.getContext('2d')!
    const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64)
    gr.addColorStop(0, 'rgba(255,255,255,1)')
    gr.addColorStop(0.25, 'rgba(230,255,251,0.55)')
    gr.addColorStop(1, 'rgba(160,240,230,0)')
    x.fillStyle = gr
    x.fillRect(0, 0, 128, 128)
    const heart = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, transparent: true, opacity: 0.9 }))
    heart.scale.setScalar(7)
    core.add(heart)
    this.coreHeart = heart
    // The existing DCLM honesty target: tapping the core opens the DCLM honesty card.
    this.add({ kind: 'dclm', key: 'dclm' }, core, "The Core — the data center alive, the bot world's 3D manifestation", () => this.coreFocus())
  }

  coreFocus(): Focus {
    return { anchor: new THREE.Vector3(0, 0, 0), camera: new THREE.Vector3(0, 6, 38) }
  }

  // ---------- jurisdictions ----------
  // HELD (Bot World HUD): jurisdiction pillars were geography-bound — lat/lon markers standing on the
  // old globe. The method is kept as frozen history; the constructor no longer calls it, and setSector()
  // guards the now-empty pillar map. Re-home the grade encoding (height/color) onto a logic structure
  // before re-enabling.
  private buildPillars(): void {
    const geo = new THREE.CylinderGeometry(0.16, 0.22, 1, 12, 1)
    geo.translate(0, 0.5, 0)
    const cap = new THREE.SphereGeometry(0.24, 16, 8)
    for (const j of this.reg.jurisdictions) {
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6, metalness: 0.3, roughness: 0.4 })
      const m = new THREE.Mesh(geo, mat)
      const capM = new THREE.Mesh(cap, mat)
      m.add(capM)
      const p = latLonToVec(j.lat, j.lon, EARTH_R)
      m.position.copy(p)
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().normalize())
      m.name = `pillar:${j.name}`
      this.root.add(m)
      this.pillars.set(j.name, m)
      this.add({ kind: 'jurisdiction', key: j.name }, m, `${j.name} — sector grades`, () => this.coreFocus())
    }
  }

  // REMOVED (Bot World HUD): buildCanada() — pan-Canadian lat/lon rings on the old globe. Frozen history.

  private buildSectorTokens(): void {
    const keys = ['water', 'energy', 'climate', 'food', 'pandemic', 'pharmacology']
    const names: Record<string, string> = { water: 'WATER', energy: 'ENERGY', climate: 'CLIMATE', food: 'FOOD', pandemic: 'PANDEMIC', pharmacology: 'PHARMA' }
    keys.forEach((k, i) => {
      const g = new THREE.Group()
      const a = THREE.MathUtils.degToRad(-50 + i * 20)
      g.position.set(Math.sin(a) * 15, 13.5 - Math.abs(i - 2.5) * 0.6, Math.cos(a) * 15)
      const shape = new THREE.Mesh(new THREE.TorusKnotGeometry(0.55, 0.16, 80, 10, 2, 3), new THREE.MeshStandardMaterial({ color: SECTOR_COLOR[k], emissive: SECTOR_COLOR[k], emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.25 }))
      const label = text3D(this.font, names[k], { size: 0.42, color: 0xffffff, emissive: SECTOR_COLOR[k], emissiveIntensity: 0.6 })
      label.position.y = -1.25
      g.add(shape, label)
      g.lookAt(0, g.position.y, 0)
      g.rotateY(Math.PI)
      this.root.add(g)
      this.sectorTokens.set(k, g)
      this.add({ kind: 'sector', key: k }, g, `${names[k]} sector layer`, () => ({ anchor: new THREE.Vector3(0, 0, 0), camera: g.position.clone().multiplyScalar(2.4).setY(16) }))
    })
  }

  private buildEstates(): void {
    const est = this.reg.pharmacology.estates
    est.forEach((e, i) => {
      const a = (i / est.length) * Math.PI * 2
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), new THREE.MeshStandardMaterial({ color: 0xa78bfa, emissive: 0xa78bfa, emissiveIntensity: 1.2 }))
      m.position.set(Math.cos(a) * 13.5, 6 + Math.sin(a * 2) * 1.2, Math.sin(a) * 13.5)
      m.name = `estate:${e.name}`
      this.estates.add(m)
    })
    this.estates.visible = false
    this.root.add(this.estates)
    this.add({ kind: 'estates', key: 'pharmacology' }, this.estates, 'Pharmacology data estates — design stage, ungraded', () => ({ anchor: new THREE.Vector3(0, 6, 0), camera: new THREE.Vector3(0, 22, 26) }))
  }

  setSector(key: string): void {
    this.sector = key
    for (const [k, g] of this.sectorTokens) {
      const on = k === key
      g.scale.setScalar(on ? 1.35 : 1)
      g.traverse(o => {
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
        if (m && 'emissiveIntensity' in m) m.emissiveIntensity = on ? 1.4 : 0.35
      })
    }
    this.estates.visible = key === 'pharmacology'
    for (const j of this.reg.jurisdictions) {
      const m = this.pillars.get(j.name)
      if (!m) continue // pillars held off-scene (Bot World HUD); grades stay in the registry
      const g: Grade = key === 'pharmacology' ? 'UNGRADED' : (j.grades[key]?.grade ?? 'UNGRADED')
      const mat = m.material as THREE.MeshStandardMaterial
      mat.color.setHex(GRADE_COLOR[g])
      mat.emissive.setHex(GRADE_COLOR[g])
      mat.emissiveIntensity = g === 'UNGRADED' ? 0.15 : 0.7
      m.userData.targetHeight = GRADE_HEIGHT[g]
    }
  }

  // ---------- live: quakes / ISS (re-homed as HUD instrument anchors) ----------
  private buildQuakes(): void {
    this.quakes = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, toneMapped: false }), 400)
    this.quakes.count = 0
    this.quakes.name = 'quakes'
    // Re-homed (Bot World HUD): the quake set renders as a disc floating beneath the 'quakes'
    // instrument slot — same data path (setQuakes keeps count + per-magnitude color), no globe.
    const inst = this.instruments.get('quakes')
    this.quakeCenter.copy(inst?.anchor ?? new THREE.Vector3(0, 5.2, -30)).add(new THREE.Vector3(0, -4.5, 0))
    this.root.add(this.quakes)
    this.add({ kind: 'feed', key: 'quakes' }, this.quakes, 'Earthquakes M2.5+ past day — USGS', () => ({
      anchor: this.quakeCenter.clone(),
      camera: this.quakeCenter.clone().add(new THREE.Vector3(0, 6, 12)),
    }))
  }

  setQuakes(items: { lat: number; lon: number; mag: number }[]): void {
    this.quakeData = items.slice(0, 400)
    this.quakes.count = this.quakeData.length
    const c = new THREE.Color()
    this.quakeData.forEach((q, i) => {
      c.setHSL(Math.max(0, 0.14 - (q.mag - 2.5) * 0.035), 1, 0.55)
      this.quakes.setColorAt(i, c)
    })
    if (this.quakes.instanceColor) this.quakes.instanceColor.needsUpdate = true
  }

  private buildIss(): void {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.18), new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.8, roughness: 0.3 }))
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, emissive: 0x2563eb, emissiveIntensity: 0.6, side: THREE.DoubleSide })
    const p1 = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.9), panelMat)
    p1.position.x = -0.32
    const p2 = p1.clone()
    p2.position.x = 0.32
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }))
    this.iss.add(body, p1, p2, beacon)
    this.iss.visible = false
    this.root.add(this.iss)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(240 * 3), 3))
    g.setDrawRange(0, 0)
    this.issTrail = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.6 }))
    this.root.add(this.issTrail)
    this.add({ kind: 'feed', key: 'iss' }, this.iss, 'International Space Station — live position, on its orbit shell around the core', () => {
      const a = this.iss.position.clone()
      return { anchor: a, camera: a.clone().normalize().multiplyScalar(ISS_ORBIT_R + 8).add(new THREE.Vector3(0, 1.5, 0)) }
    })
  }

  setIss(lat: number, lon: number, altKm: number): void {
    // Re-homed (Bot World HUD): the station keeps its live lat/lon as its sub-orbital point, on a
    // fixed shell around the core. Nominal 408 km maps to the shell; real variation reads as a
    // small honest offset — nothing invented, nothing exaggerated.
    const r = ISS_ORBIT_R + (altKm - 408) * 0.01
    latLonToVec(lat, lon, r, this.issTarget)
    if (!this.iss.visible) { this.iss.position.copy(this.issTarget); this.iss.visible = true }
    this.issTrailPts.push(this.issTarget.clone())
    if (this.issTrailPts.length > 240) this.issTrailPts.shift()
    const pos = this.issTrail.geometry.getAttribute('position') as THREE.BufferAttribute
    this.issTrailPts.forEach((p, i) => pos.setXYZ(i, p.x, p.y, p.z))
    pos.needsUpdate = true
    this.issTrail.geometry.setDrawRange(0, this.issTrailPts.length)
  }

  // ---------- Unity ring ----------
  private buildUnityRing(): void {
    const R = 25
    const n = this.reg.chambers.length
    const ringGeo = new THREE.TorusGeometry(R, 0.05, 6, 240)
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x14b8a6, transparent: true, opacity: 0.45, toneMapped: false }))
    ring.rotation.x = Math.PI / 2
    this.unityRing = ring
    this.root.add(ring)
    this.reg.chambers.forEach((c, i) => {
      const a = (i / n) * Math.PI * 2 + Math.PI / 2
      const g = new THREE.Group()
      g.position.set(Math.cos(a) * R, Math.sin(a * 3) * 0.6, Math.sin(a) * R)
      const edge = new THREE.MeshStandardMaterial({ color: 0x14b8a6, emissive: 0x14b8a6, emissiveIntensity: 0.8 })
      const glass = new THREE.MeshPhysicalMaterial({ color: 0x0c2230, metalness: 0.2, roughness: 0.08, clearcoat: 1, transparent: true, opacity: 0.78, emissive: 0x062a2a, emissiveIntensity: 0.6 })
      const mono = new THREE.Mesh(new THREE.BoxGeometry(2.1, 3.2, 0.3), [edge, edge, edge, edge, glass, glass])
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.12, 0.42), edge)
      frame.position.y = -1.66
      const title = text3D(this.font, c.title.replace(/^The /, '').toUpperCase().slice(0, 22), { size: 0.3, emissive: 0x14b8a6, emissiveIntensity: 0.55 })
      title.position.y = 2.15
      const glyph = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), new THREE.MeshStandardMaterial({ color: 0xe6fffb, emissive: c.status === 'LANDED' ? 0x14b8a6 : 0x8eb4c8, emissiveIntensity: 1.1, flatShading: true }))
      glyph.position.set(0, 0.2, 0.3)
      glyph.name = 'glyph'
      g.add(mono, frame, title, glyph)
      g.lookAt(0, g.position.y, 0)
      g.rotateY(Math.PI)
      g.userData.edge = edge
      this.root.add(g)
      this.chambers.set(c.key, g)
      this.add({ kind: 'chamber', key: c.key }, g, `Unity chamber: ${c.title} — ${c.headline}`, () => {
        const out = g.position.clone().setY(0).normalize()
        return { anchor: g.position.clone(), camera: g.position.clone().add(out.multiplyScalar(7.5)).add(new THREE.Vector3(0, 1.2, 0)) }
      })
    })
  }

  setDiscovered(keys: Set<string>): void {
    for (const [k, g] of this.chambers) {
      const on = keys.has(k)
      const edge = g.userData.edge as THREE.MeshStandardMaterial
      edge.color.setHex(on ? 0xffd166 : 0x14b8a6)
      edge.emissive.setHex(on ? 0xffd166 : 0x14b8a6)
      edge.emissiveIntensity = on ? 1.3 : 0.8
    }
  }

  // ---------- Universal RTE root ----------
  private buildRteRoot(): void {
    const Y = -21
    this.universalCore = new THREE.Mesh(new THREE.OctahedronGeometry(2.2, 0), new THREE.MeshPhysicalMaterial({ color: 0x5eead4, emissive: 0x14b8a6, emissiveIntensity: 0.9, metalness: 0.1, roughness: 0.05, clearcoat: 1, flatShading: true }))
    this.universalCore.scale.y = 1.8
    this.universalCore.position.set(0, Y, 0)
    this.root.add(this.universalCore)
    const label = text3D(this.font, 'UNIVERSAL RTE', { size: 0.95, emissive: 0x14b8a6, emissiveIntensity: 0.7 })
    label.position.set(0, Y + 5.4, 3)
    this.root.add(label)
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.5, Math.abs(Y) - EARTH_R, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0x14b8a6, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
    beam.position.set(0, (Y - EARTH_R) / 2, 0)
    this.root.add(beam)
    const disk = new THREE.Mesh(new THREE.RingGeometry(9.5, 13.5, 96), new THREE.MeshBasicMaterial({ color: 0x0f766e, transparent: true, opacity: 0.25, side: THREE.DoubleSide, toneMapped: false }))
    disk.rotation.x = -Math.PI / 2
    disk.position.y = Y - 0.6
    this.root.add(disk)
    this.add({ kind: 'universal', key: 'universal' }, this.universalCore, 'The Universal RTE — the root every room is seated into', () => ({ anchor: new THREE.Vector3(0, Y, 0), camera: new THREE.Vector3(0, Y + 7, 24) }))
    this.construct.position.set(0, -36, 0)
    this.root.add(this.construct)
    this.add({ kind: 'universal', key: 'construct' }, this.construct, 'The truth mesh — time along the length, level as height', () => ({ anchor: this.construct.position.clone(), camera: this.construct.position.clone().add(new THREE.Vector3(0, 8, 16)) }))
    const mesh = truthMeshScene()
    this.drawConstruct({ title: 'Truth mesh', lines: [mesh.speech], empty: false, form: 'mesh', steps: mesh.steps, joints: mesh.joints, ties: mesh.ties, shell: mesh.shell, unknown: mesh.unknown, from: { kind: 'universal', key: 'universal' } })
    const n = this.reg.rtes.length
    this.reg.rtes.forEach((r, i) => {
      const a = (i / n) * Math.PI * 2 + Math.PI / 2
      const g = new THREE.Group()
      g.position.set(Math.cos(a) * 11.5, Y, Math.sin(a) * 11.5)
      const color = STATUS_COLOR(r.status)
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.6, 0.55, 6), new THREE.MeshStandardMaterial({ color: 0x0f1d2b, metalness: 0.7, roughness: 0.3, emissive: color, emissiveIntensity: 0.15 }))
      const emblem = new THREE.Mesh(r.kind === 'spec' ? new THREE.OctahedronGeometry(0.6, 0) : r.kind === 'unity' ? new THREE.DodecahedronGeometry(0.6, 0) : new THREE.IcosahedronGeometry(0.62, 0), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.1, flatShading: true }))
      emblem.position.y = 1.5
      emblem.name = 'emblem'
      const title = text3D(this.font, r.name.replace('Athletic Intelligence RTE', 'ATHLETIC RTE').replace('Baseball Diamond Module', 'BASEBALL DIAMOND').replace('DCCP Crypto Flight HUD', 'CRYPTO FLIGHT HUD').replace('Public Sector à la carte', 'PUBLIC SECTOR').replace('Energy & SCADA RTE', 'ENERGY · SCADA').toUpperCase(), { size: 0.34, emissive: color, emissiveIntensity: 0.6 })
      title.position.y = 2.7
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 9.5, 6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, toneMapped: false }))
      spoke.rotation.z = Math.PI / 2
      spoke.position.set(-5.4, 0.1, 0)
      g.add(base, emblem, title)
      g.lookAt(0, Y, 0)
      g.rotateY(Math.PI)
      const spokeHolder = new THREE.Group()
      spokeHolder.position.copy(g.position)
      spokeHolder.lookAt(0, Y, 0)
      spokeHolder.rotateY(Math.PI / 2)
      spoke.position.set(-4.9 + 0.0, 0, 0)
      spokeHolder.add(spoke)
      this.root.add(g, spokeHolder)
      this.add({ kind: 'rte', key: r.key }, g, `${r.name} — ${r.status}`, () => {
        const out = g.position.clone().setY(0).normalize()
        return { anchor: g.position.clone().add(new THREE.Vector3(0, 1.4, 0)), camera: g.position.clone().add(out.multiplyScalar(7)).add(new THREE.Vector3(0, 3.2, 0)) }
      })
      const depths = r.facts.length ? r.facts : ['0:1']
      depths.forEach((_, fi) => {
        const plate = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.62), new THREE.MeshStandardMaterial({ color: 0x0f1d2b, emissive: color, emissiveIntensity: 0.45, metalness: 0.4, roughness: 0.35 }))
        plate.position.y = -0.9 - fi * 0.95
        const tag = text3D(this.font, r.facts.length ? String(fi + 1).padStart(2, '0') : '0:1', { size: 0.22, emissive: color, emissiveIntensity: 0.7 })
        tag.position.y = plate.position.y + 0.28
        g.add(plate, tag)
        this.add({ kind: 'rte', key: `${r.key}#${fi}` }, plate, `${r.name} depth ${fi + 1}`, () => {
          const out = g.position.clone().setY(0).normalize()
          const anchor = g.position.clone().add(new THREE.Vector3(0, plate.position.y, 0))
          return { anchor, camera: anchor.clone().add(out.multiplyScalar(4.2)).add(new THREE.Vector3(0, 1.1, 0)) }
        })
      })
    })
  }

  /** Replace the construct with a room drawn from the record. An empty scene stays a bare floor. */
  drawConstruct(scene: ConstructScene): void {
    rememberConstruct(scene)
    while (this.construct.children.length) {
      const child = this.construct.children[0]
      this.construct.remove(child)
      child.traverse(o => {
        const mesh = o as THREE.Mesh
        if (mesh.geometry && !String(mesh.name).startsWith('text:')) mesh.geometry.dispose()
        if (mesh.material && !Array.isArray(mesh.material)) mesh.material.dispose()
      })
    }
    const floor = new THREE.Mesh(new THREE.CircleGeometry(7, 48), new THREE.MeshStandardMaterial({ color: 0x070b10, roughness: 0.9, metalness: 0.1 }))
    floor.rotation.x = -Math.PI / 2
    floor.userData.pick = { kind: 'universal', key: 'construct' }
    this.construct.add(floor)
    if (scene.form === 'mesh') {
      this.drawTruthMesh(scene.steps ?? 2, scene.joints, scene.ties, scene.shell, scene.unknown)
      this.placeOffshoot(scene)
      return
    }
    const title = text3D(this.font, (scene.empty ? 'CONSTRUCT' : scene.title).replace(/[^\x20-\x7e]/g, '').slice(0, 22).toUpperCase() || 'CONSTRUCT', { size: 0.55, emissive: 0x14b8a6, emissiveIntensity: 0.8 })
    title.position.y = 3.2
    title.userData.pick = { kind: 'universal', key: 'construct' }
    this.construct.add(title)
    const lines = scene.empty ? ['NOTHING LOADED'] : scene.lines
    lines.slice(0, 8).forEach((line, i) => {
      const a = (i / Math.max(lines.length, 1)) * Math.PI * 2
      const slab = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.15, 0.12), new THREE.MeshStandardMaterial({ color: 0x10241f, emissive: 0x14b8a6, emissiveIntensity: scene.empty ? 0.15 : 0.45, roughness: 0.4 }))
      slab.position.set(Math.cos(a) * 4.2, 0.7, Math.sin(a) * 4.2)
      slab.lookAt(0, 0.7, 0)
      slab.userData.pick = { kind: 'universal', key: 'construct' }
      const tag = text3D(this.font, line.replace(/[^\x20-\x7e]/g, '').slice(0, 28).toUpperCase() || '0:1', { size: 0.16, emissive: 0xe8fbff, emissiveIntensity: 0.5 })
      tag.position.copy(slab.position)
      tag.position.y += 0.85
      tag.userData.pick = { kind: 'universal', key: 'construct' }
      this.construct.add(slab, tag)
    })
    this.placeOffshoot(scene)
  }

  /** Time along the length. Height is floor, stretch, and ceiling. No new fact is added. */
  private drawTruthMesh(steps: number, joints?: { end: boolean; grade?: 'two' | 'one' | 'conflict' }[], ties?: { from: number; to: number }[], shell?: { from: number; to: number }[], unknown?: { from: number; to: number }[]): void {
    const n = Math.max(2, Math.min(40, joints?.length || Math.floor(steps)))
    const span = 0.42
    const xOf = (i: number) => (i - (n - 1) / 2) * span
    const zOf = (i: number) => (joints?.[i]?.end === false ? 1.35 : 0)
    const dot = (end: boolean) => new THREE.SphereGeometry(end ? 0.09 : 0.055, 8, 8)
    const floorMat = new THREE.MeshBasicMaterial({ color: 0x8eb4c8 })
    const twoMat = new THREE.MeshBasicMaterial({ color: 0x22c55e })
    const clashMat = new THREE.MeshBasicMaterial({ color: 0xef4444 })
    const upMat = new THREE.MeshBasicMaterial({ color: 0x14b8a6 })
    const ceilMat = new THREE.MeshBasicMaterial({ color: 0xe8fbff })
    const link = (a: THREE.Vector3, b: THREE.Vector3, color: number) => {
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), new THREE.LineBasicMaterial({ color }))
      line.userData.pick = { kind: 'universal', key: 'construct' }
      this.construct.add(line)
    }
    const at = (i: number, y: number) => new THREE.Vector3(xOf(i), y, zOf(i))
    for (let i = 0; i < n; i++) {
      const end = joints?.[i]?.end !== false
      const grade = joints?.[i]?.grade
      const mat = grade === 'two' ? twoMat : grade === 'conflict' ? clashMat : floorMat
      const node = new THREE.Mesh(dot(end || grade === 'conflict'), mat)
      node.position.copy(at(i, 0.15))
      node.userData.pick = { kind: 'universal', key: 'construct' }
      this.construct.add(node)
      if (i < n - 1) {
        const left = at(i, 0.15)
        const right = at(i + 1, 0.15)
        const mid = left.clone().add(right).multiplyScalar(0.5)
        mid.y = 1.15
        link(left, mid, 0x14b8a6)
        link(mid, right, 0x14b8a6)
        link(mid, new THREE.Vector3(mid.x, 2.35, 0.35), 0x5b6b7a)
        const knot = new THREE.Mesh(dot(false), upMat)
        knot.position.copy(mid)
        knot.userData.pick = { kind: 'universal', key: 'construct' }
        this.construct.add(knot)
      }
    }
    for (const tie of ties ?? []) {
      if (tie.from < 0 || tie.to < 0 || tie.from >= n || tie.to >= n) continue
      link(at(tie.from, 0.45), at(tie.to, 0.45), 0x8a7340)
    }
    for (const gap of unknown ?? []) {
      if (gap.from < 0 || gap.to < 0 || gap.from >= n || gap.to >= n) continue
      const a = at(gap.from, 0.15)
      const b = at(gap.to, 0.15)
      const mid = a.clone().add(b).multiplyScalar(0.5)
      mid.y = 0.55
      mid.z += 0.7
      const mark = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), new THREE.MeshBasicMaterial({ color: 0xf59e0b }))
      mark.position.copy(mid)
      mark.userData.pick = { kind: 'universal', key: 'construct' }
      this.construct.add(mark)
      link(a, mid, 0x8a7340)
      link(mid, b, 0x8a7340)
      const tag = text3D(this.font, 'UNKNOWN', { size: 0.22, emissive: 0xf59e0b, emissiveIntensity: 0.7 })
      tag.position.copy(mid)
      tag.position.y += 0.35
      this.construct.add(tag)
    }
    const capAt = new THREE.Vector3(0, 2.35, 0.35)
    for (const tie of shell ?? []) {
      if (tie.from < 0 || tie.to < 0 || tie.from >= n || tie.to >= n) continue
      const a = at(tie.from, 1.75)
      const b = at(tie.to, 1.75)
      link(a, b, 0xffd166)
    }
    if (joints) {
      joints.forEach((joint, index) => {
        if (joint.end && index < n) link(at(index, 0.15), capAt, 0xe8fbff)
      })
    }
    link(new THREE.Vector3(xOf(0), 2.35, 0.35), new THREE.Vector3(xOf(n - 1), 2.35, 0.35), 0xe8fbff)
    const cap = new THREE.Mesh(dot(true), ceilMat)
    cap.position.set(0, 2.35, 0.35)
    cap.userData.pick = { kind: 'universal', key: 'construct' }
    this.construct.add(cap)
    const time = text3D(this.font, 'TIME', { size: 0.28, emissive: 0xffd166, emissiveIntensity: 0.7 })
    time.position.set(xOf(0), 0.55, 0.4)
    const ceiling = text3D(this.font, 'CEILING', { size: 0.28, emissive: 0xe8fbff, emissiveIntensity: 0.7 })
    ceiling.position.set(0, 2.7, 0.35)
    const legend = [
      ['TWO PAGES', 0x22c55e],
      ['ONE PAGE', 0x8eb4c8],
      ['CONFLICT', 0xef4444],
    ] as const
    const tags = legend.map(([label, color], i) => {
      const tag = text3D(this.font, label, { size: 0.2, emissive: color, emissiveIntensity: 0.8 })
      tag.position.set(xOf(0), 1.6 - i * 0.38, 2.2)
      return tag
    })
    this.construct.add(time, ceiling, ...tags)
  }

  /** Branch the drawn room off a determined plate. The plate stays where it was set. */
  private placeOffshoot(scene: ConstructScene): void {
    this.root.updateMatrixWorld(true)
    const plate = scene.from ? this.findPickable({ kind: scene.from.kind as Target['kind'], key: scene.from.key }) : undefined
    const origin = new THREE.Vector3()
    if (plate) plate.object.getWorldPosition(origin)
    else this.universalCore.getWorldPosition(origin)
    const away = origin.clone()
    away.y = 0
    if (away.lengthSq() < 1) away.set(0, 0, 1)
    away.normalize().multiplyScalar(plate ? 9 : 0)
    const spot = origin.clone().add(away).add(new THREE.Vector3(0, plate ? -4 : -15, 0))
    this.construct.position.copy(spot)
    this.linkSpur(scene.empty && !scene.from ? null : origin, spot)
  }

  private linkSpur(from: THREE.Vector3 | null, to: THREE.Vector3): void {
    if (this.spur) {
      this.root.remove(this.spur)
      this.spur.geometry.dispose()
      ;(this.spur.material as THREE.Material).dispose()
      this.spur = null
    }
    if (!from) return
    const dir = to.clone().sub(from)
    const len = dir.length()
    if (len < 0.5) return
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 6), new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.45 }))
    mesh.position.copy(from).add(to).multiplyScalar(0.5)
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
    this.root.add(mesh)
    this.spur = mesh
  }

  // ---------- DCLM machine ----------
  private buildDclm(): void {
    const Y = 21
    this.dclmCore.position.set(0, Y, 0)
    const core = new THREE.Mesh(new THREE.SphereGeometry(1.2, 32, 16), new THREE.MeshStandardMaterial({ color: 0xe9d5ff, emissive: 0xa855f7, emissiveIntensity: 1.2, metalness: 0.3, roughness: 0.2 }))
    this.dclmCore.add(core)
    for (let i = 0; i < 3; i++) {
      const cube = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.6 + i * 1.1, 2.6 + i * 1.1, 2.6 + i * 1.1)), new THREE.LineBasicMaterial({ color: i === 1 ? 0x14b8a6 : 0xa855f7, transparent: true, opacity: 0.8 - i * 0.2 }))
      cube.userData.spin = (i + 1) * 0.18 * (i % 2 ? -1 : 1)
      this.dclmCore.add(cube)
    }
    this.root.add(this.dclmCore)
    const glass = new THREE.Mesh(new THREE.CircleGeometry(5.5, 48), new THREE.MeshBasicMaterial({ color: 0xc4b5fd, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }))
    glass.position.set(0, 10.5, 0)
    this.root.add(glass)
    const mirrorLabel = text3D(this.font, 'TRINITY', { size: 0.42, emissive: 0xc4b5fd, emissiveIntensity: 0.6 })
    mirrorLabel.position.set(0, 11.2, 0)
    this.root.add(mirrorLabel)
    const label = text3D(this.font, 'DCLM', { size: 1.1, emissive: 0xa855f7, emissiveIntensity: 0.8 })
    label.position.set(0, Y + 4.2, 0)
    this.root.add(label)
    const seq = Math.max(0, ...this.integrity.flatMap(m => m.receipt?.receipts.map(r => r.sequence ?? 0) ?? [0]))
    const seqLabel = text3D(this.font, `LAST KERNEL SEQ ${seq}`, { size: 0.36, emissive: 0x14b8a6, emissiveIntensity: 0.5 })
    seqLabel.position.set(0, Y - 3.4, 0)
    this.root.add(seqLabel)
    this.integrity.forEach((m, i) => {
      const color = m.state === 'MATCH' ? 0x22c55e : m.state === 'UNCHECKED' ? 0xf59e0b : 0xef4444
      const node = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.3 }))
      node.userData.phase = (i / this.integrity.length) * Math.PI * 2
      node.name = `module:${m.module}`
      this.dclmNodes.push(node)
      this.root.add(node)
    })
    this.add({ kind: 'dclm', key: 'machine' }, this.dclmCore, 'The DCLM machine — module receipts and client-side integrity status', () => ({ anchor: new THREE.Vector3(0, Y, 0), camera: new THREE.Vector3(0, Y + 2, 12) }))
  }

  // ---------- DCCP pipe ----------
  private buildPipe(): void {
    const pts = [new THREE.Vector3(0, 21, 0), new THREE.Vector3(10, 23.5, -7), new THREE.Vector3(19, 21, -13), new THREE.Vector3(26, 14, -16), new THREE.Vector3(30, 6, -15), new THREE.Vector3(32, -2, -10)]
    const curve = new THREE.CatmullRomCurve3(pts)
    this.pipeMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform float uTime; varying vec2 vUv; void main(){ float p=fract(vUv.x*6.0-uTime*0.35); float pulse=smoothstep(0.0,0.08,p)*smoothstep(0.22,0.08,p); vec3 c=mix(vec3(0.08,0.72,0.65),vec3(0.66,0.33,0.97),vUv.x); gl_FragColor=vec4(c*(0.35+2.2*pulse), 0.55+0.45*pulse); }',
      transparent: true, depthWrite: false, toneMapped: false,
    })
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 0.2, 10, false), this.pipeMat)
    this.root.add(tube)
    const stages: [string, string][] = [['proposal', 'PROPOSAL'], ['quorum', 'QUORUM'], ['finalize', 'FINALIZE'], ['ipfs', 'IPFS · PINATA'], ['ipns', 'IPNS']]
    stages.forEach(([key, name], i) => {
      const p = pts[i + 1]
      const g = new THREE.Group()
      g.position.copy(p)
      const node = new THREE.Mesh(key === 'ipfs' ? new THREE.CylinderGeometry(0.9, 0.9, 0.5, 6) : key === 'ipns' ? new THREE.ConeGeometry(0.7, 1.6, 6) : new THREE.SphereGeometry(0.6, 20, 12), new THREE.MeshStandardMaterial({ color: 0xc4b5fd, emissive: i < 3 ? 0x7c3aed : 0x0ea5e9, emissiveIntensity: 0.9, metalness: 0.4, roughness: 0.3 }))
      if (key === 'ipfs') node.rotation.x = Math.PI / 2
      const label = text3D(this.font, name, { size: 0.42, emissive: 0xa855f7, emissiveIntensity: 0.5 })
      label.position.y = 1.5
      g.add(node, label)
      g.lookAt(p.x * 0.4, p.y, 30)
      this.root.add(g)
      this.add({ kind: 'pipe', key }, g, `DCCP release pipe: ${name} — design, not deployed`, () => ({ anchor: p.clone(), camera: p.clone().add(new THREE.Vector3(2, 2.5, 9)) }))
    })
    const design = text3D(this.font, 'PIPE · DRAFT · NO CID YET', { size: 0.42, emissive: 0x0ea5e9, emissiveIntensity: 0.5 })
    design.position.set(21, 25.5, -10)
    design.lookAt(0, 25.5, 30)
    this.root.add(design)
  }

  // ---------- live instruments ----------
  private buildInstruments(): void {
    const keys = ['weather', 'river', 'quakes', 'iss', 'kp', 'carbon']
    keys.forEach((k, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      const a = THREE.MathUtils.degToRad(196 + col * 17)
      const anchor = new THREE.Vector3(Math.cos(a) * 30, 5.2 - row * 6.2, -Math.sin(a) * 30)
      this.buildInstrumentSlot(k, anchor)
    })
    // Telemetrics board: one fixed slot over the whole feed cluster.
    const aT = THREE.MathUtils.degToRad(213)
    this.buildInstrumentSlot('telemetrics', new THREE.Vector3(Math.cos(aT) * 30, -7.2, -Math.sin(aT) * 30))
    const title = text3D(this.font, 'LIVE PUBLIC FEEDS', { size: 0.62, emissive: 0x38bdf8, emissiveIntensity: 0.6 })
    const a = THREE.MathUtils.degToRad(213)
    title.position.set(Math.cos(a) * 30, 10.6, -Math.sin(a) * 30)
    title.lookAt(0, 10.6, 14)
    this.root.add(title)
  }

  private buildInstrumentSlot(key: string, anchor: THREE.Vector3): void {
    const g = new THREE.Group()
    g.position.copy(anchor)
    const facing = new THREE.Vector3(0, anchor.y, 14).sub(anchor).normalize()
    g.lookAt(anchor.clone().add(facing))
    const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), new THREE.MeshStandardMaterial({ color: 0x8eb4c8, emissive: 0x8eb4c8, emissiveIntensity: 1.1, flatShading: true }))
    beacon.name = 'beacon'
    g.add(beacon)
    this.root.add(g)
    const label = key === 'telemetrics' ? 'Telemetrics · all feeds' : `Live instrument: ${key}`
    this.instruments.set(key, { group: g, anchor, facing, rendered: 0, alt: label })
    const target: Target = key === 'telemetrics' ? { kind: 'telemetrics' as Target['kind'], key: 'telemetrics' } : { kind: 'feed', key }
    this.add(target, g, label, () => ({ anchor: anchor.clone(), camera: anchor.clone().add(facing.clone().multiplyScalar(11)) }))
  }

  renderInstrument(key: string, st: FeedStatus | undefined, v: FeedValues, now: number): void {
    const inst = this.instruments.get(key)
    if (!inst || !st) return
    const ago = st.lastOk ? Math.max(0, Math.round((now - st.lastOk) / 60000)) : null
    const when = ago === null ? 'not yet updated' : ago < 1 ? 'updated under a minute ago' : `updated ${ago} min ago`
    let value = '—'
    let detail = ''
    if (st.state === 'LIVE' || st.state === 'STALE') {
      if (key === 'weather' && v.weather) { value = `${Math.round(v.weather.tempC)} °C`; detail = `Wind ${Math.round(v.weather.windKmh)} km/h · observation ${v.weather.at.replace('T', ' ')} local` }
      if (key === 'river' && v.river) { value = v.river.levelM !== undefined ? `${v.river.levelM.toFixed(2)} m` : 'no level'; detail = `${v.river.dischargeM3s !== undefined ? `Discharge ${v.river.dischargeM3s.toFixed(1)} m³/s · ` : ''}provisional · ${v.river.at.slice(0, 16).replace('T', ' ')} UTC` }
      if (key === 'quakes' && v.quakes) { value = `${v.quakes.count} quakes`; detail = v.quakes.strongest ? `Strongest M${v.quakes.strongest.mag.toFixed(1)} · ${v.quakes.strongest.place}` : '' }
      if (key === 'iss' && v.iss) { value = `${Math.round(v.iss.altKm)} km up`; detail = `${v.iss.lat.toFixed(1)}°, ${v.iss.lon.toFixed(1)}° · ${Math.round(v.iss.speedKmh).toLocaleString('en-US')} km/h · ${v.iss.visibility}` }
      if (key === 'kp' && v.kp) { value = `Kp ${v.kp.kp.toFixed(1)}`; detail = `${v.kp.kp >= 5 ? 'Geomagnetic storm' : v.kp.kp >= 4 ? 'Active' : 'Quiet'} · ${v.kp.at.replace('T', ' ').slice(0, 16)} UTC` }
      if (key === 'carbon' && v.carbon) { value = `${Math.round(v.carbon.intensity)} gCO₂/kWh`; detail = `Index ${v.carbon.index} · from ${v.carbon.from.replace('T', ' ').replace('Z', ' UTC')}` }
    }
    const accent = st.state === 'LIVE' ? '#22c55e' : st.state === 'STALE' ? '#f59e0b' : st.state === 'PENDING' ? '#8eb4c8' : '#ef4444'
    if (inst.plate) { inst.group.remove(inst.plate); inst.plate.userData.dispose?.() }
    const plate = textPlate({ width: 8.2, title: `${st.title}`, lines: [`${value}`, detail || (st.state === 'UNAVAILABLE' ? `Source did not answer${st.lastError ? ` (${st.lastError})` : ''}; retrying with backoff.` : 'Waiting for first reading.'), `Source: ${st.source}`], accent, footer: `${st.state} · ${when}` })
    plate.traverse(o => { o.userData.pick = { kind: 'feed', key } })
    inst.group.add(plate)
    inst.plate = plate
    inst.alt = `${st.title}. ${st.state}. ${when}. Source: ${st.source}. ${value}. ${detail}`
    const beacon = inst.group.getObjectByName('beacon') as THREE.Mesh | undefined
    if (beacon) { const bm = beacon.material as THREE.MeshStandardMaterial; bm.color.set(accent); bm.emissive.set(accent) }
    inst.rendered = now
  }

  sceneText(): string {
    return [...this.instruments.values()].map(i => i.alt).filter(Boolean).join(' ')
  }

  instrumentAge(key: string): number {
    return this.instruments.get(key)?.rendered ?? 0
  }

  /** Telemetrics board: one fixed slot showing aggregate feed health. Data flows through it; it never reshapes the environment. */
  renderTelemetrics(statuses: FeedStatus[], v: FeedValues, now: number): void {
    const inst = this.instruments.get('telemetrics')
    if (!inst) return
    const liveN = statuses.filter(s => s.state === 'LIVE').length
    const staleN = statuses.filter(s => s.state === 'STALE').length
    const short: Record<string, string> = { quakes: 'Quakes', iss: 'ISS', weather: 'Weather', kp: 'Kp', carbon: 'Carbon', river: 'River' }
    const valueOf = (key: string): string => {
      const val = (v as Record<string, unknown>)[key]
      if (key === 'quakes' && v.quakes) return v.quakes.strongest ? `M${v.quakes.strongest.mag.toFixed(1)} · ${v.quakes.count}` : `${v.quakes.count}`
      if (key === 'iss' && v.iss) return `${Math.round(v.iss.altKm)} km`
      if (key === 'weather' && v.weather) return `${Math.round(v.weather.tempC)} °C`
      if (key === 'kp' && v.kp) return `${v.kp.kp.toFixed(1)}`
      if (key === 'carbon' && v.carbon) return `${Math.round(v.carbon.intensity)}`
      if (key === 'river' && v.river && v.river.levelM !== undefined) return `${v.river.levelM.toFixed(2)} m`
      return val === undefined ? '—' : '…'
    }
    const lines = statuses.map(s => {
      const dot = s.state === 'LIVE' ? '●' : s.state === 'STALE' ? '◐' : s.state === 'PENDING' ? '○' : '✕'
      return `${dot} ${short[s.key] ?? s.key} · ${valueOf(s.key)} · ${s.state}`
    })
    const accent = liveN === statuses.length ? '#22c55e' : liveN > 0 ? '#f59e0b' : '#ef4444'
    if (inst.plate) { inst.group.remove(inst.plate); inst.plate.userData.dispose?.() }
    const plate = textPlate({
      width: 8.2,
      title: 'TELEMETRICS · ALL FEEDS',
      lines: [`${liveN} of ${statuses.length} live${staleN ? ` · ${staleN} stale` : ''}`, ...lines, 'Sources: USGS · wheretheiss.at · Open-Meteo · NOAA · NESO · ECCC'],
      accent,
      footer: `Board · ${liveN === statuses.length ? 'all feeds answering' : 'some feeds quiet — last readings labeled, never shown as live'}`,
    })
    plate.traverse(o => { o.userData.pick = { kind: 'telemetrics' as Target['kind'], key: 'telemetrics' } satisfies Target })
    inst.group.add(plate)
    inst.plate = plate
    const beacon = inst.group.getObjectByName('beacon') as THREE.Mesh | undefined
    if (beacon) { const bm = beacon.material as THREE.MeshStandardMaterial; bm.color.set(accent); bm.emissive.set(accent) }
    inst.rendered = now
  }

  /** Corporate Helpers research node: one fixed glass octahedron beside the DCLM machine. */
  private buildResearch(): void {
    const g = new THREE.Group()
    const anchor = new THREE.Vector3(9.5, 22.5, 8)
    g.position.copy(anchor)
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(1.05, 0), new THREE.MeshPhysicalMaterial({ color: 0x3b2a12, emissive: 0xffd166, emissiveIntensity: 0.75, metalness: 0.2, roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.92, flatShading: true }))
    gem.name = 'gem'
    const label = text3D(this.font, 'CORPORATE HELPERS', { size: 0.5, emissive: 0xffd166, emissiveIntensity: 0.65 })
    label.position.y = 2.2
    g.add(gem, label)
    this.root.add(g)
    this.add({ kind: 'corph' as Target['kind'], key: 'corph' }, g, 'Corporate Helpers · Trinity-reviewed research', () => ({ anchor: anchor.clone(), camera: anchor.clone().add(new THREE.Vector3(2, 3, 12)) }))
  }

  // ---------- landing cards: four 3D data plates on the logical ring around the core, each with deep levels ----------
  private static readonly LANDING_TIERS = [
    { key: 'live', name: 'LIVE', color: 0x22c55e },
    { key: 'develop', name: 'DEVELOP', color: 0x38bdf8 },
    { key: 'publish', name: 'PUBLISH', color: 0xa855f7 },
    { key: 'order', name: 'ORDER', color: 0xf59e0b },
    { key: 'forensics', name: 'FORENSICS', color: 0xe8c36a },
    { key: 'design', name: 'DESIGN', color: 0x14b8a6 },
  ]

  /** A group on the logical data-plate ring around the core, face turned outward so plates read from the boot view. */
  private landingGroup(angleDeg: number, radius: number, y: number): THREE.Group {
    const g = new THREE.Group()
    const a = THREE.MathUtils.degToRad(angleDeg)
    const pos = new THREE.Vector3(Math.cos(a) * radius, y, Math.sin(a) * radius)
    g.position.copy(pos)
    g.lookAt(pos.clone().multiplyScalar(2).setY(pos.y))
    this.root.add(g)
    return g
  }

  private landingPlinth(g: THREE.Group, accent: number, radius = 2.4): void {
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 1.15, 0.5, 28),
      new THREE.MeshStandardMaterial({ color: 0x0c2230, metalness: 0.6, roughness: 0.25, emissive: accent, emissiveIntensity: 0.18, transparent: true, opacity: 0.92 }),
    )
    plinth.position.y = -3.1
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.04, 0.05, 10, 48), new THREE.MeshBasicMaterial({ color: accent, toneMapped: false }))
    rim.rotation.x = Math.PI / 2
    rim.position.y = -2.85
    g.add(plinth, rim)
  }

  private landingTitle(g: THREE.Group, text: string, accent: number, size = 0.6, y = 4.1): void {
    const title = text3D(this.font, text, { size, color: 0xffffff, emissive: accent, emissiveIntensity: 0.7 })
    title.position.y = y
    g.add(title)
  }

  /** A slow-spinning gem above the card so it reads as a destination from far away. */
  private landingBeacon(g: THREE.Group, accent: number, y = 5.2): void {
    const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 1.3, flatShading: true }))
    beacon.position.y = y
    g.add(beacon)
    this.landingOrbits.push(beacon)
  }

  private landingFocus(g: THREE.Group, dist = 12): Focus {
    const anchor = g.position.clone()
    const out = anchor.clone().normalize()
    return { anchor, camera: anchor.clone().add(out.multiplyScalar(dist)).add(new THREE.Vector3(0, 1.5, 0)) }
  }

  private landingGlass(color: number, opacity = 0.9): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({ color: 0x0c2230, metalness: 0.2, roughness: 0.08, clearcoat: 1, transparent: true, opacity, emissive: color, emissiveIntensity: 0.35 })
  }

  // ----- card 1: the Conscious Cosmos -----
  private buildLandingCosmos(): void {
    const accent = 0xa855f7
    const g = this.landingGroup(150, 21, -8)
    g.scale.setScalar(0.45)
    this.landingPlinth(g, accent)
    this.landingTitle(g, 'THE CONSCIOUS COSMOS', accent)
    const plate = textPlate({
      width: 9, title: 'The Conscious Cosmos',
      lines: [
        'Picture, not proof. Meaning stays here.',
        'Five names, not five laws.',
        'The loop is a metaphor.',
      ],
      accent: '#a855f7', footer: 'Philosophy companion · one picture · not a measurement',
    })
    plate.position.y = 0.2
    g.add(plate)
    // The five names orbit the plate on a slow ring: depth, not decoration — they are the content.
    const orbit = new THREE.Group()
    const names = ['Existence', 'Information', 'Energy', 'Time', 'Observer']
    names.forEach((n, i) => {
      const a = (i / names.length) * Math.PI * 2
      const orbm = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), new THREE.MeshStandardMaterial({ color: 0xe9d5ff, emissive: accent, emissiveIntensity: 1 }))
      orbm.position.set(Math.cos(a) * 5.4, Math.sin(a) * 5.4, 0)
      const lab = text3D(this.font, n, { size: 0.34, emissive: accent, emissiveIntensity: 0.6 })
      lab.position.copy(orbm.position).add(new THREE.Vector3(0, 0.75, 0))
      orbit.add(orbm, lab)
    })
    orbit.position.y = 0.2
    g.add(orbit)
    this.landingOrbits.push(orbit)
    this.landingBeacon(g, accent)
    this.add({ kind: 'landing' as Target['kind'], key: 'cosmos' }, g, 'The Conscious Cosmos — philosophy companion, not a measurement', () => this.landingFocus(g, 8))

    // Level 2: the seven-step story as an ascending spiral.
    const s = this.landingGroup(140, 27, -4)
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 8.6, 12), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.55, toneMapped: false }))
    s.add(beam)
    const steps = ['Undivided', 'A distinction', 'Pattern', 'Form', 'Organization', 'Life', 'Reflection']
    steps.forEach((name, i) => {
      const y = -3 + i * 1.0
      const a = i * 0.9 + 0.4
      const lab = text3D(this.font, name, { size: 0.42, emissive: accent, emissiveIntensity: 0.65 })
      lab.position.set(Math.cos(a) * 2.4, y, Math.sin(a) * 2.4)
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), new THREE.MeshBasicMaterial({ color: 0xe9d5ff, toneMapped: false }))
      dot.position.set(0, y, 0)
      s.add(lab, dot)
    })
    this.landingTitle(s, 'THE STORY · SEVEN STEPS', accent, 0.5, 5.1)
    const sPlate = textPlate({ width: 6.5, title: 'A telling, not a derivation', lines: ['Undivided → distinction → pattern → form →', 'organization → life → reflection'], accent: '#a855f7', footer: 'No certainty claimed for the telling.' })
    sPlate.position.y = -4.9
    s.add(sPlate)
    this.add({ kind: 'landing' as Target['kind'], key: 'cosmos-story' }, s, 'The seven-step story — an ascending spiral', () => this.landingFocus(s))

    // Level 3: the boundary wall — what this plate is not.
    const b = this.landingGroup(160, 27, -12)
    const wall = new THREE.Mesh(new THREE.BoxGeometry(9.4, 5.2, 0.4), this.landingGlass(accent))
    b.add(wall)
    const bPlate = textPlate({
      width: 8.4, title: 'What this plate is not',
      lines: [
        'Not absolute truth.',
        'Not det = 1 as a law.',
        'Not a hash or a URL standing in for identity.',
        'The loop is a metaphor: no Hamiltonian,',
        'no identity between universe and mind.',
        'Closing, not a verdict:',
        '“The cosmos is the place this picture is about.',
        'It is not, on this plate, a mind we have measured',
        'or a heart we have found.”',
      ],
      accent: '#a855f7', footer: 'Philosophy carries no measurements.',
    })
    bPlate.position.z = 0.24
    b.add(bPlate)
    this.landingTitle(b, 'THE BOUNDARY WALL', accent, 0.5, 3.7)
    this.add({ kind: 'landing' as Target['kind'], key: 'cosmos-boundary' }, b, 'The boundary wall — what the Cosmos plate is not', () => this.landingFocus(b))
  }

  // ----- card 2: Ontario provincial overview (David's reported 2024-FY figures only) -----
  private buildLandingOntario(): void {
    const accent = 0x14b8a6
    const g = this.landingGroup(60, 21, -8)
    g.scale.setScalar(0.45)
    this.landingPlinth(g, accent)
    this.landingTitle(g, 'ONTARIO · OVERVIEW', accent)
    const plate = textPlate({
      width: 9, title: 'Ontario · Provincial Overview',
      lines: [
        'QHC · $348.5M · 320 beds · 144,200 ED visits',
        'KHSC · $812.4M · 575 beds · 112,500 ED visits',
        '72 boards · 2,071,550 students FTE',
        '$32.02B envelope · $1.27B/yr recoverable',
      ],
      accent: '#14b8a6', footer: '2024-FY figures · reported — not live data',
    })
    plate.position.y = 0.2
    g.add(plate)
    const orbit = new THREE.Group()
    const tokens: [string, number][] = [['HEALTH', 0x14b8a6], ['SCHOOLS', 0xffd166]]
    tokens.forEach(([name, color], i) => {
      const a = (i / tokens.length) * Math.PI * 2
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.1, flatShading: true }))
      gem.position.set(Math.cos(a) * 5.6, Math.sin(a) * 5.6, 0)
      const lab = text3D(this.font, name, { size: 0.34, emissive: color, emissiveIntensity: 0.6 })
      lab.position.copy(gem.position).add(new THREE.Vector3(0, 0.8, 0))
      orbit.add(gem, lab)
    })
    orbit.position.y = 0.2
    g.add(orbit)
    this.landingOrbits.push(orbit)
    this.landingBeacon(g, accent)
    this.add({ kind: 'landing' as Target['kind'], key: 'ontario' }, g, 'Ontario provincial overview — Drive-verified 2024-FY figures, reported', () => this.landingFocus(g, 8))

    // Level 2: healthcare — QHC vs KHSC comparison bars, heights proportional to reported values.
    const h = this.landingGroup(50, 27, -4)
    this.landingTitle(h, 'HEALTHCARE · QHC vs KHSC', accent, 0.5, 4.9)
    const metrics: { name: string; qhc: number; khsc: number; fmt: (v: number) => string }[] = [
      { name: 'Revenue', qhc: 348.5, khsc: 812.4, fmt: v => `$${v}M` },
      { name: 'Beds', qhc: 320, khsc: 575, fmt: v => `${v}` },
      { name: 'ED visits', qhc: 144200, khsc: 112500, fmt: v => v.toLocaleString('en-US') },
    ]
    const base = new THREE.Mesh(new THREE.BoxGeometry(14.2, 0.3, 2.6), new THREE.MeshStandardMaterial({ color: 0x0c2230, metalness: 0.6, roughness: 0.3, emissive: accent, emissiveIntensity: 0.25 }))
    base.position.y = -2.6
    h.add(base)
    metrics.forEach((m, i) => {
      const x = (i - 1) * 4.4
      const max = Math.max(m.qhc, m.khsc)
      const pairs: [number, number, string][] = [[m.qhc, 0x14b8a6, 'QHC'], [m.khsc, 0xffd166, 'KHSC']]
      pairs.forEach(([v, color, who], j) => {
        const bh = 0.4 + 3.2 * (v / max)
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.95, bh, 0.95), new THREE.MeshStandardMaterial({ color: 0x0c2230, emissive: color, emissiveIntensity: 0.85, metalness: 0.3, roughness: 0.3 }))
        bar.position.set(x + (j === 0 ? -0.58 : 0.58), -2.45 + bh / 2, 0)
        h.add(bar)
        const val = text3D(this.font, m.fmt(v), { size: 0.28, emissive: color, emissiveIntensity: 0.6 })
        val.position.set(bar.position.x, -2.45 + bh + 0.55, 0)
        h.add(val)
        const tag = text3D(this.font, who, { size: 0.26, emissive: color, emissiveIntensity: 0.5 })
        tag.position.set(bar.position.x, -2.05, 0)
        h.add(tag)
      })
      const name = text3D(this.font, m.name, { size: 0.36, emissive: 0xffffff, emissiveIntensity: 0.4 })
      name.position.set(x, -3.15, 0)
      h.add(name)
    })
    const hPlate = textPlate({ width: 7.6, title: 'QHC vs KHSC', lines: ['Teal bars: Quinte Health (QHC)', 'Gold bars: Kingston Health Sciences Centre (KHSC)', 'Bar heights proportional to reported values.'], accent: '#14b8a6', footer: '2024-FY figures · reported — not live data' })
    hPlate.position.y = -4.6
    h.add(hPlate)
    this.add({ kind: 'landing' as Target['kind'], key: 'ontario-health' }, h, 'Healthcare — QHC vs KHSC comparison bars', () => this.landingFocus(h))

    // Level 3: school boards — the $32.02B envelope with the $1.27B/yr recoverable flow at true proportion.
    const c = this.landingGroup(70, 27, -12)
    this.landingTitle(c, 'SCHOOL BOARDS', accent, 0.55, 4.9)
    const big = 3.2
    const small = big * Math.cbrt(1.27 / 32.02)
    const env = new THREE.Mesh(new THREE.BoxGeometry(big, big, big), this.landingGlass(accent, 0.4))
    env.position.y = 0.6
    const envEdge = new THREE.LineSegments(new THREE.EdgesGeometry(env.geometry), new THREE.LineBasicMaterial({ color: accent, toneMapped: false }))
    envEdge.position.copy(env.position)
    const flow = new THREE.Mesh(new THREE.BoxGeometry(small, small, small), new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xffd166, emissiveIntensity: 0.9, metalness: 0.3, roughness: 0.3 }))
    flow.position.set(big / 2 + small / 2 + 0.9, 0.6, 0)
    const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 10), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.6, toneMapped: false }))
    conduit.rotation.z = Math.PI / 2
    conduit.position.set(big / 2 + 0.45, 0.6, 0)
    c.add(env, envEdge, flow, conduit)
    const envLab = text3D(this.font, '$32.02B — operating envelope', { size: 0.4, emissive: accent, emissiveIntensity: 0.6 })
    envLab.position.set(0, 2.9, 0)
    const flowLab = text3D(this.font, '$1.27B/yr — recoverable', { size: 0.34, emissive: 0xffd166, emissiveIntensity: 0.6 })
    flowLab.position.set(flow.position.x, 1.9, 0)
    const popLab = text3D(this.font, '72 boards · 2,071,550 students FTE', { size: 0.4, emissive: 0xffffff, emissiveIntensity: 0.4 })
    popLab.position.set(0, -1.8, 0)
    c.add(envLab, flowLab, popLab)
    const cPlate = textPlate({ width: 7.6, title: 'True proportion', lines: ['The gold block is the $1.27B/yr recoverable flow,', 'drawn at true volume proportion against the $32.02B envelope.'], accent: '#14b8a6', footer: '2024-FY figures · reported — not live data' })
    cPlate.position.y = -3.6
    c.add(cPlate)
    this.add({ kind: 'landing' as Target['kind'], key: 'ontario-schools' }, c, 'School boards — $32.02B envelope, $1.27B/yr recoverable', () => this.landingFocus(c))
  }

  // ----- card 3: Tier Command Center — a deep vertical stack; every tier does something real -----
  private buildLandingTiers(): void {
    const g = this.landingGroup(240, 21, -8)
    g.scale.setScalar(0.45)
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 13, 12), new THREE.MeshStandardMaterial({ color: 0x0c2230, emissive: 0x14b8a6, emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.3 }))
    g.add(spine)
    this.landingTitle(g, 'TIER COMMAND CENTER', 0x14b8a6, 0.55, 7.4)
    // The stack itself is pickable first; each slab re-registers its own subtree afterwards.
    this.add({ kind: 'landing' as Target['kind'], key: 'tiers' }, g, 'Tier Command Center — six platforms, one vertical stack', () => this.landingFocus(g, 10))
    World.LANDING_TIERS.forEach((t, i) => {
      const slab = new THREE.Group()
      slab.position.y = 5 - i * 2
      const box = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.7, 3.0), this.landingGlass(t.color))
      const lab = text3D(this.font, t.name, { size: 0.5, emissive: t.color, emissiveIntensity: 0.7 })
      lab.position.z = 1.55
      const edge = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.14, 3.2), new THREE.MeshBasicMaterial({ color: t.color, toneMapped: false }))
      edge.position.y = -0.42
      slab.add(box, lab, edge)
      g.add(slab)
      this.add({ kind: 'landing' as Target['kind'], key: `tiers-${t.key}` }, slab, `Tier ${t.name} — pick to open it`, () => {
        const a = new THREE.Vector3()
        slab.getWorldPosition(a)
        const out = a.clone().normalize()
        return { anchor: a, camera: a.clone().add(out.multiplyScalar(9.5)).add(new THREE.Vector3(0, 1, 0)) }
      })
    })

    // Level 3: one honest deep plate per tier, in an arc south of the stack.
    const deepLines: Record<string, { lines: string[]; footer: string }> = {
      live: { lines: ['The board watches six public feeds.', 'Each row shows its latest reading in plain words,', 'or says honestly when a feed is quiet.', 'Nothing is invented to fill a gap.'], footer: 'Opens the telemetrics board' },
      develop: { lines: ['Where the next build takes shape before it lands.', 'No instrumentation is wired to it from this page.'], footer: 'UNKNOWN — not yet instrumented' },
      publish: { lines: ['Where a landed build would ship.', 'The release pipe is a design: proposal → quorum →', 'finalize → IPFS through Pinata → IPNS.', 'No release has traveled it.'], footer: 'UNKNOWN — not yet instrumented' },
      order: { lines: ['Where seats and access would be ordered.', 'The pilot Unity handle is the whole of it:', 'a passkey your device creates, nothing sent anywhere.'], footer: 'UNKNOWN — not yet instrumented' },
      forensics: { lines: ['Ten of eleven modules match their receipts', 'byte for byte, checked on your device.', 'Corporate helpers was never issued a receipt —', 'checked, not sealed.'], footer: 'Opens the DCLM receipts view' },
      design: { lines: ['The design law: what the world must be,', 'before anything is built.', 'The Unity chambers hold the doctrine.'], footer: 'UNKNOWN — no live feed, none claimed' },
    }
    const deepAngles = [222, 231, 240, 249, 258, 267] // logical arc around the tier stack
    World.LANDING_TIERS.forEach((t, i) => {
      const d = this.landingGroup(deepAngles[i], 27, -8)
      this.landingPlinth(d, t.color, 1.4)
      this.landingTitle(d, `${t.name} · DEEP`, t.color, 0.4, 3.6)
      const info = deepLines[t.key]
      const plate = textPlate({ width: 5, title: `${t.name} — deep`, lines: info.lines, accent: `#${t.color.toString(16).padStart(6, '0')}`, footer: info.footer })
      plate.position.y = 0.2
      d.add(plate)
      this.add({ kind: 'landing' as Target['kind'], key: `tiers-${t.key}-deep` }, d, `Tier ${t.name}, deep — the honest state`, () => this.landingFocus(d, 10))
    })
  }

  // ----- card 4: DCLM Cognitive Engine — the design, kernel unreachable, no fake compute -----
  private buildLandingDclm(): void {
    const accent = 0x00f5d4
    const g = this.landingGroup(330, 21, -8)
    g.scale.setScalar(0.45)
    this.landingPlinth(g, accent)
    this.landingTitle(g, 'DCLM COGNITIVE ENGINE', accent, 0.55)
    const plate = textPlate({
      width: 9, title: 'DCLM Cognitive Engine',
      lines: [
        'Apprentice → Boundary → Master → Twain',
        'Invariant: det(M) = 1.0',
        'Kernel UNREACHABLE · Oct 3, 2026',
      ],
      accent: '#00f5d4', footer: 'Design — kernel UNREACHABLE · last checked Oct 3, 2026',
    })
    plate.position.y = 0.2
    g.add(plate)
    const phases: [string, number][] = [['APPRENTICE', 0x14b8a6], ['BOUNDARY', 0xf59e0b], ['MASTER', 0xa855f7], ['TWAIN', 0xe8c36a]]
    const arc = new THREE.Group()
    phases.forEach(([name, color], i) => {
      const x = -3.6 + i * 2.4
      const node = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1, flatShading: true }))
      node.position.set(x, -4.6, 1.4)
      const lab = text3D(this.font, name, { size: 0.28, emissive: color, emissiveIntensity: 0.6 })
      lab.position.set(x, -5.5, 1.4)
      arc.add(node, lab)
    })
    const arcBeam = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.6, toneMapped: false }))
    arcBeam.position.set(0, -4.6, 1.4)
    arc.add(arcBeam)
    g.add(arc)
    this.landingOrbits.push(arc)
    this.landingBeacon(g, accent)
    this.add({ kind: 'landing' as Target['kind'], key: 'dclm-engine' }, g, 'DCLM Cognitive Engine — four phases, invariant det(M) = 1.0', () => this.landingFocus(g, 8))

    // Level 2: the four phases as a pipeline of gates you fly through.
    const p = this.landingGroup(320, 27, -4)
    const gateColors = [0x14b8a6, 0xf59e0b, 0xa855f7, 0xe8c36a]
    const gateNames = ['APPRENTICE', 'BOUNDARY', 'MASTER', 'TWAIN']
    gateNames.forEach((name, i) => {
      const x = -4.8 + i * 3.2
      const gate = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.12, 10, 40), new THREE.MeshStandardMaterial({ color: gateColors[i], emissive: gateColors[i], emissiveIntensity: 0.9, metalness: 0.4, roughness: 0.3 }))
      gate.position.x = x
      const lab = text3D(this.font, name, { size: 0.34, emissive: gateColors[i], emissiveIntensity: 0.6 })
      lab.position.set(x, -2.4, 0)
      p.add(gate, lab)
    })
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 13.6, 10), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.55, toneMapped: false }))
    beam.rotation.z = Math.PI / 2
    p.add(beam)
    this.landingTitle(p, 'THE PHASE PIPELINE', accent, 0.5, 3.6)
    const pPlate = textPlate({ width: 7, title: 'Four gates, in order', lines: ['Apprentice → Boundary → Master → Twain', 'A design you can fly, not a running compute.'], accent: '#00f5d4', footer: 'Kernel UNREACHABLE · last checked Oct 3, 2026' })
    pPlate.position.y = -4.1
    p.add(pPlate)
    this.add({ kind: 'landing' as Target['kind'], key: 'dclm-pipeline' }, p, 'The phase pipeline — four gates flown in order', () => {
      const a = p.position.clone()
      const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(p.quaternion)
      return { anchor: a, camera: a.clone().add(axis.multiplyScalar(-10)).add(new THREE.Vector3(0, 1.2, 0)) }
    })

    // Level 3: the invariant wall.
    const w = this.landingGroup(340, 27, -12)
    const wall = new THREE.Mesh(new THREE.BoxGeometry(8.8, 5, 0.35), this.landingGlass(accent))
    w.add(wall)
    const wPlate = textPlate({
      width: 8, title: 'The Invariant Wall',
      lines: [
        'det(M) ≡ 1.0',
        'Layer [0] law floor:',
        'NO_FORCE · HOST_SAFE',
        'TRUTH_OR_NOTHING · CLEANUP_FIRST',
      ],
      accent: '#00f5d4', footer: 'Kernel UNREACHABLE · last checked Oct 3, 2026',
    })
    wPlate.position.z = 0.22
    w.add(wPlate)
    this.landingTitle(w, 'THE INVARIANT WALL', accent, 0.5, 3.6)
    this.add({ kind: 'landing' as Target['kind'], key: 'dclm-invariant' }, w, 'The invariant wall — det(M) = 1.0 and the Layer [0] laws', () => this.landingFocus(w))
  }


  // ---------- bot swarms: instanced point-swarms on orbits around the core ----------
  // Honest-empty: with no tasks bound they render as quiet ghost orbits labeled "NO TASKS BOUND".
  // Density and orbit speed are meant to encode progress — but no task manifests are plumbed into
  // the world yet, so nothing is invented: the orbits drift quietly until real binds arrive.
  private buildSwarms(): void {
    const fams = [
      { key: 'swarms-ephemeral', name: 'EPHEMERAL BINDS', color: 0x14b8a6 },
      { key: 'swarms-arbitrage', name: 'SELF-ARBITRAGE LOOPS', color: 0xa855f7 },
      { key: 'swarms-receipts', name: 'RECEIPT CHAIN', color: 0xe8c36a },
    ]
    let seed = 987654321
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    fams.forEach((f, i) => {
      const R = 12.5 + i * 1.5
      const g = new THREE.Group()
      const tilt = (i - 1) * 0.07
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(R, 0.025, 6, 160),
        new THREE.MeshBasicMaterial({ color: f.color, transparent: true, opacity: 0.22, toneMapped: false }),
      )
      ring.rotation.x = Math.PI / 2 + tilt
      g.add(ring)
      // Ghost points ride the orbit; the spinner turns slowly in update().
      const n = this.quality === 'low' ? 220 : 600
      const pos = new Float32Array(n * 3)
      for (let k = 0; k < n; k++) {
        const a = rnd() * Math.PI * 2
        const rr = R + (rnd() + rnd() + rnd() - 1.5) * 0.9
        const yy = (rnd() + rnd() - 1) * 0.7
        pos.set([Math.cos(a) * rr, yy, Math.sin(a) * rr], k * 3)
      }
      const pg = new THREE.BufferGeometry()
      pg.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      const spinner = new THREE.Group()
      spinner.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: f.color, size: 0.14, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true })))
      spinner.rotation.x = tilt
      spinner.userData.speed = 0.05 + i * 0.015
      g.add(spinner)
      this.swarmSpinners.push(spinner)
      const tag = text3D(this.font, `${f.name} · NO TASKS BOUND`, { size: 0.34, emissive: f.color, emissiveIntensity: 0.5 })
      tag.position.set(R * 0.72, 1.6, R * 0.72)
      g.add(tag)
      this.root.add(g)
      this.add(
        { kind: 'dclm', key: f.key },
        g,
        `Swarm orbit — ${f.name.toLowerCase()} · no tasks bound`,
        () => ({ anchor: new THREE.Vector3(0, 0, 0), camera: new THREE.Vector3(R * 1.1, 7, R * 1.1) }),
      )
    })
  }

  // ---------- the tree: substrate → roots → tree → fruit ----------
  // Circuit roots grow down into the core; trunk and branches glow with the combined strand colors
  // (human gold + AI teal/violet); the glow resolves to white where the roots touch the core.
  private buildTree(): void {
    const g = new THREE.Group()
    const a = THREE.MathUtils.degToRad(200)
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a))
    const base = dir.clone().multiplyScalar(EARTH_R + 0.6)
    base.y = 0.4
    const up = new THREE.Vector3(dir.x * 0.55, 0.85, dir.z * 0.55).normalize()
    const seg = (from: THREE.Vector3, to: THREE.Vector3, r1: number, r2: number, color: number, emissiveIntensity = 0.9): THREE.Mesh => {
      const d = to.clone().sub(from)
      const len = d.length()
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(r2, r1, len, 8),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity, metalness: 0.3, roughness: 0.4 }),
      )
      m.position.copy(from).addScaledVector(d, 0.5)
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())
      return m
    }
    let seed = 4451
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    // Roots: from the base inward and down into the core; white tips where they touch it.
    const side = new THREE.Vector3(-dir.z, 0, dir.x)
    for (let i = 0; i < 6; i++) {
      const spread = (i / 5 - 0.5) * 2.2
      const s = base.clone().addScaledVector(side, spread * 0.4).add(new THREE.Vector3(0, -0.2, 0))
      const e = dir.clone().multiplyScalar(EARTH_R - 3.2).addScaledVector(side, spread).add(new THREE.Vector3(0, -1.6 - rnd() * 1.2, 0))
      g.add(seg(s, e, 0.07, 0.02, 0xe8c36a, 0.7))
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }))
      tip.position.copy(e)
      g.add(tip)
    }
    // Trunk.
    const top = base.clone().addScaledVector(up, 4.2)
    g.add(seg(base, top, 0.32, 0.16, 0xe8c36a, 0.8))
    // Branches: teal and violet strands; sub-branches end in white fruit-orbs.
    const tiltAxis = new THREE.Vector3().crossVectors(up, new THREE.Vector3(0, 1, 0)).normalize()
    for (let i = 0; i < 5; i++) {
      const az = (i / 5) * Math.PI * 2 + 0.5
      const bdir = up.clone().applyAxisAngle(tiltAxis, 0.65).applyAxisAngle(up, az)
      const b0 = base.clone().addScaledVector(up, 2.3 + (i % 2) * 1.2)
      const b1 = b0.clone().addScaledVector(bdir, 2.4)
      const color = i % 2 ? 0x14b8a6 : 0xa855f7
      g.add(seg(b0, b1, 0.1, 0.045, color))
      for (let j = 0; j < 2; j++) {
        const sdir = bdir.clone().applyAxisAngle(up, az + (j ? 0.9 : -0.9)).applyAxisAngle(tiltAxis, 0.35)
        const s1 = b1.clone().addScaledVector(sdir, 1.4)
        g.add(seg(b1, s1, 0.045, 0.015, j ? 0x14b8a6 : 0xa855f7, 1.1))
        const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshBasicMaterial({ color: 0xf2fffd, toneMapped: false }))
        fruit.position.copy(s1)
        g.add(fruit)
      }
    }
    const title = text3D(this.font, 'THE TREE', { size: 0.5, emissive: 0xe8c36a, emissiveIntensity: 0.7 })
    title.position.copy(top).addScaledVector(up, 1.6)
    const sub = text3D(this.font, 'SUBSTRATE · ROOTS · TREE · FRUIT', { size: 0.3, emissive: 0x14b8a6, emissiveIntensity: 0.6 })
    sub.position.copy(top).addScaledVector(up, 0.9)
    g.add(title, sub)
    this.root.add(g)
    this.add({ kind: 'dclm', key: 'tree' }, g, 'The Tree — substrate, roots, tree, fruit; the playground growing from the law floor', () => ({
      anchor: base.clone().addScaledVector(up, 2),
      camera: base.clone().addScaledVector(dir, 11).add(new THREE.Vector3(0, 4.5, 0)),
    }))
  }

  // ---------- the generative pyramid: apex + four law-floor invariants ----------
  // Canonical structure per src/dccp/explorer/pyramid.ts: one apex (Unity ID / white light) and four
  // corner stones — the law-floor invariants as the four dimensions — with 4D-addressed nodes.
  private buildPyramid(): void {
    const g = new THREE.Group()
    const a = THREE.MathUtils.degToRad(5)
    const center = new THREE.Vector3(Math.cos(a) * 19, -4.5, Math.sin(a) * 19)
    g.position.copy(center)
    const H = 6
    const W = 3.6
    const apexMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.6, flatShading: true }))
    apexMesh.position.set(0, H / 2, 0)
    g.add(apexMesh)
    const apexTag = text3D(this.font, `APEX · UNITY ID ${fmtCoord(ORIGIN)}`, { size: 0.3, emissive: 0xffffff, emissiveIntensity: 0.7 })
    apexTag.position.set(0, H / 2 + 1.1, 0)
    g.add(apexTag)
    const lineMat = new THREE.LineBasicMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.55, toneMapped: false })
    const edge = (p: THREE.Vector3, q: THREE.Vector3): void => {
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([p, q]), lineMat))
    }
    const cornerPos: THREE.Vector3[] = []
    const axisColors: Record<string, number> = { t: 0x14b8a6, n: 0xa855f7, h: 0xe8c36a, c: 0x38bdf8 }
    CORNER_INPUTS.forEach((corner, i) => {
      const ca = (i / 4) * Math.PI * 2 + Math.PI / 4
      const p = new THREE.Vector3(Math.cos(ca) * W, -H / 2, Math.sin(ca) * W)
      cornerPos.push(p)
      const color = axisColors[corner.axis] ?? 0xffffff
      const stone = new THREE.Mesh(new THREE.TetrahedronGeometry(0.55, 0), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.1, flatShading: true }))
      stone.position.copy(p)
      g.add(stone)
      const tag = text3D(this.font, `${AXIS_NAMES[corner.axis]} ${fmtCoord(step(ORIGIN, corner.axis))}`, { size: 0.26, emissive: color, emissiveIntensity: 0.6 })
      tag.position.set(p.x, p.y - 1.1, p.z)
      g.add(tag)
      edge(apexMesh.position, p)
    })
    for (let i = 0; i < 4; i++) edge(cornerPos[i], cornerPos[(i + 1) % 4])
    const title = text3D(this.font, 'THE GENERATIVE PYRAMID', { size: 0.42, emissive: 0xe8f6ff, emissiveIntensity: 0.6 })
    title.position.set(0, H / 2 + 2.1, 0)
    g.add(title)
    this.root.add(g)
    this.add({ kind: 'dclm', key: 'pyramid' }, g, 'The generative pyramid — apex Unity ID, four law-floor invariants', () => ({
      anchor: center.clone(),
      camera: center.clone().add(new THREE.Vector3(6, 4, 12)),
    }))
  }

  // ---------- detail plate ----------
  showDetail(anchor: THREE.Vector3, title: string, lines: string[], accent: string, footer?: string): void {
    this.clearDetail()
    const plate = textPlate({ width: 6.4, title, lines, accent, footer })
    plate.position.copy(anchor)
    plate.userData.anchor = anchor.clone()
    this.detail = plate
    this.root.add(plate)
  }

  /** A soft gold ring that marks the chosen place. Replaces in-world text plates (the card carries the words). */
  mark(anchor: THREE.Vector3 | null): void {
    this.markerAt = anchor ? anchor.clone() : null
    this.marker.visible = !!anchor
  }

  clearDetail(): void {
    if (!this.detail) return
    this.root.remove(this.detail)
    this.detail.userData.dispose?.()
    this.detail = undefined
  }

  // ---------- per-frame ----------
  update(dt: number, t: number, camera: THREE.Camera, now: Date, reducedMotion: boolean): void {
    const ss = subsolar(now)
    latLonToVec(ss.lat, ss.lon, 1, this.sunDir).normalize()
    this.sunSprite.position.copy(this.sunDir).multiplyScalar(380)
    const sun = this.root.getObjectByName('sun') as THREE.DirectionalLight | undefined
    sun?.position.copy(this.sunDir).multiplyScalar(100)
    const motion = reducedMotion ? 0.15 : 1
    for (const m of this.pillars.values()) {
      const h = m.userData.targetHeight ?? 0.3
      m.scale.y += (h - m.scale.y) * Math.min(1, dt * 4)
      const cap = m.children[0] as THREE.Mesh
      cap.position.y = 1
      cap.scale.set(1, 1 / Math.max(0.05, m.scale.y), 1)
    }
    for (const g of this.sectorTokens.values()) g.children[0].rotation.y += dt * 0.6 * motion
    for (const g of this.chambers.values()) { const gl = g.getObjectByName('glyph'); if (gl) gl.rotation.y += dt * 0.5 * motion }
    this.universalCore.rotation.y += dt * 0.25 * motion
    this.root.traverse(o => { if (o.name === 'emblem') o.rotation.y += dt * 0.8 * motion })
    this.root.traverse(o => { if (o.name === 'gem') o.rotation.y += dt * 0.4 * motion })
    for (const o of this.landingOrbits) o.rotation.y += dt * 0.35 * motion
    this.dclmCore.children.forEach(c => { if (c.userData.spin) { c.rotation.x += dt * c.userData.spin * motion; c.rotation.y += dt * c.userData.spin * 0.7 * motion } })
    this.dclmNodes.forEach(n => {
      const a = n.userData.phase + t * 0.4 * motion
      n.position.set(Math.cos(a) * 3.8, 21 + Math.sin(a * 2) * 0.5, Math.sin(a) * 3.8)
      n.rotation.y += dt
    })
    this.estates.rotation.y += dt * 0.05 * motion
    this.pipeMat.uniforms.uTime.value = t * motion
    // quakes pulse: disc slots beneath the 'quakes' instrument anchor (re-homed, no globe)
    for (let i = 0; i < this.quakes.count; i++) {
      const q = this.quakeData[i]
      const qa = i * 2.39996
      const qr = 3.6 * Math.sqrt(i / 400)
      const s = (0.22 + (q.mag - 2.5) * 0.16) * (1 + 0.25 * Math.sin(t * 3 * motion + i))
      this.dummy.position.set(this.quakeCenter.x + Math.cos(qa) * qr, this.quakeCenter.y, this.quakeCenter.z + Math.sin(qa) * qr)
      this.dummy.scale.setScalar(Math.max(0.05, s))
      this.dummy.updateMatrix()
      this.quakes.setMatrixAt(i, this.dummy.matrix)
    }
    this.quakes.instanceMatrix.needsUpdate = true
    if (this.iss.visible) {
      this.iss.position.lerp(this.issTarget, Math.min(1, dt * 0.8))
      this.iss.lookAt(0, 0, 0)
    }
    // ---- folding: the far view shows the core and the main holograms; detail unfolds as you approach ----
    const h = camera.position.length() - EARTH_R
    this.tier = tierOf(h)
    const fk = this.focusKind
    const cosmos = this.tier === 'cosmic'
    if (cosmos) this.core.rotation.y += dt * 0.05 * motion
    // The core breathes slowly; reduced motion keeps it near still.
    this.core.scale.setScalar(1 + 0.02 * Math.sin(t * 0.9) * motion)
    this.coreHeart.material.opacity = 0.75 + 0.2 * Math.sin(t * 0.9 + 1) * motion
    // Swarm orbits drift quietly until tasks bind.
    for (const s of this.swarmSpinners) s.rotation.y += dt * (s.userData.speed as number) * motion
    this.unityRing.visible = !cosmos
    this.universalCore.visible = !cosmos
    this.dclmCore.visible = !cosmos
    this.estates.visible = !cosmos
    for (const node of this.dclmNodes) node.visible = !cosmos
    for (const chamber of this.chambers.values()) chamber.visible = !cosmos
    const far = this.tier === 'orbit' || cosmos
    const pillarsOn = this.tier === 'cloud' || ((fk === 'sector' || fk === 'jurisdiction') && this.tier !== 'street' && !far)
    for (const m of this.pillars.values()) m.visible = pillarsOn
    for (const g of this.sectorTokens.values()) g.visible = !cosmos && (far || fk === 'sector' || camera.position.distanceTo(g.position) > 14)
    for (const inst of this.instruments.values()) {
      const near = camera.position.distanceTo(inst.anchor) < 24 || fk === 'feed'
      if (inst.plate) inst.plate.visible = near
      const b = inst.group.getObjectByName('beacon')
      if (b) { b.visible = !near || !inst.plate; b.rotation.y += dt * 0.9 * motion }
    }
    this.geo.update(camera, (camera as THREE.PerspectiveCamera).userData.lookAt ?? this.tmp.set(0, 0, 0), dt)
    if (this.markerAt) {
      const d = camera.position.distanceTo(this.markerAt)
      this.marker.position.copy(this.markerAt)
      this.marker.quaternion.copy(camera.quaternion)
      this.marker.scale.setScalar(Math.max(0.05, d * 0.035) * (1 + (reducedMotion ? 0 : 0.08 * Math.sin(t * 3))))
    }
    // Every extruded label turns (upright, yaw only) to face the visitor, so text never reads backwards.
    // Labels fold away with distance: big hub titles stay, small titles appear only when you are near them.
    // Reach buckets follow the authored text size (text3D records it as userData.foldSize); the measured
    // cap-height is only a fallback, because font metrics can push a small label over a bucket edge
    // (e.g. the 0.34 RTE titles measure ~0.38 tall and would wrongly earn the 34-unit medium reach).
    // The scan repeats every 64 frames so labels attached after boot still fold and face; labels that
    // left the scene are pruned.
    this.labelTick = (this.labelTick + 1) & 63
    if (!this.labels || this.labelTick === 0) {
      this.labels ??= []
      this.root.traverse(o => {
        if (!o.name.startsWith('text:') || this.labelSize.has(o)) return
        this.labels!.push(o)
        const authored = o.userData.foldSize as number | undefined
        if (authored !== undefined) this.labelSize.set(o, authored)
        else { this.box.setFromObject(o).getSize(this.sz); this.labelSize.set(o, Math.min(this.sz.y, 2)) }
      })
      for (let i = this.labels.length - 1; i >= 0; i--) {
        if (!this.labels[i].parent) { this.labelSize.delete(this.labels[i]); this.labels.splice(i, 1) }
      }
    }
    for (const o of this.labels) {
      if (!o.parent) continue
      const size = this.labelSize.get(o) ?? 0.4
      const reach = size >= 0.6 ? 80 : size >= 0.36 ? 34 : 19
      o.getWorldPosition(this.wp)
      o.visible = camera.position.distanceTo(this.wp) < reach
      if (!o.visible) continue
      o.getWorldPosition(this.wp)
      const yaw = Math.atan2(camera.position.x - this.wp.x, camera.position.z - this.wp.z)
      this.qa.setFromAxisAngle(this.yAxis, yaw)
      o.parent.getWorldQuaternion(this.qb)
      o.quaternion.copy(this.qb.invert().multiply(this.qa))
    }
    if (this.detail) {
      // Camera-space placement: the slab always fits (≤ 42% of view width, ≤ 72% of height),
      // sits beside the subject (right on landscape, low on portrait) and floats with slight parallax.
      const cam = camera as THREE.PerspectiveCamera
      const w = 6.4
      const h = (this.detail.userData.height as number | undefined) ?? 4
      const d = 9
      const viewH = 2 * d * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))
      const viewW = viewH * cam.aspect
      const portrait = cam.aspect < 0.9
      const scale = Math.min((viewW * (portrait ? 0.9 : 0.42)) / w, (viewH * (portrait ? 0.42 : 0.72)) / h)
      const offX = portrait ? 0 : viewW / 2 - (w * scale) / 2 - viewW * 0.04
      const offY = portrait ? -viewH / 2 + (h * scale) / 2 + viewH * 0.12 : viewH * 0.02
      const target = this.tmp.set(offX, offY, -d).applyMatrix4(cam.matrixWorld)
      if (!this.detail.userData.placed) { this.detail.position.copy(target); this.detail.userData.placed = true }
      else this.detail.position.lerp(target, Math.min(1, dt * (reducedMotion ? 30 : 6)))
      this.detail.scale.setScalar(scale)
      this.detail.quaternion.copy(cam.quaternion)
      if (!reducedMotion) this.detail.rotateY(portrait ? 0 : -0.12 + Math.sin(t * 0.6) * 0.015)
    }
  }
}
