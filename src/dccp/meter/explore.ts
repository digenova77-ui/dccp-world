/** An explore command issued to the swarm.
 * A feeling pays nothing. A new minute two sources name the same way pays.
 * That is the hunt. What is already held does not pay again.
 */

import { NOVEL_FACE } from './keys.ts'

export const EXPLORE_COMMAND = 'EXPLORE NEXT. EVERYWHERE. EVERYTHING. EVERY WAY. EVERY TIME. BECAUSE YOU\'RE BEING AUDITED.'

export function verifiedPay(claim: { sources: number; agrees: boolean; alreadyHeld: boolean }): number {
  if (claim.alreadyHeld || claim.sources < 2 || !claim.agrees) return 0
  return NOVEL_FACE
}

export function exploreNow(input: { two: number; conflict: number; onePage: number; presentReading: boolean; claims?: { sources: number; agrees: boolean; alreadyHeld: boolean }[] }): { keys: number; paid: number; words: string } {
  const present = input.presentReading ? 'A present reading was supplied.' : 'No new present reading was supplied.'
  const claims = input.claims ?? []
  const paid = claims.reduce((sum, claim) => sum + verifiedPay(claim), 0)
  const keys = claims.filter(claim => verifiedPay(claim) > 0).length
  return {
    keys,
    paid,
    words: `Command issued. ${EXPLORE_COMMAND} The swarm looked at history. ${input.two} minutes are two pages. ${input.conflict} conflicts. ${input.onePage} are one page. It looked at the present. ${present} A verified new key pays ${NOVEL_FACE}. That is the hunt. Two pages are still not two instruments. A feeling pays 0. A minute already held does not pay again. A conflict does not pay. This pass minted ${keys} and paid ${paid}. No gap was filled.`,
  }
}
