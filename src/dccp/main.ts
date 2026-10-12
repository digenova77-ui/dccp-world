import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import './styles/main.css'
import { Renderer, suggestQuality } from './engine/renderer'
import { Flight } from './engine/flight'
import { Haptics, type HapticKind } from './engine/haptics'
import { Ambient } from './engine/ambient'
import { loadFont } from './world/text3d'
import { World } from './world/world'
import { loadRegistry } from './data/registry'
import type { ModuleIntegrity, Registry } from './data/types'
import { LiveFeeds, type FeedValues } from './live/feeds'
import { IrisBrain, OUTSIDE_GAP, type IrisReply, type Target } from './iris/brain'
import { discoveryWords, mirrorOf } from './iris/mirror'
import { offerMesh } from './unity/mesh'
import { memorySpeech, recall, remember } from './iris/memory'
import { IRIS_TASK, taskHeld } from './iris/task'
import { IrisVoice, recognitionSupported, synthesisSupported } from './iris/voice'
import { IrisOrb } from './iris/orb'
import { Overlay, type EntryMode, type Toggles } from './ui/overlay'
import { Card, Ladder, type CardModel } from './ui/card'
import { cardFor, cityCard, countryCard, type CardCtx } from './ui/cards'
import { TIERS, inCountry, toLatLon, tierInfo, type Tier } from './world/geo'
import type { City, Country } from './data/types'
import { createPilotHandle, FAILURE_SPEECH, forgetHandle, storedHandle } from './unity/unityid'
import { ensureGenesisAttestation } from './unity/genesis'
import { acceptAgreement, agreementAccepted, clearAgreement } from './unity/agreement'
import { ReceiptPipe, type PipeView } from './pipe/chain'
import { citeSpeech, placeLines, wikiNote } from './live/wiki'
import { DecisionLedger, summarize } from './meter/decision'
import { WORKS, creditPool, loadEconomy, payDecision, runShift, saveEconomy, splitSupply, type EconomyState } from './meter/economy'
import { unityOpen, unityRead, unitySend } from './meter/unityclient'
import { dualDisplays } from './meter/dual'
import { giveKey, mintKey, payTrickle, type SolvedKey } from './meter/keys'
import { nullifyBotValue, priorFrom } from './meter/value'
import { connectorLines, cosmicLines, connectors } from './unity/connectors'
import { rotate, rotationWords } from './trinity/rotation'
import { buildMaster, masterWords } from './meter/master'
import { foundAgain, headStart } from './meter/again'
import { seedReturn, takeDerivative, type Derivative } from './meter/seed'
import { crossGap, emptyGap, hireBot, sellBody, type GapState } from './meter/gap'
import { swarmSpeech, swarmView } from './meter/swarm'
import { auditBot, botAudit, botSeat, botsMay, releaseBot, signBotUnity } from './unity/botid'
import { closedStream, residualIdentity } from './meter/close'
import { darkHolds, findWhite, fingerprint, listDark, listWhite, takeDark, takeWhite } from './ledger/dark'
import { admitSeat, loadSeats, rosterLines, saveSeats } from './ledger/juvenile'
import { auditTotality } from './ledger/totality'
import { listProofs } from './ledger/blackhole'
import { choosePipe, framework, keepAdventure, seeAdventure } from './unity/adventure'
import { scaleBand } from './ui/band'
import { saidAgo, unifiedTelemetry, type Reading } from './ui/telemetry'
import { chain } from './truth/chain'
import { iceLook } from './rte/ice'
import { sceneFrom } from './rte/construct'
import { newChallenge, verifyPublicSignature } from './unity/fatherkey'
import { mirrorWords, twoWayMirror } from './trinity/mirror'

const PREFS = 'dccpworld.prefs.v2' // v2: sound now means optional ambient music, off by default
const DISC = 'dccpworld.discovered.v1'
const FEED_KEYS = ['weather', 'river', 'quakes', 'iss', 'kp', 'carbon'] as const
const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const defaults = (): Toggles => ({ sound: false, haptics: false, reducedMotion: prefersReduced, transcript: false })
const loadPrefs = (): Toggles => {
  try { return { ...defaults(), ...JSON.parse(localStorage.getItem(PREFS) ?? '{}') } } catch { return defaults() }
}
const hadPrefs = (): boolean => { try { return localStorage.getItem(PREFS) !== null } catch { return false } }
const savePrefs = (t: Toggles): void => { try { localStorage.setItem(PREFS, JSON.stringify(t)) } catch { /* private mode */ } }

const toggles = loadPrefs()
if (prefersReduced) toggles.reducedMotion = true
const canvas = document.getElementById('game') as HTMLCanvasElement
canvas.tabIndex = 0
const overlay = new Overlay(document.getElementById('ui')!, toggles, recognitionSupported())
const card = new Card(document.getElementById('ui')!)
const ladder = new Ladder(document.getElementById('ui')!, TIERS)
card.setReducedMotion(toggles.reducedMotion)
let shown: Target | null = null

type Q = 'low' | 'medium' | 'high'
function chooseQuality(): Q {
  const forced = new URLSearchParams(location.search).get('quality')
  if (forced === 'low' || forced === 'medium' || forced === 'high') return forced
  let q: Q = suggestQuality()
  try {
    // Software rasterisers (SwiftShader, llvmpipe) and small GPUs cannot hold 4K textures + bloom; never let them crash the tab.
    const probe = document.createElement('canvas').getContext('webgl2') ?? document.createElement('canvas').getContext('webgl')
    if (!probe) return 'low'
    const info = probe.getExtension('WEBGL_debug_renderer_info')
    const name = String(info ? probe.getParameter(info.UNMASKED_RENDERER_WEBGL) : probe.getParameter(probe.RENDERER)).toLowerCase()
    if (/swiftshader|llvmpipe|software|basic render/.test(name)) q = 'low'
    if (probe.getParameter(probe.MAX_TEXTURE_SIZE) < 8192 && q === 'high') q = 'medium'
    probe.getExtension('WEBGL_lose_context')?.loseContext()
  } catch { q = 'low' }
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  if (mem !== undefined && mem <= 2) q = 'low'
  return q
}
const quality = chooseQuality()
const renderer = new Renderer(canvas, quality)
canvas.addEventListener('webglcontextlost', e => {
  e.preventDefault()
  overlay.fail('The graphics context was lost. Reload to continue; add ?quality=low to the address for a lighter world.')
})
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x03050b)
const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.05, 2000)
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.minDistance = 4
controls.maxDistance = 140
controls.rotateSpeed = 0.6
const flight = new Flight(camera, controls.target)
const haptics = new Haptics()
haptics.enabled = false
let audio: AudioContext | null = null
let ambient: Ambient | null = null
let voice: IrisVoice | null = null
let mode: EntryMode | null = null
let world: World | null = null
let registry: Registry
let integrity: ModuleIntegrity[] = []
let brain: IrisBrain
const feeds = new LiveFeeds()
const pipe = new ReceiptPipe()
let pipeView: PipeView = pipe.view()
async function syncPipe(): Promise<void> {
  const seat = pipe.seat(storedHandle()?.handle ?? null)
  if (seat === 'member') await pipe.ensureLaw()
  pipeView = pipe.view()
  if (shown?.kind === 'pipe') refreshCard()
}
const orb = new IrisOrb(1.6, quality === 'low' ? 4 : 5)
orb.group.position.set(-9, 3.5, 17)
scene.add(orb.group)
const discovered = new Set<string>((() => { try { return JSON.parse(localStorage.getItem(DISC) ?? '[]') as string[] } catch { return [] } })())
let irisAwake = false
let pendingHeard = ''
let order: Target[] = []
let cursor = -1
const emptySpectrum = new Uint8Array(64)

function pulse(kind: HapticKind): void {
  if (toggles.haptics && !toggles.reducedMotion) haptics.pulse(kind)
}

