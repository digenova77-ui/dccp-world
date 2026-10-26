import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { readHandoff, type Grade, type Handoff } from '../dccp/handoff'
import { cardAt, RUNGS, type City, type Land, type Rung, type ViewCard } from '../dccp/ladder'

export const Route = createFileRoute('/')({ component: Front })

function presentedLine(): string | null {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
  const query = new URLSearchParams(window.location.search).get('line')
  const raw = hash || query || ''
  if (!raw) return null
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

export function Front() {
  const [row, setRow] = useState<Handoff>({ ok: false, reason: 'SHUT' })
  useEffect(() => {
    setRow(readHandoff(presentedLine()))
  }, [])
  if (!row.ok) return <Gate word={row.reason} />
  return <Hud grade={row.grade} />
}

function Gate({ word }: { word: 'SHUT' | 'HOLE' }) {
  return (
    <main>
      <p className="hole">{word}</p>
    </main>
  )
}

function Hud({ grade }: { grade: Grade }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const meter = useRef<HTMLParagraphElement>(null)
  const go = useRef<(index: number) => void>(() => {})
  const fix = useRef<{ lat: number; lon: number } | null>(null)
  const cities = useRef<City[]>([])
  const lands = useRef<Land[]>([])
  const [rung, setRung] = useState<Rung>('LOCAL')
  const [card, setCard] = useState<ViewCard>(() => cardAt('LOCAL', [], [], null, null, 'en'))

  useEffect(() => {
    let stop = false
    let release = () => {}
    let watch = -1
    const node = canvas.current
    if (!node) return () => {}
    const locale = navigator.language || 'en'
    const refresh = () => {
      if (stop) return
      const at = fix.current
      setCard((prev) => cardAt(prev.rung, cities.current, lands.current, at?.lat ?? null, at?.lon ?? null, locale))
    }
    void Promise.all([fetch('/registry/cities.json'), fetch('/registry/countries.json')])
      .then(async ([cityRes, landRes]) => {
        if (!cityRes.ok || !landRes.ok) return
        const cityJson = (await cityRes.json()) as { cities?: unknown[] }
        const landJson = (await landRes.json()) as { countries?: unknown[] }
        if (stop) return
        cities.current = (cityJson.cities ?? []).flatMap((row) => {
          const city = asCity(row)
          return city ? [city] : []
        })
        lands.current = (landJson.countries ?? []).flatMap((row) => {
          const land = asLand(row)
          return land ? [land] : []
        })
        refresh()
      })
      .catch(() => {})
    if (navigator.geolocation) {
      watch = navigator.geolocation.watchPosition(
        (pos) => {
          fix.current = { lat: pos.coords.latitude, lon: pos.coords.longitude }
          refresh()
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 8000 },
      )
    }
    const perf = new URLSearchParams(window.location.search).has('perf')
    if (meter.current) meter.current.hidden = !perf
    void import('../dccp/scene').then((mod) => {
      if (stop || !canvas.current) return
      const world = mod.mount(canvas.current, {
        onRung: (index) => {
          if (stop) return
          const next = RUNGS[index] ?? 'LOCAL'
          const at = fix.current
          setRung(next)
          setCard(cardAt(next, cities.current, lands.current, at?.lat ?? null, at?.lon ?? null, locale))
        },
        onPerf: perf
          ? (line) => {
              if (meter.current) meter.current.textContent = line
            }
          : undefined,
      })
      release = world.release
      go.current = world.go
      const mark = window.setInterval(() => {
        const ms = world.frameMs()
        if (ms == null || !canvas.current) return
        canvas.current.dataset.frameMs = String(Math.round(ms))
        window.clearInterval(mark)
      }, 400)
      release = () => {
        window.clearInterval(mark)
        world.release()
      }
    })
    return () => {
      stop = true
      if (watch >= 0) navigator.geolocation.clearWatch(watch)
      release()
    }
  }, [])

  return (
    <main>
      <canvas ref={canvas} id="world" />
      <p ref={meter} className="perf" hidden />
      <header>
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M32 10 A22 22 0 0 1 32 54" />
          <path d="M32 10 A22 22 0 0 0 32 54" />
        </svg>
        <p>DualisCapax</p>
      </header>
      <div className="hud" data-grade={grade}>
        <span className="bracket tl" />
        <span className="bracket tr" />
        <span className="bracket bl" />
        <span className="bracket br" />
        <div className="reticle" aria-hidden="true" />
        <ol className="ladder">
          {RUNGS.map((name) => (
            <li key={name}>
              <button type="button" aria-current={name === rung ? 'true' : undefined} onClick={() => go.current(RUNGS.indexOf(name))}>
                {name}
              </button>
            </li>
          ))}
        </ol>
        <section className="plate">
          <p className="kicker">{rung}</p>
          <p className="seat">
            {grade} · flags 0
          </p>
          <h1>{card.title}</h1>
          {card.figure ? (
            <p className="seat">
              {card.figure}
              {card.raw && card.raw !== card.figure ? ` · ${card.raw}` : ''}
              {card.grade ? ` · ${card.grade}` : ''}
            </p>
          ) : card.grade ? (
            <p className="seat">{card.grade}</p>
          ) : null}
          <p className="sub">{card.note}</p>
          <ol className="seats">
            <li>Iris</li>
            <li>DCLM</li>
            <li>Twain</li>
          </ol>
        </section>
      </div>
    </main>
  )
}

function asCity(row: unknown): City | null {
  if (!row || typeof row !== 'object') return null
  const rec = row as Record<string, unknown>
  if (typeof rec.name !== 'string' || typeof rec.region !== 'string') return null
  if (typeof rec.lat !== 'number' || typeof rec.lon !== 'number' || typeof rec.pop !== 'number') return null
  if (!Number.isInteger(rec.pop)) return null
  return { name: rec.name, region: rec.region, lat: rec.lat, lon: rec.lon, pop: rec.pop }
}

function asLand(row: unknown): Land | null {
  if (!row || typeof row !== 'object') return null
  const rec = row as Record<string, unknown>
  if (typeof rec.name !== 'string' || typeof rec.continent !== 'string' || typeof rec.pop !== 'number') return null
  if (!Number.isInteger(rec.pop) || !Array.isArray(rec.rings)) return null
  const rings = rec.rings.filter((ring): ring is number[] => Array.isArray(ring) && ring.every((n) => typeof n === 'number'))
  return { name: rec.name, continent: rec.continent, pop: rec.pop, rings }
}
