// Live public telemetry. Every request has a hard timeout; failures back off exponentially;
// each feed exposes LIVE / STALE / UNAVAILABLE so the world never shows dead data as live.

import { weatherFromMet } from './proxy.ts'

export type FeedState = 'PENDING' | 'LIVE' | 'STALE' | 'UNAVAILABLE'

export interface Quake { id: string; mag: number; place: string; time: number; lat: number; lon: number; depthKm: number }
export interface FeedValues {
  quakes?: { count: number; strongest?: Quake; items: Quake[]; generated: number }
  iss?: { lat: number; lon: number; altKm: number; speedKmh: number; visibility: string; at: number }
  weather?: { tempC: number; windKmh: number; code: number; at: string }
  kp?: { kp: number; at: string }
  carbon?: { intensity: number; index: string; from: string }
  river?: { levelM?: number; dischargeM3s?: number; at: string; station: string }
}

export interface FeedSpec<K extends keyof FeedValues> {
  key: K
  title: string
  source: string
  url: string
  everyMs: number
  staleAfterMs: number
  /** Public URL the browser may call if the same-origin proxy does not answer. */
  direct?: string
  parse: (json: unknown) => NonNullable<FeedValues[K]>
}

export interface FeedStatus {
  key: keyof FeedValues
  title: string
  source: string
  state: FeedState
  lastOk: number | null
  lastError: string | null
  failures: number
  nextAt: number
}

const num = (v: unknown, fallback = NaN): number => (typeof v === 'number' && Number.isFinite(v) ? v : Number.isFinite(Number(v)) ? Number(v) : fallback)

export const FEEDS: FeedSpec<keyof FeedValues>[] = [
  {
    key: 'quakes', title: 'Earthquakes · M2.5+ past day', source: 'USGS Earthquake Hazards Program',
    url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson', everyMs: 60_000, staleAfterMs: 15 * 60_000,
    parse: (j: any) => {
      const items: Quake[] = (j?.features ?? []).slice(0, 400).map((f: any) => ({
        id: String(f.id), mag: num(f.properties?.mag, 0), place: String(f.properties?.place ?? 'unnamed location'),
        time: num(f.properties?.time, 0), lon: num(f.geometry?.coordinates?.[0], 0), lat: num(f.geometry?.coordinates?.[1], 0),
        depthKm: num(f.geometry?.coordinates?.[2], 0),
      }))
      const strongest = items.reduce<Quake | undefined>((a, b) => (!a || b.mag > a.mag ? b : a), undefined)
      return { count: items.length, strongest, items, generated: num(j?.metadata?.generated, Date.now()) }
    },
  },
  {
    key: 'iss', title: 'International Space Station', source: 'wheretheiss.at (NORAD 25544)',
    url: '/api/live?feed=iss', direct: 'https://api.wheretheiss.at/v1/satellites/25544', everyMs: 5_000, staleAfterMs: 3 * 60_000,
    parse: (j: any) => ({ lat: num(j.latitude), lon: num(j.longitude), altKm: num(j.altitude), speedKmh: num(j.velocity), visibility: String(j.visibility ?? ''), at: num(j.timestamp, Date.now() / 1000) * 1000 }),
  },
  {
    key: 'weather', title: 'Air at the point under the camera', source: 'MET Norway',
    url: '/api/live?feed=weather',
    everyMs: 10 * 60_000, staleAfterMs: 60 * 60_000,
    parse: (j: any) => ({ tempC: num(j.current?.temperature_2m), windKmh: num(j.current?.wind_speed_10m), code: num(j.current?.weather_code, -1), at: String(j.current?.time ?? '') }),
  },
  {
    key: 'kp', title: 'Geomagnetic Kp index', source: 'NOAA Space Weather Prediction Center',
    url: '/api/live?feed=kp', direct: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json', everyMs: 15 * 60_000, staleAfterMs: 4 * 3600_000,
    parse: (j: any) => {
      const rows = Array.isArray(j) ? j : []
      const last = rows[rows.length - 1]
      if (Array.isArray(last)) return { kp: num(last[1]), at: String(last[0]) }
      return { kp: num(last?.Kp), at: String(last?.time_tag ?? '') }
    },
  },
  {
    key: 'carbon', title: 'Grid carbon intensity · Britain', source: 'National Energy System Operator · Carbon Intensity API',
    url: '/api/live?feed=carbon', direct: 'https://api.carbonintensity.org.uk/intensity', everyMs: 15 * 60_000, staleAfterMs: 2 * 3600_000,
    parse: (j: any) => {
      const d = j?.data?.[0]
      return { intensity: num(d?.intensity?.actual ?? d?.intensity?.forecast), index: String(d?.intensity?.index ?? ''), from: String(d?.from ?? '') }
    },
  },
  {
    key: 'river', title: 'Moira River at Belleville (02HM003)', source: 'Environment and Climate Change Canada · real-time hydrometric',
    url: 'https://api.weather.gc.ca/collections/hydrometric-realtime/items?f=json&limit=1&STATION_NUMBER=02HM003&sortby=-DATETIME',
    everyMs: 15 * 60_000, staleAfterMs: 6 * 3600_000,
    parse: (j: any) => {
      const p = j?.features?.[0]?.properties ?? {}
      const level = num(p.LEVEL, NaN)
      const discharge = num(p.DISCHARGE, NaN)
      return { levelM: Number.isFinite(level) ? level : undefined, dischargeM3s: Number.isFinite(discharge) ? discharge : undefined, at: String(p.DATETIME ?? ''), station: String(p.STATION_NAME ?? 'MOIRA RIVER') }
    },
  },
]

