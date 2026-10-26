/** The seed is your account. You can trade coins for a derivative of what somebody else found.
 * The find stays theirs. Nothing is seized. The return is booked back into the seed.
 * Test supply only. Not a security, and not a way out of a real liquidation.
 */

import { trickleAt } from './keys.ts'
import type { SolvedKey } from './keys.ts'

export interface Derivative {
  id: string
  findId: string
  finder: 'bots'
  face: number
  cost: number
  takenOn: number
}

export function liquidate(): { seized: false; reason: string } {
  return { seized: false, reason: 'The seed is not liquidated. A find is not seized. Coins move only if you choose to trade them for a derivative.' }
}

export function takeDerivative(supply: number, key: SolvedKey, shift: number, held: readonly Derivative[]): { supply: number; derivative: Derivative } | { error: string } {
  if (key.holder !== 'bots') return { error: 'That find is already yours. A derivative is of what somebody else found. The seed does not buy itself.' }
  if (held.some(row => row.findId === key.id)) return { error: 'The seed already holds a derivative of that find.' }
  if (supply < key.face) return { error: 'The seed does not have the coins. Nothing is liquidated. The find stays with whoever made it.' }
  return {
    supply: supply - key.face,
    derivative: { id: `derivative:${key.id}`, findId: key.id, finder: 'bots', face: key.face, cost: key.face, takenOn: shift },
  }
}

/** Marginal return this shift, credited to the seed. The shift it was taken pays nothing yet. */
export function seedReturn(held: readonly Derivative[], shift: number): number {
  let sum = 0
  for (const row of held) {
    const period = shift - row.takenOn
    if (period < 1) continue
    sum += trickleAt(row.face, period)
  }
  return sum
}