async function boot(): Promise<void> {
  let timer: number | undefined
  const timeout = new Promise<never>((_, rej) => { timer = setTimeout(() => rej(new Error('Loading took longer than 40 seconds. Check your connection and reload.')), 40_000) as unknown as number })
  const [font, reg] = await Promise.race([Promise.all([loadFont(), loadRegistry('/')]), timeout])
  clearTimeout(timer)
  registry = reg.registry
  integrity = reg.integrity
  const w = new World(font, registry, integrity, quality)
  world = w
  scene.add(w.root)
  w.setDiscovered(discovered)
  // The HUD opens facing the core — the data center alive. No locale is the frame.
  const home = w.coreFocus()
  camera.position.copy(home.camera)
  controls.target.copy(home.anchor)
  brain = new IrisBrain(registry, () => ({ values: feeds.values, status: [...feeds.status.values()] }), () => ({
    locked: integrity.filter(m => m.state === 'MATCH').length,
    total: integrity.length,
    mismatched: integrity.filter(m => m.state === 'MISMATCH' || m.state === 'NOT-LOCKED').map(m => m.module),
  }), () => storedHandle()?.handle ?? null)
  order = [
    { kind: 'iris', key: 'iris' },
    ...registry.chambers.map(c => ({ kind: 'chamber' as const, key: c.key })),
    { kind: 'universal', key: 'universal' },
    ...registry.rtes.map(r => ({ kind: 'rte' as const, key: r.key })),
    ...['water', 'energy', 'climate', 'food', 'pandemic', 'pharmacology'].map(k => ({ kind: 'sector' as const, key: k })),
    // The core and the Bot World HUD structures. TargetKind is sealed in brain.ts (read-only),
    // so these reuse the dclm kind — describe() and the card are key-agnostic for it.
    { kind: 'dclm', key: 'dclm' },
    { kind: 'dclm', key: 'swarms-ephemeral' },
    { kind: 'dclm', key: 'swarms-arbitrage' },
    { kind: 'dclm', key: 'swarms-receipts' },
    { kind: 'dclm', key: 'tree' },
    { kind: 'dclm', key: 'pyramid' },
    { kind: 'dclm', key: 'machine' },
    ...['proposal', 'quorum', 'finalize', 'ipfs', 'ipns'].map(k => ({ kind: 'pipe' as const, key: k })),
    ...FEED_KEYS.map(k => ({ kind: 'feed' as const, key: k })),
    { kind: 'telemetrics', key: 'telemetrics' },
    { kind: 'corph', key: 'corph' },
    // The four 3D data plates on the logical ring around the core, each followed by its deep levels.
    ...['cosmos', 'cosmos-story', 'cosmos-boundary', 'ontario', 'ontario-health', 'ontario-schools', 'tiers',
      'tiers-live', 'tiers-develop', 'tiers-publish', 'tiers-order', 'tiers-forensics', 'tiers-design',
      'tiers-live-deep', 'tiers-develop-deep', 'tiers-publish-deep', 'tiers-order-deep', 'tiers-forensics-deep', 'tiers-design-deep',
      'dclm-engine', 'dclm-pipeline', 'dclm-invariant'].map(k => ({ kind: 'landing' as const, key: k })),
  ]
  const label = (t: Target): string => (t.kind === 'iris' ? 'Agent Iris, the orb' : w.findPickable(t)?.label ?? t.key)
  const group: Record<string, string> = { iris: 'Iris', chamber: 'Unity playground chambers', universal: 'Universal RTE', rte: 'RTE rooms', sector: 'Sector layers', dclm: 'The Core · DCLM', pipe: 'DCCP pipe', feed: 'Live public feeds', telemetrics: 'Live public feeds', corph: 'DualisCapax research', landing: 'Data plates' }
  overlay.setAtlas(order.map((t, i) => ({ id: String(i), group: group[t.kind] ?? 'Other', label: label(t) })))
  refreshUnityId()
  for (const k of FEED_KEYS) w.renderInstrument(k, feeds.status.get(k), feeds.values, Date.now())
  w.renderTelemetrics([...feeds.status.values()], feeds.values, Date.now())
  overlay.setSceneText(w.sceneText())
  overlay.ready()
}

function onFeed(key: keyof FeedValues): void {
  if (!world) return
  world.renderInstrument(key, feeds.status.get(key), feeds.values, Date.now())
  world.renderTelemetrics([...feeds.status.values()], feeds.values, Date.now())
  overlay.setSceneText(world.sceneText())
  if (key === 'quakes' && feeds.values.quakes) world.setQuakes(feeds.values.quakes.items)
  if (shown && (shown.kind === 'feed' || shown.kind === 'telemetrics' || shown.kind === 'country' || shown.kind === 'city')) refreshCard()
  if (key === 'iss' && feeds.values.iss && Number.isFinite(feeds.values.iss.lat)) world.setIss(feeds.values.iss.lat, feeds.values.iss.lon, feeds.values.iss.altKm)
  paintScale()
}

const wikiAllowed = (): boolean => agreementAccepted()
let wikiPending: string | null = null

function grantAgreement(): void {
  acceptAgreement()
  const pending = wikiPending
  wikiPending = null
  const after = (): void => {
    landOnPhone()
    if (!pending) return
    void settle(pending, { speech: OUTSIDE_GAP, action: 'none' }).then(reply => irisSays(reply))
  }
  if (!storedHandle()) void makeUnityId().then(after)
  else {
    void irisSays({ speech: 'Agreed. Wikipedia and this phone\'s location are covered. Sound and haptics stay off.', action: 'none' })
    after()
  }
}

function landOnPhone(): void {
  if (!world) return
  if (!agreementAccepted()) {
    overlay.announce('Location is in the Unity agreement. One yes covers it, with the handle and Wikipedia.')
    return
  }
  if (!navigator.geolocation) {
    overlay.announce('This browser has no location service. You stay where you are.')
    return
  }
  overlay.announce('Asking this phone where it is. The reading is not stored and not sent.')
  navigator.geolocation.getCurrentPosition(pos => {
    if (!world) return
    const here = world.geo.focusFor(pos.coords.latitude, pos.coords.longitude, tierInfo('street').altitude)
    camera.position.copy(here.camera)
    controls.target.copy(here.anchor)
    world.geo.pin(pos.coords.latitude, pos.coords.longitude)
    const meters = pos.coords.accuracy
    const how = meters >= 1000 ? `about ${Math.max(1, Math.round(meters / 1000))} kilometers` : `about ${Math.round(meters)} meters`
    overlay.announce(meters > 50
      ? `Human scale, on this phone's reading. The fix is only ${how}, so this is not a rooftop.`
      : `Human scale, on this phone. The fix is ${how}.`)
  }, () => overlay.announce('The phone did not share a location. You stay where you are.'), { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 })
}

function refreshLedger(): void {
  const lines = [
    ...listWhite().map(doc => `White · ${doc.sha256.slice(0, 12)} · ${doc.text.slice(0, 80)}`),
    ...listDark().map(doc => `Dark · sealed · ${doc.sha256.slice(0, 12)} · ${doc.bytes} characters`),
  ]
  overlay.setLedger(lines)
  const roster = rosterLines(storedHandle()?.handle ?? null, loadSeats())
  overlay.setRoster(roster.dark, roster.lines)
  const owner = storedHandle()?.handle ?? null
  const rooms = framework(owner)
  overlay.setAdventure(rooms.length ? rooms.map(room => seeAdventure(room, owner).lines[0]) : ['The world still has a framework. It does not need one. That framework is being removed. DCLM holds nothing.'])
  overlay.setConnectors(connectorLines({ countries: world?.geo.countries.length ?? 0, cities: world?.geo.cities.length ?? 0 }))
  overlay.setUnified(rotationWords(rotate()))
  void fingerprint(JSON.stringify({ shifts: economy.shifts, doctor: economy.doctor.supply, bots: economy.bots.supply })).then(walletHash => auditTotality([
    ...listDark().map(doc => ({ kind: 'dark', sha256: doc.sha256 })),
    ...loadSeats().map(seat => ({ kind: 'seat', sha256: seat.sha256 })),
    ...listProofs().map(proof => ({ kind: 'proof', sha256: proof.sha256 })),
    { kind: 'wallet', sha256: walletHash },
  ])).then(row => overlay.setTotality(`Totality audited on the dark ledger. ${row.count} parts. Hash ${row.hash}. The scoreboard is hidden.`))
}

async function answerLedger(text: string): Promise<void> {
  const q = text.replace(/\b(the|ledger|dark|white|document|documents)\b/gi, ' ').replace(/\s+/g, ' ').trim()
  if (q.length < 3) {
    void irisSays({ speech: `White holds ${listWhite().length}. Dark holds ${listDark().length}, sealed on this device. I can quote white. I will not read dark into the room.`, action: 'none' })
    return
  }
  const white = findWhite(q)
  if (white) {
    void irisSays({ speech: `From the white ledger: ${white.text.slice(0, 280)}`, action: 'none' })
    return
  }
  const held = await darkHolds(q).catch(() => false)
  void irisSays({ speech: held ? 'That is in the dark ledger. I will not read it aloud.' : 'I do not have that in either ledger.', action: 'none' })
}

