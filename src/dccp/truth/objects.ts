/** Every gap is a blueprint. The object is the condition that would close it.
 * Nothing in this list is filled. DCLM holds the condition, not the value.
 */

import { mapRows } from '../index/map.ts'
import { STUDIES } from '../trinity/studies.ts'
import { closeFor } from './bestpath.ts'

export interface BlueprintObject {
  id: string
  name: string
  missing: 'place' | 'second source' | 'agreement' | 'reading' | 'seed'
  blueprint: string
  filled: false
}

const INSTRUMENTS = ['Station', 'Kp', 'Grid', 'Air', 'River'] as const

export function gapObjects(): BlueprintObject[] {
  const minutes: BlueprintObject[] = mapRows().filter(row => !row.paired).map(row => {
    if (row.grade === 'conflict') {
      return { id: `minute:${row.time}`, name: row.name, missing: 'agreement' as const, blueprint: 'Both seconds stay until the sources name one and the same second. The minute is not averaged.', filled: false as const }
    }
    if (row.grade === 'light-time') {
      return { id: `star:${row.name}`, name: row.name, missing: 'second source' as const, blueprint: 'An Earth minute this catalog line does not name. The light-time is not that minute.', filled: false as const }
    }
    if (row.space === 'no place held') {
      return { id: `minute:${row.time}`, name: row.name, missing: 'place' as const, blueprint: 'A place named with this minute. The time alone is not a seed.', filled: false as const }
    }
    return { id: `minute:${row.time}`, name: row.name, missing: 'second source' as const, blueprint: 'A second source that names this same minute. One page is not a pair.', filled: false as const }
  })
  const studies: BlueprintObject[] = STUDIES.filter(study => !study.seed).map(study => ({
    id: `study:${study.name}`,
    name: study.name,
    missing: 'seed' as const,
    blueprint: `Place, minute, and source together. Held now: ${study.space}. ${study.time}. ${study.audit}`,
    filled: false as const,
  }))
  const readings: BlueprintObject[] = INSTRUMENTS.map(label => ({
    id: `reading:${label}`,
    name: label,
    missing: 'reading' as const,
    blueprint: closeFor(label),
    filled: false as const,
  }))
  return [...minutes, ...studies, ...readings]
}

export function gapMapWords(objects: readonly BlueprintObject[] = gapObjects()): string {
  const kinds = ['place', 'second source', 'agreement', 'reading', 'seed'] as const
  const counts = kinds.map(kind => {
    const n = objects.filter(row => row.missing === kind).length
    const article = kind === 'agreement' ? 'an' : 'a'
    return `${n} missing ${article} ${kind}`
  }).join(', ')
  return `The gaps are mapped. ${objects.length} blueprint objects. ${counts}. Every one is filled: false. An unknown is the condition that would close it, not the missing number. DCLM holds the condition.`
}
