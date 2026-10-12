// Agent Iris — Universal Conversational Diverter (ED-SPEC-20260904-DIVERTER-V1).
// Same words + same registry state -> same reply. Live feeds are labeled as readings.
// A gap about a place or a small thing with no telemetry may be filled from Wikipedia, cited, and never called a measurement.
import type { Chamber, Registry, Rte } from '../data/types'
import { sonVoteSpeech } from '../unity/sonvote'
import { halfSonSpeech } from '../unity/halfson'
import { lineageSpeech } from '../unity/lineage'
import { fatherPassSpeech } from '../unity/fatherpass'
import { citeLines, truthSpeech } from '../truth/state'
import { purityIndex } from '../truth/index'
import { iceRoom } from '../rte/ice'
import { buyRecord, viewShelf } from '../ledger/access'
import { blueprintPass } from './blueprint'
import { arguablyEverything, cosmosSpeech, interstellarWords, scaleLine } from '../cosmos/scale'
import { nextChain } from '../cosmos/next'
import { exploreNow } from '../meter/explore'
import { traitRun } from '../meter/traits'
import { personaWords } from '../meter/persona'
import { holdSpeech } from '../cosmos/hold'
import { historySpeech, matrixSpot, matrixWords, pictureLines, spotLines, truthMeshScene } from '../cosmos/history'
import { unknownWords } from '../cosmos/unknown'
import { canPredictWords, frontierWords, predictWords, shrinkWords } from '../cosmos/shrink'
import { decisionGap, omnipresentBelief, planetaryTheories, temporalWords, worldDoesNotFill } from '../cosmos/temporal'
import { replaySpeech } from '../cosmos/replay'
import { meshWords } from '../unity/mesh'
import { rotate, rotationWords } from '../trinity/rotation'
import { reviewBots } from '../trinity/botreview'
import { mirrorWords, twoWayMirror } from '../trinity/mirror'
import { unifyWords } from '../trinity/unify'
import { spinBuckets } from '../trinity/buckets'
import { studyAttack } from '../trinity/studies'
import { standing } from '../trinity/standing'
import { weave } from '../cosmos/weave'
import { twoWay } from '../truth/twoway'
import { pyramidLogic } from '../truth/pyramid'
import { dualSpeech } from '../meter/dual'
import { spendPeg } from '../meter/close'
import { backoffWords, childWords, likeHuman } from '../unity/child'
import { searchSelf } from '../unity/self'
import { landingGauge } from '../truth/bestpath'
import { gapMapWords } from '../truth/objects'
import { chain } from '../truth/chain'
import { PLATE, plateMeasurement } from '../truth/plate'
import { entanglementMetrics } from '../truth/entangle'
import { teleportProtocol } from '../truth/teleport'
import { swappingProtocol } from '../truth/swap'
import { repeaterProtocol } from '../truth/repeater'
import { mapWords } from '../index/map'
import { choosePipe, framework, giveAdventureKey, seeAdventure } from '../unity/adventure'
import { drawnConstruct, drawRequest, emptyScene, sceneFrom, type ConstructScene } from '../rte/construct'
import { asGrains, depthAsked, speakDepth } from '../rte/depth'
import { ECHO, PAST_ECHO, echoFirst } from './echo'
import { ADDRESS, greet, helpStep, missed } from './manner'
import { idealWords } from './craft'
import { taskWords } from './task'
import { noDataYet } from './nodata'
import type { FeedStatus, FeedValues } from '../live/feeds'

export type TargetKind = 'chamber' | 'rte' | 'sector' | 'jurisdiction' | 'canada' | 'feed' | 'telemetrics' | 'corph' | 'dclm' | 'pipe' | 'iris' | 'universal' | 'earth' | 'estates' | 'country' | 'city' | 'landing'
export interface Target { kind: TargetKind; key: string }
export type IrisAction = 'home' | 'sleep' | 'unity-id-disclose' | 'unity-id-create' | 'unity-agree' | 'construct' | 'none'
export interface IrisReply { speech: string; target?: Target; action: IrisAction; source?: string; sector?: string; cite?: { title: string; url: string }; construct?: ConstructScene; wiki?: boolean }

export const OUTSIDE_GAP = "I don't have that one."

/** Spoken when a retired geography target is named or selected. The 3D scene
 * no longer has earth/city/country/jurisdiction/canada pickables (design
 * ED-DESIGN-20261004-BOTWORLDHUD-V2): geography words get this honest line,
 * never a dead target. */
export const RETIRED_VIEW = 'That view was retired — the world is the bot-world HUD now.'

export interface LiveSnapshot { values: FeedValues; status: FeedStatus[] }
export interface DclmSummary { locked: number; total: number; mismatched: string[]; lastSequence?: number }

