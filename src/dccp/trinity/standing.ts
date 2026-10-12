/** What is left after the framework is taken off.
 * The mesh is order, length, and grade. The next pass adds nothing.
 */

import { NAMED } from '../cosmos/between.ts'
import { PICTURE } from '../cosmos/history.ts'
import { nextDerivative, truthMesh } from '../cosmos/truthmesh.ts'
import { MAP_HASH, mapRows } from '../index/map.ts'

export const STRIPPED = [
  'a framework',
  'a conscious cosmos as a fact',
  'a completed architecture',
  'a primitive that was not in the record',
  'a result with no auditor',
] as const

export function standing(): { more: number; words: string } {
  const held = new Map<string, { name: string; at: string }>()
  for (const minute of PICTURE) held.set(minute.at, minute)
  for (const named of NAMED) if (!held.has(named.at)) held.set(named.at, named)
  const nodes = truthMesh([...held.values()])
  const more = nextDerivative(nodes).length
  const rows = mapRows()
  const paired = rows.filter(row => row.paired).length
  const words = [
    `Stripped: ${STRIPPED.join(', ')}.`,
    `Left standing: ${held.size} minutes in order, the length between each pair, and the grade of each row. ${paired} are paired. ${rows.length - paired} are unpaired.`,
    `The seed is a place, a minute, and a source. It is present on 4 rows and stops after that.`,
    `The mesh calculates that and then stops. The next pass adds ${more}.`,
    `The hash of the index is ${MAP_HASH}.`,
    'DCLM holds nothing. That is what is deployed.',
  ]
  return { more, words: words.join(' ') }
}
