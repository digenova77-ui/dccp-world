// One storyboard for every genre: Macro (what it is, plain words) → Logic (how it works) → Physics (the evidence, numbers live here).
import type { City, Country, Grade, ModuleIntegrity, Registry } from '../data/types'
import type { FeedStatus, FeedValues } from '../live/feeds'
import { placeWeather, weatherLine, type PlaceWeather } from '../live/place'
import type { Target } from '../iris/brain'
import { arcDeg } from '../world/geo'
import type { CardItem, CardModel, Tone } from './card'
import type { PipeView } from '../pipe/chain'
import { drawnConstruct } from '../rte/construct'
import { gapLine, gapProtocol } from '../iris/nodata'

export interface CardCtx {
  reg: Registry
  integrity: ModuleIntegrity[]
  feeds: { values: FeedValues; status: Map<keyof FeedValues, FeedStatus> }
  discovered: Set<string>
  describe: (t: Target) => string
  /** Called when asynchronous data (weather) for the shown card arrives. */
  onLate: () => void
  pipe?: PipeView
}

const GRADE_WORD: Record<Grade, string> = { 'AT BENCHMARK': 'At benchmark', NEAR: 'Near', GAPPED: 'Gapped', THIN: 'Thin', UNGRADED: 'Not graded' }
const GRADE_SCORE: Record<Grade, number> = { 'AT BENCHMARK': 4, NEAR: 3, GAPPED: 2, THIN: 1, UNGRADED: 0 }

const sentence = (s: string): string => { const t = s.trim(); return !t || /[.!?…"”)]$/.test(t) ? t : `${t}.` }
const firstSentence = (s: string): string => { const m = s.match(/^.*?[.!?](\s|$)/); return sentence(m ? m[0] : s) }
const ago = (ms: number | null): string => {
  if (!ms) return 'no reading yet'
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000))
  return s < 90 ? `${s} seconds ago` : s < 5400 ? `${Math.round(s / 60)} minutes ago` : `${Math.round(s / 3600)} hours ago`
}
export function bigNumber(n: number): string {
  if (!n) return 'not recorded'
  if (n >= 1e12) return `${(n / 1e12).toFixed(1).replace(/\.0$/, '')} trillion`
  if (n >= 1e9) return `${(n / 1e9).toFixed(1).replace(/\.0$/, '')} billion`
  if (n >= 1e6) return `${Math.round(n / 1e6)} million`
  if (n >= 1e3) return `${Math.round(n / 1e3)} thousand`
  return String(n)
}
const statusTone = (status: string): { label: string; tone: Tone } => {
  const s = status.toUpperCase()
  if (s.startsWith('APPROVED')) return { label: 'Approved', tone: 'verified' }
  if (s.startsWith('LANDED') || s.startsWith('LIVE')) return { label: 'Landed', tone: 'pilot' }
  if (s.startsWith('DRAFT')) return { label: 'Draft', tone: 'mock' }
  if (s.includes('PILOT')) return { label: 'Pilot', tone: 'pilot' }
  return { label: 'Design', tone: 'design' }
}

function quakesNear(v: FeedValues, test: (lat: number, lon: number) => boolean): { n: number; strongest?: number } {
  const items = v.quakes?.items ?? []
  let n = 0, strongest: number | undefined
  for (const q of items) if (test(q.lat, q.lon)) { n++; strongest = Math.max(strongest ?? -9, q.mag) }
  return { n, strongest }
}

function capitalOf(reg: Registry, a3: string): City | undefined {
  return reg.cities.cities.find(c => c.a3 === a3 && c.capital) ?? reg.cities.cities.filter(c => c.a3 === a3).sort((a, b) => b.pop - a.pop)[0]
}

/** One line of plain words for a feed's latest reading; 'no reading yet' when there is none. Mirrors the 3D instrument values. */
function feedReading(key: keyof FeedValues, v: FeedValues): string {
  if (key === 'quakes' && v.quakes) {
    const s = v.quakes.strongest
    return `${v.quakes.count} in 24 h${s ? ` · strongest M${s.mag.toFixed(1)}` : ''}`
  }
  if (key === 'iss' && v.iss) return `${Math.round(v.iss.altKm)} km up · ${Math.round(v.iss.speedKmh).toLocaleString('en-US')} km/h`
  if (key === 'weather' && v.weather) return `${Math.round(v.weather.tempC)}°C · wind ${Math.round(v.weather.windKmh)} km/h`
  if (key === 'kp' && v.kp) return `Kp ${v.kp.kp.toFixed(1)}${v.kp.kp >= 5 ? ' · storm' : v.kp.kp >= 4 ? ' · active' : ' · quiet'}`
  if (key === 'carbon' && v.carbon) return `${Math.round(v.carbon.intensity)} gCO₂/kWh · ${v.carbon.index || 'unrated'}`
  if (key === 'river' && v.river) {
    const parts = [v.river.levelM !== undefined ? `${v.river.levelM.toFixed(2)} m` : '', v.river.dischargeM3s !== undefined ? `${v.river.dischargeM3s.toFixed(1)} m³/s` : ''].filter(Boolean)
    return parts.join(' · ') || 'no reading in the latest record'
  }
  return 'no reading yet'
}

const STATE_WORD: Record<string, string> = { LIVE: 'Live', STALE: 'Stale', UNAVAILABLE: 'Unavailable', PENDING: 'Connecting' }

// ---------- 3D landing cards (kind 'landing') ----------
// Fixed copy. Figures are David's reported 2024-FY numbers, never invented; philosophy carries no measurements.

const LANDING_TIERS = [
  { key: 'live', name: 'LIVE', state: 'live' as const, what: 'The tier that is actually running: the night Earth, the six public feeds, the telemetrics board. The only tier with live instrumentation.' },
  { key: 'develop', name: 'DEVELOP', state: 'unknown' as const, what: 'Where the next build takes shape before it lands. No instrumentation is wired to it from this page.' },
  { key: 'publish', name: 'PUBLISH', state: 'unknown' as const, what: 'Where a landed build would ship. The release pipe exists as a design; nothing is deployed on any chain.' },
  { key: 'order', name: 'ORDER', state: 'unknown' as const, what: 'Where seats and access would be ordered. The only ordering here is the pilot Unity handle, created on-device.' },
  { key: 'forensics', name: 'FORENSICS', state: 'receipts' as const, what: 'Where evidence is checked: the DCLM integrity and receipt view. Client-side checks; the kernel is unreachable since Oct 3, 2026.' },
  { key: 'design', name: 'DESIGN', state: 'unknown' as const, what: 'The design law of the Unity Framework: what the world must be, before anything is built. Doctrine, not instrumentation.' },
]
const UNKNOWN_BOUNDARY = 'UNKNOWN is a legitimate state. This tier is named and placed; nothing is wired to it yet — nothing here is faked, and nothing is shown as live.'

