import * as THREE from 'three'
import { FontLoader, type Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'

let fontPromise: Promise<Font> | null = null
export function loadFont(url = '/fonts/sora-600.typeface.json'): Promise<Font> {
  fontPromise ??= new FontLoader().loadAsync(url)
  return fontPromise
}

const geoCache = new Map<string, THREE.BufferGeometry>()

export interface Text3DOptions {
  size?: number
  depth?: number
  color?: THREE.ColorRepresentation
  emissive?: THREE.ColorRepresentation
  emissiveIntensity?: number
  bevel?: boolean
  align?: 'center' | 'left'
}

/** Extruded, bevelled 3D type. Geometry is cached per (text,size,depth). */
export function text3D(font: Font, text: string, opts: Text3DOptions = {}): THREE.Mesh {
  const size = opts.size ?? 1
  const depth = opts.depth ?? size * 0.28
  const key = `${text}|${size}|${depth}|${opts.bevel !== false}|${opts.align ?? 'center'}`
  let geo = geoCache.get(key)
  if (!geo) {
    const g = new TextGeometry(text, {
      font, size, depth, curveSegments: 4,
      bevelEnabled: opts.bevel !== false, bevelThickness: size * 0.05, bevelSize: size * 0.03, bevelSegments: 2,
    })
    g.computeBoundingBox()
    const bb = g.boundingBox!
    const dx = opts.align === 'left' ? -bb.min.x : -(bb.max.x + bb.min.x) / 2
    g.translate(dx, -(bb.max.y + bb.min.y) / 2, -depth / 2)
    geo = g
    geoCache.set(key, g)
  }
  const mat = new THREE.MeshStandardMaterial({
    color: opts.color ?? 0xe8fbff, metalness: 0.55, roughness: 0.28,
    emissive: new THREE.Color(opts.emissive ?? 0x14b8a6), emissiveIntensity: opts.emissiveIntensity ?? 0.35,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.castShadow = false
  mesh.name = `text:${text}`
  // Authored size drives the distance-fold buckets in world.ts (userData.pick etc. untouched).
  mesh.userData.foldSize = size
  return mesh
}

export interface PlateOptions {
  width?: number
  title?: string
  lines: string[]
  accent?: string
  footer?: string
}

/** A thick glass slab whose face carries crisp canvas-rendered text; edges glow in the accent colour. */
export function textPlate(opts: PlateOptions): THREE.Group {
  const width = opts.width ?? 9
  const canvas = document.createElement('canvas')
  const W = 1024
  const ctx = canvas.getContext('2d')!
  const pad = 54
  const accent = opts.accent ?? '#14b8a6'
  const wrap = (text: string, font: string, max: number): string[] => {
    ctx.font = font
    const words = text.split(/\s+/)
    const out: string[] = []
    let line = ''
    for (const w of words) {
      const test = line ? `${line} ${w}` : w
      if (ctx.measureText(test).width > max && line) { out.push(line); line = w } else line = test
    }
    if (line) out.push(line)
    return out
  }
  const bodyFont = '400 34px Figtree, system-ui, sans-serif'
  const titleFont = '700 50px Sora, system-ui, sans-serif'
  const titleLines = opts.title ? wrap(opts.title, titleFont, W - pad * 2) : []
  const body = opts.lines.flatMap((l, i) => [...wrap(l, bodyFont, W - pad * 2), ...(i < opts.lines.length - 1 ? [''] : [])])
  const H = Math.min(2048, pad * 2 + titleLines.length * 62 + (titleLines.length ? 26 : 0) + body.length * 46 + (opts.footer ? 70 : 0))
  canvas.width = W
  canvas.height = H
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, 'rgba(10,22,34,0.94)')
  grad.addColorStop(1, 'rgba(6,10,20,0.94)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = accent
  ctx.lineWidth = 6
  ctx.strokeRect(3, 3, W - 6, H - 6)
  let y = pad + 40
  ctx.fillStyle = '#ffffff'
  ctx.font = titleFont
  for (const l of titleLines) { ctx.fillText(l, pad, y); y += 62 }
  if (titleLines.length) y += 26
  ctx.font = bodyFont
  ctx.fillStyle = '#d5eef2'
  for (const l of body) { ctx.fillText(l, pad, y); y += 46 }
  if (opts.footer) {
    ctx.font = '600 26px Figtree, system-ui, sans-serif'
    ctx.fillStyle = accent
    ctx.fillText(opts.footer, pad, H - pad + 6)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  const height = (width * H) / W
  const depth = 0.32
  const group = new THREE.Group()
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0b1a26, metalness: 0.1, roughness: 0.15, transmission: 0, transparent: true, opacity: 0.85, clearcoat: 1 })
  const edge = new THREE.MeshBasicMaterial({ color: new THREE.Color(accent) })
  const face = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false })
  const box = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), [edge, edge, edge, edge, glass, glass])
  const front = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.985, height * 0.985), face)
  front.position.z = depth / 2 + 0.01
  group.add(box, front)
  group.userData.dispose = () => { tex.dispose(); box.geometry.dispose(); front.geometry.dispose(); face.dispose(); glass.dispose(); edge.dispose() }
  group.userData.height = height
  return group
}
