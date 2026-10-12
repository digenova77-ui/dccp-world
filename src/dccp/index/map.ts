/** The index is a map of space and time.
 * A row is a held minute or a held light-time. Unpaired stays unpaired.
 */

import { NAMED } from '../cosmos/between.ts'
import { gradeMinute, PICTURE, SPOTS, type MinuteGrade } from '../cosmos/history.ts'
import { BODIES } from '../cosmos/scale.ts'
import { sha256Hex } from '../pipe/chain.ts'

export interface MapRow {
  space: string
  time: string
  name: string
  grade: MinuteGrade | 'light-time'
  paired: boolean
}

export function mapRows(): MapRow[] {
  const held = new Map<string, { name: string; at: string }>()
  for (const minute of PICTURE) held.set(minute.at, minute)
  for (const named of NAMED) if (!held.has(named.at)) held.set(named.at, named)
  const minutes: MapRow[] = [...held.values()]
    .filter(row => Number.isFinite(Date.parse(row.at)))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    .map(row => {
      const spot = SPOTS.find(item => item.at === row.at)
      const grade = gradeMinute(spot?.place, row.at)
      return {
        space: spot ? `${spot.place}, ${spot.body}` : 'no place held',
        time: row.at,
        name: row.name,
        grade,
        paired: grade === 'two',
      }
    })
  const stars: MapRow[] = BODIES.filter(body => body.kind === 'star').map(body => ({
    space: body.distance,
    time: body.light,
    name: body.name,
    grade: 'light-time' as const,
    paired: false,
  }))
  return [...minutes, ...stars]
}

export function mapText(rows: readonly MapRow[] = mapRows()): string {
  return rows.map(row => `${row.time} | ${row.space} | ${row.name} | ${row.grade} | ${row.paired ? 'paired' : 'unpaired'}`).join('\n')
}

export async function mapHash(rows: readonly MapRow[] = mapRows()): Promise<string> {
  return sha256Hex(mapText(rows))
}

export const MAP_HASH = '630e4da1db1f6f96f2c075b876a8c04ebcdebbe81788f284e3e8cc1a7d12e712'

export function mapWords(rows: readonly MapRow[] = mapRows()): string {
  const paired = rows.filter(row => row.paired).length
  const unpaired = rows.length - paired
  return `The index is a map of space and time. ${rows.length} rows. ${paired} paired. ${unpaired} unpaired. An unpaired minute stays on the map as unpaired. The hash of this index is ${MAP_HASH}.`
}
