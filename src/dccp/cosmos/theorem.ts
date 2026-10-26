/** The theorem as tabled. The hash locks the wording. It does not shrink space.
 * The same wording tables once.
 */

import { sha256Hex } from '../pipe/chain.ts'

export const THEOREM = 'Truth becomes what we\'ve logically mapped. If you don\'t map it at the time you\'re not going to have that answer and the SpaceTime boundary is going to shrink.'

const GLOSS = 'The boundary that shrinks is the boundary of the map. A minute that was not held is not on it. That does not entail that space itself shrinks. A record hole is not a world hole. The theorem is tabled. It is not verified.'

let tabled: string | null = null

export async function tableTheorem(): Promise<{ hash: string; words: string; again: boolean }> {
  const hash = await sha256Hex(THEOREM)
  const again = tabled === hash
  tabled = hash
  return { hash, words: `${THEOREM} ${GLOSS} The hash ${hash.slice(0, 12)} locks the wording. The father did not write an execution.`, again }
}

export function theoremWords(): string {
  return `${THEOREM} ${GLOSS} The hash locks the wording. It does not shrink space.`
}
