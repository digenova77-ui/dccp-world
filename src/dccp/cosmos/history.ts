/** The picture of history this world holds.
 * A minute with a source is real. The stretch between two real minutes is simulated.
 * Matrix mode spins a capture down to the places those minutes stand on.
 * A minute with no place is not a seed. A new real minute does not overwrite one already held.
 */

import { APOLLO } from './replay.ts'
import { looksLikePrivateKey, sha256Hex } from '../pipe/chain.ts'
import { HYPOTHESIS } from './hypothesis.ts'
import { deductionWords } from './deduce.ts'
import { betweenWords, NAMED } from './between.ts'
import { closeEnds, deepen, meshSpeech, truthMesh } from './truthmesh.ts'
import { theoremWords } from './theorem.ts'
import { unknownGaps, unknownWords } from './unknown.ts'
import { canPredictWords, frontierWords, predictWords, shrinkWords } from './shrink.ts'
import { arguablyEverything, interstellarWords } from './scale.ts'
import { decisionGap, omnipresentBelief, planetaryTheories, temporalWords, worldDoesNotFill } from './temporal.ts'

export interface HeldMinute {
  at: string
  name: string
  source: string
}

export interface SeedSpot {
  name: string
  at: string
  place: string
  body: 'earth' | 'moon'
  lat: number
  lon: number
  source: string
}

export const PICTURE: readonly HeldMinute[] = APOLLO.map(sample => ({
  at: sample.at,
  name: sample.name,
  source: 'published Apollo 11 times',
}))

/** The capture spun down. Only a held minute with a place becomes a seed. */
export const SPOTS: readonly SeedSpot[] = [
  { name: 'Liftoff', at: '1969-07-16T13:32:00Z', place: 'Launch pad 39A', body: 'earth', lat: 28.608, lon: -80.604, source: 'published Apollo 11 times' },
  { name: 'The Eagle has landed', at: '1969-07-20T20:17:39Z', place: 'Tranquility Base', body: 'moon', lat: 0.674, lon: 23.473, source: 'published Apollo 11 times' },
  { name: 'A step on the surface', at: '1969-07-21T02:56:15Z', place: 'Tranquility Base', body: 'moon', lat: 0.674, lon: 23.473, source: 'published Apollo 11 times' },
  { name: 'Splashdown', at: '1969-07-24T16:50:35Z', place: 'Pacific recovery', body: 'earth', lat: 13.317, lon: -169.15, source: 'published Apollo 11 times' },
]

export function pictureLines(held: readonly HeldMinute[] = PICTURE): string[] {
  const real = [...held].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  return [
    `${real.length} real ${real.length === 1 ? 'minute' : 'minutes'}. Between them the path is simulated.`,
    ...real.map(minute => `${minute.name}. ${minute.at}. ${minute.source}.`),
    'A supplied real minute replaces the stand-in for that minute only. It does not overwrite a minute already held.',
    'The rest of history is not loaded.',
  ]
}

export function supplyReal(held: readonly HeldMinute[], row: { at: string; name: string; source: string }): { held: HeldMinute[]; words: string } {
  const name = row.name.trim()
  const source = row.source.trim()
  if (!name || !source) return { held: [...held], words: 'A real minute needs a name and a source. Nothing was added. Chat is not a source.' }
  const ms = Date.parse(row.at)
  if (!Number.isFinite(ms)) return { held: [...held], words: 'That time did not parse. Nothing was added.' }
  const clash = held.find(minute => Math.abs(Date.parse(minute.at) - ms) < 60_000)
  if (clash && clash.name !== name) return { held: [...held], words: `${clash.name} is already held at that minute. The new claim was not written over it.` }
  if (clash) return { held: [...held], words: 'That minute is already real.' }
  const next = [...held, { at: new Date(ms).toISOString().replace('.000Z', 'Z'), name, source }].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  return { held: next, words: `${name} is now a held minute. The simulated path on either side is shorter. The source stays on the minute.` }
}

