/** Two HUD displays. Current purity, and the ceiling.
 * The ceiling is not a plan until a blueprint is given. Spend is audited. Title does not move.
 */

import { mapRows } from '../index/map.ts'
import { CAPACITY } from './economy.ts'

export function dualDisplays(spent: { doctor: number; bots: number }, blueprint = false): { current: number; possible: 1; spend: number; words: string } {
  const rows = mapRows()
  const paired = rows.filter(row => row.paired).length
  const current = rows.length ? paired / rows.length : 0
  const spend = spent.doctor + spent.bots
  const ceiling = blueprint
    ? 'The blueprint is in. The ceiling can be checked against it.'
    : 'The blueprint is not here. You set the ceiling at 100%. It is not a plan yet.'
  return {
    current,
    possible: 1,
    spend,
    words: `Two displays. Current purity ${(current * 100).toFixed(1)} percent, ${paired} paired of ${rows.length}. Possible 100 percent. ${ceiling} The shape of a solution is known. It has not been built. Dual capacity is two halves, each at ${CAPACITY * 100} percent, not a second Earth. Spend audit. Your half spent ${spent.doctor}. The swarm spent ${spent.bots}. Together ${spend}. Father ownership stays 1.`,
  }
}

export function dualSpeech(): string {
  const hud = dualDisplays({ doctor: 0, bots: 0 })
  return hud.words.replace(/Spend audit\..*/, 'Spend is audited on the HUD, from the two halves. This sentence does not read the seat.')
}