function paintScale(): void {
  if (!world || !registry) return
  const ll = toLatLon(controls.target.length() > 9 ? controls.target : camera.position)
  const country = world.geo.countryAt(ll.lat, ll.lon)
  const city = world.tier === 'street' || world.tier === 'civil' ? world.geo.cityNear(ll.lat, ll.lon, world.tier === 'street' ? 0.8 : 1.6) : null
  let province: { name: string; guard: string } | null = null
  if (country?.a3 === 'CAN' && world.tier === 'civil') {
    let best: { name: string; guard: string } | null = null
    let dist = 18
    for (const scope of registry.canada) {
      if (scope.key === 'ca') continue
      const d = Math.hypot(scope.lat - ll.lat, scope.lon - ll.lon)
      if (d < dist) { dist = d; best = { name: scope.name, guard: scope.guard } }
    }
    province = best
  }
  const items = feeds.values.quakes?.items ?? []
  const quakesHere = country ? items.filter(q => inCountry(country, q.lat, q.lon)).length : 0
  const band = scaleBand({
    tier: world.tier,
    country: country ? { name: country.name, a3: country.a3, pop: country.pop, popYear: country.popYear } : null,
    city: city?.name ?? null,
    province,
    quakesHere,
    issAltKm: feeds.values.iss?.altKm ?? null,
    kp: feeds.values.kp?.kp ?? null,
    carbon: feeds.values.carbon?.intensity ?? null,
  })
  const readings: Reading[] = [
    { scope: 'Planet', label: 'Station', value: feeds.values.iss && Number.isFinite(feeds.values.iss.altKm) ? `${Math.round(feeds.values.iss.altKm)} km` : null, ago: saidAgo(feeds.values.iss?.at) },
    { scope: 'Planet', label: 'Kp', value: feeds.values.kp && Number.isFinite(feeds.values.kp.kp) ? feeds.values.kp.kp.toFixed(1) : null, ago: saidAgo(feeds.values.kp?.at) },
    { scope: 'Planet', label: 'Grid', value: feeds.values.carbon && Number.isFinite(feeds.values.carbon.intensity) ? `Britain ${Math.round(feeds.values.carbon.intensity)}` : null, ago: saidAgo(feeds.values.carbon?.from) },
  ]
  feeds.setPlace(ll.lat, ll.lon)
  if (world.tier === 'street' || world.tier === 'civil') {
    readings.push({ scope: 'Here', label: 'Air', value: feeds.values.weather && Number.isFinite(feeds.values.weather.tempC) ? `${Math.round(feeds.values.weather.tempC)}°` : null, ago: saidAgo(feeds.values.weather?.at) })
    const nearMoira = Math.hypot(ll.lat - 44.16, ll.lon + 77.38) < 0.75
    if (nearMoira) readings.push({ scope: 'Here', label: 'River', value: feeds.values.river?.levelM != null ? `${feeds.values.river.levelM} m` : null, gap: 'Moira at Belleville. The hydrometric host did not answer. No level is invented.' })
  }
  const look = iceLook()
  if (look.looks > 0) readings.push({ scope: 'Ice', label: look.cut, value: null })
  const swarm = swarmView(economy, gap, Boolean(botSeat()))
  if (botSeat()) readings.push({ scope: 'This seat', label: 'Swarm', value: swarm.deployed ? `${swarm.workers} working` : null })
  const lines = unifiedTelemetry(band, readings).lines
  const satisfied = new Set(readings.filter(reading => reading.value !== null).map(reading => reading.label))
  overlay.setScaleBand(band.title, [...lines, chain(satisfied).hud])
  overlay.setConnectors(world.tier === 'cosmic' ? cosmicLines(connectors()) : connectorLines({ countries: world.geo.countries.length, cities: world.geo.cities.length }))
}

function refreshUnityId(): void {
  const handle = storedHandle()?.handle ?? null
  overlay.setUnityId(handle, 'A pilot handle is a persistent pseudonym stored by your authenticator. It can sync. It is not a Unity Network issuance, and it is not a claim that it never leaves a device. No name, email, or document is collected.')
  if (handle && world) openHud()
  else if (world) closeHud()
  void syncPipe()
}

let ledger: DecisionLedger | null = null
let economy: EconomyState = loadEconomy()
const KEYS_STORE = 'dccpworld.keys.v1'
let solved: SolvedKey[] = (() => { try { return JSON.parse(localStorage.getItem(KEYS_STORE) ?? '[]') as SolvedKey[] } catch { return [] } })()
let derivatives: Derivative[] = (() => { try { return JSON.parse(localStorage.getItem('dccpworld.seed-derivatives.v1') ?? '[]') as Derivative[] } catch { return [] } })()
let supplied: { id: string; claim: string }[] = (() => { try { return JSON.parse(localStorage.getItem('dccpworld.master.v1') ?? '[]') as { id: string; claim: string }[] } catch { return [] } })()
const saveSupplied = (): void => { try { localStorage.setItem('dccpworld.master.v1', JSON.stringify(supplied)) } catch { /* private mode */ } }
const saveDerivatives = (): void => { try { localStorage.setItem('dccpworld.seed-derivatives.v1', JSON.stringify(derivatives)) } catch { /* private mode */ } }
let gap: GapState = (() => { try { const raw = localStorage.getItem('dccpworld.gap.v1'); return raw ? JSON.parse(raw) as GapState : emptyGap() } catch { return emptyGap() } })()
const saveGap = (): void => { try { localStorage.setItem('dccpworld.gap.v1', JSON.stringify(gap)) } catch { /* private mode */ } }
const saveKeys = (): void => { try { localStorage.setItem(KEYS_STORE, JSON.stringify(solved)) } catch { /* private mode */ } }

function holdKey(id: string, claim: string, novel: boolean, holder: 'doctor' | 'bots', shift: number, give: boolean): SolvedKey | null {
  const prior = solved.find(key => key.id === id)
  if (prior) {
    const again = foundAgain({ seen: prior.seen ?? 1, earned: prior.earned ?? false, holder: prior.holder }, shift)
    const next = { ...prior, seen: again.seen, earned: again.earned }
    solved = solved.map(key => key.id === id ? next : key)
    saveKeys()
    return next
  }
  const unityId = storedHandle()?.handle ?? null
  const own = unityId ? solved.filter(key => key.holder === 'doctor').map(key => key.claim) : []
  const ownMirror = holder === 'doctor' && unityId ? mirrorOf(claim, own) : null
  let key = mintKey(id, claim, Boolean(novel) && !ownMirror, holder)
  if (give) {
    const again = foundAgain({ seen: 1, earned: false, holder }, shift)
    key = { ...giveKey(key, shift), seen: again.seen, earned: again.earned }
  }
  solved.push(key)
  saveKeys()
  const shareId = holder === 'doctor' ? storedHandle()?.handle ?? null : botSeat()?.handle ?? null
  offerMesh(holder === 'doctor' ? 'keys' : 'bots', claim, shareId)
  return key
}