export function matrixSpot(text: string): SeedSpot | null {
  const lower = text.toLowerCase()
  if (/\b39a\b|\blaunch pad\b|\bliftoff\b/.test(lower)) return SPOTS[0]
  if (/\bstep\b/.test(lower) && /\b(surface|moon|apollo|tranquility|history)\b/.test(lower)) return SPOTS[2]
  if (/\btranquility\b|\beagle\b/.test(lower)) return SPOTS[1]
  if (/\bsplashdown\b|\bpacific recovery\b/.test(lower)) return SPOTS[3]
  const found = extra.find(item => item.lat != null && item.lon != null && lower.includes(item.place.toLowerCase()))
  if (!found || found.lat == null || found.lon == null) return null
  return { name: found.name, at: found.at, place: found.place, body: 'earth', lat: found.lat, lon: found.lon, source: found.source }
}

export function spotLines(spot: SeedSpot): string[] {
  const where = spot.body === 'earth'
    ? `On this Earth, ${spot.lat.toFixed(3)}, ${spot.lon.toFixed(3)}.`
    : 'On the Moon. This Earth is not that place, so the camera stays.'
  return [
    `${spot.name}. ${spot.at}.`,
    `${spot.place}. ${where}`,
    'This seed is a held minute. The minutes around it are not seeds. They stay simulated.',
  ]
}

export function matrixWords(): string {
  return 'Matrix mode draws one seed. Any place, any time, any named perspective. It is real only with a source. A second distinct source verifies that minute. A disagreement does not. A repeated source does not count. A transit with no place is not a seed.'
}

const EXTRA_KEY = 'dccpworld.history.perspectives.v1'

export interface Perspective {
  name: string
  at: string
  place: string
  lat: number | null
  lon: number | null
  perspective: string
  source: string
  audit: string
}

function loadExtra(): Perspective[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = JSON.parse(localStorage.getItem(EXTRA_KEY) ?? '[]') as Perspective[]
    return Array.isArray(raw) ? raw.filter(row => row && row.source && row.audit) : []
  } catch {
    return []
  }
}

let extra = loadExtra()

function saveExtra(): void {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(EXTRA_KEY, JSON.stringify(extra)) } catch { /* the device could not hold it */ }
}

