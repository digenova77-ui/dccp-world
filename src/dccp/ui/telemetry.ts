import { gapLine } from '../iris/nodata.ts'
import { closeFor, landingGauge } from '../truth/bestpath.ts'

/** One HUD. Every instrument is a scope, a name, and a value or a gap.
 * A missing one stays in the list and says the condition that would close it.
 */

export interface Reading {
  scope: string
  label: string
  value: string | null
  /** How old the reading is, in the source's own words. */
  ago?: string | null
  /** Set when the missing line has a specific close. Otherwise the gap protocol is used. */
  gap?: string
}

export function saidAgo(at: number | string | null | undefined, now = Date.now()): string | null {
  if (at == null || at === '') return null
  const ms = typeof at === 'number' ? at : Date.parse(at)
  if (!Number.isFinite(ms)) return null
  const s = Math.round((now - ms) / 1000)
  if (s < 0 || s > 60 * 60 * 24 * 14) return null
  if (s < 5) return 'just now'
  if (s < 90) return `${s} seconds ago`
  const m = Math.round(s / 60)
  if (m < 90) return `${m} minutes ago`
  const h = Math.round(m / 60)
  return `${h} hours ago`
}

export function unifiedTelemetry(place: { title: string; lines: string[] }, readings: Reading[]): { title: string; lines: string[] } {
  const gauge = readings.length ? landingGauge(readings) : null
  const live = readings.filter(reading => reading.value !== null).map(reading => `${reading.scope} · ${reading.label} · ${reading.value}${reading.ago ? ` · ${reading.ago}` : ''}`)
  const missing = readings.filter(reading => reading.value === null).map(reading => reading.gap ?? `${gapLine(`${reading.scope} · ${reading.label}`)} Best path: ${closeFor(reading.label)}`)
  const lines = [place.lines[0], gauge?.words, ...live, ...missing].filter((line): line is string => Boolean(line))
  return { title: place.title, lines: lines.slice(0, 12) }
}
