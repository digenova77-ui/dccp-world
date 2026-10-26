/** The same three buckets on every subject this world studies.
 * A seed is a place, a minute, and a source. DCLM adds none.
 */

export interface Study {
  name: string
  space: string
  time: string
  audit: string
  seed: boolean
}

export const STUDIES: readonly Study[] = [
  { name: 'Apollo minutes', space: '4 places held', time: '25 minutes held', audit: 'pages. Two agree. One conflicts.', seed: true },
  { name: 'Live instruments', space: 'a gauge or a coordinate, when a feed answers', time: 'the reading\'s clock, when it answers', audit: 'USGS, NORAD, MET Norway, NOAA, NESO, or the Belleville gauge. None of those readings is in the index.', seed: false },
  { name: 'Countries and cities', space: 'borders and city points from Natural Earth', time: 'no decision minute', audit: 'a map file. A population figure is not a measurement.', seed: false },
  { name: 'Nearby stars', space: '4 distances', time: '4 light-times, not an Earth minute', audit: 'a catalog line. No pair with a minute here.', seed: false },
  { name: 'Planetary theories', space: 'the Earth, named', time: 'no minute', audit: 'no shown record', seed: false },
  { name: 'Rooms and suites', space: 'a named seat, not a coordinate', time: 'no event minute in the index', audit: 'a specification. Health states zero patient information. The others are drafts or modules.', seed: false },
  { name: 'Chambers', space: 'no place of a decision', time: 'some sentences are dated', audit: 'a person\'s words, or a draft. Not a second source.', seed: false },
]

export function studyAttack(): { seeded: number; words: string } {
  const seeded = STUDIES.filter(study => study.seed)
  const open = STUDIES.filter(study => !study.seed)
  const lines = STUDIES.map(study => `${study.name}. Space: ${study.space}. Time: ${study.time}. Audit: ${study.audit}. ${study.seed ? 'The seed is here, and it still stops where the pages are not two instruments.' : 'The seed stops.'}`)
  return {
    seeded: seeded.length,
    words: `Same attack. Three buckets on everything we study. DCLM is in front and adds nothing. ${lines.join(' ')} ${seeded.length} subject has the seed. ${open.length} stop before a result, because a result needs an audit. The father did not write this.`,
  }
}
