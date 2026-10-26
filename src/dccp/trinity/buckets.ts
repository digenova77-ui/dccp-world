/** Three buckets. DCLM sits in front and adds nothing.
 * The common seed is a place, a minute, and a source. It stops when one is missing.
 */

import { mapRows } from '../index/map.ts'

export function spinBuckets(): { seed: number; words: string } {
  const rows = mapRows()
  const placed = rows.filter(row => row.space !== 'no place held' && row.grade !== 'light-time')
  const unplaced = rows.filter(row => row.space === 'no place held')
  const stars = rows.filter(row => row.grade === 'light-time')
  const paired = placed.filter(row => row.paired).map(row => row.name)
  const conflict = placed.filter(row => row.grade === 'conflict').map(row => row.name)
  const one = placed.filter(row => row.grade === 'one').map(row => row.name)
  const words = [
    'Three buckets. Space, time, and audit. What we know and what we do not know both go in them.',
    `Space. Held: the places on ${placed.length} minutes, and ${stars.length} star distances. Not held: ${unplaced.length} minutes have no place.`,
    `Time. Held: ${rows.length - stars.length} minutes and ${stars.length} light-times. Not held: the next minute, and the inside of a gap.`,
    'Audit. Held: a page named each minute. Not held: a second instrument, one landing second, and any record from a planet we did not watch.',
    'DCLM is in front of the other two seats. It holds nothing, so it adds no fourth bucket. Iris keeps the grade that is already on the row. The other side still chooses, and a theory is not a shown record.',
    `The common seed is a place, a minute, and a source. ${placed.length} rows have it. It develops this far: ${paired.join(' and ')} are printed alike on two pages, and those pages are not two instruments. ${conflict.join(' and ') || 'No row'} has the seed and the sources disagree. ${one.join(' and ') || 'No row'} has the seed and one page. Past that the seed stops.`,
    'The father did not write this. This was not a sealed sitting.',
  ]
  return { seed: placed.length, words: words.join(' ') }
}