function sameSource(a: string, b: string): boolean {
  return a.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() === b.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function verifyMinute(place: string, at: string, held: readonly Perspective[] = perspectives()): { sources: number; words: string } {
  const ms = Date.parse(at)
  const rows = held.filter(item => sameSource(item.place, place) && Number.isFinite(ms) && Math.abs(Date.parse(item.at) - ms) < 60_000)
  const sources = [...new Set(rows.map(item => item.source.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()).filter(Boolean))]
  const names = [...new Set(rows.map(item => item.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()).filter(Boolean))]
  const times = [...new Set(rows.map(item => item.at))]
  if (sources.length < 2) return { sources: sources.length, words: sources.length ? 'One source. The minute is held. It is not verified.' : 'No source is on that minute.' }
  if (names.length > 1 || times.length > 1) return { sources: sources.length, words: `${sources.length} sources do not say the same thing. Both stay. Not verified.` }
  return { sources: sources.length, words: `${sources.length} sources agree. That minute is verified. The perspectives stay.` }
}

export function perspectives(): readonly Perspective[] {
  const published = SPOTS.map(spot => ({
    name: spot.name,
    at: spot.at,
    place: spot.place,
    lat: spot.lat,
    lon: spot.lon,
    perspective: 'the published record',
    source: spot.source,
    audit: 'published',
  }))
  const nssdc: Perspective[] = [
    { name: 'Liftoff', at: '1969-07-16T13:32:00Z', place: 'Launch pad 39A', lat: 28.608, lon: -80.604, perspective: 'the NASA record', source: 'NASA NSSDC Apollo 11', audit: 'nssdc' },
    { name: 'The Eagle has landed', at: '1969-07-20T20:17:40Z', place: 'Tranquility Base', lat: 0.67, lon: 23.47, perspective: 'the NASA record', source: 'NASA NSSDC Apollo 11', audit: 'nssdc' },
    { name: 'Splashdown', at: '1969-07-24T16:50:35Z', place: 'Pacific recovery', lat: 13.3, lon: -169.15, perspective: 'the NASA record', source: 'NASA NSSDC Apollo 11', audit: 'nssdc' },
  ]
  return [...published, ...nssdc, ...extra]
}

export function boundaryWords(): string {
  return 'The space boundary of this capture is the four places we hold. Lost time sits inside an interval, not on that boundary, except where the place does not change. Landing and the step are the same place, so the lost interval between them is time at one point. The one-second disagreement, 20:17:39 and 20:17:40, sits on the landing, an end of that interval. The hatch second sits inside it and is not held. That is a correlation in the record. It does not entail that a missed second moved space. A record hole is not a world hole.'
}

export type MinuteGrade = 'two' | 'one' | 'conflict'

/** Two pages that print the same second, one page, or a disagreement. Two pages are not two instruments. */
export function gradeMinute(place: string | undefined, at: string): MinuteGrade {
  if (!place) return 'one'
  const words = verifyMinute(place, at).words
  if (words.includes('sources agree')) return 'two'
  if (words.includes('do not say the same thing')) return 'conflict'
  return 'one'
}

export function gradeWords(grades: readonly MinuteGrade[]): string {
  const two = grades.filter(grade => grade === 'two').length
  const clash = grades.filter(grade => grade === 'conflict').length
  const one = grades.filter(grade => grade === 'one').length
  return `${two} minutes are printed alike on two pages. That is not two instruments. ${clash} minute conflicts, and both seconds stay. ${one} are one page. They are drawn differently so they cannot be mistaken for each other.`
}

export function secondSourceWords(): string {
  const lift = verifyMinute('Launch pad 39A', '1969-07-16T13:32:00Z')
  const land = verifyMinute('Tranquility Base', '1969-07-20T20:17:39Z')
  const splash = verifyMinute('Pacific recovery', '1969-07-24T16:50:35Z')
  return `Liftoff. ${lift.words} Landing. ${land.words} Splashdown. ${splash.words} NASA NSSDC is the second source. The landing differs by one second, 20:17:39 and 20:17:40. Both stay.`
}

export async function takePerspective(row: { name: string; at: string; place: string; perspective: string; source: string; lat?: number | null; lon?: number | null }): Promise<{ held: Perspective | null; words: string }> {
  const name = row.name.trim()
  const place = row.place.trim()
  const perspective = row.perspective.trim()
  const source = row.source.trim()
  const joined = `${name} ${place} ${perspective} ${source}`
  if (!name || !place || !perspective || !source) return { held: null, words: 'A perspective needs a name, a place, a time, and a source. Nothing was added. Chat is not a source.' }
  if (looksLikePrivateKey(joined)) return { held: null, words: 'A private key is refused. It is not a perspective.' }
  if (/\b(child|children|juvenile|roster)\b/i.test(joined)) return { held: null, words: 'A child\'s mark stays off this picture. It was not added.' }
  const ms = Date.parse(row.at)
  if (!Number.isFinite(ms)) return { held: null, words: 'That time did not parse. Nothing was added.' }
  const at = new Date(ms).toISOString().replace('.000Z', 'Z')
  const same = perspectives().find(item => item.place === place && item.perspective === perspective && item.at === at && sameSource(item.source, source))
  if (same) return { held: same, words: 'That source is already on that perspective. The audit stays.' }
  const lat = typeof row.lat === 'number' && Math.abs(row.lat) <= 90 ? row.lat : null
  const lon = typeof row.lon === 'number' && Math.abs(row.lon) <= 180 ? row.lon : null
  const audit = await sha256Hex([name, at, place, perspective, source].join('\n'))
  const held = { name, at, place, lat, lon, perspective, source, audit }
  extra = [...extra, held]
  saveExtra()
  const check = verifyMinute(place, at)
  return { held, words: `${perspective} at ${place}, ${at}, is held beside whatever else is there. Audit ${audit.slice(0, 12)}. ${check.words}` }
}

export function compareMethods(): string {
  return 'One source holds a minute and does not verify it. Two distinct sources that name it the same way verify it. If they disagree, both stay and it is not verified. A repeated source does not count. This world does not weigh a source by who held it, by whether it was written at the time, or by an object in the ground. A published record is one source, not a higher one.'
}

export function truthMeshScene(): { speech: string; steps: number; joints: { end: boolean; grade: MinuteGrade }[]; ties: { from: number; to: number }[]; shell: { from: number; to: number }[]; unknown: { from: number; to: number }[] } {
  const held = new Map<string, { name: string; at: string }>()
  for (const minute of PICTURE) held.set(minute.at, { name: minute.name, at: minute.at })
  for (const named of NAMED) if (!held.has(named.at)) held.set(named.at, { name: named.name, at: named.at })
  const deep = deepen(PICTURE, NAMED)
  const shell = closeEnds(deep.joints)
  const nodes = truthMesh([...held.values()])
  const joints = deep.joints.map(joint => {
    const spot = SPOTS.find(item => item.at === joint.at)
    return { end: joint.end, grade: gradeMinute(spot?.place, joint.at) }
  })
  return {
    speech: `${meshSpeech(nodes, deep.ties.length, shell.length)} ${gradeWords(joints.map(joint => joint.grade))}`,
    steps: deep.joints.length,
    joints,
    ties: deep.ties,
    shell,
    unknown: unknownGaps(deep.joints),
  }
}

export function historySpeech(text: string): string | null {
  const lower = text.toLowerCase()
  if (/\bargue?ably everything\b|\beverything correlates\b|\bcorrelates with everything\b/.test(lower)) return arguablyEverything()
  if (/\binterstellar\b|\bstar to star\b/.test(lower)) return interstellarWords()
  if (/\bplanetary consciousness\b|\bgaia\b|\bnoosphere\b/.test(lower)) return planetaryTheories()
  if (/\bomnipresent\b|\bconscious nature\b/.test(lower)) return omnipresentBelief()
  if (/\batoms\b|\bconscious\b|\bplanets themselves\b/.test(lower)) return worldDoesNotFill()
  if (/\btemporal\b|\btime logic\b|\blogic constraints?\b/.test(lower)) return temporalWords()
  if (/\bwhat can (?:you|i) predict\b|\bwhat do you predict\b/.test(lower)) return canPredictWords()
  if (/\bpredict\b|\bthe future\b/.test(lower)) return predictWords()
  if (/\bfrontier\b|\bspeed of light\b/.test(lower)) return frontierWords()
  if (/\bshrink/.test(lower)) {
    const mesh = truthMeshScene()
    return shrinkWords(mesh.steps, mesh.unknown.length)
  }
  if (/\btheorem\b|\bmapped at the time\b/.test(lower)) return theoremWords()
  if (/\bunknown\b/.test(lower) && /\b(boundary|mirror|observable|gap)\b/.test(lower)) return unknownWords(truthMeshScene().unknown.length)
  if (/\bspace-?time\b|\bspacetimes?\b|\blost times?\b|\bmismap/.test(lower)) return boundaryWords()
  if (/\btruth mesh\b|\bfloor to ceiling\b|\btruth derivatives\b|\b4d\b|\bin 3d\b|\bin three d\b/.test(lower)) return truthMeshScene().speech
  if (/\bwhat happened between\b|\bbetween the (?:time )?intervals?\b|\binside the gaps?\b/.test(lower)) return betweenWords()
  if (/\bdeduce\b|\bdeduction\b|\bmissing facts\b|\btimeline\b/.test(lower)) return deductionWords(PICTURE, SPOTS)
  if (/\bhypothesis\b|\bpure logic\b|\bfill the holes\b|\bfill in the holes\b/.test(lower)) return HYPOTHESIS + ' It is tabled beside the holes. It is not verified. The hash locks the wording and does not prove the path.'
  if (/\bcompare\b/.test(lower) && /\b(method|methods|verif|source|history)\b/.test(lower)) return compareMethods()
  if (/\bverif|\bmulti-source\b|\bsecond source\b/.test(lower)) return secondSourceWords()
  if (/\bmatrix\b|\bseed spot\b|\bseed spots\b|\bany perspective\b|\bfrom anywhere\b/.test(lower)) return matrixWords()
  if (!/\bhistory\b|\bpicture of the past\b|\breal versus simulated\b|\breal vs simulated\b/.test(lower)) return null
  return `${pictureLines()[0]} ${matrixWords()} The rest of history is not loaded. No August archive was loaded over this.`
}