export async function fetchJson(url: string, timeoutMs: number, fetcher: typeof fetch = fetch): Promise<unknown> {
  const ctrl = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  // Hard deadline: even a fetcher that ignores the abort signal cannot stall a feed.
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      ctrl.abort()
      const e = new Error('timed out')
      e.name = 'AbortError'
      reject(e)
    }, timeoutMs)
  })
  try {
    return await Promise.race([
      (async () => {
        const res = await fetcher(url, { signal: ctrl.signal, cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return await res.json()
      })(),
      deadline,
    ])
  } finally {
    clearTimeout(timer)
  }
}

/** Backoff after `failures` consecutive failures: base, doubling, capped at 10 minutes. */
export function backoffMs(baseMs: number, failures: number): number {
  if (failures <= 0) return baseMs
  return Math.min(10 * 60_000, Math.max(5_000, Math.min(baseMs, 30_000) * 2 ** Math.min(failures, 8)))
}

export function stateOf(status: Pick<FeedStatus, 'lastOk' | 'failures'>, staleAfterMs: number, now: number): FeedState {
  if (status.lastOk === null) return status.failures > 0 ? 'UNAVAILABLE' : 'PENDING'
  return now - status.lastOk > staleAfterMs ? 'STALE' : 'LIVE'
}

export class LiveFeeds {
  readonly values: FeedValues = {}
  readonly status = new Map<keyof FeedValues, FeedStatus>()
  private timer: number | undefined
  private inflight = new Set<keyof FeedValues>()
  private listeners = new Set<(key: keyof FeedValues) => void>()

  private place = { lat: 44.18, lon: -77.36 }

  constructor(private specs = FEEDS, private timeoutMs = 9_000, private fetcher: typeof fetch = (...a) => fetch(...a)) {
    for (const s of specs) this.status.set(s.key, { key: s.key, title: s.title, source: s.source, state: 'PENDING', lastOk: null, lastError: null, failures: 0, nextAt: 0 })
  }

  setPlace(lat: number, lon: number): void {
    if (Number.isFinite(lat) && Number.isFinite(lon)) this.place = { lat, lon }
  }

  onUpdate(fn: (key: keyof FeedValues) => void): void {
    this.listeners.add(fn)
  }

  start(): void {
    if (this.timer !== undefined) return
    const tick = () => {
      const now = Date.now()
      for (const spec of this.specs) {
        const st = this.status.get(spec.key)!
        st.state = stateOf(st, spec.staleAfterMs, now)
        if (now >= st.nextAt && !this.inflight.has(spec.key)) void this.poll(spec)
      }
    }
    tick()
    this.timer = setInterval(tick, 1_000) as unknown as number
  }

  stop(): void {
    if (this.timer !== undefined) clearInterval(this.timer)
    this.timer = undefined
  }

  private async read(spec: FeedSpec<keyof FeedValues>): Promise<unknown> {
    const same = spec.key === 'weather'
      ? `/api/live?feed=weather&lat=${this.place.lat.toFixed(2)}&lon=${this.place.lon.toFixed(2)}`
      : spec.url
    try {
      return await fetchJson(same, this.timeoutMs, this.fetcher)
    } catch (err) {
      const direct = spec.key === 'weather'
        ? `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${this.place.lat.toFixed(2)}&lon=${this.place.lon.toFixed(2)}`
        : spec.direct
      if (!direct) throw err
      const json = await fetchJson(direct, this.timeoutMs, this.fetcher)
      if (spec.key === 'weather') {
        const shaped = weatherFromMet(json)
        if (!shaped) throw err
        return shaped
      }
      return json
    }
  }

  private async poll(spec: FeedSpec<keyof FeedValues>): Promise<void> {
    const st = this.status.get(spec.key)!
    this.inflight.add(spec.key)
    try {
      const json = await this.read(spec)
      ;(this.values as Record<string, unknown>)[spec.key] = spec.parse(json)
      st.lastOk = Date.now()
      st.failures = 0
      st.lastError = null
      st.nextAt = st.lastOk + spec.everyMs
    } catch (err) {
      st.failures += 1
      st.lastError = err instanceof Error ? (err.name === 'AbortError' ? 'timed out' : err.message) : 'failed'
      st.nextAt = Date.now() + backoffMs(spec.everyMs, st.failures)
    } finally {
      this.inflight.delete(spec.key)
      st.state = stateOf(st, spec.staleAfterMs, Date.now())
      for (const fn of this.listeners) {
        try { fn(spec.key) } catch (e) { console.warn('feed listener failed', e) }
      }
    }
  }
}