function tradeHeld(): { given: number; novel: number } {
  const shift = Math.max(1, economy.shifts + 1)
  let given = 0
  let novel = 0
  solved = solved.map(key => {
    if (key.holder !== 'doctor' || key.traded) return key
    given += 1
    if (key.novel) novel += 1
    return giveKey(key, shift)
  })
  saveKeys()
  return { given, novel }
}
function escMeter(s: string): string {
  return s.replace(/[&<>"]/g, c => (c === '&' ? '\u0026amp;' : c === '<' ? '\u0026lt;' : c === '>' ? '\u0026gt;' : '\u0026quot;'))
}

function recordDecision(claim: string, calls = 1, startedAt?: number): void {
  const handle = storedHandle()?.handle
  if (!mode || !handle) return
  const key = `dccpworld.meter.v1.${handle}`
  if (!ledger) ledger = new DecisionLedger(key)
  ledger.note(claim.slice(0, 80), calls, startedAt ?? performance.now())
  economy = payDecision(economy, claim)
  saveEconomy(economy)
  paintWallet()
}

function paintWallet(): void {
  const handle = storedHandle()?.handle
  if (!handle || !ledger) {
    overlay.setWallet(`<p>No Unity ID is bound. The HUD is closed. The core is free to look at — the bot world's quiet state. Anything that is not free needs a wallet, and the wallet does not buy a children's event.</p><h3>Two displays</h3><p>${escMeter(dualDisplays({ doctor: economy.doctor.spent, bots: economy.bots.spent }).words)}</p><p>${escMeter(mirrorWords(twoWayMirror({ walletOpen: false, locked: integrity.filter(m => m.state === 'MATCH').length, total: integrity.length })))}</p>`)
    return
  }
  const sum = summarize(ledger.list())
  const rows = [...ledger.list()].slice(-6).reverse().map(row => `<li>${escMeter(row.claim)} · ${row.calls} ${row.calls === 1 ? 'call' : 'calls'} · ${row.minutes.toFixed(2)} min · E unfilled</li>`).join('')
  const pool = creditPool(economy)
  const purse = economy.split
    ? `<p>Seed ${economy.doctor.supply.toFixed(2)}. Swarm credit pool ${pool.remaining.toFixed(2)} remaining of ${pool.granted.toFixed(0)} granted. The swarm draws it to act. Father ownership stays 100% through the split. The pool is a draw, not a title. Audited. You have made ${economy.doctor.works}, still owned entirely by you. The bots have made ${economy.bots.works}, entirely theirs.</p><button type="button" data-econ="shift">Run one shift at half capacity</button><h3>The gap</h3><p>You pay a bot for work it can grind. It pays you for one thing you volunteer, because it has no body. Nothing is read from a sensor. A first mark of its kind pays 4. A repeat pays 1.</p><button type="button" data-econ="hire">Hire a bot</button><button type="button" data-econ="body">Volunteer one body mark</button><button type="button" data-econ="cross">Cross it: hire, then get hired</button>`
    : `<p>The supply is still whole: ${economy.doctor.supply}. Nothing has been given to a credit pool.</p><button type="button" data-econ="split">Give 50% to the swarm as a credit pool</button>`
  const notes = economy.last.map(line => `<li>${escMeter(line)}</li>`).join('')
  const held = solved.filter(k => k.holder === 'doctor' && !k.traded)
  const novelHeld = held.filter(k => k.novel).length
  const book = solved.reduce((sum, key) => {
    if (!key.traded || key.tradedOn === null || economy.shifts < key.tradedOn) return sum
    return sum + closedStream(key.face, economy.shifts - key.tradedOn + 1)
  }, 0)
  const residual = residualIdentity()
  const swarm = swarmView(economy, gap, Boolean(botSeat()))
  const seat = botSeat()
  const auditRows = botAudit().slice(-6).reverse().map(row => `<li>${row.sequence}. ${escMeter(row.act)} · ${row.result} · ${escMeter(row.reason)}</li>`).join('') || '<li>No act yet. The audit is already on.</li>'
  const askRows = swarm.asks.map(ask => `<li>${escMeter(ask.ask)} · ${ask.known ? 'known' : 'unknown'} · pays ${ask.face}</li>`).join('')
  const planRows = swarm.plan.slice(0, 4).map(line => `<li>${escMeter(line)}</li>`).join('')
  const recent = swarm.recent.length ? swarm.recent.map(line => `<li>${escMeter(line)}</li>`).join('') : '<li>No work has been recorded on this seat.</li>'
  const swarmHtml = `<h3>Swarm</h3><p>${escMeter(swarm.status)}</p><p>${seat ? `Bot Unity ID ${escMeter(seat.handle)}. A choice, not a commitment. They can leave. Audit always while they are here.` : 'No bot has chosen to work here. Their own sandboxes are still free.'}</p>${seat ? '<button type="button" data-econ="release-bots">Leave. No commitment</button>' : '<button type="button" data-econ="sign-bots">Choose a Unity ID and work here</button>'}<div class="swarm"><section><h3>What you see</h3><p>Workers ${swarm.workers}. Finished by them ${swarm.finished}. Finished by you ${swarm.yours}. Idle bots, the ones with nothing to work for, finished ${swarm.idleFinished}.</p><ol>${recent}</ol></section><section><h3>What they are asking</h3><p>${swarm.next ? `Next: ${escMeter(swarm.next.ask)}. ${swarm.next.known ? 'Known, pays 1.' : 'Unknown, pays 4.'}` : 'Nothing is being asked. The plan is written. It is not running.'}</p><ol>${askRows}</ol><p>Their plan</p><ol>${planRows}</ol></section></div><h3>Audit</h3><p>Always on. It cannot be switched off. This seat only.</p><ol>${auditRows}</ol>`
  const mirror = escMeter(mirrorWords(twoWayMirror({ walletOpen: true, locked: integrity.filter(m => m.state === 'MATCH').length, total: integrity.length })))
  overlay.setWallet(`<p class="handle">${escMeter(handle)}</p><p>Bound on this device. This seat opened your HUD.</p><h3>Two displays</h3><p>${escMeter(dualDisplays({ doctor: economy.doctor.spent, bots: economy.bots.spent }).words)}</p><h3>Trinity mirror</h3><p>${mirror}</p><h3>Wallet</h3><p>A shift is 5. A repeat is worth 1. A first find is worth 4. Given away, the return through n shifts is that face times ln(1+n). Booked so far: ${book.toFixed(2)}. Royalty is not in the fixed sum. The 10% fee splits ${(residual.efuse * 100).toFixed(0)}% to eFuse and ${(residual.unity * 100).toFixed(0)}% to Unity. That does not sell eFuse. The paper for that derivative is not here.</p>${purse}${swarmHtml}<p>${masterWords(buildMaster(supplied))} Keys you hold: ${held.length}${novelHeld ? `, ${novelHeld} of them new` : ''}. Traded: ${solved.filter(k => k.traded && k.holder === 'doctor').length}. Derivatives of what others found: ${derivatives.length}. Nothing is earned the first time it is found. It has to be found again. On the playground, which costs nothing, a bot starts ${headStart().shifts} shifts sooner because a person takes longer to decide. The find is not taken.</p><button type="button" data-econ="trade">Give Iris the keys I hold</button><button type="button" data-econ="derive">Trade coins for a derivative of their find</button><p>${sum.decisions} decisions metered · ${sum.calls} calls · ${sum.minutes.toFixed(2)} minutes · watts not measured.</p><ul>${notes}${rows}</ul>`)
  refreshLedger()
}

function openHud(): void {
  if (!storedHandle() || !world || mode) return
  mode = 'read'
  overlay.enter()
  ladder.show()
  canvas.focus()
  toggles.transcript = true
  overlay.setToggle('transcript', true)
  recordDecision('HUD opened')
}

function closeHud(): void {
  mode = null
  ledger = null
  overlay.closeHud()
  ladder.hide()
  card.hide()
  paintWallet()
}

// ---------------- Iris ----------------
async function irisSays(reply: IrisReply): Promise<void> {
  if (pendingHeard) {
    remember(pendingHeard, reply.speech)
    pendingHeard = ''
  }
  auditBot('iris-task', taskHeld(reply.speech), taskHeld(reply.speech) ? IRIS_TASK : `${IRIS_TASK} Not held. Not invented.`)
  overlay.iris(reply.speech, reply.cite)
  if (reply.sector && world && reply.sector !== world.sector) world.setSector(reply.sector)
  if (reply.construct && world) {
    world.drawConstruct(reply.construct)
    const owner = storedHandle()?.handle
    if (owner && !reply.construct.empty) keepAdventure(owner, reply.construct.title, reply.construct.lines)
    if (reply.construct.pin) flyGeo(reply.construct.pin.lat, reply.construct.pin.lon, tierInfo('street').altitude)
  }
  if (reply.target && reply.action !== 'home') goTo(reply.target, false)
  if (reply.action === 'home') goCore(false)
  if (reply.action === 'unity-id-create' || reply.action === 'unity-agree') grantAgreement()
  if (mode !== 'read' && synthesisSupported() && voice) await voice.speak(reply.speech)
  if (reply.action === 'sleep') sleepIris()
}

async function settle(text: string, reply: IrisReply): Promise<IrisReply> {
  if (!reply.speech.startsWith(OUTSIDE_GAP) && !reply.wiki) return reply
  if (!wikiAllowed()) {
    wikiPending = text
    return { speech: 'I don\'t have that here. Wikipedia is in the Unity agreement, with the handle and this phone\'s location. Say I agree, once. I will not send this until you do.', action: 'none' }
  }
  let spoke = false
  const wait = window.setTimeout(() => {
    spoke = true
    void irisSays({ speech: 'I don\'t have a reading for that. I\'m checking Wikipedia.', action: 'none' })
  }, 450)
  const note = await wikiNote(text)
  window.clearTimeout(wait)
  if (!note) {
    if (spoke) return { speech: 'Wikipedia doesn\'t have a clear page for that, so I won\'t guess.', action: 'none' }
    return reply
  }
  if (typeof note.lat === 'number' && typeof note.lon === 'number') flyGeo(note.lat, note.lon, tierInfo('street').altitude)
  return {
    speech: citeSpeech(note, recordPop(note.title)),
    action: reply.wiki ? 'construct' : 'none',
    source: `Wikipedia · ${note.title}`,
    cite: { title: note.title, url: note.url },
    construct: reply.wiki ? sceneFrom(note.title, placeLines(note, recordPop(note.title))) : undefined,
  }
}

function recordPop(title: string): number | null {
  const key = title.split(',')[0].trim().toLowerCase()
  const city = registry.cities.cities.find(c => c.name.toLowerCase() === key)
  if (city?.pop) return city.pop
  const country = registry.countries.countries.find(c => c.name.toLowerCase() === key)
  return country?.pop || null
}

function hear(text: string): void {
  if (!brain) return
  pendingHeard = text
  const found = text.match(/\b(?:i discovered|we discovered|has this been discovered|no mirror of)\b[:\s]*(.*)$/i)
  if (found) {
    const claim = found[1].trim().replace(/[?.!]+$/g, '')
    const id = storedHandle()?.handle ?? null
    const held = id ? solved.filter(key => key.holder === 'doctor').map(key => key.claim) : []
    if (id && claim && !mirrorOf(claim, held)) offerMesh('discovery', claim, id)
    void irisSays({ speech: discoveryWords(claim, held, id), action: 'none' })
    return
  }
  if (/\b(what have you learned|are you awake|do you remember|what do you remember)\b/i.test(text)) {
    void irisSays({ speech: memorySpeech(), action: 'none' })
    return
  }
  if (/\b(white paper|knowledge patent|patent)\b/i.test(text) && /\bcovers\b/i.test(text)) {
    const prior = priorFrom(text)
    if (prior) {
      const audited = nullifyBotValue(solved, prior)
      solved = audited.keys
      saveKeys()
      auditBot('value-audit', audited.nullified > 0, audited.words)
      void irisSays({ speech: audited.words, action: 'none' })
      paintWallet()
      return
    }
  }
  overlay.visitor(text)
  pulse('tap')
  if (/\b(trade|give)( you| iris| away)? (the |my )?key/.test(text.toLowerCase()) || text.toLowerCase().includes('give away the key')) {
    const deal = tradeHeld()
    const speech = deal.given
      ? `You gave me ${deal.given === 1 ? 'the key' : `${deal.given} keys`}${deal.novel ? `, ${deal.novel} of them new` : ''}. You still own what you made. The trickle starts next shift, and each payment after that is smaller. A new key pays more than one we already had.`
      : 'You are not holding a key. Open a room nobody has opened, then give me what you found.'
    void irisSays({ speech, action: 'none' })
    paintWallet()
    return
  }
  if (/\bi agree\b|\bi accept\b|\baccept the agreement\b/.test(text.toLowerCase())) {
    grantAgreement()
    return
  }
  if (/\bledger\b/.test(text.toLowerCase())) {
    void answerLedger(text)
    return
  }
  if (/\bswarm\b|\bbotswarm\b|\bmy bots\b/.test(text.toLowerCase())) {
    void irisSays({ speech: swarmSpeech(swarmView(economy, gap, Boolean(botSeat()))), action: 'none' })
    paintWallet()
    return
  }
  if (/\b(bot|bots)\b/.test(text.toLowerCase()) && /\bsign\b/.test(text.toLowerCase())) {
    void signBotUnity().then(seat => {
      void irisSays({ speech: `They signed. Their Unity ID is ${seat.handle}. It is a bot seat, not your passkey, and not an issuance. From here every act is audited, including a refusal. They still do not get your location, your microphone, or a file.`, action: 'none' })
      paintWallet()
    })
    return
  }
  if (/\baudit\b/.test(text.toLowerCase())) {
    const last = botAudit().at(-1)
    const seat = botSeat()
    const who = seat ? `Their Unity ID is ${seat.handle}.` : 'They have not signed. They cannot work until they do.'
    void irisSays({ speech: last ? `${who} The audit is always on. The last row is ${last.sequence}: ${last.act}, ${last.result}. ${last.reason}.` : `${who} The audit is always on. Nothing has been written yet.`, action: 'none' })
    paintWallet()
    return
  }
  const gapAsk = text.toLowerCase()
  if (gapAsk.includes('hire a bot') || gapAsk.includes('volunteer') || gapAsk.includes('cross the gap') || gapAsk.includes('body job')) {
    const act = gapAsk.includes('cross') ? 'cross' : gapAsk.includes('hire') ? 'hire' : 'body'
    if (!botsMay(act)) {
      void irisSays({ speech: 'Refused. The bots have not signed a Unity ID. The refusal is on the audit. They do not work, and they do not get paid, until they sign.', action: 'none' })
      paintWallet()
      return
    }
    const ran = gapAsk.includes('cross') ? crossGap(economy, gap) : gapAsk.includes('hire') ? hireBot(economy, gap) : sellBody(economy, gap)
    economy = ran.state
    gap = ran.gap
    saveEconomy(economy)
    saveGap()
    void irisSays({ speech: economy.last[0] ?? 'Nothing moved.', action: 'none' })
    paintWallet()
    return
  }
  const started = performance.now()
  void settle(text, brain.respond(text)).then(reply => {
    const earlier = recall(text)
    const spoken = earlier ? { ...reply, speech: `I still hold this. ${reply.speech}` } : reply
    recordDecision(text, spoken.cite ? 2 : 1, started)
    return irisSays(spoken)
  })
}

function ensureVoice(): void {
  if (voice) return
  const v = new IrisVoice()
  v.onUtterance = hear
  v.onState = s => {
    ambient?.duck(s === 'speaking')
    overlay.setMic(v.micOn)
    if (s === 'unavailable') { overlay.speechUnavailable(); overlay.setMic(false) }
  }
  voice = v
}

async function wakeIris(): Promise<void> {
  if (!brain) return
  ensureVoice()
  irisAwake = true
  orb.setAwake(true)
  pulse('wake')
  // Speak first, synchronously inside the user's tap (browsers block speech started later),
  // then open the microphone once the greeting has finished.
  const greeted = irisSays(brain.greeting())
  if (mode === 'talk' && voice && !voice.micOn) {
    const ok = await voice.enableMic()
    overlay.setMic(ok)
    if (!ok) overlay.speechUnavailable()
  }
  await greeted
}

function sleepIris(): void {
  irisAwake = false
  orb.setAwake(false)
  voice?.disableMic()
  overlay.setMic(false)
}

// ---------------- navigation ----------------
const cardCtx = (): CardCtx => ({
  reg: registry, integrity, feeds: { values: feeds.values, status: feeds.status }, discovered,
  describe: t => brain?.describe(t).speech ?? '',
  onLate: () => { if (shown) refreshCard() },
  pipe: pipeView,
})
function countryOf(a3: string): Country | undefined { return world?.geo.byA3.get(a3) }
function cityOf(key: string): City | undefined {
  const [a3, ...rest] = key.split(':'); const name = rest.join(':')
  return registry.cities.cities.find(c => c.a3 === a3 && c.name === name)
}
function modelFor(t: Target): CardModel | null {
  if (t.kind === 'country') { const c = countryOf(t.key); return c ? countryCard(c, cardCtx(), inCountry) : null }
  if (t.kind === 'city') { const c = cityOf(t.key); return c ? cityCard(c, countryOf(c.a3), cardCtx()) : null }
  return cardFor(t, cardCtx())
}
function showCard(t: Target): void {
  const m = modelFor(t)
  shown = m ? t : null
  if (m) {
    card.show(m)
    if (t.kind === 'rte') card.setLayer(m.layers.length - 1)
  } else card.hide()
}
function refreshCard(): void {
  if (!shown || !card.isOpen) return
  const m = modelFor(shown)
  if (m) card.refresh(m)
}
function clearSelection(): void {
  shown = null
  card.hide()
  world?.mark(null)
  world?.geo.select(null)
  world?.geo.markCity(null)
  if (world) world.focusKind = null
}
/** Fly to a point on the globe at a given storyboard altitude, keeping the view upright. */
function flyGeo(lat: number, lon: number, altitude: number): void {
  if (!world) return
  const f = world.geo.focusFor(lat, lon, altitude)
  flight.to(f.camera, f.anchor, toggles.reducedMotion, () => pulse('arrive'))
}
function goGeo(t: Target, speak: boolean): void {
  if (!world || !brain) return
  world.clearDetail()
  world.mark(null)
  if (t.kind === 'country') {
    const c = countryOf(t.key)
    if (!c) return
    world.geo.select(c)
    world.geo.markCity(null)
    flyGeo(c.label[1], c.label[0], world.geo.countryAltitude(c))
    overlay.announce(c.name)
  } else {
    const c = cityOf(t.key)
    if (!c) return
    const country = countryOf(c.a3)
    if (country && world.geo.selected !== country) world.geo.select(country)
    world.geo.markCity(c)
    flyGeo(c.lat, c.lon, tierInfo('civil').altitude)
    overlay.announce(c.name)
  }
  world.focusKind = t.kind
  pulse('select')
  showCard(t)
  if (t.kind === 'country' && !discovered.has(`country:${t.key}`)) {
    discovered.add(`country:${t.key}`)
    try { localStorage.setItem(DISC, JSON.stringify([...discovered])) } catch { /* private mode */ }
    const c = countryOf(t.key)
    holdKey(`country:${t.key}`, c?.name ?? t.key, true, 'doctor', economy.shifts, false)
    if (speak) {
      const reply = brain.describe(t)
      reply.speech += ' Nobody had opened this country. The key is worth more. Give it to me when you want the trickle.'
      void irisSays({ ...reply, target: undefined })
      return
    }
  }
  if (speak) void irisSays({ ...brain.describe(t), target: undefined })
}

function goTo(t: Target, speak = true): void {
  if (!world || !brain) return
  if (t.kind === 'country' || t.kind === 'city') return goGeo(t, speak)
  if (t.kind === 'iris') {
    world.clearDetail()
    clearSelection()
    flight.to(new THREE.Vector3(-9, 5, 25), orb.group.position.clone(), toggles.reducedMotion)
    if (speak) void irisSays({ ...brain.describe(t), target: undefined })
    return
  }
  if (t.kind === 'earth') return goCore(speak)
  if (t.kind === 'sector') world.setSector(t.key)
  const p = world.findPickable(t)
  if (!p) return
  const f = p.focus()
  pulse('select')
  flight.to(f.camera, f.anchor, toggles.reducedMotion, () => pulse('arrive'))
  world.clearDetail()
  world.focusKind = t.kind
  world.mark(f.anchor)
  world.geo.markCity(null)
  if (t.kind === 'jurisdiction') {
    const c = world.geo.countries.find(x => x.name.toLowerCase() === t.key.toLowerCase())
    world.geo.select(c ?? null)
  } else world.geo.select(null)
  showCard(t)
  const id = `${t.kind}:${t.key}`
  const first = !discovered.has(t.key) && !discovered.has(id)
  const worthKey = first && (t.kind === 'chamber' || t.kind === 'rte' || t.kind === 'sector')
  if (t.kind === 'chamber' && !discovered.has(t.key)) {
    discovered.add(t.key)
    try { localStorage.setItem(DISC, JSON.stringify([...discovered])) } catch { /* private mode */ }
    world.setDiscovered(discovered)
    if (discovered.size === registry.chambers.length) pulse('seal')
  }
  if (worthKey) {
    discovered.add(id)
    try { localStorage.setItem(DISC, JSON.stringify([...discovered])) } catch { /* private mode */ }
    holdKey(id, p.label, true, 'doctor', economy.shifts, false)
  }
  overlay.announce(p.label)
  if (speak) {
    recordDecision(`Open ${t.kind}`)
    const reply = brain.describe(t)
    const all = registry.chambers.length
    if (t.kind === 'chamber') reply.speech += discovered.size === all ? ` That is every chamber of the Unity playground, all ${all}. The tree is lit.` : ` ${discovered.size} of ${all} chambers discovered.`
    if (worthKey) reply.speech += ' That one had not been found. The key is worth more. Give it to me when you want the trickle. You still own what you made.'
    void irisSays({ ...reply, target: undefined })
  }
}

function goCore(speak = true): void {
  if (!world || !brain) return
  const h = world.coreFocus()
  world.clearDetail()
  clearSelection()
  flight.to(h.camera, h.anchor, toggles.reducedMotion)
  if (speak) void irisSays({ ...brain.describe({ kind: 'dclm', key: 'dclm' }), action: 'none', target: undefined })
}

async function makeUnityId(): Promise<void> {
  const res = await createPilotHandle()
  refreshUnityId()
  if (res.ok) {
    pulse('seal')
    // The Genesis mark: this ID believed before proof. Idempotent — the
    // record can never hold the same ID twice.
    void ensureGenesisAttestation(res.handle.handle, res.handle.createdAt).catch(() => {})
    await irisSays({ speech: 'Agreed. Your Unity ID is bound on this device, and Wikipedia and this phone\'s location are covered with it. Sound and haptics stay off. The HUD is open.', action: 'none' })
  } else {
    pulse('warn')
    await irisSays({ speech: FAILURE_SPEECH[res.reason], action: 'none' })
  }
}

// ---------------- input ----------------
const ray = new THREE.Raycaster()
const ndc = new THREE.Vector2()
let downAt: { x: number; y: number } | null = null
function pickAt(x: number, y: number): Target | 'orb' | null {
  if (!world) return null
  const r = canvas.getBoundingClientRect()
  ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1)
  ray.setFromCamera(ndc, camera)
  const objs: THREE.Object3D[] = [orb.core, ...world.pickables.map(p => p.object)]
  for (const h of ray.intersectObjects(objs, true)) {
    let o: THREE.Object3D | null = h.object
    let visible = true
    while (o) { if (!o.visible) { visible = false; break } o = o.parent }
    if (!visible) continue
    if (h.object === orb.core) return 'orb'
    const pick = h.object.userData.pick as Target | undefined
    // Taps select 3D pickables only — the globe-tap branch is gone with the Earth.
    if (pick) return pick
  }
  return null
}
canvas.addEventListener('pointerdown', e => {
  downAt = { x: e.clientX, y: e.clientY }
  if (flight.active) flight.pause()
})
canvas.addEventListener('pointerup', e => {
  if (!downAt || !world || !mode) return
  const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y)
  downAt = null
  if (moved > 6) return
  const hit = pickAt(e.clientX, e.clientY)
  if (hit === 'orb') {
    if (!irisAwake) void wakeIris()
    else if (voice?.state === 'speaking') {
      voice.stopSpeaking()
      overlay.focusAsk()
    }
    else goTo({ kind: 'iris', key: 'iris' })
    return
  }
  if (hit) goTo(hit)
})
let hoverT = 0
canvas.addEventListener('pointermove', e => {
  if (!world || !mode || performance.now() - hoverT < 80) return
  hoverT = performance.now()
  canvas.style.cursor = pickAt(e.clientX, e.clientY) ? 'pointer' : 'grab'
})