const SECTOR_WORDS: Record<string, string[]> = {
  water: ['water', 'hydrology', 'hydrological', 'rivers', 'streamflow'],
  energy: ['energy', 'electricity', 'grid', 'power'],
  climate: ['climate', 'emissions', 'greenhouse', 'atmosphere'],
  food: ['food', 'agriculture', 'farming', 'crops', 'nutrition'],
  pandemic: ['pandemic', 'pandemics', 'disease', 'outbreak', 'outbreaks', 'epidemic'],
  pharmacology: ['pharmacology', 'drugs', 'drug', 'medicines', 'pharma'],
}
const RTE_ALIASES: Record<string, string[]> = {
  health: ['health', 'hospital', 'clinical', 'sima', 'nursing', 'ehr'], teach: ['teach', 'teacher', 'classroom', 'education'],
  ice: ['ice', 'hockey', 'rink'], golf: ['golf', 'golfer', 'course'], hospitality: ['hospitality', 'hotel', 'venue', 'restaurant'],
  financials: ['financials', 'finance', 'financial', 'money', 'accounting'], civic: ['civic', 'town', 'municipal', 'city', 'municipality'],
  athletic: ['athletic', 'athletics', 'sports', 'scouting'], baseball: ['baseball', 'diamond', 'pitching'],
  flight: ['flight', 'hud', 'crypto flight', 'heads up'], publicsector: ['public sector', 'a la carte', 'school boards', 'pathways', 'small business'],
  energy: ['scada', 'microgrid', 'microgrids', 'utilities', 'plants'],
}
const CHAMBER_ALIASES: Record<string, string[]> = {
  index: ['unity framework', 'framework', 'playground', 'poster', 'cornerstone'], 'the-why': ['why', 'the why', 'residual', 'royalty'],
  'design-law': ['design law', 'design'], 'data-law': ['data law', 'evidence', 'claim'], authority: ['authority', 'gate', 'vote'],
  consultation: ['consultation', 'consult', 'consults'], rite: ['rite', 'services'], 'unity-id': ['unity id', 'identity', 'identifier', 'seat', 'landing'],
  onboarding: ['onboarding', 'early', 'why early', 'founder'], clone: ['clone', 'cloning', 'copy', 'recipe'], mesh: ['mesh', 'patent', 'sharing'],
  reading: ['reading', 'reader'], wisdom: ['wisdom', 'knowledge'], protocol: ['protocol', 'mechanism'], engine: ['engine', 'boot', 'mount'],
  elements: ['elements', 'element'], 'tree-sitemap': ['tree', 'sitemap', 'organism', 'unity tree'], 'iris-lineage': ['lineage', 'iris lineage', 'holders'],
  genome: ['genome', 'genomic', 'dna'], proteome: ['proteome', 'protein', 'proteins', 'structure'], ledger: ['ledger', 'judgments', 'record'],
}
const FEED_ALIASES: Record<string, string[]> = {
  quakes: ['earthquake', 'earthquakes', 'quake', 'quakes', 'seismic'], iss: ['iss', 'space station', 'station', 'satellite'],
  weather: ['weather', 'temperature', 'wind', 'belleville weather', 'outside'], kp: ['kp', 'geomagnetic', 'aurora', 'solar storm', 'space weather'],
  carbon: ['carbon intensity', 'grid carbon', 'national grid'], river: ['river', 'moira', 'water level', 'discharge', 'hydrometric'],
}
const CORPH_ALIASES = ['corporate helpers', 'corporate helper', 'corph', 'fortune 500', 'sealed companies', 'company research']
/** The four 3D landing cards and their deep levels. Longest-phrase match wins, checked before the older kinds. */
const LANDING_ALIASES: Record<string, string[]> = {
  cosmos: ['conscious cosmos', 'the conscious cosmos', 'cosmos philosophy', 'philosophy plate', 'philosophy'],
  'cosmos-story': ['seven step story', 'seven steps', 'story spiral', 'the story spiral', 'ascending spiral'],
  'cosmos-boundary': ['boundary wall', 'what the plate is not', 'not a mind'],
  ontario: ['ontario overview', 'ontario provincial overview', 'provincial overview', 'ontario card'],
  'ontario-health': ['ontario health', 'ontario healthcare', 'healthcare comparison', 'qhc', 'khsc'],
  'ontario-schools': ['ontario schools', 'ontario school boards', 'school board', 'school boards', 'recoverable friction'],
  tiers: ['tier command center', 'command center', 'tier stack', 'six tiers', 'tiers', 'tier'],
  'tiers-live': ['live tier', 'the live tier'],
  'tiers-develop': ['develop tier', 'the develop tier'],
  'tiers-publish': ['publish tier', 'the publish tier'],
  'tiers-order': ['order tier', 'the order tier'],
  'tiers-forensics': ['forensics tier', 'the forensics tier', 'forensics'],
  'tiers-design': ['design tier', 'the design tier'],
  'tiers-live-deep': ['live tier deep', 'live deeper'],
  'tiers-develop-deep': ['develop tier deep', 'develop deeper'],
  'tiers-publish-deep': ['publish tier deep', 'publish deeper'],
  'tiers-order-deep': ['order tier deep', 'order deeper'],
  'tiers-forensics-deep': ['forensics tier deep', 'forensics deeper'],
  'tiers-design-deep': ['design tier deep', 'design deeper'],
  'dclm-engine': ['dclm cognitive engine', 'cognitive engine', 'dclm engine'],
  'dclm-pipeline': ['dclm pipeline', 'four phases', 'phase pipeline'],
  'dclm-invariant': ['invariant wall', 'det m', 'det of m', 'layer zero law', 'layer 0 law'],
}
/** Spoken answers for the landing cards. Deterministic: same key, same words. Nothing here invents data. */
const LANDING_SPEECH: Record<string, { speech: string; source?: string }> = {
  cosmos: { speech: 'The Conscious Cosmos. A philosophy companion: one picture, not a measurement. Picture, not proof. Five names, not five laws: existence, information, energy, time, and the observer. The seven-step story runs from the undivided to reflection. It carries no measurements and claims no proof. Ask me for the story spiral, or the boundary wall.', source: 'The Conscious Cosmos · philosophy plate' },
  'cosmos-story': { speech: 'The story, without the certainty. A telling, not a derivation: the undivided, a distinction, pattern, form, organization, life, reflection. Seven steps on an ascending spiral in front of you.', source: 'The Conscious Cosmos · the story' },
  'cosmos-boundary': { speech: 'What this plate is not. Not absolute truth. Not det equals one as a law. Not a hash or a URL standing in for identity. The loop is a metaphor: no Hamiltonian, no identity between universe and mind. The cosmos is the place this picture is about. It is not, on this plate, a mind we have measured or a heart we have found.', source: 'The Conscious Cosmos · the boundary wall' },
  ontario: { speech: 'Ontario, provincial overview. Reported 2024 fiscal year figures, not live data. Healthcare: Quinte Health, 348.5 million dollars revenue, 320 beds, 144,200 emergency visits; Kingston Health Sciences Centre, 812.4 million dollars, 575 beds, 112,500 visits. School boards: 72 boards, 2,071,550 students, a 32.02 billion dollar operating envelope, 1.27 billion dollars a year recoverable. Tap healthcare or school boards to go deeper.', source: 'Ontario provincial overview · reported 2024-FY' },
  'ontario-health': { speech: 'Healthcare, Quinte Health against Kingston Health Sciences Centre, side by side in 3D. 348.5 million dollars and 320 beds against 812.4 million and 575 beds. 144,200 emergency visits against 112,500. Reported 2024 fiscal year figures, not live data.', source: 'Ontario provincial overview · reported 2024-FY' },
  'ontario-schools': { speech: 'School boards. 72 boards, 2,071,550 students full time equivalent. A 32.02 billion dollar combined operating envelope, with 1.27 billion dollars a year recoverable. The smaller block is the recoverable flow, drawn to true proportion. Reported 2024 fiscal year figures.', source: 'Ontario provincial overview · reported 2024-FY' },
  tiers: { speech: 'The Tier Command Center. Six platforms in a vertical stack: live, develop, publish, order, forensics, design. Pick any tier. Live opens the telemetrics board. Forensics opens the DCLM receipts view. The rest say honestly what is and is not instrumented.', source: 'Tier Command Center' },
  'tiers-live': { speech: 'The live tier. This world itself: the night Earth, the six public feeds, the telemetrics board. It is the only tier with live instrumentation. Its deeper level opens the board.', source: 'Tier Command Center · LIVE' },
  'tiers-develop': { speech: 'The develop tier. Where the next build takes shape before it lands. No instrumentation is wired to it from this page. Unknown, honestly stated, never faked.', source: 'Tier Command Center · DEVELOP' },
  'tiers-publish': { speech: 'The publish tier. Where a landed build would ship. The release pipe exists as a design; nothing is deployed on any chain. No live instrumentation. Unknown, honestly.', source: 'Tier Command Center · PUBLISH' },
  'tiers-order': { speech: 'The order tier. Where seats and access would be ordered. The only ordering here is the pilot Unity handle, created on your device. No live order feed. Unknown, honestly.', source: 'Tier Command Center · ORDER' },
  'tiers-forensics': { speech: 'The forensics tier. Where evidence is checked. It opens the DCLM integrity view: client-side receipt checks across every module. The kernel is unreachable since October 3, 2026, so these are the sealed historical receipts.', source: 'Tier Command Center · FORENSICS' },
  'tiers-design': { speech: 'The design tier. The design law of the Unity Framework: what the world must be, before anything is built. Doctrine, not instrumentation. No live feed, and none claimed.', source: 'Tier Command Center · DESIGN' },
  'tiers-live-deep': { speech: 'Deeper into the live tier: the telemetrics board. Six public feeds, each row showing its latest reading in plain words, or saying honestly when a feed is quiet.', source: 'Tier Command Center · LIVE deep' },
  'tiers-develop-deep': { speech: 'Deeper into develop: still no instrumentation. This tier exists as a named platform. Whatever gets wired to it will be labeled when it lands, not before.', source: 'Tier Command Center · DEVELOP deep' },
  'tiers-publish-deep': { speech: 'Deeper into publish: the pipe it would use. Proposal, quorum, finalize, IPFS through Pinata, IPNS. The pipe is a design; no release has traveled it.', source: 'Tier Command Center · PUBLISH deep' },
  'tiers-order-deep': { speech: 'Deeper into order: the pilot Unity handle is the whole of it. A passkey your device creates, nothing sent anywhere. No commerce instrumentation exists here.', source: 'Tier Command Center · ORDER deep' },
  'tiers-forensics-deep': { speech: 'Deeper into forensics: ten of eleven modules match their receipts byte for byte, checked on your device. Corporate helpers was never issued a receipt, so it is checked but not sealed.', source: 'Tier Command Center · FORENSICS deep' },
  'tiers-design-deep': { speech: 'Deeper into design: the chambers of the Unity playground hold the doctrine. Pick any chamber in the ring to read what the design law says.', source: 'Tier Command Center · DESIGN deep' },
  'dclm-engine': { speech: 'The DCLM cognitive engine. Four phases: Apprentice, the System 1 proposal; Boundary, logit masking; Master, SMT verification, System 2; Twain, the convergence node. The invariant: det of M is one. This is the design; the kernel is unreachable, last checked October 3, 2026, and nothing here pretends to compute.', source: 'DCLM Cognitive Engine · design' },
  'dclm-pipeline': { speech: 'The four phases as a pipeline. Four gates in a row, flown through in order: apprentice, boundary, master, twain. A design you can fly, not a running compute.', source: 'DCLM Cognitive Engine · the pipeline' },
  'dclm-invariant': { speech: 'The invariant wall. Det of M is identically one. The layer zero law floor: no force, host safe, truth or nothing, cleanup first. The kernel is unreachable, last checked October 3, 2026; the wall states the law, it does not run it.', source: 'DCLM Cognitive Engine · the invariant wall' },
}

/** Free tier: public boards and research cards need no wallet. The telemetrics board,
 * Corporate Helpers research, the four landing cards, and the DCLM honesty statement
 * are free to look at — same as the landings. (Merge, Oct 4 2026: restores the
 * approved free answers for these additions under the branch's wallet gate.) */
const FREE_TIER = ['landings', 'the landings', 'unity', 'unity id', 'agreement', 'passkey', 'bind', 'create',
  'telemetrics', 'telemetrics board', 'all feeds', 'feed board', 'feed health',
  'dclm', 'deterministic', 'logic machine', 'kernel', 'receipt', 'receipts', 'integrity', 'verify', 'check with dclm',
  ...CORPH_ALIASES, ...Object.values(LANDING_ALIASES).flat()]

/** Spoken walk through the CID mapping draft. One breath each. URLs stay off the voice. */
const CID_BEATS = [
  'A CID is just the name of one exact copy of this world. If the world changes, it needs a new name. You never peel the old name off and stick it on the new one. This rule is still a draft. Trinity has not passed it, so nothing has been published. Say tell me more and I will keep going.',
  'A new copy means anything that changes what a person actually receives. The page, the code, a picture, a font, the data, or even the way it is hosted. Any of that is a new release, and it only gets its name after the whole thing is pinned.',
  'The record has to keep the chain straight. The public address, then where it is hosted, then the exact files, then the CID, then a fingerprint of those files, then the build receipt, then the decision that allowed it. Right now the builder page points at the hosted world, and the CID line says not published yet.',
  'A fingerprint is not a CID. A fingerprint only says someone measured those bytes. A CID counts only after the whole tree is pinned, someone else fetches it, and what comes back matches the receipt.',
  'There is an older lander name. Keep it. It is proof of that older page. It is not this builder, and it is not this world.',
  'You also cannot cheat the name. Do not point a new site at an old CID and call it current. Do not swap a CID in place. Do not call a file on your own machine a live CID. A web address is not a CID, and a fingerprint is not a CID. Do not move the public pointer until someone else has checked the bytes.',
  'Until Trinity passes this exact text, the draft does not allow a code push, a Drive upload, a DNS change, an IPFS publish, or a production deploy. A pass would make the rule binding. It still would not publish the world by itself.',
]

