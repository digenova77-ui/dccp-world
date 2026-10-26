/** One stone at the top, and the cards under it.
 * The stone figure is a published estimate. It is not a count we made.
 * 205 courses come from the 2016 combination of the older surveys, which still falls short of the original top.
 */

export const CAPSTONE = 1
export const STONE_ESTIMATE = 2_300_000
export const COURSES_SURVEYED = 205
export const COURSES_SHORT = 9
export const CHAMBER_CARDS = 138

export const JOBS = ['Cut', 'Haul', 'Raise', 'Set', 'Case', 'Orient'] as const
export const METHODS = [
  'External ramp. Possible. Not selected.',
  'Spiral or zigzag ramp. Consistent. Not selected.',
  'Internal ramp. A void does not name it.',
  'Levers for the last short lift. They do not haul the stone.',
] as const

export function pyramidCards(): number {
  return CAPSTONE + JOBS.length + METHODS.length + COURSES_SURVEYED
}

export function correlation(): { cards: number; stonesPerCapstone: number; cardsPerSeed: number; words: string } {
  const cards = pyramidCards()
  const words = [
    `One card is seeded at the top, the pyramidion. It is not on the pyramid now.`,
    `A published estimate says roughly ${STONE_ESTIMATE.toLocaleString('en-US')} blocks. That is not a count this record made. The ratio to the one at the top is ${STONE_ESTIMATE.toLocaleString('en-US')} to 1.`,
    `The 2016 combination of the course surveys numbers ${COURSES_SURVEYED} courses and still falls short by about ${COURSES_SHORT} courses and the pyramidion.`,
    `This page opens ${cards} cards: 1 apex, ${JOBS.length} jobs, ${METHODS.length} methods, and ${COURSES_SURVEYED} courses. ${cards} to 1 is not ${STONE_ESTIMATE.toLocaleString('en-US')} to 1. The correlation misses.`,
    `The chamber stack elsewhere sums to ${CHAMBER_CARDS}. That is not the stone estimate either.`,
    `A block without a source is not given a history. Those cards are not drawn.`,
  ].join(' ')
  return { cards, stonesPerCapstone: STONE_ESTIMATE / CAPSTONE, cardsPerSeed: cards / CAPSTONE, words }
}

export function courseCard(n: number): string {
  const course = Math.min(COURSES_SURVEYED, Math.max(1, Math.floor(n)))
  return `Course ${course} of ${COURSES_SURVEYED} surveyed. This card does not hold the thickness. No block in the course is named. The blueprint is unfilled.`
}