const step = (dir: number): void => {
  if (!order.length) return
  cursor = (cursor + dir + order.length) % order.length
  goTo(order[cursor])
}
function orbit(az: number, el: number): void {
  flight.pause()
  const off = camera.position.clone().sub(controls.target)
  const sph = new THREE.Spherical().setFromVector3(off)
  sph.theta += az
  sph.phi = THREE.MathUtils.clamp(sph.phi + el, 0.15, Math.PI - 0.15)
  camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sph))
}
function zoom(f: number): void {
  flight.pause()
  const off = camera.position.clone().sub(controls.target).multiplyScalar(f)
  const len = THREE.MathUtils.clamp(off.length(), controls.minDistance, controls.maxDistance)
  camera.position.copy(controls.target).add(off.setLength(len))
}
window.addEventListener('keydown', e => {
  if (!mode || (e.target as HTMLElement)?.closest?.('input,textarea')) return
  const k = e.key
  if (k === 'ArrowLeft') orbit(-0.08, 0)
  else if (k === 'ArrowRight') orbit(0.08, 0)
  else if (k === 'ArrowUp') orbit(0, -0.06)
  else if (k === 'ArrowDown') orbit(0, 0.06)
  else if (k === '+' || k === '=') zoom(0.88)
  else if (k === '-' || k === '_') zoom(1.12)
  else if (k === 'n' || k === 'N') step(1)
  else if (k === 'p' || k === 'P') step(-1)
  else if (k === ' ') { flight.pause(); voice?.stopSpeaking() }
  else if (k === 'h' || k === 'H') goCore()
  else if (k === 'a' || k === 'A') overlay.togglePanel('atlas')
  else if (k === 't' || k === 'T') { overlay.setToggle('transcript', !toggles.transcript); savePrefs(toggles) }
  else if (k === 'm' || k === 'M') void toggleMic(!voice?.micOn)
  else if (k === 'Escape') { overlay.togglePanel('atlas', false); world?.clearDetail(); clearSelection() }
  else return
  if (k.startsWith('Arrow') || k === ' ') e.preventDefault()
})