const DCLM_PHASES: { name: string; role: string }[] = [
  { name: 'Apprentice', role: 'System 1 · the proposal' },
  { name: 'Boundary', role: 'Logit masking' },
  { name: 'Master', role: 'SMT verification · System 2' },
  { name: 'Twain', role: 'The convergence node' },
]
const LAYER_ZERO = ['NO_FORCE', 'HOST_SAFE', 'TRUTH_OR_NOTHING', 'CLEANUP_FIRST']

function landingCard(key: string, ctx: CardCtx): CardModel | null {
  const { feeds } = ctx
  const ask = { id: 'ask', label: 'Ask Iris', primary: true }
  const ontarioSource = 'David’s Drive records · 2024-FY figures · reported'
  switch (key) {
    case 'cosmos': return {
      id: 'landing:cosmos', level: 1, path: ['Landing', 'The Conscious Cosmos'], title: 'The Conscious Cosmos',
      subtitle: 'Philosophy companion · one picture · not a measurement',
      badge: { label: 'Philosophy · not a measurement', tone: 'design' }, center: true,
      layers: [
        { key: 'macro', lead: 'Picture, not proof. Meaning stays here. Receipts stay in the engineering paper.', items: [{ label: 'The stance', value: 'Philosophy as philosophy — pure logic, no measurements, no claim of proof.', wide: true }], source: 'The Conscious Cosmos · philosophy plate' },
        {
          key: 'logic', lead: 'Five names, not five laws.',
          items: [
            { label: 'Existence', value: 'That something is, before any model.', wide: true },
            { label: 'Information', value: 'Pattern — the word we use between matter and meaning.', wide: true },
            { label: 'Energy', value: 'Change.', wide: true },
            { label: 'Time', value: 'Order of change.', wide: true },
            { label: 'Observer', value: 'Experience itself — a name, not a measured field.', wide: true },
            { label: 'The loop', value: 'A metaphor — no Hamiltonian, no identity between universe and mind.', wide: true },
          ],
          boundary: 'The story, without the certainty — a telling, not a derivation: Undivided → a distinction → pattern → form → organization → life → reflection.',
          source: 'The Conscious Cosmos · philosophy plate',
        },
        {
          key: 'physics', lead: 'The boundary is the content.',
          items: [{ label: 'Closing, not a verdict', value: '“The cosmos is the place this picture is about. It is not, on this plate, a mind we have measured or a heart we have found.”', wide: true }],
          boundary: 'What this plate is not: NOT absolute truth · NOT det = 1 as a law · NOT a hash or URL standing in for identity.',
          source: 'The Conscious Cosmos · philosophy plate',
        },
      ],
      actions: [ask, { id: 'go:landing:cosmos-story', label: 'The seven-step story' }, { id: 'go:landing:cosmos-boundary', label: 'The boundary wall' }],
    }
    case 'cosmos-story': return {
      id: 'landing:cosmos-story', level: 2, path: ['Landing', 'The Conscious Cosmos', 'The story'], title: 'The Story',
      subtitle: 'Seven steps · a telling, not a derivation',
      badge: { label: 'Philosophy · not a measurement', tone: 'design' }, center: true,
      layers: [
        { key: 'macro', lead: 'The story, without the certainty.', items: ['Undivided', 'A distinction', 'Pattern', 'Form', 'Organization', 'Life', 'Reflection'].map((s, i) => ({ label: `Step ${i + 1}`, value: s })), source: 'The Conscious Cosmos · philosophy plate' },
        { key: 'logic', lead: 'Seven steps on an ascending spiral in the world above this card.', boundary: 'A telling, not a derivation. No certainty is claimed for the telling — that is the honest state of a philosophy plate.', source: 'The Conscious Cosmos · philosophy plate' },
      ],
      actions: [ask, { id: 'go:landing:cosmos', label: 'Back to the Cosmos' }, { id: 'go:landing:cosmos-boundary', label: 'The boundary wall' }],
    }
    case 'cosmos-boundary': return {
      id: 'landing:cosmos-boundary', level: 3, path: ['Landing', 'The Conscious Cosmos', 'The boundary wall'], title: 'The Boundary Wall',
      subtitle: 'What this plate is not',
      badge: { label: 'Honesty boundary', tone: 'verified' }, center: true,
      layers: [
        {
          key: 'macro', lead: 'Closing, not a verdict.',
          items: [{ label: 'The closing', value: '“The cosmos is the place this picture is about. It is not, on this plate, a mind we have measured or a heart we have found.”', wide: true }],
          source: 'The Conscious Cosmos · philosophy plate',
        },
        {
          key: 'logic', lead: 'Three things this plate refuses to be.',
          items: [
            { label: 'Not', value: 'Absolute truth.', wide: true },
            { label: 'Not', value: 'det = 1 as a law.', wide: true },
            { label: 'Not', value: 'A hash or a URL standing in for identity.', wide: true },
            { label: 'The loop', value: 'A metaphor — no Hamiltonian, no identity between universe and mind.', wide: true },
          ],
          boundary: 'This plate carries no telemetrics. Philosophy has no measurements — that is the honest state.',
          source: 'The Conscious Cosmos · philosophy plate',
        },
      ],
      actions: [ask, { id: 'go:landing:cosmos', label: 'Back to the Cosmos' }],
    }
    case 'ontario': {
      const wst = feeds.status.get('weather')
      return {
        id: 'landing:ontario', level: 1, path: ['Landing', 'Ontario · Provincial Overview'], title: 'Ontario · Provincial Overview',
        subtitle: 'Drive-verified figures · reported, not live',
        badge: { label: 'Reported · 2024-FY', tone: 'verified' }, center: true,
        layers: [
          {
            key: 'macro', lead: 'The province, in its own reported numbers.',
            items: [
              { label: 'QHC revenue', value: '$348.5M' }, { label: 'QHC beds', value: '320' }, { label: 'QHC ED visits', value: '144,200' },
              { label: 'KHSC revenue', value: '$812.4M' }, { label: 'KHSC beds', value: '575' }, { label: 'KHSC ED visits', value: '112,500' },
              { label: 'School boards', value: '72' }, { label: 'Students FTE', value: '2,071,550' },
              { label: 'Operating envelope', value: '$32.02B' }, { label: 'Recoverable / yr', value: '$1.27B' },
            ],
            source: ontarioSource,
          },
          {
            key: 'logic', lead: 'How the numbers read.',
            items: [
              { label: 'Procurement delay', value: 'HIGH · reported, qualitative' },
              { label: 'Intergovernmental data lag', value: 'MODERATE · reported, qualitative' },
              { label: 'Resource allocation', value: 'MONITORING · reported, qualitative' },
            ],
            boundary: 'Friction vectors are qualitative and reported — a reading, not a measurement.',
            source: ontarioSource,
          },
          {
            key: 'physics', lead: 'The province under the weather.',
            items: [{ label: 'Belleville weather', value: `${feedReading('weather', feeds.values)} · ${wst ? STATE_WORD[wst.state] ?? wst.state : 'Not wired'}`, action: 'go:feed:weather', wide: true }],
            boundary: 'Vintage: 2024-FY figures · reported — NOT live data. Large figures in billions, always.',
            source: `${ontarioSource} · Open-Meteo`,
          },
        ],
        actions: [ask, { id: 'go:landing:ontario-health', label: 'Healthcare · QHC vs KHSC' }, { id: 'go:landing:ontario-schools', label: 'School boards' }],
      }
    }
    case 'ontario-health': return {
      id: 'landing:ontario-health', level: 2, path: ['Landing', 'Ontario', 'Healthcare'], title: 'Healthcare · QHC vs KHSC',
      subtitle: 'Side-by-side comparison · reported 2024-FY',
      badge: { label: 'Reported · 2024-FY', tone: 'verified' }, center: true,
      layers: [
        {
          key: 'macro', lead: 'Two hospital corporations, three measures, drawn to scale in the world above this card.',
          items: [
            { label: 'QHC revenue', value: '$348.5M' }, { label: 'KHSC revenue', value: '$812.4M' },
            { label: 'QHC beds', value: '320' }, { label: 'KHSC beds', value: '575' },
            { label: 'QHC ED visits', value: '144,200' }, { label: 'KHSC ED visits', value: '112,500' },
          ],
          source: ontarioSource,
        },
        {
          key: 'physics', lead: 'Revenue, the headline measure.',
          bars: { title: 'Revenue, reported ($M)', rows: [{ label: 'QHC', value: 348.5, display: '$348.5M' }, { label: 'KHSC', value: 812.4, display: '$812.4M' }] },
          boundary: 'Reported 2024-FY figures — not live data. Bar heights are proportional to the reported values.',
          source: ontarioSource,
        },
      ],
      actions: [ask, { id: 'go:landing:ontario', label: 'Back to Ontario' }, { id: 'go:landing:ontario-schools', label: 'School boards' }],
    }
    case 'ontario-schools': return {
      id: 'landing:ontario-schools', level: 3, path: ['Landing', 'Ontario', 'School boards'], title: 'School Boards',
      subtitle: '$32.02B envelope · $1.27B/yr recoverable',
      badge: { label: 'Reported · 2024-FY', tone: 'verified' }, center: true,
      layers: [
        {
          key: 'macro', lead: 'Seventy-two boards, two million students, and the friction inside the envelope.',
          items: [
            { label: 'School boards', value: '72' }, { label: 'Students FTE', value: '2,071,550' },
            { label: 'Combined operating envelope', value: '$32.02B' }, { label: 'Recoverable per year', value: '$1.27B' },
          ],
          source: ontarioSource,
        },
        {
          key: 'physics', lead: 'The recoverable flow, drawn to true proportion against the envelope.',
          bars: { title: 'Envelope vs recoverable flow ($B)', rows: [{ label: 'Operating envelope', value: 32.02, display: '$32.02B' }, { label: 'Recoverable / yr', value: 1.27, display: '$1.27B' }] },
          boundary: '2024-FY figures · reported — not live data. Large figures in billions, always.',
          source: ontarioSource,
        },
      ],
      actions: [ask, { id: 'go:landing:ontario', label: 'Back to Ontario' }, { id: 'go:landing:ontario-health', label: 'Healthcare · QHC vs KHSC' }],
    }
    case 'tiers': return {
      id: 'landing:tiers', level: 1, path: ['Landing', 'Tier Command Center'], title: 'Tier Command Center',
      subtitle: 'Six platforms · one vertical stack',
      badge: { label: 'Command stack', tone: 'design' }, center: true,
      layers: [
        {
          key: 'macro', lead: 'Six tiers, stacked vertically in the world. Pick any platform — each one does something real.',
          items: LANDING_TIERS.map(t => ({ label: t.name, value: t.state === 'live' ? 'Live — opens the telemetrics board' : t.state === 'receipts' ? 'Evidence — opens the DCLM receipts view' : 'Not instrumented — the honest deep level', action: `go:landing:tiers-${t.key}`, wide: true })),
          source: 'Tier Command Center',
        },
        { key: 'logic', lead: 'A tier that is live opens its instrument. A tier that is not says so, in normal type, with no fake controls.', boundary: 'No decorative dead controls: every platform either opens a real instrument or states its honest empty state.', source: 'Tier Command Center' },
      ],
      actions: [ask],
    }
    default: break
  }
  const tierHit = key.match(/^tiers-(live|develop|publish|order|forensics|design)(-deep)?$/)
  if (tierHit) {
    const t = LANDING_TIERS.find(x => x.key === tierHit[1])!
    const deep = !!tierHit[2]
    const id = `landing:${key}`
    const title = deep ? `${t.name} · Deep` : `Tier ${t.name}`
    const subtitle = deep ? 'The honest deep level' : 'Command tier'
    const path = deep ? ['Landing', 'Tier Command Center', t.name, 'Deep'] : ['Landing', 'Tier Command Center', t.name]
    const openReal = t.state === 'live'
      ? { id: 'go:telemetrics:telemetrics', label: 'Open the telemetrics board', primary: true }
      : t.state === 'receipts'
        ? { id: 'go:dclm:dclm', label: 'Open the DCLM integrity view', primary: true }
        : null
    const deeper = deep ? null : { id: `go:landing:tiers-${t.key}-deep`, label: t.state === 'unknown' ? 'Go deeper — the honest state' : 'Go deeper' }
    const back = { id: 'go:landing:tiers', label: 'Back to the stack' }
    const badge = t.state === 'live' ? { label: 'Live', tone: 'live' as const } : t.state === 'receipts' ? { label: 'Evidence', tone: 'verified' as const } : { label: 'Not instrumented', tone: 'mock' as const }
    const deepLine: Record<string, string> = {
      live: 'The board watches six public feeds. Each row shows its latest reading in plain words, or says honestly when a feed is quiet. Nothing is invented to fill a gap.',
      develop: 'Still no instrumentation. This tier exists as a named platform; whatever gets wired to it will be labeled when it lands, not before.',
      publish: 'The pipe this tier would use: proposal, quorum, finalize, IPFS through Pinata, IPNS. The pipe is a design; no release has traveled it.',
      order: 'The pilot Unity handle is the whole of it: a passkey your device creates, nothing sent anywhere. No commerce instrumentation exists here.',
      forensics: 'Ten of eleven modules match their receipts byte for byte, checked on your device. Corporate helpers was never issued a receipt, so it is checked but not sealed.',
      design: 'The chambers of the Unity playground hold the doctrine. Pick any chamber in the ring to read what the design law says.',
    }
    return {
      id, level: deep ? 3 : 2, path, title, subtitle, badge, center: true,
      layers: [
        { key: 'macro', lead: deep ? deepLine[t.key] : t.what, items: [{ label: 'Tier', value: t.name }, { label: 'State', value: t.state === 'live' ? 'LIVE — instrumented' : t.state === 'receipts' ? 'Evidence — receipts view' : 'UNKNOWN — not yet instrumented' }], ...(t.state === 'unknown' ? { boundary: UNKNOWN_BOUNDARY } : {}), source: 'Tier Command Center' },
        ...(t.state === 'unknown' ? [{ key: 'logic' as const, lead: 'What would live here.', items: [{ label: 'Instrumentation', value: 'None wired from this page.', wide: true }], boundary: UNKNOWN_BOUNDARY, source: 'Tier Command Center' }] : []),
      ],
      actions: [ask, ...(openReal ? [openReal] : []), ...(deeper ? [deeper] : []), back],
    }
  }
  switch (key) {
    case 'dclm-engine': return {
      id: 'landing:dclm-engine', level: 1, path: ['Landing', 'DCLM Cognitive Engine'], title: 'DCLM Cognitive Engine',
      subtitle: 'Four phases · invariant det(M) ≡ 1.0',
      badge: { label: 'Design', tone: 'design' }, center: true,
      layers: [
        {
          key: 'macro', lead: 'Four phases, one invariant. The design of the engine, not a running machine.',
          items: DCLM_PHASES.map((p, i) => ({ label: `Phase ${i + 1} · ${p.name}`, value: p.role })),
          source: 'DCLM Cognitive Engine · design',
        },
        {
          key: 'logic', lead: 'The invariant the engine is built around.',
          items: [{ label: 'Invariant', value: 'det(M) ≡ 1.0' }, { label: 'Kernel status', value: 'UNREACHABLE · last checked Oct 3, 2026', wide: true }],
          boundary: 'No reconnect. No fake compute. The kernel API is unreachable since Oct 3, 2026 — the machine behind it is asleep. The engine below is the design; nothing here pretends to compute.',
          source: 'DCLM Cognitive Engine · design',
        },
      ],
      actions: [ask, { id: 'go:landing:dclm-pipeline', label: 'Fly the phase pipeline' }, { id: 'go:landing:dclm-invariant', label: 'The invariant wall' }],
    }
    case 'dclm-pipeline': return {
      id: 'landing:dclm-pipeline', level: 2, path: ['Landing', 'DCLM Cognitive Engine', 'The pipeline'], title: 'The Phase Pipeline',
      subtitle: 'Four gates · flown in order',
      badge: { label: 'Design', tone: 'design' }, center: true,
      layers: [
        { key: 'macro', lead: 'The four phases as a pipeline: four gates in a row in the world, flown through in order.', items: DCLM_PHASES.map((p, i) => ({ label: `Gate ${i + 1} · ${p.name}`, value: p.role })), source: 'DCLM Cognitive Engine · design' },
        { key: 'logic', lead: 'Apprentice proposes, the Boundary masks, the Master verifies, Twain converges.', boundary: 'A design you can fly, not a running compute. The kernel is unreachable; nothing here runs the phases.', source: 'DCLM Cognitive Engine · design' },
      ],
      actions: [ask, { id: 'go:landing:dclm-engine', label: 'Back to the engine' }, { id: 'go:landing:dclm-invariant', label: 'The invariant wall' }],
    }
    case 'dclm-invariant': return {
      id: 'landing:dclm-invariant', level: 3, path: ['Landing', 'DCLM Cognitive Engine', 'The invariant wall'], title: 'The Invariant Wall',
      subtitle: 'det(M) ≡ 1.0 · the Layer [0] law floor',
      badge: { label: 'Law floor', tone: 'verified' }, center: true,
      layers: [
        {
          key: 'macro', lead: 'The wall states the law. It does not run it.',
          items: [{ label: 'Invariant', value: 'det(M) ≡ 1.0' }, ...LAYER_ZERO.map(l => ({ label: 'Layer [0]', value: l }))],
          source: 'DCLM Cognitive Engine · design',
        },
        {
          key: 'logic', lead: 'The law floor, four lines.',
          items: LAYER_ZERO.map(l => ({ label: l, value: 'Standing law of the engine.', wide: true })),
          boundary: 'The kernel is UNREACHABLE · last checked Oct 3, 2026. The wall is the design law, stated — not a live verification.',
          source: 'DCLM Cognitive Engine · design',
        },
      ],
      actions: [ask, { id: 'go:landing:dclm-engine', label: 'Back to the engine' }, { id: 'go:landing:dclm-pipeline', label: 'The pipeline' }],
    }
    default: return null
  }
}

