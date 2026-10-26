/** A past mission from the times that were published.
 * A minute we do not hold is a path between two times, not the recording, and not for sale.
 */

export interface Sample {
  at: string
  name: string
}

export const APOLLO: readonly Sample[] = [
  { at: '1969-07-16T13:32:00Z', name: 'Liftoff' },
  { at: '1969-07-16T16:22:13Z', name: 'Translunar injection' },
  { at: '1969-07-20T20:17:39Z', name: 'The Eagle has landed' },
  { at: '1969-07-21T02:56:15Z', name: 'A step on the surface' },
  { at: '1969-07-24T16:50:35Z', name: 'Splashdown' },
]

export function watchAt(ms: number, samples: readonly Sample[] = APOLLO): string {
  const times = samples.map(sample => ({ ...sample, ms: Date.parse(sample.at) }))
  if (ms < times[0].ms || ms > times[times.length - 1].ms) return 'That time is outside this mission record.'
  const exact = times.find(sample => Math.abs(sample.ms - ms) < 60_000)
  if (exact) return `${exact.name}, ${exact.at}. That minute is a held time. It is not a film.`
  let prev = times[0]
  for (const sample of times) {
    if (sample.ms > ms) return `Between ${prev.name} and ${sample.name}. The path is a straight stand-in, so the direction is visible. It is not the recording. The missing minute was not bought.`
    prev = sample
  }
  return 'That time is outside this mission record.'
}

export function replaySpeech(text: string): string | null {
  if (!/\bapollo\b|\bmoon mission\b|\beagle has landed\b|\bsplashdown\b/.test(text.toLowerCase())) return null
  const landing = APOLLO[2]
  return `Apollo 11, from published times. Liftoff 16 July 1969, 13:32 UTC. ${landing.name}, ${landing.at}. A step on the surface 21 July 1969, 02:56:15 UTC. Splashdown 24 July 1969, 16:50:35 UTC. Between those times the path is simulated. The gaps were not bought as a recording. You can watch the times. You are not in 1969.`
}