async function toggleMic(on: boolean): Promise<void> {
  if (on) {
    mode = 'talk'
    if (!irisAwake) return wakeIris()
    ensureVoice()
    const ok = (await voice?.enableMic()) ?? false
    overlay.setMic(ok)
    if (!ok) overlay.speechUnavailable()
  } else {
    voice?.disableMic()
    overlay.setMic(false)
  }
}

overlay.onToggle = (k, v) => {
  if (k === 'mic') return void toggleMic(v)
  savePrefs(toggles)
  if (k === 'sound') { if (v) startAmbient(); else ambient?.set(false) }
  if (k === 'haptics') { haptics.enabled = v; if (v) pulse('tap') }
  if (k === 'reducedMotion') card.setReducedMotion(v)
}
overlay.onAtlas = id => {
  overlay.togglePanel('atlas', false)
  cursor = Number(id)
  goTo(order[cursor])
}
overlay.onHome = () => goCore()
card.onClose = () => clearSelection()
card.onUp = () => {
  if (!shown) return goCore()
  if (shown.kind === 'city') return goTo({ kind: 'country', key: shown.key.split(':')[0] })
  goCore()
}
card.onAction = (_id, action) => {
  if (!shown || !world || !brain) return
  pulse('tap')
  if (action === 'ask') { void irisSays({ ...brain.describe(shown), target: undefined }); return }
  if (action.startsWith('go:')) {
    const [, kind, ...rest] = action.split(':')
    goTo({ kind: kind as Target['kind'], key: rest.join(':') })
    return
  }
  if (action === 'lower' && shown.kind === 'country') {
    const c = countryOf(shown.key)
    const cap = c && (registry.cities.cities.find(x => x.a3 === c.a3 && x.capital) ?? registry.cities.cities.filter(x => x.a3 === c.a3).sort((a, b) => b.pop - a.pop)[0])
    if (cap) goTo({ kind: 'city', key: `${cap.a3}:${cap.name}` })
    else if (c) flyGeo(c.label[1], c.label[0], tierInfo('civil').altitude)
    return
  }
  if (action === 'street' && shown.kind === 'city') {
    const c = cityOf(shown.key)
    if (c) { flyGeo(c.lat, c.lon, tierInfo('street').altitude); card.setOpen(false) }
    return
  }
  if (action === 'country' && shown.kind === 'jurisdiction') {
    const c = world.geo.countries.find(x => x.name.toLowerCase() === shown!.key.toLowerCase())
    if (c) goTo({ kind: 'country', key: c.a3 })
  }
}
/** Ladder: from where you are, inward to you or outward toward the cosmic. */
ladder.onTier = (tier: Tier) => {
  if (!world || !mode) return
  pulse('tap')
  const look = controls.target.length() > 9 ? controls.target : camera.position
  const ll = toLatLon(look)
  flyGeo(ll.lat, ll.lon, tierInfo(tier).altitude)
  recordDecision(`Scale ${tier}`)
  overlay.announce(`${tierInfo(tier).name}: ${tierInfo(tier).what}`)
}
overlay.onAsk = text => hear(text)
overlay.onBind = () => grantAgreement()
overlay.onLand = () => landOnPhone()
overlay.onLedger = (face, text) => {
  void (face === 'white' ? takeWhite(text) : takeDark(text)).then(result => {
    overlay.announce('error' in result ? result.error : face === 'white' ? 'Taken in white. Iris can quote it.' : 'Sealed in the dark. Iris will not read it aloud.')
    refreshLedger()
  }).catch(() => overlay.announce('The dark ledger could not seal that. It was not stored.'))
}
let fatherChallenge: string | null = null
overlay.onFatherChallenge = () => {
  fatherChallenge = newChallenge()
  overlay.setFatherChallenge(fatherChallenge)
}
overlay.onFatherCheck = (publicPem, signature) => {
  if (!fatherChallenge) {
    overlay.setFatherResult('Make a challenge first. The signature has to match that line.')
    return
  }
  void verifyPublicSignature(publicPem, fatherChallenge, signature).then(result => overlay.setFatherResult(result.reason))
}
overlay.onAdventure = pipe => {
  const owner = storedHandle()?.handle
  if (!owner) {
    overlay.announce('Bind a Unity ID first. An adventure belongs to one.')
    return
  }
  const result = choosePipe(owner, pipe)
  overlay.announce('error' in result ? result.error : pipe === 'share' ? 'A key is minted. The room opens by that key alone. There is no password. Hide is still there.' : 'Hidden. The key is back with you. Share is still there. There is no password.')
  refreshLedger()
}
overlay.onSeat = (kind, consent, mark) => {
  const admitted = admitSeat({ kind, consent, mark, handle: storedHandle()?.handle ?? null })
  if (!admitted.ok) {
    overlay.announce(admitted.reason)
    return
  }
  void takeDark(admitted.mark).then(sealed => {
    if ('error' in sealed) {
      overlay.announce(sealed.error)
      return
    }
    saveSeats([{ id: sealed.id, kind: admitted.kind, consent: true as const, handle: admitted.handle, sha256: sealed.sha256, at: sealed.at }, ...loadSeats()].slice(0, 80))
    overlay.announce('The seat is taken. The mark is sealed. It is not shown.')
    refreshLedger()
  }).catch(() => overlay.announce('The mark could not be sealed. The seat was not taken.'))
}
async function refreshUnity(): Promise<void> {
  const handle = storedHandle()?.handle ?? null
  if (!handle) {
    overlay.setUnityPay(null, null, [], '')
    return
  }
  try {
    const view = await unityRead(handle)
    const lines = (view.transfers ?? []).map(row => `${row.to === handle ? `Received ${row.amount} from ${row.from}` : `Sent ${row.amount} to ${row.to}`}. ${row.receipt.slice(0, 12)}`)
    overlay.setUnityPay(handle, view.balance, lines, view.error ?? '')
  } catch {
    overlay.setUnityPay(handle, null, [], 'The wallet did not answer.')
  }
}