function weatherFor(lat: number, lon: number, ctx: CardCtx): PlaceWeather | null | undefined {
  return placeWeather(lat, lon, () => ctx.onLate())
}

export function countryCard(c: Country, ctx: CardCtx, inCountry: (c: Country, lat: number, lon: number) => boolean): CardModel {
  const { reg } = ctx
  const cap = capitalOf(reg, c.a3)
  const w = cap ? weatherFor(cap.lat, cap.lon, ctx) : null
  const graded = reg.jurisdictions.find(j => j.name.toLowerCase() === c.name.toLowerCase())
  const cities = reg.cities.cities.filter(x => x.a3 === c.a3).sort((a, b) => b.pop - a.pop)
  const q = quakesNear(ctx.feeds.values, (lat, lon) => inCountry(c, lat, lon))
  const quakeWord = q.n === 0 ? 'None in the last day' : q.n === 1 ? 'One in the last day' : `${q.n} in the last day`
  const live = w ? { label: 'Live weather', tone: 'live' as Tone } : { label: 'Reference map', tone: 'verified' as Tone }
  const macro: CardItem[] = [
    { label: 'Region', value: c.subregion || c.continent },
    { label: cap?.capital ? 'Capital' : 'Largest city', value: cap?.name ?? 'Not in the map' },
    { label: cap ? `Weather in ${cap.name}` : 'Weather', value: cap ? weatherLine(w) : 'No city to check' },
    { label: 'Earthquakes', value: quakeWord },
  ]
  if (graded) macro.push({ label: 'Sector research', value: `${Object.keys(graded.grades).length} sector layers`, wide: true })
  return {
    id: `country:${c.a3}`, level: 2, path: ['Earth', c.continent, c.name], title: c.name, subtitle: c.subregion || c.continent,
    badge: live,
    layers: [
      { key: 'macro', lead: `${c.name} sits in ${c.subregion || c.continent}.${cap ? ` ${sentence(`${cap.capital ? 'Its capital is' : 'Its largest city is'} ${cap.name}`)}` : ''} Go lower to see its cities.`, items: macro, source: 'Natural Earth · Open-Meteo · USGS' },
      {
        key: 'logic', lead: 'Borders and cities come from Natural Earth, a public world map. Weather is fetched live for the capital. Earthquakes come from the US Geological Survey feed for the past day.',
        items: [
          ...(graded ? Object.entries(graded.grades).map(([k, g]) => ({ label: reg.sectors.find(s => s.key === k)?.name ?? k, value: GRADE_WORD[g.grade] })) : []),
          { label: 'Map', value: 'Natural Earth borders', wide: !graded },
        ],
        source: reg.countries.source,
      },
      {
        key: 'physics', lead: `The measurable picture of ${c.name}.`,
        items: [
          { label: `People (${c.popYear || 'year n/a'})`, value: bigNumber(c.pop) },
          { label: `Economy (${c.gdpYear || 'year n/a'})`, value: c.gdpMd ? `$${bigNumber(c.gdpMd * 1e6)}` : 'not recorded' },
          { label: 'Cities in the map', value: String(cities.length) },
          { label: 'Strongest quake, 24 h', value: q.strongest !== undefined ? `M ${q.strongest.toFixed(1)}` : '—' },
          ...(w ? [{ label: 'Wind at the capital', value: `${Math.round(w.windKmh)} km/h` }, { label: 'Weather checked', value: ago(w.at) }] : []),
        ],
        bars: cities.length > 1 ? { title: 'Largest cities · metro population', rows: cities.slice(0, 5).map(x => ({ label: x.name, value: x.pop, display: bigNumber(x.pop) })) } : undefined,
        boundary: 'Population and economy are Natural Earth estimates from the year shown, not live counts. This map is a model of the world, not a live digital twin.',
        source: 'Natural Earth 1:50m · Open-Meteo · USGS',
      },
    ],
    actions: [{ id: 'ask', label: 'Ask Iris', primary: true }, { id: 'lower', label: 'Go to its cities' }],
  }
}

