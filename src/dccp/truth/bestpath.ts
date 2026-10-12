/** Best path truth. A blueprint is the condition that would close a gap.
 * It is not the missing number. DCLM holds the condition and not the value.
 * Friction and affinity are the two purity meters on a landing. They add to 1.
 * The peg is affinity 1. Entropy is 0 at either peg and highest in between.
 */

export function closeFor(label: string): string {
  const key = label.toLowerCase()
  if (key.includes('station')) return 'A NORAD position with a time. The altitude is not guessed between polls.'
  if (key.includes('kp')) return 'A NOAA Kp row with its own time tag. That product is not a stream, and the minutes between rows are not drawn.'
  if (key.includes('grid') || key.includes('carbon')) return 'A Britain carbon intensity with its period. No number until that desk answers.'
  if (key.includes('air') || key.includes('weather')) return 'A MET Norway reading at this latitude and longitude, with its time.'
  if (key.includes('river')) return 'A hydrometric level at the named gauge, with its time.'
  if (key.includes('ice')) return 'A gamesheet for this cut. No roster is invented, and a child\'s mark is not opened by buying it.'
  return 'A source that names this place and this minute. A guess is not that source.'
}

export function binaryEntropy(p: number): number {
  if (p <= 0 || p >= 1) return 0
  return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p))
}

export function landingGauge(readings: readonly { label: string; value: string | null }[]): { friction: number; affinity: number; entropy: number; pulse: boolean; plus: string | null; words: string } {
  const total = readings.length
  const held = readings.filter(row => row.value !== null).length
  const friction = total ? (total - held) / total : 1
  const affinity = total ? held / total : 0
  const entropy = binaryEntropy(friction)
  const pulse = held > 0
  const next = readings.find(row => row.value === null)
  const plus = next ? next.label : null
  const peg = affinity === 1 ? 'The gauge is on the peg.' : 'The peg is affinity 1. It is not on the peg.'
  const path = plus ? `Best path, ${plus}: ${closeFor(plus)}` : 'Every instrument on this landing has a reading. There is no next blank.'
  const words = `Friction ${friction.toFixed(2)}. Affinity ${affinity.toFixed(2)}. They add to 1. ${peg} Entropy ${entropy.toFixed(2)}, from none at either peg to 1 when the landing is split in half. ${pulse ? 'A pulse is a reading that arrived.' : 'No pulse. Nothing arrived.'} +1 is ${plus ?? 'nowhere left to point'}. ${path} DCLM holds the condition, not the number. A galactic state is not on this card.`
  return { friction, affinity, entropy, pulse, plus, words }
}
