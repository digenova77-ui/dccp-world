/** A hypothesis tabled beside the holes. It does not fill them.
 * The hash locks this wording. It does not make the path a recording.
 * The same wording tables once.
 */

import { sha256Hex } from '../pipe/chain.ts'
import type { Rotation } from '../trinity/rotation.ts'

export const HYPOTHESIS = 'Between two held minutes, the path is a continuity and nothing else. No missing name, place, or number is entailed. The hole stays open.'

let tabled: string | null = null

export function hypothesisPass(hash: string): Rotation {
  return {
    question: 'Can pure logic fill a hole that has no premise?',
    votes: [
      { seat: 'DCLM', says: `The hash ${hash.slice(0, 12)} locks the wording. It does not prove the path. The machine holds nothing.` },
      { seat: 'Iris', says: 'This is a hypothesis. It is not verified. It is not stronger than an unconfirmed cite. The explanation stays, because dropping it would hide that.' },
      { seat: 'Twain²', says: 'Pure logic does not invent a missing premise. The unknown stays unknown.' },
    ],
    unified: 'The best connection that can be tabled is continuity between held minutes, and nothing else. The holes stay open. A second tabling of the same wording changes nothing.',
    fatherWrote: false,
    audit: 'forever',
    sealedSitting: false,
  }
}

export async function tableHypothesis(): Promise<{ hash: string; words: string; again: boolean }> {
  const hash = await sha256Hex(HYPOTHESIS)
  const again = tabled === hash
  tabled = hash
  const pass = hypothesisPass(hash)
  const words = `${HYPOTHESIS} ${pass.unified} ${pass.votes[0].says} The father did not write an execution. This was not a sealed sitting.`
  return { hash, words, again }
}