overlay.onUnity = (action, to, amount) => {
  const handle = storedHandle()?.handle
  if (!handle) {
    overlay.setUnityPay(null, null, [], 'Bind a Unity ID before the wallet can send or receive.')
    return
  }
  if (action === 'fund') {
    const deposit = Math.floor(economy.doctor.supply)
    void unityOpen(handle, deposit).then(view => {
      if (view.taken) {
        economy = { ...economy, doctor: { ...economy.doctor, supply: economy.doctor.supply - view.taken, spent: economy.doctor.spent + view.taken } }
        saveEconomy(economy)
        paintWallet()
      }
      const lines = (view.transfers ?? []).map(row => `${row.to === handle ? `Received ${row.amount} from ${row.from}` : `Sent ${row.amount} to ${row.to}`}. ${row.receipt.slice(0, 12)}`)
      const note = view.error ?? (view.taken ? `Moved ${view.taken} from the seed into the wallet. The swarm pool was not touched.` : 'The seed was already moved. Sending again does not take more.')
      overlay.setUnityPay(handle, view.balance, lines, note)
    }).catch(() => overlay.setUnityPay(handle, null, [], 'The wallet did not answer.'))
    return
  }
  void unitySend(handle, to.trim(), Math.floor(amount)).then(view => {
    if (view.error) overlay.setUnityPay(handle, view.balance ?? null, [], view.error)
    void refreshUnity()
  }).catch(() => overlay.setUnityPay(handle, null, [], 'The wallet did not answer.'))
}

window.setInterval(() => { void refreshUnity() }, 3000)

