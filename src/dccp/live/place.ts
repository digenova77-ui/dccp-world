// Live weather for any place the visitor chooses (Open-Meteo, keyless, CORS-enabled).
// Hard timeout, cached for 10 minutes, never throws, never blocks the world.
import { fetchJson } from './feeds'

export interface PlaceWeather { tempC: number; windKmh: number; code: number; at: number }
type Entry = { at: number; value: PlaceWeather | null; pending?: Promise<PlaceWeather | null> }
const cache = new Map<string, Entry>()
const TTL = 10 * 60_000

const WORDS: [number[], string][] = [
  [[0], 'Clear'], [[1], 'Mostly clear'], [[2], 'Partly cloudy'], [[3], 'Overcast'], [[45, 48], 'Fog'],
  [[51, 53, 55, 56, 57], 'Drizzle'], [[61, 63, 65, 66, 67, 80, 81, 82], 'Rain'], [[71, 73, 75, 77, 85, 86], 'Snow'],
  [[95, 96, 99], 'Thunderstorm'],
]
export function weatherWord(code: number): string {
  for (const [codes, w] of WORDS) if (codes.includes(code)) return w
  return 'Unknown sky'
}
export function weatherLine(w: PlaceWeather | null | undefined): string {
  if (!w) return 'Checking…'
  return `${weatherWord(w.code)}, ${Math.round(w.tempC)}°C`
}

/** Returns a cached value immediately if fresh; otherwise starts (or joins) one bounded request. */
export function placeWeather(lat: number, lon: number, onReady: (w: PlaceWeather | null) => void, timeoutMs = 8000): PlaceWeather | null | undefined {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`
  const e = cache.get(key)
  const now = Date.now()
  if (e && !e.pending && now - e.at < TTL) return e.value
  if (e?.pending) { void e.pending.then(onReady); return e.value ?? undefined }
  const url = `/api/live?feed=weather&lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}`
  const pending = fetchJson(url, timeoutMs).then((j: any) => {
    const t = Number(j?.current?.temperature_2m), w = Number(j?.current?.wind_speed_10m), c = Number(j?.current?.weather_code)
    return Number.isFinite(t) ? { tempC: t, windKmh: Number.isFinite(w) ? w : 0, code: Number.isFinite(c) ? c : -1, at: Date.now() } : null
  }).catch(() => null)
  const entry: Entry = { at: now, value: e?.value ?? null, pending }
  cache.set(key, entry)
  void pending.then(v => { entry.value = v ?? entry.value; entry.at = v ? Date.now() : now - TTL + 60_000; entry.pending = undefined; onReady(entry.value) })
  return e?.value ?? undefined
}