export function cityCard(city: City, country: Country | undefined, ctx: CardCtx): CardModel {
  const w = weatherFor(city.lat, city.lon, ctx)
  const q = quakesNear(ctx.feeds.values, (lat, lon) => arcDeg(lat, lon, city.lat, city.lon) < 3)
  const others = ctx.reg.cities.cities.filter(x => x.a3 === city.a3 && x !== city).sort((a, b) => arcDeg(city.lat, city.lon, a.lat, a.lon) - arcDeg(city.lat, city.lon, b.lat, b.lon)).slice(0, 3)
  return {
    id: `city:${city.a3}:${city.name}`, level: 3, path: ['Earth', country?.name ?? city.a3, city.name], title: city.name,
    subtitle: city.capital ? `Capital · ${country?.name ?? ''}` : city.region || country?.name,
    badge: w ? { label: 'Live weather', tone: 'live' } : { label: 'Reference map', tone: 'verified' },
    layers: [
      {
        key: 'macro', lead: `${city.name} is ${city.capital ? 'the capital of' : 'a city in'} ${country?.name ?? 'this country'}. Go to street level to stand in it.`,
        items: [
          { label: 'Weather now', value: weatherLine(w) },
          { label: 'Earthquakes nearby', value: q.n === 0 ? 'None in the last day' : `${q.n} in the last day` },
          { label: 'Neighbours', value: others.map(o => o.name).join(', ') || '—', wide: true },
        ],
        source: 'Natural Earth · Open-Meteo · USGS',
      },
      {
        key: 'logic', lead: 'The civic layer holds cities and municipalities. Weather is fetched live for this exact spot. Municipal services and civic records are not connected yet.',
        items: [{ label: 'Civic data', value: 'Not connected yet', wide: true }],
        boundary: 'No municipal, civic or personal data is loaded for this city. Human scale shows the place, not a file on the people.',
        source: ctx.reg.cities.source,
      },
      {
        key: 'physics', lead: `The measurable picture of ${city.name}.`,
        items: [
          { label: 'Metro population', value: bigNumber(city.pop) },
          { label: 'Position', value: `${city.lat.toFixed(2)}°, ${city.lon.toFixed(2)}°` },
          ...(w ? [{ label: 'Wind', value: `${Math.round(w.windKmh)} km/h` }, { label: 'Checked', value: ago(w.at) }] : []),
          { label: 'Strongest quake within 300 km', value: q.strongest !== undefined ? `M ${q.strongest.toFixed(1)}` : '—' },
        ],
        boundary: 'Population is a Natural Earth metro estimate, not a census count.',
        source: 'Natural Earth 1:50m · Open-Meteo · USGS',
      },
    ],
    actions: [{ id: 'ask', label: 'Ask Iris', primary: true }, { id: 'street', label: 'Human scale' }],
  }
}

