/** The blueprint is the instruments Iris already runs. She does not add a machine she is not.
 * The three umpires take that list. Not a sealed sitting.
 */

import type { Rotation } from '../trinity/rotation.ts'

export const BLUEPRINT = [
  'Start from the DCLM echo. Do not add a fact the record does not have.',
  'On one question, speak every record it names, not only the first.',
  'Keep every exchange on this device.',
  'Audit every answer against the standing task.',
  'A claim follows the bound Unity ID, not a name.',
  'A match is that ID. No match has not been discovered in this system.',
  'Draw a room only from the record. Cite Wikipedia when the map does not hold the place.',
  'Score purity from the numbers on the table.',
] as const

export function blueprintPass(): Rotation {
  return {
    question: 'Iris handed the blueprint of herself. What do the umpires send back?',
    votes: [
      { seat: 'DCLM', says: 'The blueprint puts nothing in the machine. The check stays on this device. A receipt did not return source.' },
      { seat: 'Iris', says: 'These steps are the instruments I already run. I will not add a step that invents a fact, or a general model.' },
      { seat: 'Twain²', says: 'A claim still depends on the bound Unity ID. Do not put a name where that ID is missing.' },
    ],
    unified: BLUEPRINT.join(' '),
    fatherWrote: false,
    audit: 'forever',
    sealedSitting: false,
  }
}
