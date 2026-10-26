/** The per-decision close. Test supply only. Not a price, not a till, not a security.
 *
 * A half-capacity shift is 5 decisions. A repeat is 1 of them. A first find is the other 4.
 * Those two faces add back to the shift. After the key is given away, the return through
 * n shifts is the closed sum face · ln(1+n).
 *
 * The royalty is not in this sum. It varies with who signed to reduce their residual.
 * The fixed fee is 10%, and that 10% splits in half: eFuse and Unity.
 * The split is an accounting of the fee. It does not sell eFuse. eFuse stays capped.
 * No derivative paper for that split is in what this world holds.
 */

import { CAPACITY, SHIFT_SLOTS, UNIT_PER_DECISION } from './economy.ts'

export const RESIDUAL = { driveBackFloor: 0.81, fee: 0.10 } as const

export function shiftSlots(): number {
  return Math.floor(SHIFT_SLOTS * CAPACITY)
}

/** First find is the rest of the shift. A repeat is one decision. */
export function faceFor(novel: boolean): number {
  const slots = shiftSlots()
  return novel ? Math.max(UNIT_PER_DECISION, slots - UNIT_PER_DECISION) : UNIT_PER_DECISION
}

/** Closed form of Σ_{k=1..n} face · ln(1 + 1/k). */
export function closedStream(face: number, periods: number): number {
  if (face <= 0 || periods < 1) return 0
  return face * Math.log1p(periods)
}

export function feeSplit(): { efuse: number; unity: number } {
  return { efuse: RESIDUAL.fee / 2, unity: RESIDUAL.fee / 2 }
}

export function spendPeg(): string {
  return [
    'Joining costs $0. The Earth is free to look at. One yes on the agreement opens the handle. It does not open a till.',
    `After that, a decision spends ${UNIT_PER_DECISION} unit of the test supply. A half-capacity shift is ${shiftSlots()} of those. A repeat is worth ${faceFor(false)}. A first find is worth ${faceFor(true)}. That unit is the peg. It is not a dollar.`,
    'Give the key away and the return through n shifts is the face times the natural log of 1 plus n. The royalty is not in that sum. The fixed 10 percent fee splits in half, eFuse and Unity. That split does not sell eFuse. eFuse stays capped, and nobody sells it.',
    'What has not been pegged is what the object is worth, and the residual that depends on who signed. Those are the costs still driving a loss. They are not invented here.',
    'The picture stays a picture. The Earth stays the real world. The work in front of us is to peg the spend, and the till stays closed until a worth is actually settled.',
  ].join(' ')
}

export function residualIdentity(): { fixed: number; room: number; royalty: null; efuse: number; unity: number; paper: null } {
  const { efuse, unity } = feeSplit()
  const fixed = RESIDUAL.driveBackFloor + RESIDUAL.fee
  return { fixed, room: 1 - fixed, royalty: null, efuse, unity, paper: null }
}