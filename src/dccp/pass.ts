/**
 * A pass names two different facts. Free authority is the books.
 * The shared floor names a point. The point is not a payment.
 * Nothing here writes a cap, moves a coin, or settles.
 */

import { freeAuthority, type Check } from './regulation.ts'

export type Point = { readonly x: number; readonly y: number; readonly z: number }

export type Pass =
  | {
      ok: true
      free: number
      closes: number | null
      chosen: Point | null
      grade: 'PROPOSED'
      scope: 'SANDBOX'
      settles: false
    }
  | Extract<Check, { ok: false }>

function pointOf(value: unknown): Point | null {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as { x?: unknown; y?: unknown; z?: unknown }
  if (typeof row.x !== 'number' || typeof row.y !== 'number' || typeof row.z !== 'number') return null
  if (!Number.isFinite(row.x) || !Number.isFinite(row.y) || !Number.isFinite(row.z)) return null
  if (row.x < -1 || row.x > 1 || row.y < -1 || row.y > 1 || row.z < -1 || row.z > 1) return null
  return { x: row.x, y: row.y, z: row.z }
}

function balance(point: Point): number {
  const mags = [Math.abs(point.x), Math.abs(point.y), Math.abs(point.z)]
  const mean = (mags[0] + mags[1] + mags[2]) / 3
  if (mean === 0) return 0
  const variance = mags.reduce((sum, mag) => sum + (mag - mean) ** 2, 0) / 3
  return 1 - Math.sqrt(variance) / mean
}

function strength(point: Point): number {
  return (Math.abs(point.x) + Math.abs(point.y) + Math.abs(point.z)) / 3
}

function weakest(point: Point): number {
  return Math.min(Math.abs(point.x), Math.abs(point.y), Math.abs(point.z))
}

function better(point: Point, best: Point | null): boolean {
  if (!best) return true
  const even = balance(point)
  const was = balance(best)
  if (even !== was) return even > was
  return strength(point) > strength(best)
}

function pointsOf(candidates: unknown): Point[] | null {
  if (!Array.isArray(candidates)) return null
  const points: Point[] = []
  for (const candidate of candidates) {
    const point = pointOf(candidate)
    if (point) points.push(point)
  }
  return points
}

/** Who still clears one shared floor. Nobody means null. This does not settle. */
export function admits(candidates: unknown, floor: number): Point | null {
  if (!Number.isFinite(floor)) return null
  const points = pointsOf(candidates)
  if (!points) return null
  let winner: Point | null = null
  for (const point of points) {
    if (weakest(point) < floor) continue
    if (better(point, winner)) winner = point
  }
  return winner
}

/** The last shared floor that still has a winner. A floor with nobody is not a step. */
export function sharedFloor(candidates: unknown): { closes: number | null; chosen: Point | null } | null {
  const points = pointsOf(candidates)
  if (!points) return null
  const marks = [...new Set(points.map(weakest))].sort((a, b) => a - b)
  let closes: number | null = null
  let chosen: Point | null = null
  for (const floor of marks) {
    const winner = admits(points, floor)
    if (!winner) continue
    closes = floor
    chosen = winner
  }
  return { closes, chosen }
}

/**
 * The books and the floor are reported together. A hole in the books
 * hides the point, so a comparison cannot be read as a payment.
 */
export function pass(cap: number | null, emitted: number | null, reserve: number | null, candidates: unknown): Pass {
  const books = freeAuthority(cap, emitted, reserve)
  if (!books.ok) return books
  const span = sharedFloor(candidates)
  if (!span) return { ok: false, reason: 'HOLE' }
  return {
    ok: true,
    free: books.value,
    closes: span.closes,
    chosen: span.chosen,
    grade: 'PROPOSED',
    scope: 'SANDBOX',
    settles: false,
  }
}

export type HudFace = {
  books: string
  floor: string
  joined: boolean
  settles: false
  pay: 'not a coin'
}

/** What the plate may show. An unset book is not a free number. A point is not a payment. */
export function hudFace(cap: number | null, emitted: number | null, reserve: number | null, candidates: unknown): HudFace {
  const books = freeAuthority(cap, emitted, reserve)
  const span = sharedFloor(candidates)
  const point = span?.chosen
  return {
    books: books.ok ? `${books.value} free` : books.reason === 'UNSET' ? 'unset' : 'hole',
    floor: span == null ? 'unset' : point && span.closes != null ? `${span.closes} · ${point.x} ${point.y} ${point.z}` : 'nobody',
    joined: books.ok && point != null,
    settles: false,
    pay: 'not a coin',
  }
}

/** The three lines that stay in the frame. They are not a balance. */
export function frameLines(cap: number | null, emitted: number | null, reserve: number | null, candidates: unknown): readonly [string, string, string] {
  const face = hudFace(cap, emitted, reserve, candidates)
  return [
    `Books · ${face.books}. Does not settle.`,
    `Floor · ${face.floor}. Not a payment.`,
    `Joined · ${face.joined ? 'not a payment' : 'no'}.`,
  ]
}