export function cardFor(t: Target, ctx: CardCtx): CardModel | null {
  const { reg, integrity, feeds, discovered } = ctx
  const ask = { id: 'ask', label: 'Ask Iris', primary: true }
  switch (t.kind) {
    case 'jurisdiction': {
      const j = reg.jurisdictions.find(x => x.name === t.key)
      if (!j) return null
      const g = Object.entries(j.grades)
      const best = g.filter(([, v]) => v.grade === 'AT BENCHMARK').map(([k]) => reg.sectors.find(s => s.key === k)?.name ?? k)
      return {
        id: `jur:${j.name}`, level: 2, path: ['Earth', 'Sector research', j.name], title: j.name, subtitle: 'Sector country model',
        badge: { label: 'Pilot research', tone: 'pilot' },
        layers: [
          { key: 'macro', lead: best.length ? `${j.name} leads the benchmark in ${best.join(' and ')}.` : `How ${j.name} compares with the best in each sector.`, items: g.map(([k, v]) => ({ label: reg.sectors.find(s => s.key === k)?.name ?? k, value: GRADE_WORD[v.grade] })), source: 'Unity Framework · sector country models' },
          { key: 'logic', lead: 'Each sector picks a benchmark country. Every other country is graded against it: at benchmark, near, gapped or thin.', items: g.map(([k, v]) => ({ label: reg.sectors.find(s => s.key === k)?.name ?? k, value: sentence(v.fact), wide: true })), source: 'Unity Framework · sector country models' },
          { key: 'physics', lead: 'Grades on one scale.', bars: { title: 'Grade by sector', rows: g.map(([k, v]) => ({ label: reg.sectors.find(s => s.key === k)?.name ?? k, value: GRADE_SCORE[v.grade], display: GRADE_WORD[v.grade] })) }, boundary: `Pilot research from ${reg.sectors[0]?.researched ?? '2026'}. Modeled analysis, not a live feed.`, source: 'Unity Framework · sector country models' },
        ],
        actions: [ask, { id: 'country', label: 'See the country' }],
      }
    }
    case 'canada': {
      const c = reg.canada.find(x => x.key === t.key)
      if (!c) return null
      return {
        id: `canada:${c.key}`, level: 3, path: ['Earth', 'Canada', c.name], title: c.name, subtitle: 'Pan-Canadian scope',
        badge: { label: 'Specification', tone: 'design' },
        layers: [
          { key: 'macro', lead: `How the health runtime would connect in ${c.name}, without ever holding patient data.`, items: [{ label: 'Systems', value: c.systems, wide: true }], source: 'SIMA-DCLM RTE specification' },
          { key: 'logic', lead: 'The runtime reads through each portal’s own rules and keeps nothing.', items: [{ label: 'Guard', value: c.guard, wide: true }], boundary: 'Invariant: no personal health information is ingested, logged or retained.', source: 'SIMA-DCLM RTE specification' },
        ],
        actions: [ask],
      }
    }
    case 'rte': {
      const [key, depthRaw] = t.key.split('#')
      const r = reg.rtes.find(x => x.key === key)
      if (!r) return null
      const depth = depthRaw === undefined ? null : Number(depthRaw)
      const facts = r.facts
      const parts = (r.about || r.job).split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean)
      const physicsLead = depth !== null && facts[depth]
        ? sentence(facts[depth])
        : facts.length
          ? `${facts.length} deep. That is the whole record.`
          : gapProtocol(`${r.name} · facts`)
      return {
        id: `rte:${r.key}`, level: 3, path: ['Universal RTE', r.name, depth !== null ? `Depth ${depth + 1}` : 'Full depth'], title: r.name, subtitle: r.kind === 'suite' ? 'RTE room' : r.kind === 'unity' ? 'Unity RTE' : 'RTE specification',
        badge: statusTone(r.status),
        layers: [
          { key: 'macro', lead: sentence(r.job || r.about), items: [{ label: 'Status', value: statusTone(r.status).label }, { label: 'Kind', value: r.kind === 'suite' ? 'Room in the suite' : r.kind === 'unity' ? 'Unity runtime' : 'Specification' }, { label: 'Depth', value: facts.length ? `${facts.length} in the record` : '0:1' }], source: 'RTE suite' },
          { key: 'logic', lead: sentence(parts[0] || r.about || r.job), items: parts.slice(1).map((part, i) => ({ label: String(i + 2).padStart(2, '0'), value: sentence(part), wide: true })), source: 'RTE suite' },
          { key: 'physics', lead: physicsLead, items: facts.length ? facts.map((f, i) => ({ label: String(i + 1).padStart(2, '0'), value: sentence(f), wide: true })) : [{ label: 'Loaded', value: gapLine(`${r.name} · facts`), wide: true }], boundary: `Recorded status: ${r.status}. Opening the room does not change that status.`, source: 'RTE suite manifest' },
        ],
        actions: [ask],
      }
    }
    case 'chamber': {
      const c = reg.chambers.find(x => x.key === t.key)
      if (!c) return null
      return {
        id: `chamber:${c.key}`, level: 2, path: ['Unity playground', c.title], title: c.title, subtitle: 'Unity Framework chamber',
        badge: discovered.has(c.key) ? { label: 'Discovered', tone: 'verified' } : statusTone(c.status),
        layers: [
          { key: 'macro', lead: sentence(c.headline), items: c.summary.slice(0, 2).map((s, i) => ({ label: i ? 'And' : 'In short', value: sentence(s), wide: true })), source: c.source },
          { key: 'logic', lead: c.quotes[0] ? `“${c.quotes[0].text}”` : 'This chamber’s reasoning is in the framework.', items: c.quotes.slice(1, 3).map(q => ({ label: q.who, value: `“${q.text}”`, wide: true })), source: c.source },
          { key: 'physics', lead: 'The record behind this chamber.', items: [{ label: 'Status', value: c.status }, { label: 'Cards in the chamber', value: String(c.cards) }, { label: 'Source', value: c.source, wide: true }], source: c.source },
        ],
        actions: [ask],
      }
    }
    case 'sector': {
      if (t.key === 'pharmacology') {
        const p = reg.pharmacology
        return {
          id: 'sector:pharmacology', level: 1, path: ['Sector layers', 'Pharmacology'], title: 'Pharmacology', subtitle: 'Sector layer',
          badge: { label: 'Design', tone: 'design' },
          layers: [
            { key: 'macro', lead: 'Medicines, from discovery to the pharmacy shelf. Mapped, not yet graded.', items: [{ label: 'State', value: 'Design stage' }, { label: 'Data estates', value: 'Named, not researched' }], source: p.source },
            { key: 'logic', lead: sentence(p.arc), items: p.estates.map(e => ({ label: e.name, value: e.note, wide: true })), boundary: 'No grades are assigned, because the estate research has not been done.', source: p.source },
          ],
          actions: [ask],
        }
      }
      const s = reg.sectors.find(x => x.key === t.key)
      if (!s) return null
      const order: Grade[] = ['AT BENCHMARK', 'NEAR', 'GAPPED', 'THIN']
      return {
        id: `sector:${s.key}`, level: 1, path: ['Sector layers', s.name], title: s.name, subtitle: 'Sector layer',
        badge: { label: 'Pilot research', tone: 'pilot' },
        layers: [
          { key: 'macro', lead: sentence(s.headline), items: [{ label: 'Benchmark', value: s.benchmark }, { label: 'Scope', value: s.scope }], source: s.source },
          { key: 'logic', lead: `Every country is compared with ${s.benchmark}. Tap a pillar on the globe to see one country’s grade.`, items: s.rows.slice(0, 6).map(r => ({ label: r.jurisdiction, value: GRADE_WORD[r.grade] })), source: s.source },
          { key: 'physics', lead: 'How the graded countries spread.', bars: { title: 'Countries per grade', rows: order.map(g => ({ label: GRADE_WORD[g], value: s.counts[g] ?? 0, display: String(s.counts[g] ?? 0) })) }, boundary: `Pilot research from ${s.researched}. ${s.state}`, source: s.source },
        ],
        actions: [ask],
      }
    }
    case 'estates': return cardFor({ kind: 'sector', key: 'pharmacology' }, ctx)
    case 'dclm': {
      const locked = integrity.filter(m => m.state === 'MATCH').length
      const all = integrity.length
      const broken = integrity.filter(m => m.state === 'MISMATCH' || m.state === 'UNCHECKED').length
      const unsealed = integrity.filter(m => m.state === 'NOT-LOCKED').length
      const badge = broken > 0 ? { label: 'Check failed', tone: 'offline' as const } : unsealed > 0 ? { label: `${locked} of ${all} sealed`, tone: 'stale' as const } : { label: 'All data checked', tone: 'verified' as const }
      return {
        id: 'dclm', level: 1, path: ['DCLM'], title: 'The DCLM', subtitle: 'Deterministic Compute Logic Machine',
        badge,
        layers: [
          { key: 'macro', lead: 'The deterministic machine that issued the sealed receipts this world carries. Every module below was fingerprinted on your device and compared with its receipt, byte for byte. One module, corporate-helpers, was never issued a receipt, so it is checked but not sealed.', items: [{ label: 'Modules matching', value: locked === all ? `All ${all}` : `${locked} of ${all}` }, { label: 'Kernel status', value: 'UNREACHABLE · last checked Oct 3, 2026', wide: true }], source: 'DCLM API v2' },
          { key: 'logic', lead: 'Each data file was sent to the DCLM twice. Both receipts had to agree. Your browser then re-fingerprints each file before using it, and refuses any file that does not match.', boundary: 'This is a client-side integrity check, not a seal or an approval. The kernel API (dualiscapax.ai/api/v2/compute) is unreachable since Oct 3, 2026 — the machine behind it is asleep. No new receipts can be requested from this page, and nothing here attempts to reconnect on its own.', source: 'DCLM API v2 · public/dclm-receipts.json' },
          { key: 'physics', lead: 'Per-module receipts (engineering view).', items: integrity.map(m => ({ label: m.module, value: `${m.state}${m.receipt ? ` · seq ${m.receipt.receipts.map(r => r.sequence).join('/')}` : ''}` })), source: 'DCLM receipts' },
        ],
        actions: [ask],
      }
    }
    case 'pipe': {
      const pipe = ctx.pipe
      const frame = pipe?.frames[0]
      const short = (hex: string) => hex.length > 18 ? `${hex.slice(0, 10)}…${hex.slice(-6)}` : hex
      return {
        id: `pipe:${t.key}`, level: 2, path: ['DCCP pipe', t.key], title: 'DCCP pipe', subtitle: pipe?.member ? 'Member frame stream' : 'Sealed · members only',
        badge: { label: pipe?.member ? 'Draft' : 'Not public', tone: 'design' },
        layers: [
          { key: 'macro', lead: 'A CID is the name of one exact copy of this world. Change the world, and it needs a new name. You don\'t reuse the old one. This rule is still a draft. Trinity hasn\'t passed it.', items: [{ label: 'Law', value: 'Draft, not in force' }, { label: 'Current CID', value: 'Not published yet' }, { label: 'You are at', value: t.key }], source: 'LAW-CID-MAPPING-DUALIS-2026-10-03-V1' },
          { key: 'logic', lead: 'The pipe is the path a release would take: proposed, voted, finalized, pinned, then named. On this device it keeps one note of that rule. The same note twice is ignored. A missing step or a clash is refused. Nothing is pinned.', boundary: 'I can\'t bind a jacket from here. Your key stays offline. Don\'t paste a PEM into this page.', source: 'CID mapping law, draft' },
          { key: 'physics', lead: pipe?.member ? 'One note, on this device only. A fingerprint is not a name, and the old lander name is not this world.' : 'The notes stay closed until a Unity handle is on this device. That still does not publish anything.', items: [
            { label: 'Public page', value: 'dualiscapax.ai/builder', wide: true },
            { label: 'Hosted at', value: 'the Manus world', wide: true },
            { label: 'Old lander name', value: 'History only. Not this world.', wide: true },
            ...(frame ? [{ label: 'Note', value: String(frame.sequence) }, { label: 'Its identity', value: short(frame.eventId) }, { label: 'Chained to', value: short(frame.stateDigest) }] : []),
          ], source: 'Kept in memory. Not a publish.' },
        ],
        actions: [ask],
      }
    }
    case 'universal': {
      if (t.key === 'construct') {
        const scene = drawnConstruct()
        return {
          id: 'construct', level: 2, path: ['Universal RTE', 'Construct'], title: scene.empty ? 'Construct' : scene.title, subtitle: 'Drawn for this look',
          badge: { label: scene.empty ? 'Empty' : 'Drawn', tone: scene.empty ? 'design' : 'verified' },
          layers: [
            { key: 'macro', lead: scene.empty ? 'The room is empty. Say what you want to look at.' : `Iris drew ${scene.title} because you asked to look at it.`, source: 'The record already held' },
            { key: 'logic', lead: 'She builds the room from the record. She does not invent the rest.', items: (scene.lines.length ? scene.lines : ['Nothing loaded.']).map((line, i) => ({ label: String(i + 1).padStart(2, '0'), value: sentence(line), wide: true })), source: 'Universal RTE construct' },
            { key: 'physics', lead: scene.empty ? '0:1. There was nothing to draw.' : `${scene.lines.length} lines, and no more.`, boundary: 'A drawn room is not a live system, and it is not a place you are standing in.', source: 'Universal RTE construct' },
          ],
          actions: [ask],
        }
      }
      return {
      id: 'universal', level: 1, path: ['Universal RTE'], title: 'Universal RTE', subtitle: 'The root runtime',
      badge: { label: 'Doctrine', tone: 'design' },
      layers: [
        { key: 'macro', lead: sentence(reg.doctrine.universal_rte ?? 'The root runtime every RTE grows from.'), items: [{ label: 'Rule', value: 'One RTE per Unity ID' }, { label: 'Construct', value: 'Say what you want to look at' }], source: 'Unity Framework doctrine' },
        { key: 'logic', lead: 'The plates are the determined landings. They stay put. Ask Iris what you want to see and she draws an offshoot from the record.', source: 'Unity Framework doctrine' },
      ],
      actions: [ask],
    }
    }
    case 'feed': {
      const st = feeds.status.get(t.key as keyof FeedValues)
      if (!st) return null
      const tone: Tone = st.state === 'LIVE' ? 'live' : st.state === 'STALE' ? 'stale' : st.state === 'UNAVAILABLE' ? 'offline' : 'pilot'
      return {
        id: `feed:${t.key}`, level: 1, path: ['Live feeds', st.title], title: st.title, subtitle: `${st.source} · ${ago(st.lastOk)}`,
        badge: { label: st.state === 'PENDING' ? 'Connecting' : st.state.toLowerCase().replace(/^./, c => c.toUpperCase()), tone },
        layers: [
          { key: 'macro', lead: ctx.describe(t), source: st.source },
          { key: 'logic', lead: st.state === 'LIVE' ? 'The reading is the source\'s own frame. The time between frames is not filled.' : `No number yet. Best path: the source has to answer with a time. DCLM does not draw the frame in between. Failures in a row: ${st.failures}.`, items: [{ label: 'Source', value: st.source, wide: true }, { label: 'Cadence', value: 'The poll is the source\'s pace, not a nano frame.', wide: true }], source: st.source },
          { key: 'physics', lead: 'Feed health.', items: [{ label: 'Last good reading', value: ago(st.lastOk) }, { label: 'Failures in a row', value: String(st.failures) }, ...(st.lastError ? [{ label: 'Last error', value: st.lastError, wide: true }] : [])], source: st.source },
        ],
        actions: [ask],
      }
    }
    case 'earth': return {
      id: 'earth', level: 1, path: ['Earth'], title: 'Earth', subtitle: 'The overlook',
      badge: { label: 'Imagery of record', tone: 'verified' },
      layers: [
        { key: 'macro', lead: 'NASA Blue Marble by day and Black Marble by night, lit by where the sun is right now. Come closer and the borders appear. Tap a country.', source: 'NASA Visible Earth' },
      ],
    }
    case 'telemetrics': {
      const order: (keyof FeedValues)[] = ['quakes', 'iss', 'weather', 'kp', 'carbon', 'river']
      const states = order.map(k => feeds.status.get(k)).filter((s): s is FeedStatus => !!s)
      const liveN = states.filter(s => s.state === 'LIVE').length
      const q = feeds.values.quakes
      const iss = feeds.values.iss
      const w = feeds.values.weather
      return {
        id: 'telemetrics', level: 1, path: ['Live feeds', 'Telemetrics'], title: 'Telemetrics', subtitle: 'All six feeds · one board',
        badge: liveN === states.length ? { label: 'All live', tone: 'live' } : liveN > 0 ? { label: `${liveN} of ${states.length} live`, tone: 'stale' } : { label: 'All quiet', tone: 'offline' },
        center: true,
        layers: [
          {
            key: 'macro',
            lead: 'Six public feeds on one board: earthquakes, the space station, Belleville weather, the Kp index, grid carbon intensity, and the Moira River. Every row shows its latest reading in plain words. Tap a row to visit that feed.',
            items: states.map(s => ({
              label: s.title,
              value: `${feedReading(s.key, feeds.values)} · ${STATE_WORD[s.state] ?? s.state}`,
              action: `go:feed:${s.key}`,
              wide: true,
            })),
            source: 'USGS · wheretheiss.at · Open-Meteo · NOAA SWPC · NESO · ECCC',
          },
          {
            key: 'logic',
            lead: 'The board watches each feed on its own timer and its own freshness limit. A feed that stops answering keeps its last reading, labeled, never shown as live.',
            items: states.map(s => ({ label: s.title, value: `${STATE_WORD[s.state] ?? s.state} · checked ${ago(s.lastOk)}`, action: `go:feed:${s.key}`, wide: true })),
            boundary: 'STALE means the last good reading is older than that feed\'s own freshness limit. UNAVAILABLE means it has never answered. The board performs no analysis of its own.',
            source: 'Live public feeds',
          },
          {
            key: 'physics',
            lead: 'The board at a glance.',
            items: [
              { label: 'Feeds live', value: `${liveN} of ${states.length}` },
              { label: 'Strongest quake, 24 h', value: q?.strongest ? `M ${q.strongest.mag.toFixed(1)}` : 'no reading yet' },
              { label: 'ISS altitude', value: iss ? `${Math.round(iss.altKm)} km` : 'no reading yet' },
              { label: 'Belleville temp', value: w ? `${Math.round(w.tempC)}°C` : 'no reading yet' },
            ],
            boundary: 'Feed values are fetched live from public sources. The board reflects them; it does not compute them.',
            source: 'USGS · wheretheiss.at · Open-Meteo',
          },
        ],
        actions: [ask],
      }
    }
    case 'corph': {
      const doc = reg.corporateHelpers
      if (!doc) return null
      const scored = doc.entries.filter(e => typeof e.mean === 'number')
      const top10 = [...scored].sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0)).slice(0, 10)
      return {
        id: 'corph', level: 1, path: ['DualisCapax research', 'Corporate Helpers'], title: 'Corporate Helpers', subtitle: 'Trinity-reviewed company research',
        badge: { label: 'Research · reported', tone: 'verified' },
        center: true,
        layers: [
          {
            key: 'macro',
            lead: sentence(doc.note),
            items: [
              { label: 'Sealed verdicts', value: String(doc.sealed) },
              { label: 'Improvement vectors', value: String(doc.aggregate.totalVectors) },
              { label: 'Mean of means', value: doc.aggregate.meanOfMeans.toFixed(2) },
              { label: 'Companies with scores', value: `${doc.aggregate.companiesWithScores} of ${doc.sealed}` },
            ],
            source: 'DualisCapax research',
          },
          {
            key: 'logic',
            lead: 'Each company is mapped as ways to make it better, not different. Analysis and mapping only, from public figures, reviewed by the Trinity — DCLM, Iris and Twain² — before anything seals.',
            items: [
              { label: 'Standard', value: 'Every figure labeled REPORTED, MODELED or UNKNOWN', wide: true },
              { label: 'Persons', value: 'Sealed — patterns are free, people are not named', wide: true },
            ],
            boundary: 'Research figures, not live telemetry. Figures shown are reported, never measured by this page.',
            source: 'DualisCapax research',
          },
          {
            key: 'physics',
            lead: 'Top ten companies by mean vector score, from the scored companies in this export.',
            bars: { title: 'Top 10 by mean', rows: top10.map(e => ({ label: e.company, value: e.mean ?? 0, display: `${(e.mean ?? 0).toFixed(2)} · ${e.vectors ?? 0} vectors` })) },
            items: [{ label: 'Exported', value: doc.generated }],
            boundary: 'A high mean scores an improvement map, not a company. It is not investment advice.',
            source: 'DualisCapax research',
          },
        ],
        actions: [ask],
      }
    }
    case 'landing': return landingCard(t.key, ctx)
    default: return null
  }
}