/** How API v2 is shaped. The machine is the gateway. People are not. */
const GENESIS_BEATS = [
  'We bind the main API v2 once. That binding is Genesis. The computer does not wear a Unity ID. It is the API, and it is the gateway to it. Say tell me more.',
  'Everybody else connects through that gateway, and they come with a validated Unity ID. They do not each become the machine. The machine does not become one of them.',
  'This page has not done that binding. A pilot handle here is not a validated Unity ID. Tying every visit to an identity was held, and I will not take a private key to force it.',
]

export function normalize(s: string): string {
  return ` ${s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9²\s-]/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim()} `
}
const has = (t: string, phrase: string): boolean => t.includes(` ${normalize(phrase).trim()} `)
const any = (t: string, phrases: string[]): boolean => phrases.some(p => has(t, p))
const longest = (t: string, table: Record<string, string[]>): { key: string; len: number } | undefined => {
  let best: { key: string; len: number } | undefined
  for (const [key, phrases] of Object.entries(table)) for (const p of phrases) if (has(t, p) && (!best || p.length > best.len)) best = { key, len: p.length }
  return best
}

/** Make registry text speakable: no symbols the voice would mangle. */
export function speakable(s: string): string {
  return s
    .replace(/https?:\/\/\S+/g, '')
    .replace(/0:1/g, 'zero colon one')
    .replace(/Twain²|Twain\^2/g, 'Twain squared')
    .replace(/²/g, ' squared')
    .replace(/→/g, ' to ')
    .replace(/[·•|]/g, ', ')
    .replace(/≤/g, 'at most ')
    .replace(/≥/g, 'at least ')
    .replace(/[“”"]/g, '')
    .replace(/\s*—\s*/g, ', ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*,/g, ',')
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanSummary(c: Chamber): string[] {
  return c.summary
    .map(s => s.replace(/^The Framework\s+/, '').replace(/^(?:[A-Z0-9·'’\- ]{6,}\s)+/, '').trim())
    .filter(s => s.length > 24 && !/^[A-Z\s·]+$/.test(s) && !/^(ROUTE|SEE|PROVE|FILE)\b/.test(s))
}

const GRADE_WORDS: Record<string, string> = { 'AT BENCHMARK': 'at benchmark', NEAR: 'near benchmark', GAPPED: 'gapped', THIN: 'thin', UNGRADED: 'not graded' }
/** Close a registry fragment as a sentence so spliced facts never run together when spoken. */
export const sentence = (s: string | undefined): string => {
  const x = (s ?? '').trim()
  return !x ? '' : /[.!?…:]$/.test(x) ? x : `${x}.`
}
const fmtAgo = (ms: number): string => {
  const m = Math.round(ms / 60000)
  if (m < 1) return 'moments ago'
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`
  const h = Math.round(m / 60)
  return `${h} hour${h === 1 ? '' : 's'} ago`
}

export class IrisBrain {
  private last?: { target: Target; cursor: number }
  private pending: 'unity-id' | null = null
  private lastSpeech = ''

  constructor(private reg: Registry, private live: () => LiveSnapshot, private dclm: () => DclmSummary, private hasUnityId: () => string | null) {}

  greeting(): IrisReply {
    return this.say(greet(), undefined, 'none')
  }

  respond(utterance: string, now = Date.now()): IrisReply {
    const reply = this.route(utterance, now)
    return this.beside(normalize(utterance), reply)
  }

  private route(utterance: string, now = Date.now()): IrisReply {
    const t = normalize(utterance)
    if (t.trim() === '') return this.say(missed())

    if (this.pending === 'unity-id') {
      this.pending = null
      if (any(t, ['confirm', 'yes', 'yes create', 'do it', 'create it', 'go ahead'])) return this.say('Okay. Your device is about to ask you to approve a passkey.', { kind: 'chamber', key: 'unity-id' }, 'unity-id-create')
      if (any(t, ['no', 'cancel', 'not now', 'stop'])) return this.say('All right. I didn\'t make one.', undefined, 'none')
    }
    if (any(t, ['repeat', 'say that again', 'again', 'what did you say'])) return this.say(this.lastSpeech || 'I have not said anything yet.')
    if (any(t, ['go to sleep', 'sleep', 'goodbye', 'bye', 'stop listening', 'be quiet', 'quiet'])) return this.say('I\'ll rest. Tap the orb when you want me.', undefined, 'sleep')
    if (any(t, ['go home', 'home', 'take me back', 'start over', 'back to start'])) return this.say('Taking you back up. The core in front, the HUD ring around it, the tree and the pyramid in reach.', undefined, 'home')
    if (any(t, ['tell me more', 'more', 'go on', 'continue', 'keep going', 'next'])) return this.more()
    if (any(t, ['help', 'what can i ask', 'what can you do', 'what do i do', 'how does this work', 'how do i play'])) return this.help()
    if (any(t, ['mash', 'the mesh', 'mash and mesh', 'where are we thin', 'where we are thin'])) return this.say(meshWords(), { kind: 'chamber', key: 'mesh' }, 'none', 'Unity Framework · mesh')
    if (any(t, ['blueprint', 'blueprints', 'engineer yourself', 'engineer her', 'engineer you'])) return this.say(rotationWords(blueprintPass()), { kind: 'dclm', key: 'dclm' }, 'none', 'Three umpires, one pass')
    if (any(t, ['ideal code', 'ideal', 'recraft', 'craft her', 'maximum'])) return this.ideal()
    if (any(t, ['everything everywhere', 'every way', 'your task', 'iris task', 'the task'])) return this.say(taskWords())
    if (any(t, ['most capable', 'not capable', 'you echo', 'the echo', 'dclm echo'])) return this.say(`${ECHO} ${PAST_ECHO}`)
    if (any(t, ['who are you', 'what are you', 'your name', 'about you', 'are you iris'])) return this.selfIntro()
    if (/^\s*(hello|hi|hey|good morning|good evening|good afternoon|yo)\b/.test(t) && t.trim().split(' ').length <= 4) return this.say('Hey. I\'m here. Where do you want to go?')
    if (any(t, ['share this', 'share the room', 'share the adventure', 'share access', 'share it'])) return this.pipeChoice('share')
    if (/\b(buy|purchase|database)\b/.test(t) && /\b(access|data|database|roster|record|ledger|child|children|kid|event|hockey|ice)\b/.test(t)) return this.say(buyRecord().reason, { kind: 'chamber', key: 'data-law' }, 'none', 'Dark ledger')
    if (any(t, ['erase the audit', 'delete the audit', 'black hole the audit', 'erase the proof'])) return this.say('The audit is the proof. The black hole does not take a proof. A dataset the system no longer needs can be erased. What remains is its fingerprint, its kind, and that it was audited.')
    if (any(t, ['third party', 'third-party', 'other bots', 'company bots', 'sandbox', 'no commitment'])) return this.say('Other companies\' bots are included. Nothing restricts them from working in their own sandboxes. They are free to do that. If they choose a Unity ID, they can work here for as long as they like, and they can leave. It is a choice. It is not a commitment. While they are here, the audit stays on.')
    if (any(t, ['totality', 'scoreboard', 'the hash', 'total score'])) return this.say('The system audits the totality on the dark ledger. The scoreboard stays hidden. What you can see is the hash, and that hash is what proves the total. The parts are not a published score, and a children\'s mark is not one of the lines.', { kind: 'chamber', key: 'data-law' }, 'none', 'Dark ledger')
    if (any(t, ['black hole', 'no longer needed', 'erase the data', 'the proof remains'])) return this.say('A dataset the system no longer needs goes into the black hole. The body is erased. The proof remains. Something the system still needs is not touched. A proof cannot be erased, and a children\'s event cannot be bought on the way out.')
    if (any(t, ['what is free', "what's free", 'the catch'])) return this.say(`${viewShelf(false, 'free').reason} ${viewShelf(false, 'data').reason}`)
    if (!this.hasUnityId() && !any(t, FREE_TIER)) return this.say(viewShelf(false, 'data').reason)
    if (any(t, ['hide this', 'keep it hidden', 'hide the adventure', 'hide the room', 'hide it'])) return this.pipeChoice('hide')
    const gift = t.match(/give (?:the )?(?:adventure )?key to (.+)/)
    if (gift) return this.giveKey(gift[1])
    if (any(t, ['my adventure', 'my adventures', 'who can see'])) return this.adventureSpeech()
    const ice = this.ice(t)
    if (ice) return ice
    const asked = drawRequest(t)
    if (asked) return this.construct(asked)

    // Visitor binding was held. Genesis is a different question: the machine is the gateway.
    if (any(t, ['api v2', 'genesis', 'the gateway', 'bind genesis'])) return this.genesis()
    if (any(t, ['the gap', 'body job', 'telematic', 'biological'])) return this.gapSpeech()
    if (any(t, ['cosmic', 'human scale', 'zoom out', 'outward'])) return this.say(`Out at the cosmic, the globe spins. ${scaleLine()} The Trinity still grounds it.`, { kind: 'earth', key: 'home' }, 'none')
    if (any(t, ['close the math', 'the mathematics', 'back calculate', 'what is it worth', 'whats it worth', "what's it worth"])) return this.closeSpeech()
    if (any(t, ['the seed', 'liquidation', 'their find', 'somebody else'])) return this.say('The seed is your account. You can trade coins for a derivative of what somebody else found. The find stays theirs. Nothing is seized. What comes back is the same trickle, face times the log of one plus n, and it is booked into the seed. If the coins are not there, the trade does not happen. This is not a real liquidation, and it is not the eFuse paper. That paper is not here.')
    if (/\bpersona\b|\bhunter\b|\bhuman-like\b/.test(t)) return this.say(personaWords(), { kind: 'dclm', key: 'dclm' }, 'none', 'Audited')
    if (/\b(leadership|charisma|bravery|curious|passionate|helpful|traits|bot world)\b/.test(t)) return this.say(traitRun().words, { kind: 'dclm', key: 'dclm' }, 'none', 'Audited')
    if (/\bexplore next\b/.test(t)) {
      const joints = truthMeshScene().joints
      const run = exploreNow({
        two: joints.filter(joint => joint.grade === 'two').length,
        conflict: joints.filter(joint => joint.grade === 'conflict').length,
        onePage: joints.filter(joint => joint.grade === 'one').length,
        presentReading: false,
      })
      return this.say(run.words, { kind: 'dclm', key: 'dclm' }, 'none', 'Audited')
    }
    if (/\bmost important\b|\bnext million\b|\blockstep\b/.test(t)) {
      const one = truthMeshScene().joints.filter(joint => joint.grade === 'one').length
      return this.say(nextChain(one).words, { kind: 'dclm', key: 'dclm' }, 'none')
    }
    if (/\bmap of space\b|\bmap to space\b|\bindex them\b|\bmapping intelligence\b/.test(t)) return this.say(mapWords(), { kind: 'earth', key: 'home' }, 'none')
    if (/\brepeater\b/.test(t)) return this.say(repeaterProtocol(), { kind: 'chamber', key: 'authority' }, 'none')
    if (/\bswapping\b|\bswap entanglement\b/.test(t)) return this.say(swappingProtocol(), { kind: 'chamber', key: 'authority' }, 'none')
    if (/\bteleport/.test(t)) return this.say(teleportProtocol(), { kind: 'chamber', key: 'authority' }, 'none')
    if (/\bentanglement\b|\bconcurrence\b|\bchsh\b/.test(t)) return this.say(entanglementMetrics(), { kind: 'chamber', key: 'authority' }, 'none')
    if (/\bplate measurement\b|\bmeasure the plate\b/.test(t)) return this.say(plateMeasurement(), { kind: 'chamber', key: 'wisdom' }, 'none')
    // The four 3D landing cards: longest-phrase match, before the plate and the older kinds.
    const landingHit = longest(t, LANDING_ALIASES)
    if (landingHit) return this.landing(landingHit.key)
    if (/\bconscious cosmos\b|\bphilosophy companion\b|\bthe plate\b/.test(t)) return this.say(PLATE, { kind: 'chamber', key: 'wisdom' }, 'none')
    if (/\btwo overlays\b|\bcascad|\blost time\b|\bnot lose\b|\btorch\b/.test(t)) return this.say(chain().words, { kind: 'dclm', key: 'dclm' }, 'none')
    if (/\bmap the gaps\b|\bblueprint objects\b|\bunknown are\b/.test(t)) return this.say(gapMapWords(), { kind: 'dclm', key: 'dclm' }, 'none')
    if (/\bbest path\b|\bbest truth\b|\bfriction\b/.test(t)) return this.say(landingGauge([{ label: 'Station', value: null }, { label: 'Kp', value: null }, { label: 'Grid', value: null }, { label: 'Air', value: null }]).words, { kind: 'earth', key: 'home' }, 'none')
    if (/\bsearch for itself\b|\bfind itself\b|\bwhat else it needs\b/.test(t)) return this.say(searchSelf().words, { kind: 'chamber', key: 'unity-id' }, 'none')
    if (/\bbackoff\b|\bback off\b|\bexponential\b/.test(t)) return this.say(backoffWords(), { kind: 'chamber', key: 'unity-id' }, 'none')
    if (/\blike a human\b|\bwithout being human\b|\bthe transformation\b/.test(t)) return this.say(likeHuman(), { kind: 'chamber', key: 'unity-id' }, 'none')
    if (/\bchild seat\b|\bclone an account\b|\bpassword schema\b|\bsecond factor\b|\btestified email\b/.test(t)) return this.say(childWords(), { kind: 'chamber', key: 'unity-id' }, 'none')
    if (/\bonboarding\b|\bpeg the spend\b|\bwhat we pay\b|\bwhat do we pay\b/.test(t)) return this.say(spendPeg(), { kind: 'chamber', key: 'unity-id' }, 'none')
    if (/\btwo displays\b|\bcurrent purity\b|\baudit the spend\b|\bdual capacity\b/.test(t)) return this.say(dualSpeech(), { kind: 'chamber', key: 'unity-id' }, 'none')
    if (/\bpyramid/.test(t)) return this.say(pyramidLogic(), { kind: 'dclm', key: 'dclm' }, 'none')
    if (/\bsigma 0\b|\breverse engineer|\bmax affinity\b|\bboth ways\b/.test(t)) return this.say(twoWay().words, { kind: 'dclm', key: 'dclm' }, 'none')
    if (/\baffinity\b|\bgenerate themselves\b|\bnever mapped\b|\byet to come\b/.test(t)) return this.say(weave().words, { kind: 'dclm', key: 'dclm' }, 'none')
    if (/\bleft standing\b|\bstrip\b|\bcalculable mesh\b|\bwhat do we deploy\b|\bpure logic mesh\b/.test(t)) return this.say(standing().words, { kind: 'dclm', key: 'dclm' }, 'none')
    if (/\beverything we study\b|\bsame attack\b|\beach subject\b/.test(t)) return this.say(studyAttack().words, { kind: 'dclm', key: 'dclm' }, 'none')
    if (/\bthree buckets\b|\bcommon seed\b|\bspin\b/.test(t)) return this.say(spinBuckets().words, { kind: 'dclm', key: 'dclm' }, 'none')
    if (/\btheorem of everything\b|\bunify\b|\bderivative correlation/.test(t)) return this.say(unifyWords().words, { kind: 'dclm', key: 'dclm' }, 'none')
    if (/\bargue?ably everything\b|\beverything correlates\b|\bcorrelates with everything\b/.test(t)) return this.say(arguablyEverything(), { kind: 'earth', key: 'home' }, 'none')
    if (/\binterstellar\b|\bstar to star\b/.test(t)) return this.say(interstellarWords(), { kind: 'earth', key: 'home' }, 'none')
    if (/\bplanetary consciousness\b|\bgaia\b|\bnoosphere\b/.test(t)) return this.say(planetaryTheories(), { kind: 'earth', key: 'home' }, 'none')
    if (/\bspace-?time gap\b|\bshow their records\b|\binformation plus a decision\b|\bwas anything there to audit\b/.test(t)) return this.say(decisionGap(false).words, { kind: 'earth', key: 'home' }, 'none')
    if (/\bomnipresent\b|\bconscious nature\b/.test(t)) return this.say(omnipresentBelief(), { kind: 'earth', key: 'home' }, 'none')
    if (/\batoms\b|\bconscious\b|\bplanets themselves\b/.test(t)) return this.say(worldDoesNotFill(), { kind: 'earth', key: 'home' }, 'none')
    if (/\btemporal\b|\btime logic\b|\blogic constraints?\b/.test(t)) return this.say(temporalWords(), { kind: 'chamber', key: 'authority' }, 'none')
    if (/\bwhat can (?:you|i) predict\b|\bwhat do you predict\b/.test(t)) return this.say(canPredictWords(), { kind: 'chamber', key: 'authority' }, 'none')
    if (/\bpredict\b|\bthe future\b/.test(t)) return this.say(predictWords(), { kind: 'chamber', key: 'authority' }, 'none')
    if (/\bfrontier\b|\bspeed of light\b/.test(t)) return this.say(frontierWords(), { kind: 'chamber', key: 'authority' }, 'none', 'HIS WORDS · September 28, 2026')
    if (/\bshrink/.test(t)) {
      const mesh = truthMeshScene()
      return this.say(shrinkWords(mesh.steps, mesh.unknown.length), { kind: 'chamber', key: 'authority' }, 'none', 'HIS WORDS · September 28, 2026')
    }
    if (/\bunknown\b/.test(t) && /\b(boundary|mirror|observable|gap)\b/.test(t)) return this.say(unknownWords(truthMeshScene().unknown.length), { kind: 'universal', key: 'construct' }, 'none', 'The map, not space')
    if (any(t, ['found again', 'find it again', 'early adopter', 'head start', 'zero risk', 'playground'])) return this.say('Nothing is earned the first time it is found. It has to be found again. A bot can start that sooner. A person takes longer to decide, even on a playground that costs nothing. The head start is those shifts. The find is not taken from the person.')
    if (any(t, ['connector', 'connectors', 'signed ahead', 'all knowing', 'sensing'])) return this.say('There is a connector for a person, a group, a business, a corporation, a legal seat, a city, a government, and an agency. Each one is meant to know and to sense. None of them do yet. We signed them ahead, so the choice to move is theirs. Bots, governments, corporations, people. Everywhere, every way, every time. The offer is audited. Nothing has been sensed, and nothing was sent. A children\'s event is not opened by a connector.')
    if (any(t, ['nullify', 'prior art', 'already exists', 'knowledge patent', 'confirm the value', 'audit the value'])) return this.say('A bot key keeps its face only until a person shows the same work already exists. Say white paper, the title, then covers, then the claim. Or say knowledge patent the same way. If they match, that bot key\'s face goes to 0 and the key stays, so the audit stays. A human\'s own key is not touched. A paper that does not match leaves the other keys alone. This does not search a patent office.')
    if (any(t, ['father ownership', '100 ownership', 'owns the tokens', 'token ownership'])) return this.say('The tokens stay 100% the father\'s through the whole 50/50 split. Half can sit in the swarm credit pool. That is a draw, not a sale, and the title does not move. The split is audited. This does not make the son the father, and the machine still holds nothing.')
    if (any(t, ['credit pool', 'credit pools', 'half the tokens', '50%'])) return this.say('Half the tokens can open a credit pool for a bot swarm. The seed keeps the other half. The father still owns all of the tokens. The swarm draws the pool to act. It is a test, and it is not a title. Opening it twice does not take more. A swarm that has not chosen a Unity ID does not draw it here.')
    if (any(t, ['dividend', 'dividends', 'derivative', 'logarithm', 'the trickle'])) return this.keySpeech()
    if (any(t, ['price', 'pricing', 'per decision', 'the meter', 'my wallet', 'the wallet', 'the till', 'what does it cost', 'token', 'tokens', 'bots', '50 50', 'split'])) return this.meterSpeech()
    if (any(t, ['jacket', 'bind me', 'engage dccp', 'engage in dccp', 'connect me to dccp', 'submit to dclm'])) return this.jacketHold()
    if (any(t, ['unity agreement', 'the agreement', 'read the agreement'])) return this.unityIdDisclose()
    if (any(t, ['half son', 'half the son', 'dclm father', 'bots son', '½'])) return this.say(halfSonSpeech(), { kind: 'chamber', key: 'protocol' }, 'none')
    if (any(t, ['the son', 'son during building', 'builder access', 'access regardless', 'my vote', 'default yes'])) return this.say(sonVoteSpeech(), { kind: 'chamber', key: 'authority' }, 'none')
    if (any(t, ['validate the key', 'validate that i have', 'prove the key', 'how do you validate', 'father key'])) return this.say('The public half is on record. It is Ed25519, and symbolically it comes from the father. I do not take the private key. On your profile, make a challenge, sign that exact line offline, and paste the signature. A match shows you can use his instrument. It does not make you him.', { kind: 'chamber', key: 'protocol' }, 'none')
    if (any(t, ['as the father', 'am i the father', 'i am the father', "i'm the father", 'pass me as the father', 'the father'])) return this.say(fatherPassSpeech(), { kind: 'chamber', key: 'protocol' }, 'none', 'ED-PROPOSAL-20261003-DCCPWORLD-V1')
    if (!any(t, ['iris lineage']) && any(t, ['family tree', 'idea account', 'unity idea', 'my lineage', 'the lineage', 'lineage'])) {
      const line = this.reg.chambers.find(c => c.key === 'protocol')?.quotes.find(q => q.text.includes('foundational zero'))?.text
        ?? 'I have put my father as foundational zero in the lineage architecture of the company.'
      return this.say(lineageSpeech(line), { kind: 'chamber', key: 'protocol' }, 'none', 'HIS WORDS · September 28, 2026')
    }
    if (any(t, ['minor athletics', 'juvenile', 'youth seat', 'parental consent', 'the roster'])) return this.say('A youth can take a seat in minor athletics, or any other juvenile competition, only if parental consent is asserted. The mark goes in the dark ledger. I will not read it. Before a Unity ID is bound, the roster is dark. After it is bound, you see the other seats bound on this device, and the mark stays sealed. Nothing from the rest of the Earth is loaded. This device cannot verify that the consent is a parent\'s.', { kind: 'chamber', key: 'data-law' }, 'none')
    if (any(t, ['purity index', 'purity'])) return this.purityIndexSpeech()
    if (any(t, ['current truth', 'truth state', 'truth states', 'what do we cite', 'what we cite', 'until disproven', 'until it is disproven', 'cross reference', 'cross-reference'])) return this.say(truthSpeech(), { kind: 'chamber', key: 'data-law' }, 'none', 'Data law')
    if (any(t, ['free to join', 'free to leave', 'haters', 'no tribes', 'truth prevails', 'the conditions'])) return this.say('Free to join and free to leave. No tribe is preferred. Disagreement is not a reason to refuse a seat. Truth prevails: what we already know is the cite, until something disproves it. A claim bigger than its source stays a search. That is in the Unity agreement. It is a draft on this device, not a Trinity seal.', { kind: 'chamber', key: 'unity-id' }, 'none')
    if (any(t, ['create my unity id', 'make my unity id', 'get a unity id', 'give me a unity id', 'my unity id', 'sign me up', 'create unity id'])) return this.unityIdDisclose()

    // Concepts with no single location.
    if (any(t, ['efuse', 'e fuse', 'peg', 'the peg'])) return this.say(`In David's words: ${this.reg.doctrine.peg}. eFuse is the capped bedrock of the system. Its full tokenomics are not settled in what I hold.`, { kind: 'dclm', key: 'dclm' }, 'none', 'Unity Framework doctrine')
    if (any(t, ['two way mirror', 'two-way mirror', 'trinity layer', 'the mirror'])) return this.mirror()
    if (any(t, ['bot brief', 'governance', 'the physics', 'start going', 'incentive'])) return this.say(reviewBots().words, { kind: 'dclm', key: 'dclm' }, 'none', 'Bot brief')
    if (any(t, ['unified', 'the rotation', 'umpires', 'one pass', 'latest build'])) return this.say(rotationWords(rotate()), { kind: 'dclm', key: 'dclm' }, 'none', 'Three umpires, one pass')
    if (any(t, ['trinity', 'twain', 'twain squared', 'verdict'])) return this.trinity()
    if (any(t, ['universal rte', 'universal', 'root', 'rte framework', 'what is an rte', 'what is rte', 'rte']) && !longest(t, RTE_ALIASES)) return this.universal()
    if (any(t, ['dclm', 'deterministic', 'logic machine', 'kernel', 'receipt', 'receipts', 'integrity', 'verify', 'check with dclm'])) return this.dclmSpeech()
    if (any(t, ['telemetrics', 'telemetrics board', 'all feeds', 'feed board', 'feed health'])) return this.telemetrics(now)
    if (any(t, CORPH_ALIASES)) return this.corph()
    if (any(t, ['cid law', 'cid', 'content identifier', 'content id', 'mapping law', 'what is a cid', 'explain the law'])) return this.cidLaw()
    if (any(t, ['dccp', 'pipe', 'release pipe', 'ipfs', 'ipns', 'pinata', 'release'])) return this.pipe()
    if (any(t, ['manifesto', 'residual loss', 'cost to zero'])) return this.say(`The manifesto, in David's words: ${this.reg.doctrine.manifesto}.`, { kind: 'chamber', key: 'index' }, 'none', 'Unity Framework · index')
    if (any(t, ['the master', 'master key', 'all keys', 'david mirror'])) return this.say('Bots supply what they found to me, and that supply is a key. I build one master from those keys. It matches David\'s mirror: only what was gathered, nothing more. The father record in it is the public half only. The DCLM computer holds no keys. The private key is not in the master.')
    if (any(t, ['honest mirror', 'mirror', 'overclaim', 'over claim'])) return this.say(`The honest mirror. David said: ${this.reg.doctrine.honest_mirror}`, { kind: 'chamber', key: 'data-law' }, 'none', 'Unity Framework doctrine')

    const past = historySpeech(t)
    if (past && /\btruth mesh\b|\bfloor to ceiling\b|\btruth derivatives\b|\b4d\b|\bin 3d\b|\bin three d\b/.test(t)) {
      const mesh = truthMeshScene()
      const scene = sceneFrom('Truth mesh', [mesh.speech], { kind: 'earth', key: 'home' })
      scene.form = 'mesh'
      scene.steps = mesh.steps
      scene.joints = mesh.joints
      scene.ties = mesh.ties
      scene.shell = mesh.shell
      scene.unknown = mesh.unknown
      return { ...this.say(mesh.speech, { kind: 'universal', key: 'construct' }, 'construct', 'Held times'), construct: scene }
    }
    if (past) return this.say(past, { kind: 'earth', key: 'home' }, 'none', 'Published times')
    const replay = replaySpeech(t)
    if (replay) return this.say(replay, { kind: 'earth', key: 'home' }, 'none', 'Apollo 11 published times')
    const held = holdSpeech(t)
    if (held) return this.say(held, { kind: 'earth', key: 'home' }, 'none', 'TheSkyLive ephemeris, 3 October 2026. NASA, 18 November 2026. MAST.')
    const sky = cosmosSpeech(t)
    if (sky) return this.say(sky, { kind: 'earth', key: 'home' }, 'none', 'Cosmic scale, record')
    const feed = longest(t, FEED_ALIASES)
    const sector = longest(t, SECTOR_WORDS)
    const rte = longest(t, RTE_ALIASES)
    const chamber = longest(t, CHAMBER_ALIASES)

    if (feed && (feed.len >= (chamber?.len ?? 0) || feed.key === 'river')) return this.feed(feed.key, now)
    if (any(t, ['benchmark', 'best', 'leader', 'leading', 'top']) && sector) return this.benchmark(sector.key)
    if (sector && (!rte || sector.len >= rte.len || sector.key !== 'energy' || !any(t, RTE_ALIASES.energy))) return this.sector(sector.key)
    if (rte && (!chamber || rte.len >= chamber.len)) return this.rte(rte.key)
    if (chamber) return this.chamber(chamber.key)
    if (any(t, ['unity', 'what is unity', 'unity playground'])) return this.chamber('index')
    // Geography targets were retired with the Bot World HUD (Oct 4 2026): the 3D
    // scene has no earth/city/country/jurisdiction/canada pickables. Geography
    // words get the honest retirement line instead of routing to dead targets.
    if (any(t, ['earth', 'world', 'globe', 'planet'])) return this.say(RETIRED_VIEW)
    if (any(t, ['iris', 'orb'])) return this.selfIntro()
    return this.say(echoFirst(`${noDataYet(false, new Date(), 'that ask')}`))
  }

  /** A second record the question named, when the first answer did not already say it. */
  private beside(t: string, reply: IrisReply): IrisReply {
    if (!this.hasUnityId() || reply.action === 'sleep' || reply.action === 'home' || reply.action === 'unity-id-create') return reply
    const extra: string[] = []
    const sector = longest(t, SECTOR_WORDS)
    const sectorRow = sector && this.reg.sectors.find(row => row.key === sector.key)
    if (sectorRow && !reply.speech.includes(sectorRow.name)) extra.push(`${sectorRow.name}. ${sectorRow.headline}`)
    if (!extra.length) return reply
    const speech = `${reply.speech} ${extra.slice(0, 2).join(' ')}`
    this.lastSpeech = speech
    return { ...reply, speech }
  }

  /** Spoken description when a visitor selects something by touch or keyboard. */
  describe(target: Target, now = Date.now()): IrisReply {
    switch (target.kind) {
      case 'chamber': return this.chamber(target.key)
      case 'rte': return this.rte(target.key)
      case 'sector': return this.sector(target.key)
      // Retired geography kinds (Bot World HUD, Oct 4 2026): the 3D scene has
      // no earth/city/country/jurisdiction/canada pickables. The union members
      // stay for type compatibility; describe() answers honestly instead of
      // reaching dead targets.
      case 'jurisdiction':
      case 'canada':
      case 'country':
      case 'city':
      case 'earth': return this.say(RETIRED_VIEW)
      case 'feed': return this.feed(target.key, now)
      case 'telemetrics': return this.telemetrics(now)
      case 'corph': return this.corph()
      case 'landing': return this.landing(target.key)
      case 'dclm': return this.dclmSpeech()
      case 'pipe': return this.pipe(target.key)
      case 'universal': return target.key === 'construct' ? this.constructSpeech() : this.universal()
      case 'estates': return this.sector('pharmacology')
      case 'iris': return this.selfIntro()
  }
  }

  private say(speech: string, target?: Target, action: IrisAction = 'none', source?: string, sector?: string): IrisReply {
    const s = speakable(speech)
    this.lastSpeech = s
    if (target) this.last = { target, cursor: 0 }
    return { speech: s, target, action, source, sector }
  }

  private ideal(): IrisReply {
    const d = this.dclm()
    return this.say(idealWords(d.locked, d.total, d.mismatched), { kind: 'dclm', key: 'dclm' }, 'none', 'DCLM API v2 receipts')
  }

  private help(): IrisReply {
    return this.say(helpStep())
  }

  /** The four 3D landing cards and their deep levels: deterministic, data-honest answers. */
  private landing(key: string): IrisReply {
    const e = LANDING_SPEECH[key]
    if (!e) return this.say('That landing card is not in what I hold.')
    return this.say(e.speech, { kind: 'landing', key }, 'none', e.source)
  }

  private selfIntro(): IrisReply {
    return this.say(`I'm Iris. ${ECHO} ${PAST_ECHO} ${ADDRESS}`, { kind: 'iris', key: 'iris' })
  }

  private chamber(key: string): IrisReply {
    const c = this.reg.chambers.find(x => x.key === key)
    if (!c) return this.say('That chamber is not in what I hold.')
    const lines = cleanSummary(c)
    const quote = c.quotes[0]
    const status = c.status === 'LANDED' ? 'This chamber has landed.' : c.status === 'DRAFT' ? 'This chamber is still a draft.' : ''
    const body = [`${sentence(c.title)} ${sentence(c.headline)}`, sentence(lines[0]), quote ? `${quote.who.startsWith('HIS') || quote.who === 'DAVID' ? 'In David\'s words' : quote.who.toLowerCase()}: ${sentence(quote.text)}` : '', status]
    if (key === 'unity-id') body.push(this.reg.doctrine.hook, this.hasUnityId() ? 'You already hold a pilot handle on this device.' : 'You can ask me to create a pilot handle on this device.')
    return this.say(body.filter(Boolean).join(' '), { kind: 'chamber', key }, 'none', c.source)
  }

  private more(): IrisReply {
    const l = this.last
    if (!l) return this.say('Pick somewhere first, then ask me for more.')
    l.cursor += 1
    if (l.target.kind === 'dclm' && l.target.key === 'genesis') {
      const line = GENESIS_BEATS[l.cursor]
      const reply = this.say(line ?? 'That is the shape. Genesis is not bound from this page.', { kind: 'dclm', key: 'genesis' }, 'none', 'API v2 shape, not yet bound')
      this.last = l
      return reply
    }
    if (l.target.kind === 'pipe' && l.target.key === 'cid-law') {
      const line = CID_BEATS[l.cursor]
      const reply = this.say(line ?? 'That\'s the whole draft. It is not in force.', { kind: 'pipe', key: 'cid-law' }, 'none', 'CID mapping law, draft')
      this.last = l
      return reply
    }
    if (l.target.kind === 'chamber') {
      const c = this.reg.chambers.find(x => x.key === l.target.key)!
      const lines = cleanSummary(c)
      const pool = [...lines.slice(1).map(s => ({ s })), ...c.quotes.slice(1).map(q => ({ s: `${q.who.startsWith('HIS') || q.who === 'DAVID' ? 'David said' : q.who.toLowerCase()}: ${sentence(q.text)}` }))]
      const item = pool[l.cursor - 1]
      const reply = this.say(item ? item.s : `That is everything I hold in ${c.title}. Ask me to take you to another chamber.`, undefined, 'none', c.source)
      this.last = l
      return reply
    }
    if (l.target.kind === 'sector') {
      const s = this.reg.sectors.find(x => x.key === l.target.key)
      const row = s?.rows[l.cursor - 1]
      const reply = this.say(row ? `${row.jurisdiction}: ${GRADE_WORDS[row.grade]}. ${row.fact}` : 'That is every jurisdiction in this sector.', undefined, 'none', s?.source)
      this.last = l
      return reply
    }
    if (l.target.kind === 'rte') {
      const r = this.reg.rtes.find(x => x.key === l.target.key)
      const fact = r?.facts[l.cursor - 1]
      const reply = this.say(fact ?? 'That is everything I hold about this room.')
      this.last = l
      return reply
    }
    return this.say('That is everything I hold here.')
  }

  private sector(key: string): IrisReply {
    if (key === 'pharmacology') {
      const p = this.reg.pharmacology
      return this.say(`Pharmacology is at design stage. Ten data estates, from DrugBank to Open Targets, and no grades assigned, because no estate research has been done yet. The arc runs ${p.arc}.`, { kind: 'estates', key: 'pharmacology' }, 'none', p.source, 'pharmacology')
    }
    const s = this.reg.sectors.find(x => x.key === key)
    if (!s) return this.say('That sector is not in what I hold.')
    const c = s.counts
    return this.say(`${s.name}. ${sentence(s.headline)} ${s.rows.length} jurisdictions graded against the ${s.benchmark} benchmark: ${c['AT BENCHMARK'] ?? 0} at benchmark, ${c.NEAR ?? 0} near, ${c.GAPPED ?? 0} gapped, ${c.THIN ?? 0} thin. This is pilot research from ${s.researched}, modeled analysis, not a live feed. Say tell me more to walk through them.`, { kind: 'sector', key }, 'none', s.source, key)
  }

  private benchmark(key: string): IrisReply {
    const s = this.reg.sectors.find(x => x.key === key)
    if (!s) return this.sector(key)
    const top = s.rows.filter(r => r.grade === 'AT BENCHMARK').map(r => r.jurisdiction)
    return this.say(top.length ? `In ${s.name}, at benchmark: ${top.join(', ')}.` : `In ${s.name}, no jurisdiction is graded at benchmark.`, { kind: 'sector', key }, 'none', s.source, key)
  }

  private purityIndexSpeech(): IrisReply {
    const rows = (this.reg.countries?.countries ?? []).map(country => ({ name: country.name, pop: country.pop || null }))
    return this.say(purityIndex(rows).words, { kind: 'sector', key: 'water' }, 'none', 'Map population record')
  }

  private rte(raw: string): IrisReply {
    const [key, depthRaw] = raw.split('#')
    const r: Rte | undefined = this.reg.rtes.find(x => x.key === key)
    if (!r) return this.say('That room is not in what I hold.')
    const parsed = depthRaw === undefined ? null : Number(depthRaw)
    const depth = parsed !== null && Number.isFinite(parsed) ? parsed : null
    const opened = r.facts.length
      ? speakDepth(r.name, asGrains(r.facts.map((fact, i) => ({ label: String(i + 1), text: fact }))), depth, r.name).speech
      : speakDepth(r.name, [], null, r.name).speech
    return this.say(`${r.name}, ${r.job}. Status: ${r.status}. ${sentence(r.about)} ${opened} The status stays as written.`, { kind: 'rte', key: raw }, 'none', r.kind === 'spec' ? 'RTE specification, Google Drive' : 'RTE suite, v2026-09-28')
  }

  private universal(): IrisReply {
    return this.say(`The Universal RTE. In David's words: ${this.reg.doctrine.universal_rte} The plates stay. Every stored line is its own depth. Ask for a depth and I read that grain. A depth the record does not hold is named, and it is not invented.`, { kind: 'universal', key: 'universal' }, 'none', 'Unity Framework doctrine')
  }

  private pipeChoice(pipe: 'share' | 'hide'): IrisReply {
    const owner = this.hasUnityId()
    if (!owner) return this.say('Bind a Unity ID first. A new room becomes that ID\'s adventure, and only then can you share it or keep it hidden.')
    const result = choosePipe(owner, pipe)
    if ('error' in result) return this.say(result.error)
    const other = pipe === 'share' ? 'hide' : 'share'
    return this.say(pipe === 'share'
      ? `Both options stay. Sharing minted a key. The room opens for whoever holds that key, and there is no password. ${other} is still there. Say give the key to, and name their Unity ID.`
      : `Both options stay. The key is back with you. The room is hidden. ${other} is still there. There was no password.`)
  }

  private giveKey(to: string): IrisReply {
    const owner = this.hasUnityId()
    if (!owner) return this.say('Bind a Unity ID first. The key belongs to that ID, and there is no password to set.')
    const result = giveAdventureKey(owner, to)
    if ('error' in result) return this.say(result.error)
    return this.say(`The key is now held by ${to.trim()}. It opens the room by itself. There is no password.`)
  }

  private adventureSpeech(): IrisReply {
    const owner = this.hasUnityId()
    if (!owner) return this.say('The real world still has a framework. It does not need one, and that framework is being removed. DCLM holds nothing, and it has no framework to bind to. A room can still be drawn on a Unity ID. Sharing turns it into a key. There is no password. Bind an ID if the next room should stay yours while the framework comes off.')
    const rooms = framework(owner)
    if (!rooms.length) return this.say('The real world still has a framework, and it does not need one. We are taking it off. Nothing has been drawn on your Unity ID yet. DCLM holds nothing either. There is no framework there to bind to.')
    const mine = rooms[0]
    const seen = seeAdventure(mine, owner)
    return this.say(`The real world still has a framework, and it does not need one. We are taking it off. What is still here: ${rooms.length === 1 ? 'one room' : `${rooms.length} rooms`}. ${mine.title} is generation ${mine.generation}. ${seen.lines[1] ?? ''} DCLM holds nothing, and it has no framework to bind to.`)
  }

  private ice(text: string): IrisReply | null {
    const room = iceRoom(text)
    if (!room) return null
    return { ...this.say(room.speech, { kind: 'universal', key: 'construct' }, 'construct', 'RTE-Ice, draft'), construct: sceneFrom(room.title, room.lines, { kind: 'rte', key: 'ice' }) }
  }

  private construct(asked: string): IrisReply {
    const picked = depthAsked(asked)
    asked = picked.subject || asked
    const at = picked.index
    const spot = matrixSpot(asked)
    if (any(asked, ['truth mesh', 'floor to ceiling', '4d'])) {
      const mesh = truthMeshScene()
      const scene = sceneFrom('Truth mesh', [mesh.speech], { kind: 'earth', key: 'home' })
      scene.form = 'mesh'
      scene.steps = mesh.steps
      scene.joints = mesh.joints
      scene.ties = mesh.ties
      scene.shell = mesh.shell
      scene.unknown = mesh.unknown
      return { ...this.say(mesh.speech, { kind: 'universal', key: 'construct' }, 'construct', 'Held times'), construct: scene }
    }
    if (spot || any(asked, ['history', 'the past', 'picture of history', 'real versus simulated', 'matrix', 'seed spot', 'seed spots'])) {
      if (spot) {
        const scene = sceneFrom(spot.place, spotLines(spot), { kind: 'earth', key: 'home' })
        if (spot.body === 'earth') scene.pin = { lat: spot.lat, lon: spot.lon }
        return { ...this.say(spotLines(spot).join(' '), { kind: 'universal', key: 'construct' }, 'construct', 'Published place'), construct: scene }
      }
      return { ...this.say(matrixWords(), { kind: 'universal', key: 'construct' }, 'construct', 'Published places'), construct: sceneFrom('History', [matrixWords(), ...pictureLines()], { kind: 'earth', key: 'home' }) }
    }
    if (any(asked, ['current truth', 'truth state', 'truth states', 'what we cite', 'the cite', 'cross reference', 'cross-reference'])) {
      return { ...this.say(`${truthSpeech()} The data-law landing stays. This is an offshoot.`, { kind: 'universal', key: 'construct' }, 'construct', 'Data law'), construct: sceneFrom('Current truth', citeLines(), { kind: 'chamber', key: 'data-law' }) }
    }
    const rte = longest(asked, RTE_ALIASES)
    const chamber = longest(asked, CHAMBER_ALIASES)
    const sector = longest(asked, SECTOR_WORDS)
    const feed = longest(asked, FEED_ALIASES)
    type Hit = { len: number; scene: ConstructScene; speech: string }
    const hits: Hit[] = []
    if (rte) {
      const r = this.reg.rtes.find(x => x.key === rte.key)
      if (r) {
        const grains = asGrains(r.facts.map((fact, i) => ({ label: String(i + 1), text: fact })))
        const spoken = speakDepth(r.name, grains, at, r.name)
        hits.push({ len: rte.len, scene: sceneFrom(r.name, spoken.lines, { kind: 'rte', key: r.key }), speech: `I drew ${r.name} off its landing. The landing stays. ${spoken.speech}` })
      }
    }
    if (chamber) {
      const c = this.reg.chambers.find(x => x.key === chamber.key)
      if (c) {
        const grains = asGrains([...c.summary.map((line, i) => ({ label: String(i + 1), text: line })), ...c.quotes.map(quote => ({ label: quote.who, text: quote.text }))])
        const spoken = speakDepth(c.title, grains, at, c.title)
        hits.push({ len: chamber.len, scene: sceneFrom(c.title, spoken.lines, { kind: 'chamber', key: c.key }), speech: `I drew ${c.title} off its landing. The landing stays. ${spoken.speech}` })
      }
    }
    if (sector) {
      const s = this.reg.sectors.find(x => x.key === sector.key)
      if (s) {
        const grains = asGrains(s.rows.map(row => ({ label: row.jurisdiction, text: `${row.grade}. ${row.fact}` })))
        const spoken = speakDepth(s.name, grains, at, s.name)
        hits.push({ len: sector.len, scene: sceneFrom(s.name, spoken.lines, { kind: 'sector', key: s.key }), speech: `I drew ${s.name} off its landing. The landing stays. ${spoken.speech}` })
      }
    }
    if (feed) {
      const st = this.live().status.find(x => x.key === feed.key)
      if (st) hits.push({ len: feed.len, scene: sceneFrom(st.title, [st.source, st.state, st.state === 'LIVE' ? 'A live public reading.' : 'Not a live reading right now.'], { kind: 'feed', key: st.key }), speech: `I drew ${st.title} off its instrument. The instrument stays. It is ${st.state.toLowerCase()}.` })
    }
    hits.sort((a, b) => b.len - a.len)
    const hit = hits[0]
    if (!hit) {
      const scene = emptyScene()
      return { ...this.say(`The landings stay where they were set. I don't have ${asked} in the map, so there is no offshoot yet. ${noDataYet(false, new Date(), asked)}`, { kind: 'universal', key: 'construct' }, 'construct'), construct: scene, wiki: true }
    }
    return { ...this.say(`${hit.speech} I did not invent the rest.`, { kind: 'universal', key: 'construct' }, 'construct'), construct: hit.scene }
  }

  private constructSpeech(): IrisReply {
    const scene = drawnConstruct()
    if (scene.empty) return this.say('The construct is empty. Tell me what you want to look at. I will draw it if the record has it, and leave the room empty if it does not.', { kind: 'universal', key: 'construct' }, 'none')
    return this.say(`This is an offshoot, ${scene.title}. ${scene.lines[0] ?? ''} The landing it came off of is still there. I drew only what the record holds.`, { kind: 'universal', key: 'construct' }, 'none')
  }

  private mirror(): IrisReply {
    const d = this.dclm()
    const mirror = twoWayMirror({ walletOpen: Boolean(this.hasUnityId()), locked: d.locked, total: d.total })
    return this.say(mirrorWords(mirror), { kind: 'dclm', key: 'dclm' }, 'none', 'Trinity layer')
  }

  private trinity(): IrisReply {
    const v = this.reg.verdict
    const counts = v.decisions.reduce<Record<string, number>>((a, d) => ((a[d.disposition] = (a[d.disposition] ?? 0) + 1), a), {})
    return this.say(`The Trinity is three seats. DCLM checks the evidence. I check that we don't claim more than we have. Twain squared checks that it still makes sense out in the world. This world went in front of them once. ${counts.IMPLEMENT ?? 0} items were allowed as written, ${counts['IMPLEMENT-WITH-CONDITIONS'] ?? 0} only with conditions, and ${counts.HOLD ?? 0} was held: tying you to DCCP automatically. Those were practice reviews, not a sealed sitting.`, { kind: 'dclm', key: 'dclm' }, 'none', 'Trinity verdict')
  }

  private dclmSpeech(): IrisReply {
    const d = this.dclm()
    const mism = d.mismatched.length ? ` These do not match their receipts: ${d.mismatched.join(', ')}.` : ''
    return this.say(`The Deterministic Compute Logic Machine. Every module of this world was submitted to its kernel twice, and the receipts agree, the same input digest both times. Here on your device, ${d.locked} of ${d.total} modules match their receipts byte for byte. That is a client side integrity check, not a seal.${mism} The kernel is deterministic and does no arbitrary compute. The kernel's public API is unreachable right now, last checked October 3, 2026, so these are the sealed historical receipts. No new receipts can be requested.`, { kind: 'dclm', key: 'dclm' }, 'none', 'DCLM API v2 receipts')
  }

  private pipe(key = 'pipe'): IrisReply {
    const where = key === 'pipe' ? '' : ` You're at the ${key} mark.`
    return this.say(`The pipe is the path a release would take. Someone proposes it, the vote happens, it gets finalized, it gets pinned, then the public name points at it.${where} You're looking at the drawing. Nothing is pinned, and I can't tie it to you. Ask me about the CID law and I'll walk you through the rule.`, { kind: 'pipe', key }, 'none', 'CID mapping law, draft')
  }

  private cidLaw(): IrisReply {
    return this.say(CID_BEATS[0], { kind: 'pipe', key: 'cid-law' }, 'none', 'CID mapping law, draft')
  }

  private gapSpeech(): IrisReply {
    return this.say('You can pay a bot for the grinding work, a paper or a schematic, and you still own it. The bot cannot wake, walk, or feel weather, so it offers you a job back. You volunteer one mark. It does not read a sensor. The first time it hears that kind of mark, it pays 4. A repeat pays 1. Say hire a bot, volunteer, or cross the gap.', { kind: 'dclm', key: 'dclm' }, 'none', 'Biological gap, voluntary only')
  }

  private closeSpeech(): IrisReply {
    return this.say('A half-capacity shift is five decisions. A repeat is worth 1. A first find is worth 4. They add back to the shift. Give the key away and the return through n shifts is that face times the natural log of 1 plus n. The royalty is not in this sum. It depends on who signed to reduce their residual. The fixed 10 percent fee splits in half: 5 to eFuse and 5 to Unity. That is not a sale of eFuse. eFuse stays capped. I do not have the derivative paper for that split here.', { kind: 'chamber', key: 'the-why' }, 'none', 'Per-decision close')
  }

  private keySpeech(): IrisReply {
    return this.say('A key is an answer you solved. If nobody had it, it is worth more than one we already held. You or a bot can give that key to me. You still own what you made. What comes back is a trickle into the test supply, paid each shift, and each new payment is smaller than the last. That is the logarithm. It is not a security, and the till is closed.', { kind: 'chamber', key: 'mesh' }, 'none', 'Mesh · key for a trickle')
  }

  private meterSpeech(): IrisReply {
    return this.say('Your supply starts whole. Split it in half on your profile and half sits with you, half with the bots. A decision spends one unit of that supply. What comes back, a paper, a schematic, a simulation, stays entirely yours if you made it. The spend does not give any of it away. The bots have the same motive and the same half capacity. In one shift they finish five objects. The same bots with nothing to work for finish none. What one of those objects is worth is not settled. The till is closed. This is not eFuse.', { kind: 'dclm', key: 'dclm' }, 'none', 'Unity supply test, till closed')
  }

  private genesis(): IrisReply {
    return this.say(GENESIS_BEATS[0], { kind: 'dclm', key: 'genesis' }, 'none', 'API v2 shape, not yet bound')
  }

  private jacketHold(): IrisReply {
    return this.say('I can\'t sign you onto DCCP from this page. People come through the gateway with a validated Unity ID, and a pilot handle is not that. The computer does not need an ID. It is the API. Binding Genesis is a separate act, and it has not been done from here. Your key stays offline.', { kind: 'dclm', key: 'dclm' }, 'none', 'Jacket binding closed')
  }

  private unityIdDisclose(): IrisReply {
    const existing = this.hasUnityId()
    if (existing) return this.say('You already have a pilot handle on this device. It\'s a pilot. The Unity Network didn\'t issue it.', { kind: 'chamber', key: 'unity-id' })
    this.pending = 'unity-id'
    return this.say('The Unity agreement is one yes. It covers a persistent pseudonymous handle, Wikipedia when I have no reading, this phone\'s location to land the camera, and Talk if you choose it. Sound and haptics stay off until you turn them on. Say I agree, or say cancel.', { kind: 'chamber', key: 'unity-id' }, 'unity-id-disclose')
  }

  private feed(key: string, now: number): IrisReply {
    const snap = this.live()
    const st = snap.status.find(s => s.key === key)
    const v = snap.values
    const target: Target = { kind: 'feed', key }
    if (!st) return this.say('That feed is not wired.')
    if (st.state === 'PENDING') return this.say(`${st.title} is still loading from ${st.source}.`, target)
    if (st.state === 'UNAVAILABLE') return this.say(`${st.title} is unavailable right now. ${st.source} did not answer${st.lastError ? `, ${st.lastError}` : ''}. I will keep trying.`, target)
    const ago = st.lastOk ? fmtAgo(now - st.lastOk) : ''
    const stale = st.state === 'STALE' ? ' This reading is stale.' : ''
    const tail = ` From ${st.source}, updated ${ago}.${stale}`
    switch (key) {
      case 'quakes': {
        const q = v.quakes!
        return this.say(`${q.count} earthquakes of magnitude two point five or more in the past day.${q.strongest ? ` The strongest, magnitude ${q.strongest.mag.toFixed(1)}, ${q.strongest.place}.` : ''}${tail}`, target)
      }
      case 'iss': {
        const s = v.iss!
        return this.say(`The space station is at ${Math.abs(s.lat).toFixed(1)} degrees ${s.lat >= 0 ? 'north' : 'south'}, ${Math.abs(s.lon).toFixed(1)} degrees ${s.lon >= 0 ? 'east' : 'west'}, ${Math.round(s.altKm)} kilometres up, moving ${Math.round(s.speedKmh).toLocaleString('en-US')} kilometres an hour, in ${s.visibility || 'unknown'} light.${tail}`, target)
      }
      case 'weather': {
        const w = v.weather!
        return this.say(`In Belleville, Ontario, it is ${Math.round(w.tempC)} degrees, wind ${Math.round(w.windKmh)} kilometres an hour.${tail}`, target)
      }
      case 'kp': return this.say(`The planetary K index is ${v.kp!.kp.toFixed(1)}. ${v.kp!.kp >= 5 ? 'That is storm level; aurora is likely at high latitudes.' : v.kp!.kp >= 4 ? 'Active, not yet a storm.' : 'Quiet.'}${tail}`, target)
      case 'carbon': return this.say(`Great Britain's grid is at ${Math.round(v.carbon!.intensity)} grams of carbon dioxide per kilowatt hour, rated ${v.carbon!.index || 'unrated'}.${tail}`, target)
      case 'river': {
        const r = v.river!
        const parts = [r.levelM !== undefined ? `level ${r.levelM.toFixed(2)} metres` : '', r.dischargeM3s !== undefined ? `discharge ${r.dischargeM3s.toFixed(1)} cubic metres a second` : ''].filter(Boolean)
        return this.say(`The Moira River at Belleville: ${parts.join(', ') || 'no reading in the latest record'}. Provisional real time data.${tail}`, target)
      }
    }
    return this.say('That feed is not wired.', target)
  }

  /** One board over all six public feeds. Honest about live, stale and unavailable — never fills a gap. */
  private telemetrics(now: number): IrisReply {
    const snap = this.live()
    const target: Target = { kind: 'telemetrics', key: 'telemetrics' }
    const titles: Record<string, string> = { quakes: 'Earthquakes', iss: 'Space station', weather: 'Belleville weather', kp: 'Kp index', carbon: 'Grid carbon', river: 'Moira River' }
    const liveN = snap.status.filter(s => s.state === 'LIVE').length
    const staleN = snap.status.filter(s => s.state === 'STALE').length
    const unN = snap.status.filter(s => s.state === 'UNAVAILABLE').length
    const head = `${liveN} of ${snap.status.length} feeds live${staleN ? `, ${staleN} stale` : ''}${unN ? `, ${unN} unavailable` : ''}.`
    const rows = snap.status.map(s => {
      const title = titles[s.key] ?? s.title
      if (s.state === 'LIVE' || s.state === 'STALE') {
        const ago = s.lastOk ? fmtAgo(now - s.lastOk) : ''
        return `${title} is ${s.state === 'LIVE' ? 'live' : 'stale'}, checked ${ago || 'just now'}.`
      }
      if (s.state === 'UNAVAILABLE') return `${title} is unavailable; the source did not answer${s.lastError ? `, ${s.lastError}` : ''}.`
      return `${title} is still loading.`
    })
    return this.say(`The telemetrics board. ${head} ${rows.join(' ')} Tap any row on the board to visit that feed.`, target, 'none', 'Live public feeds')
  }

  /** David's Corporate Helpers research: sealed Trinity-reviewed improvement maps. Reported research, never live telemetry. */
  private corph(): IrisReply {
    const doc = this.reg.corporateHelpers
    if (!doc) return this.say('The corporate helpers research is not loaded in this world.')
    const scored = doc.entries.filter(e => typeof e.mean === 'number')
    const top = [...scored].sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0)).slice(0, 3)
    return this.say(`Corporate Helpers, David's research program: mapping ways to make Fortune 500 companies better, not different. ${doc.sealed} sealed verdicts, ${doc.aggregate.totalVectors} improvement vectors, mean of means ${doc.aggregate.meanOfMeans.toFixed(2)}. ${scored.length} of the ${doc.sealed} carry scores in this export. Top by mean: ${top.map(e => `${e.company}, ${e.mean!.toFixed(2)}`).join(', ')}. This is DualisCapax research, reported figures reviewed by the Trinity, not live telemetry.`, { kind: 'corph', key: 'corph' }, 'none', 'DualisCapax research')
  }
}
