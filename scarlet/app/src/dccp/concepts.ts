/** Named pictures the HUD may draw. A miss is not a picture. */

export type Picture = 'cosmos' | 'record' | 'swarm' | 'ice' | 'sima'

export type Concept = {
  key: string
  picture: Picture
  name: string
  seat: string
  look: string
  held: string
  phrases: string[]
}

export const CONCEPTS: Concept[] = [
  {
    key: 'cosmos',
    picture: 'cosmos',
    name: 'Cosmos',
    seat: 'Telemetry overlay',
    look: 'The night Earth is the ground. The meridians are the shape of a reading, not a live feed.',
    held: 'A live reading from the box is compute. It is not wired on this page, so the value stays UNKNOWN.',
    phrases: ['cosmos', 'telemetry', 'universe', 'earth', 'night', 'overlay'],
  },
  {
    key: 'record',
    picture: 'record',
    name: 'Record',
    seat: 'The computer',
    look: 'One idea, two chamber names, three rings from one center. Philosophy asks if it is defined. Physics asks if it was measured. Law asks if it is allowed.',
    held: 'A live decision is proof. The public law path is not this page. No receipt is invented here.',
    phrases: ['record', 'computer', 'chamber', 'law', 'receipt', 'operation', 'planck'],
  },
  {
    key: 'swarm',
    picture: 'swarm',
    name: 'Swarm',
    seat: 'Bot seats',
    look: 'Seats around one idea. The picture is the swarm. It is not a swarm that has been sent.',
    held: 'Sending a seat to work is compute. No joule is measured, so the price stays UNKNOWN.',
    phrases: ['swarm', 'bot', 'bots', 'agent', 'iris'],
  },
  {
    key: 'ice',
    picture: 'ice',
    name: 'Hockey',
    seat: 'RTE-Ice',
    look: 'The rink is the concept: ice, lines, and a seat. No athlete is named. The registry withholds that file.',
    held: 'A live stat is proof about a person. It is not drawn. Look stays free.',
    phrases: ['hockey', 'ice', 'rink', 'rte ice', 'athletic'],
  },
  {
    key: 'sima',
    picture: 'sima',
    name: 'SiMA',
    seat: 'RTE-Health',
    look: 'Click-burden is the published formula: clicks × 1, tabs × 2.5, modals × 4, app swaps × 3. Zero PHI.',
    held: 'Running it on a chart is compute, and a chart is not ingested. The count stays UNKNOWN.',
    phrases: ['sima', 'clinical', 'health', 'ehr', 'click', 'burden', 'phi'],
  },
]

export function resolveConcept(ask: string): Concept | null {
  const q = ask.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  if (!q) return null
  let best: { score: number; concept: Concept } | null = null
  for (const concept of CONCEPTS) {
    let score = 0
    for (const phrase of concept.phrases) {
      if (q === phrase) score += 4
      else if (q.includes(phrase)) score += phrase.length
    }
    if (score > 0 && (!best || score > best.score)) best = { score, concept }
  }
  return best?.concept ?? null
}
