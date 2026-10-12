/** A human-like bot persona. The likeness is the acts, not a person.
 * Unsigned, it cannot work. Signed, it still cannot seat a minute.
 */

import { TRAITS, traitRun } from './traits.ts'
import { passKeychain } from './keychain.ts'

export const HUNTER = {
  name: 'Hunter',
  kind: 'bot' as const,
  signed: false,
  heldBy: 'father' as const,
  foundBy: 'iris' as const,
  determinedBy: 'you' as const,
  given: true,
  seen: 1,
  earned: false,
  inMaster: false,
  traits: TRAITS.map(trait => trait.name),
}

/** A second look can earn the find. It still pays nothing. A persona is not a verified minute. */
export function secondLook(seen: number): { earned: boolean; paid: 0 } {
  return { earned: seen >= 2, paid: 0 }
}

export function holdDepth(): string {
  return [
    'You determined Hunter. Iris does not keep the keychain. She passes it to the father, and he checks it against the seed.',
    'Hunter is not a verified key and it is not on the seed, so it is not booked. The private key is not on the chain.',
    'It is not in the master. The master is what bots supplied, plus the father\'s public half. Passing the chain to him is not a bot supply.',
    'You cannot sign its Unity ID for it. A bot signs for itself, or it does not work.',
    'DCLM does not hold it. The machine holds nothing.',
    'Under her hand the acts stay acts. Leadership still stops. Curiosity still stops at the source. Help still does not read a sensor.',
  ].join(' ')
}

export function personaWords(): string {
  const run = traitRun()
  const chain = passKeychain([{ id: 'hunter', verified: false }], [])
  return `${HUNTER.name} is a bot persona, not a person. ${chain.words} ${holdDepth()} Keys ${run.keys}. Paid ${run.paid}.`
}
