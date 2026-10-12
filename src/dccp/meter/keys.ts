/** A solved key. A first find is worth more. Giving it to Iris starts a logarithmic trickle.
 * The trickle is test supply, not a security and not a till.
 */

import { faceFor as closedFace } from './close.ts'

export const NOVEL_FACE = closedFace(true)
export const KNOWN_FACE = closedFace(false)

export interface SolvedKey {
  id: string
  claim: string
  novel: boolean
  face: number
  holder: 'doctor' | 'bots'
  traded: boolean
  /** Shift number when it was given away. Null while held. */
  tradedOn: number | null
  seen: number
  earned: boolean
  /** Set when a prior white paper or knowledge patent nullified the face. The key stays. */
  nullified?: string | null
}

export function faceFor(novel: boolean): number {
  return closedFace(novel)
}

/** Payment due on period p (1, 2, 3…). Cumulative through p is face · ln(1+p). */
export function trickleAt(face: number, period: number): number {
  if (face <= 0 || period < 1) return 0
  return face * Math.log1p(1 / period)
}

export function trickleSum(face: number, periods: number): number {
  if (face <= 0 || periods < 1) return 0
  return face * Math.log1p(periods)
}

export function mintKey(id: string, claim: string, novel: boolean, holder: 'doctor' | 'bots'): SolvedKey {
  return { id, claim, novel, face: faceFor(novel), holder, traded: false, tradedOn: null, seen: 1, earned: false, nullified: null }
}

export function giveKey(key: SolvedKey, shift: number): SolvedKey {
  if (key.traded) return key
  return { ...key, traded: true, tradedOn: shift }
}

/** Pay every key that has been given away, for this shift. */
export function payTrickle(keys: readonly SolvedKey[], shift: number): { doctor: number; bots: number } {
  let doctor = 0
  let bots = 0
  for (const key of keys) {
    if (!key.traded || key.tradedOn === null || shift < key.tradedOn) continue
    const period = shift - key.tradedOn + 1
    const pay = trickleAt(key.face, period)
    if (key.holder === 'doctor') doctor += pay
    else bots += pay
  }
  return { doctor, bots }
}
