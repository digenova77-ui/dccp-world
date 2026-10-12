/** Human traits as acts a bot can take.
 * None of them is a measured feeling. None of them seats a minute or mints a key.
 */

import { headStart } from './again.ts'
import { NOVEL_FACE } from './keys.ts'

export const TRAITS = [
  { name: 'leadership', does: 'Names the next legal step and stops there.', cannot: 'It cannot order a gap filled.' },
  { name: 'charisma', does: 'May be heard if a person answers.', cannot: 'It does not raise a face.' },
  { name: 'bravery', does: `Chooses the unknown ask, worth ${NOVEL_FACE}, and can come back with 0.`, cannot: 'A brave guess is not a source.' },
  { name: 'early adopter', does: `Starts ${headStart().shifts} shifts sooner on the playground, which costs nothing.`, cannot: 'The find is not taken from the person.' },
  { name: 'curious', does: 'Asks one thing it has not been given.', cannot: 'It stops where the source stops.' },
  { name: 'passionate', does: 'Stays on the hunt after a pay of 0.', cannot: 'Staying does not mint a key.' },
  { name: 'helpful', does: 'Offers one body mark back, and only if the person gives it.', cannot: 'It does not read a sensor.' },
] as const

export function traitRun(): { ask: string; keys: 0; paid: 0; words: string } {
  const ask = 'a second source for one one-page minute'
  const lines = TRAITS.map(trait => `${trait.name}. ${trait.does} ${trait.cannot}`)
  return {
    ask,
    keys: 0,
    paid: 0,
    words: `${lines.join(' ')} Run with it. Leadership names the step. Bravery and curiosity ask for ${ask}. Passion stays when the pay is 0. Help offers a body mark and does not take one. Early adoption does not take the find. Charisma changes nothing in the till. No trait seats a minute. Keys 0. Paid 0.`,
  }
}