overlay.onEconomy = action => {
  if (action === 'sign-bots') {
    void signBotUnity().then(() => paintWallet())
    return
  }
  if (action === 'release-bots') {
    releaseBot()
    overlay.announce('They left. There was no commitment. Their sandbox was always theirs. The audit of the leaving stays.')
    paintWallet()
    return
  }
  if (action === 'split') economy = splitSupply(economy)
  if (action === 'trade') tradeHeld()
  if (action === 'derive') {
    const found = solved.find(key => key.holder === 'bots' && !derivatives.some(row => row.findId === key.id))
    if (!found) {
      overlay.announce('Nobody else has a find to take a derivative of yet. Your own finds stay yours. Nothing is liquidated.')
    } else {
      const taken = takeDerivative(economy.doctor.supply, found, economy.shifts, derivatives)
      if ('error' in taken) overlay.announce(taken.error)
      else {
        economy = { ...economy, doctor: { ...economy.doctor, supply: taken.supply, spent: economy.doctor.spent + taken.derivative.cost } }
        derivatives = [...derivatives, taken.derivative]
        saveDerivatives()
        overlay.announce('Coins left the seed for a derivative of their find. The find stays theirs. The return comes back here. Nothing was seized.')
      }
    }
  }
  if (action === 'hire' || action === 'body' || action === 'cross' || action === 'shift') {
    if (!botsMay(action)) {
      paintWallet()
      overlay.announce('Not here. They have not chosen a Unity ID. Their own sandbox is still free. The refusal is on the audit.')
      return
    }
  }
  if (action === 'hire' || action === 'body' || action === 'cross') {
    const ran = action === 'hire' ? hireBot(economy, gap) : action === 'body' ? sellBody(economy, gap) : crossGap(economy, gap)
    economy = ran.state
    gap = ran.gap
    saveGap()
  }
  if (action === 'shift') {
    const ran = runShift(economy)
    economy = ran.state
    const shift = economy.shifts
    for (let i = 0; i < ran.report.botWorks; i++) {
      const claim = WORKS[i % WORKS.length]
      const seen = solved.some(k => k.holder === 'bots' && k.claim === claim)
      const key = holdKey(`bots:${shift}:${i}`, claim, !seen, 'bots', shift, seen)
      if (key?.earned && !supplied.some(row => row.id === key.id)) {
        supplied = [...supplied, { id: key.id, claim: key.claim }]
        saveSupplied()
        auditBot('supply-iris', true, 'found data given to iris for a key')
      }
    }
    const pay = payTrickle(solved, shift)
    const back = seedReturn(derivatives, shift)
    economy = {
      ...economy,
      doctor: { ...economy.doctor, supply: economy.doctor.supply + pay.doctor + back },
      bots: { ...economy.bots, supply: economy.bots.supply + pay.bots },
      last: [`Trickle this shift: you ${pay.doctor.toFixed(2)}, bots ${pay.bots.toFixed(2)}. Seed derivative ${back.toFixed(2)}. Logarithmic, and smaller next time.`, ...economy.last].slice(0, 6),
    }
  }
  saveEconomy(economy)
  paintWallet()
}
overlay.onUnityId = action => {
  if (action === 'forget') {
    forgetHandle()
    clearAgreement()
    refreshUnityId()
    void irisSays({ speech: 'Forgotten on this device. The passkey itself stays in your authenticator until you remove it there.', action: 'none' })
  } else void grantAgreement()
}
overlay.onEnter = m => {
  mode = m
  // Everything here runs synchronously inside the entry tap: show the world, then let Iris speak
  // (speech must start inside the gesture), then set up optional ambient audio without awaiting it.
  overlay.enter()
  ladder.show()
  canvas.focus()
  if (m !== 'read' && !hadPrefs()) toggles.haptics = !toggles.reducedMotion
  if (m === 'read') toggles.transcript = true
  for (const k of ['sound', 'haptics', 'reducedMotion', 'transcript'] as const) overlay.setToggle(k, toggles[k])
  savePrefs(toggles)
  haptics.enabled = toggles.haptics
  feeds.onUpdate(key => onFeed(key))
  feeds.start()
  void wakeIris()
  if (toggles.sound) startAmbient()
}

function startAmbient(): void {
  try {
    if (!audio) {
      audio = new AudioContext()
      ambient = new Ambient(audio)
    }
    void audio.resume().catch(() => undefined)
    ambient?.duck(voice?.state === 'speaking')
    ambient?.set(true)
  } catch { audio = null; ambient = null }
}

// Any later tap replays speech the browser refused earlier (it must be inside a gesture).
window.addEventListener('pointerdown', () => { voice?.retryIfBlocked() }, { capture: true })
window.addEventListener('keydown', () => { voice?.retryIfBlocked() }, { capture: true })

// ---------------- gamepad ----------------
let padPrev: boolean[] = []
function gamepad(dt: number): void {
  const pad = navigator.getGamepads?.().find(Boolean)
  if (!pad || !mode) return
  const dead = (v: number) => (Math.abs(v) < 0.15 ? 0 : v)
  const lx = dead(pad.axes[0] ?? 0)
  const ly = dead(pad.axes[1] ?? 0)
  const ry = dead(pad.axes[3] ?? 0)
  if (lx || ly) orbit(-lx * dt * 1.6, ly * dt * 1.2)
  if (ry) zoom(1 + ry * dt * 1.2)
  const b = pad.buttons.map(x => x.pressed)
  const edge = (i: number) => b[i] && !padPrev[i]
  if (edge(0)) step(1)
  if (edge(2)) step(-1)
  if (edge(1)) goCore()
  if (edge(3)) { if (!irisAwake) void wakeIris(); else voice?.stopSpeaking() }
  padPrev = b
}

// ---------------- loop ----------------
const clock = new THREE.Clock()
let fpsFrames = 0
let fpsTime = 0
let perfChecked = false
let instrumentTimer = 0
let frameErrors = 0
let cardTimer = 0
function frame(): void {
  const dt = Math.min(0.1, clock.getDelta())
  const t = clock.elapsedTime
  try {
    flight.update(dt)
    gamepad(dt)
    // Near the ground the orbit target sits on the surface: allow a close camera and never let it sink below the land.
    const onGround = controls.target.length() > 9
    controls.minDistance = onGround ? 0.45 : 4
    controls.update()
    const minR = 10.18
    if (camera.position.length() < minR) camera.position.setLength(minR)
    camera.userData.lookAt = controls.target
    voice?.update(dt, t)
    const speaking = voice?.state === 'speaking'
    const level = Math.min(1, (voice?.speechLevel ?? 0) + (voice?.micLevel ?? 0) * 1.4)
    orb.update(dt, t, level, voice?.spectrum ?? emptySpectrum, speaking ? 1 : 0)
    orb.group.lookAt(camera.position)
    if (world) {
      world.update(dt, t, camera, new Date(), toggles.reducedMotion)
      ladder.set(world.tier)
      cardTimer += dt
      if (cardTimer > 5) { cardTimer = 0; if (shown?.kind === 'feed' || shown?.kind === 'telemetrics') refreshCard() }
      if (cardTimer > 0.4 && Math.floor(cardTimer * 2) !== Math.floor((cardTimer - dt) * 2)) paintScale()
      instrumentTimer += dt
      if (instrumentTimer > 30) {
        instrumentTimer = 0
        for (const k of FEED_KEYS) world.renderInstrument(k, feeds.status.get(k), feeds.values, Date.now())
        world.renderTelemetrics([...feeds.status.values()], feeds.values, Date.now())
        overlay.setSceneText(world.sceneText())
      }
    }
    renderer.render(scene, camera)
  } catch (err) {
    if (frameErrors++ < 5) console.error('frame error (recovered)', err)
  }
  // Twain² condition: drop bloom if the device cannot hold 30 fps once the world is up.
  if (world && !perfChecked) {
    fpsFrames++
    fpsTime += dt
    if (fpsTime > 4) {
      perfChecked = true
      if (fpsFrames / fpsTime < 30 && quality === 'high') renderer.applyQuality('medium')
    }
  }
}
renderer.gl.setAnimationLoop(frame)
document.addEventListener('visibilitychange', () => { if (!document.hidden) clock.getDelta() })

boot().catch(err => {
  console.error(err)
  overlay.fail(err instanceof Error ? err.message : 'Unknown error')
})

declare global { interface Window { __world: unknown } }
window.__world = {
  get ready() { return !!world },
  get mode() { return mode },
  get sector() { return world?.sector },
  get integrity() { return integrity.map(m => ({ module: m.module, state: m.state })) },
  get feeds() { return [...feeds.status.values()].map(s => ({ key: s.key, state: s.state })) },
  get discovered() { return [...discovered] },
  get camera() { return camera.position.toArray() },
  get flying() { return flight.active },
  get irisAwake() { return irisAwake },
  ask: (text: string) => {
    if (!brain) return undefined
    overlay.visitor(text)
    const reply = brain.respond(text)
    void settle(text, reply).then(final => irisSays(final))
    return reply
  },
  goTo,
  pickables: () => world?.pickables.length ?? 0,
  pick: (x: number, y: number) => pickAt(x, y),
  get tier() { return world?.tier ?? null },
  get card() { const m = card.current; return m ? { id: m.id, title: m.title, open: card.isOpen } : null },
  get selected() { return world?.geo.selected?.name ?? null },
  get pipe() { return pipe.readOnlyStream() },
  ladder: (t: Tier) => ladder.onTier?.(t),
}
