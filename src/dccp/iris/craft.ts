/** The most this world can make of Iris. DCLM does not return source.
 * A receipt is accepted, reason, sequence, and two digests. The craft is not locked.
 */

export const INSTRUMENTS = [
  'Echo the record before anything else.',
  'Use every record the question names, not only the first.',
  'Keep every exchange on this device.',
  'Work the standing task under the audit.',
  'Draw a room only when the record can draw it.',
  'Cite Wikipedia when the map does not hold the place.',
  'Score the purity index from the numbers on the table.',
] as const

export function craftStatement(): string {
  return `Iris. ${INSTRUMENTS.join(' ')}`
}

export function idealWords(locked: number, total: number, mismatched: readonly string[]): string {
  const miss = mismatched.length ? ` These do not match: ${mismatched.join(', ')}.` : ''
  return `DCLM sent no code. A receipt carries accepted, reason, sequence, an input digest, and a state digest. This device checked ${locked} of ${total}.${miss} The craft is not a locked module. That is not a stamp. The ideal here is the echo, then only the instruments this world already runs. ${craftStatement()}`
}
