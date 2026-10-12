/** The cosmic scale this world holds. A record, not a live reading.
 * The rest of the catalog is not loaded, and it is not invented.
 */

export interface Body {
  name: string
  kind: 'planet' | 'star'
  distance: string
  light: string
  composition: string
}

export const SOLAR_AGE = '4.6 billion years'

export const BODIES: readonly Body[] = [
  { name: 'Mercury', kind: 'planet', distance: '0.39 AU from the Sun', light: '3.2 minutes', composition: 'rock' },
  { name: 'Venus', kind: 'planet', distance: '0.72 AU from the Sun', light: '6 minutes', composition: 'rock' },
  { name: 'Earth', kind: 'planet', distance: '1 AU from the Sun', light: '8.3 minutes', composition: 'rock' },
  { name: 'Mars', kind: 'planet', distance: '1.52 AU from the Sun', light: '12.7 minutes', composition: 'rock' },
  { name: 'Jupiter', kind: 'planet', distance: '5.2 AU from the Sun', light: '43 minutes', composition: 'gas' },
  { name: 'Saturn', kind: 'planet', distance: '9.6 AU from the Sun', light: '80 minutes', composition: 'gas' },
  { name: 'Uranus', kind: 'planet', distance: '19.2 AU from the Sun', light: '2.7 hours', composition: 'ice' },
  { name: 'Neptune', kind: 'planet', distance: '30.1 AU from the Sun', light: '4.2 hours', composition: 'ice' },
  { name: 'Proxima Centauri', kind: 'star', distance: '4.24 light years', light: '4.24 years', composition: 'star' },
  { name: 'Alpha Centauri', kind: 'star', distance: '4.37 light years', light: '4.37 years', composition: 'star' },
  { name: "Barnard's Star", kind: 'star', distance: '5.96 light years', light: '5.96 years', composition: 'star' },
  { name: 'Sirius', kind: 'star', distance: '8.6 light years', light: '8.6 years', composition: 'star' },
]

const ORDERED = [...BODIES].sort((a, b) => b.name.length - a.name.length)

export function arguablyEverything(): string {
  return 'Arguably, everything. That word is the whole of the claim. Everything is not a source, and it is not a correlation. A correlation needs two sourced minutes that name each other. We hold four star light-times and no such pair. If everything were allowed to count, every empty gap would look filled, and the grades would be a lie. The argument can be written down. It does not seat a minute.'
}

export function interstellarWords(): string {
  const stars = BODIES.filter(body => body.kind === 'star')
  const list = stars.map(star => `${star.name}, ${star.light}`).join('. ')
  return `What we hold between stars is distance and light-time. ${list}. No correlation among them is loaded, and none of them is tied to a minute on Earth. Light from Proxima that arrived today left 4.24 years ago. That is an earlier minute, and only if an instrument wrote it down. It does not reach into an empty gap, and it does not change the grades. A correlation would change the record only if two sources named the same minute. We do not have that pair.`
}

export function scaleLine(): string {
  const planets = BODIES.filter(body => body.kind === 'planet').length
  const stars = BODIES.length - planets
  return `${planets} planets, then ${stars} nearby stars. Distance, light-time, and composition. The solar system age we hold is ${SOLAR_AGE}. A record, not a live reading. The rest of the catalog is not loaded.`
}

export function cosmosSpeech(text: string): string | null {
  const lower = text.toLowerCase()
  const hit = ORDERED.find(body => lower.includes(body.name.toLowerCase()))
  if (hit?.name === 'Earth' && !/\b(far|distance|light|au|age|composition)\b/.test(lower)) return null
  if (!hit) {
    if (/\bplanets\b|\bstar systems\b|\bnearby stars\b|\bthe universe\b/.test(lower)) return scaleLine()
    return null
  }
  const age = hit.kind === 'planet' ? ` The solar system age we hold is ${SOLAR_AGE}.` : ''
  return `${hit.name}. ${hit.distance}. Light-time ${hit.light}. ${hit.composition}.${age} A record, not a live reading.`
}
