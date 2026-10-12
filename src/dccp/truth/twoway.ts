/** Forward from Sigma 0, and back from the latest held minute.
 * They meet only on minutes already held. Reversing does not fill a hole.
 * A pyramid method is not among the held minutes.
 */

import { heldTimes } from '../cosmos/weave.ts'

export function twoWay(): { held: number; open: number; affinity: number; friction: number; unified: number; words: string } {
  const times = heldTimes()
  const held = times.length
  const open = held > 0 ? held - 1 + 2 : 2
  const total = held + open
  const affinity = total ? held / total : 0
  const friction = total ? open / total : 1
  const unified = Math.min(affinity, affinity)
  const first = times[0] ?? 'none'
  const last = times[times.length - 1] ?? 'none'
  const words = [
    `Sigma 0 is no cut, no place, and no minute. It is not a reading.`,
    `Forward runs from Sigma 0 to the first held minute, ${first}, then through ${held} held minutes, and stops at ${last}. The present after that is unheld.`,
    `Reverse runs from that unheld present back through the same ${held} minutes and stops before Sigma 0. The stretch before ${first} is unheld.`,
    `The two directions meet on the held minutes and nowhere else. Open stretches: ${open}. Friction ${friction.toFixed(2)}. Affinity ${affinity.toFixed(2)}. The reverse affinity is the same number, because the holes are the same holes.`,
    `Unified affinity is the smaller of the two, ${unified.toFixed(2)}. Max affinity would be 1. It is not. Reversing does not fill what the forward pass left open.`,
    `The pyramid blueprint is not one of these minutes. A finished mass does not entail the procedure that raised it. More than one procedure is consistent with the stones standing. Pure logic does not choose among them. That is the exact reason the blueprint stays open. It is audited as unfilled.`,
    `A historical blueprint is complete only as a condition. It is not complete as a method. The next pass adds nothing.`,
  ].join(' ')
  return { held, open, affinity, friction, unified, words }
}
