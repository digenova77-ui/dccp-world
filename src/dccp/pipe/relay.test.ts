/** `dualis.relay.v1` tests — the relay protocol baked into the bind path.
 * Design: RELAY_DESIGN.md. Verdict: ED-PREDICT-20261004-RELAY-V1 (predicted).
 *
 * Every test is honest: a relayed bind is never a delivered bind; malformed
 * bundles are rejected with reasons, never trusted; receipts are verified
 * like the live path — import never invents one. */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { webcrypto } from 'node:crypto'
import {
  CarryDaemon,
  memoryOutboxStore,
  type NewOutboxEntry,
  type OutboxEntry,
} from './daemon.ts'
import {
  RELAY_SCHEMA,
  fromRelayBundle,
  fromRelayReceiptBundle,
  isRelayable,
  isUnreachableHole,
  memoryRelayOutboxStore,
  parseRelayExport,
  parseRelayReceiptImport,
  toRelayBundle,
  toRelayReceiptBundle,
  type RelayBundle,
} from './relay.ts'
import {
  FATHER_BIND_PROTOCOL,
  bytesToBase64,
  fatherKeyFingerprint,
  prepareFatherBind,
  type BindEndpoint,
  type FatherBindReceipt,
  type FatherBindWallet,
  type PinnedFather,
} from './fatherBind.ts'
import { canonicalJson } from './ephemeral.ts'
import { resetBindingRegistry } from './ephemeral.ts'

const subtle = webcrypto.subtle
const ENDPOINT: BindEndpoint = { protocol: 'http', host: '127.0.0.1', port: '18099', path: '' }

function throwingFetch(): typeof fetch {
  return (async () => {
    throw new Error('connect ECONNREFUSED 127.0.0.1:18099')
  }) as unknown as typeof fetch
}

function walletEntry(hash: string): NewOutboxEntry {
  return {
    manifest_hash: hash,
    kind: 'wallet-bind',
    envelope: JSON.stringify({ kind: 'wallet-bind', v: '2', authority: 'NONE' }),
    endpoint: ENDPOINT,
    unity_id: 'dc.unity.test',
  }
}

function relayableEntry(over: Partial<OutboxEntry> = {}): OutboxEntry {
  return {
    schema: 'dualis.daemon.v1',
    manifest_hash: 'sha256:relayable',
    kind: 'wallet-bind',
    envelope: 'box-bytes',
    endpoint: { ...ENDPOINT },
    unity_id: 'dc.unity.test',
    state: 'QUEUED',
    attempts: 1,
    next_attempt_at: 0,
    created_at: 0,
    last_error: 'HOLE · UNREACHABLE — the kernel endpoint did not answer.',
    receipt: null,
    ...over,
  }
}

async function makeFather(): Promise<{ priv: CryptoKey; pinned: PinnedFather }> {
  const kp = (await subtle.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify'])) as CryptoKeyPair
  const raw = new Uint8Array(await subtle.exportKey('raw', kp.publicKey))
  return { priv: kp.privateKey, pinned: { raw, fingerprint: await fatherKeyFingerprint(raw) } }
}

async function makeWallet(): Promise<FatherBindWallet> {
  const kp = (await subtle.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify'])) as CryptoKeyPair
  const raw = new Uint8Array(await subtle.exportKey('raw', kp.publicKey))
  return { id: 'agency-test-1', fingerprint: 'sha256:testfp00000000000000', alg: 'Ed25519', privateKey: kp.privateKey, publicRaw: raw }
}

test.beforeEach(() => {
  resetBindingRegistry()
})

/* ---------------- relayability ---------------- */

test('isUnreachableHole recognizes only the no-live-kernel marker', () => {
  assert.equal(isUnreachableHole('HOLE · UNREACHABLE — the kernel endpoint did not answer.'), true)
  assert.equal(isUnreachableHole('DEAD · 12 attempts, no kernel answer. Last: HOLE · UNREACHABLE — x'), true)
  assert.equal(isUnreachableHole('HOLE · daemon fault: boom'), false)
  assert.equal(isUnreachableHole('REJECTED · NO_PINNED_KEY — x'), false)
  assert.equal(isUnreachableHole(null), false)
  assert.equal(isUnreachableHole(''), false)
})

test('isRelayable: QUEUED/DEAD + UNREACHABLE only — never terminal, never faulted', () => {
  assert.equal(isRelayable(relayableEntry()), true)
  assert.equal(isRelayable(relayableEntry({ state: 'DEAD', last_error: 'DEAD · 12 attempts, no kernel answer. Last: HOLE · UNREACHABLE — x' })), true)
  assert.equal(isRelayable(relayableEntry({ state: 'DELIVERED' })), false)
  assert.equal(isRelayable(relayableEntry({ state: 'REJECTED', last_error: 'REJECTED · NO_PINNED_KEY — x' })), false)
  assert.equal(isRelayable(relayableEntry({ state: 'IN_FLIGHT' })), false)
  assert.equal(isRelayable(relayableEntry({ last_error: 'HOLE · daemon fault: boom' })), false)
  assert.equal(isRelayable(relayableEntry({ last_error: null })), false)
})

/* ---------------- bundle round-trip ---------------- */

test('toRelayBundle → fromRelayBundle round-trips, fail-closed', () => {
  const entry = relayableEntry({ father_pubkey_b64: 'cHVia2V5', father_fingerprint: 'sha256:fp' })
  const bundle = toRelayBundle(entry, '2026-10-04T21:00:00.000Z', 7)
  assert.equal(bundle.schema, RELAY_SCHEMA)
  assert.equal(bundle.manifest_hash, 'sha256:relayable')
  assert.equal(bundle.relay_sequence, 7)
  assert.equal(bundle.father_pubkey_b64, 'cHVia2V5')
  const parsed = fromRelayBundle(JSON.parse(JSON.stringify(bundle)))
  assert.equal(parsed.ok, true)
  if (parsed.ok) assert.deepEqual(parsed.value, bundle)
})

test('fromRelayBundle rejects every malformed shape with a reason — never throws', () => {
  const good = toRelayBundle(relayableEntry(), '2026-10-04T21:00:00.000Z', 1)
  const cases: Array<[string, unknown]> = [
    ['not an object', 42],
    ['null', null],
    ['wrong schema', { ...good, schema: 'dualis.relay.v0' }],
    ['no manifest_hash', { ...good, manifest_hash: '' }],
    ['bad kind', { ...good, kind: 'mint-coins' }],
    ['no envelope', { ...good, envelope: '' }],
    ['bad endpoint', { ...good, endpoint: { host: 'x' } }],
    ['no unity_id', { ...good, unity_id: '' }],
    ['no relayed_at', { ...good, relayed_at: '' }],
    ['bad sequence', { ...good, relay_sequence: -1 }],
    ['NaN sequence', { ...good, relay_sequence: NaN }],
    ['no reason', { ...good, reason: '' }],
  ]
  for (const [name, input] of cases) {
    const r = fromRelayBundle(input)
    assert.equal(r.ok, false, name)
    if (!r.ok) assert.match(r.reason, /REJECTED/, name)
  }
})

test('fromRelayReceiptBundle rejects DELIVERED without a receipt — receipts are never invented', () => {
  const good = toRelayReceiptBundle({
    manifest_hash: 'sha256:x',
    outcome: 'DELIVERED',
    receipt: { accepted: true },
    reason: 'kernel answered',
    answered_at: '2026-10-04T21:00:00.000Z',
  })
  assert.equal(fromRelayReceiptBundle(good).ok, true)
  const noReceipt = fromRelayReceiptBundle({ ...good, receipt: undefined })
  assert.equal(noReceipt.ok, false)
  if (!noReceipt.ok) assert.match(noReceipt.reason, /never invented/)
  const nullReceipt = fromRelayReceiptBundle({ ...good, receipt: null })
  assert.equal(nullReceipt.ok, false)
  assert.equal(fromRelayReceiptBundle({ ...good, outcome: 'MAYBE' }).ok, false)
  assert.equal(fromRelayReceiptBundle({ ...good, reason: '' }).ok, false)
})

test('parseRelayExport skips malformed members, keeps valid ones, never throws', () => {
  const good = toRelayBundle(relayableEntry(), '2026-10-04T21:00:00.000Z', 1)
  const parsed = parseRelayExport({
    schema: RELAY_SCHEMA,
    exported_at: '2026-10-04T21:00:00.000Z',
    exporter: 'dualis.app.v1',
    bundles: [good, { ...good, manifest_hash: '' }, 'junk', { ...good, manifest_hash: 'sha256:second' }],
  })
  assert.equal(parsed.ok, true)
  assert.equal(parsed.bundles.length, 2)
  assert.equal(parsed.skipped, 2)
  assert.equal(parsed.reasons.length, 2)
  assert.equal(parseRelayExport('nope').ok, false)
  assert.equal(parseRelayExport({ schema: RELAY_SCHEMA }).ok, false)
})

/* ---------------- daemon bake-in ---------------- */

test('HOLE → the bind ALSO enters the relay outbox, gated, retry queue intact', async () => {
  const events: string[] = []
  const d = new CarryDaemon({
    store: memoryOutboxStore(),
    relayStore: memoryRelayOutboxStore(),
    fetchImpl: throwingFetch(),
    onEvent: e => void events.push(e.type),
  })
  await d.enqueue(walletEntry('sha256:relay-me'))
  await d.pump()
  const [entry] = await d.list()
  assert.equal(entry.state, 'QUEUED', 'retry queue keeps working')
  assert.match(entry.last_error ?? '', /UNREACHABLE/)
  assert.equal(entry.relayed, true, 'entry is marked relayed')
  assert.ok(entry.relayed_at, 'relay timestamp recorded')
  assert.ok(events.includes('relayed'), 'relayed event emitted')
  const bundles = await d.relayList()
  assert.equal(bundles.length, 1)
  assert.equal(bundles[0].manifest_hash, 'sha256:relay-me')
  assert.equal(bundles[0].schema, RELAY_SCHEMA)
  assert.match(bundles[0].reason, /UNREACHABLE/)
  // A relayed bind is not a delivered bind.
  assert.equal(entry.receipt, null)
})

test('repeated HOLEs never relay the same bind twice — idempotent', async () => {
  let now = 1_000_000
  const d = new CarryDaemon({
    store: memoryOutboxStore(),
    relayStore: memoryRelayOutboxStore(),
    fetchImpl: throwingFetch(),
    now: () => now,
    backoffMs: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
  })
  await d.enqueue(walletEntry('sha256:once'))
  for (let i = 0; i < 4; i++) {
    now += 20
    await d.pump(now)
  }
  const bundles = await d.relayList()
  assert.equal(bundles.length, 1, 'one relay bundle per manifest_hash, ever')
  const [entry] = await d.list()
  assert.equal(entry.attempts, 4, 'retry queue still advances independently')
})

test('non-network failures are NOT relayed — only no-live-kernel', async () => {
  const d = new CarryDaemon({
    store: memoryOutboxStore(),
    relayStore: memoryRelayOutboxStore(),
    fetchImpl: throwingFetch(),
  })
  // father-bind with no pinned key → REJECTED · NO_PINNED_KEY (terminal, not a HOLE)
  await d.enqueue({
    manifest_hash: 'sha256:no-key',
    kind: 'father-bind',
    envelope: JSON.stringify({ protocol: FATHER_BIND_PROTOCOL }),
    endpoint: ENDPOINT,
    unity_id: 'dc.unity.test',
  })
  await d.pump()
  const [entry] = await d.list()
  assert.equal(entry.state, 'REJECTED')
  assert.equal(entry.relayed, undefined)
  assert.equal((await d.relayList()).length, 0, 'rejections on the merits never enter the relay')
})

test('exportRelay is portable, sorted, IPFS-shaped', async () => {
  const d = new CarryDaemon({ store: memoryOutboxStore(), relayStore: memoryRelayOutboxStore(), fetchImpl: throwingFetch() })
  await d.enqueue(walletEntry('sha256:exp-b'))
  await d.enqueue(walletEntry('sha256:exp-a'))
  await d.pump()
  const exported = await d.exportRelay()
  assert.equal(exported.schema, RELAY_SCHEMA)
  assert.equal(exported.exporter, 'dualis.app.v1')
  assert.ok(exported.exported_at)
  assert.equal(exported.bundles.length, 2)
  assert.ok(exported.bundles[0].relay_sequence < exported.bundles[1].relay_sequence, 'sorted by sequence')
  // JSON-serializable — the pin-to-IPFS shape.
  assert.doesNotThrow(() => JSON.stringify(exported))
})

/* ---------------- receipt ingest ---------------- */

async function fatherBindEntry(d: CarryDaemon, father: { priv: CryptoKey; pinned: PinnedFather }, wallet: FatherBindWallet, hash: string) {
  const prepared = await prepareFatherBind({
    unityId: 'dc.unity.test',
    wallet,
    pinnedFather: father.pinned,
    endpoint: ENDPOINT,
  })
  assert.equal(prepared.ok, true)
  if (!prepared.ok) throw new Error('test setup: prepareFatherBind rejected')
  await d.enqueue({
    manifest_hash: hash,
    kind: 'father-bind',
    envelope: JSON.stringify(prepared.prepared.envelope),
    endpoint: ENDPOINT,
    unity_id: 'dc.unity.test',
    father_pubkey_b64: Buffer.from(father.pinned.raw).toString('base64'),
    father_fingerprint: father.pinned.fingerprint,
  })
}

function countersignedReceipt(fatherPriv: CryptoKey, manifestHash: string, wallet: FatherBindWallet) {
  return (async () => {
    const receipt: FatherBindReceipt = {
      protocol: FATHER_BIND_PROTOCOL,
      manifest_hash: manifestHash,
      wallet_pubkey: Buffer.from(wallet.publicRaw).toString('base64'),
      wallet_alg: 'Ed25519',
      bound_at: '2026-10-04T21:30:00.000Z',
      authority: 'NONE',
      father_fingerprint: 'sha256:testfather',
    }
    const sig = await subtle.sign({ name: 'Ed25519' }, fatherPriv, new TextEncoder().encode(canonicalJson(receipt)))
    return { receipt, father_signature: bytesToBase64(new Uint8Array(sig)) }
  })()
}

function receiptImportFor(manifestHash: string, outcome: 'DELIVERED' | 'HOLE' | 'REJECTED', receipt?: unknown, reason = 'counterparty answer') {
  return {
    schema: RELAY_SCHEMA,
    exported_at: '2026-10-04T22:00:00.000Z',
    receipts: [
      toRelayReceiptBundle({ manifest_hash: manifestHash, outcome, receipt, reason, answered_at: '2026-10-04T22:00:00.000Z' }),
    ],
  }
}

test('ingest DELIVERED father-bind: valid countersignature → DELIVERED, relay cleared', async () => {
  const d = new CarryDaemon({ store: memoryOutboxStore(), relayStore: memoryRelayOutboxStore(), fetchImpl: throwingFetch() })
  const father = await makeFather()
  const wallet = await makeWallet()
  await fatherBindEntry(d, father, wallet, 'sha256:ingest-ok')
  await d.pump()
  assert.equal((await d.relayList()).length, 1, 'bind entered the relay on UNREACHABLE')
  const kernelAnswer = await countersignedReceipt(father.priv, 'sha256:ingest-ok', wallet)
  const result = await d.ingestRelayReceipts(receiptImportFor('sha256:ingest-ok', 'DELIVERED', kernelAnswer, 'kernel countersigned'))
  assert.equal(result.applied, 1)
  assert.equal(result.rejected, 0)
  const [entry] = await d.list()
  assert.equal(entry.state, 'DELIVERED')
  assert.ok(entry.receipt, 'a real kernel answer behind the receipt')
  assert.equal((await d.relayList()).length, 0, 'relay bundle cleared on terminal settle')
})

test('ingest DELIVERED with the WRONG father key → rejected, PIN_MISMATCH, never delivered', async () => {
  const d = new CarryDaemon({ store: memoryOutboxStore(), relayStore: memoryRelayOutboxStore(), fetchImpl: throwingFetch() })
  const father = await makeFather()
  const wrong = await makeFather()
  const wallet = await makeWallet()
  await fatherBindEntry(d, father, wallet, 'sha256:ingest-bad')
  await d.pump()
  const kernelAnswer = await countersignedReceipt(wrong.priv, 'sha256:ingest-bad', wallet)
  const result = await d.ingestRelayReceipts(receiptImportFor('sha256:ingest-bad', 'DELIVERED', kernelAnswer))
  assert.equal(result.applied, 0)
  assert.equal(result.rejected, 1)
  assert.match(result.reasons.join(' '), /PIN_MISMATCH/)
  const [entry] = await d.list()
  assert.notEqual(entry.state, 'DELIVERED', 'no seal on a bad countersignature — ever')
})

test('ingest is idempotent: unknown hashes ignored, double delivery ignored, malformed counted', async () => {
  const d = new CarryDaemon({ store: memoryOutboxStore(), relayStore: memoryRelayOutboxStore(), fetchImpl: throwingFetch() })
  const father = await makeFather()
  const wallet = await makeWallet()
  await fatherBindEntry(d, father, wallet, 'sha256:ingest-idem')
  await d.pump()
  const kernelAnswer = await countersignedReceipt(father.priv, 'sha256:ingest-idem', wallet)
  const first = await d.ingestRelayReceipts(receiptImportFor('sha256:ingest-idem', 'DELIVERED', kernelAnswer))
  assert.equal(first.applied, 1)
  // Same receipt again → ignored, never settled twice.
  const second = await d.ingestRelayReceipts(receiptImportFor('sha256:ingest-idem', 'DELIVERED', kernelAnswer))
  assert.equal(second.applied, 0)
  assert.equal(second.ignored, 1)
  // Unknown hash → ignored.
  const third = await d.ingestRelayReceipts(receiptImportFor('sha256:ghost', 'DELIVERED', kernelAnswer))
  assert.equal(third.ignored, 1)
  // Malformed import → rejected with reasons, never throws.
  const fourth = await d.ingestRelayReceipts({ schema: RELAY_SCHEMA, receipts: [{ nope: true }] })
  assert.equal(fourth.rejected, 1)
  assert.equal(await d.ingestRelayReceipts('junk').then(r => r.rejected), 1)
})

test('ingest HOLE keeps the bind live and QUEUED; ingest REJECTED settles terminal with the true reason', async () => {
  const d = new CarryDaemon({ store: memoryOutboxStore(), relayStore: memoryRelayOutboxStore(), fetchImpl: throwingFetch() })
  await d.enqueue(walletEntry('sha256:ingest-hole'))
  await d.enqueue(walletEntry('sha256:ingest-rej'))
  await d.pump()
  const hole = await d.ingestRelayReceipts(
    receiptImportFor('sha256:ingest-hole', 'HOLE', undefined, 'HOLE · UNREACHABLE — the counterparty kernel did not answer either.'),
  )
  assert.equal(hole.applied, 1)
  const rej = await d.ingestRelayReceipts(
    receiptImportFor('sha256:ingest-rej', 'REJECTED', undefined, 'REJECTED · BAD_RESPONSE — the counterparty kernel refused the envelope.'),
  )
  assert.equal(rej.applied, 1)
  const entries = await d.list()
  const holeEntry = entries.find(e => e.manifest_hash === 'sha256:ingest-hole')!
  const rejEntry = entries.find(e => e.manifest_hash === 'sha256:ingest-rej')!
  assert.equal(holeEntry.state, 'QUEUED', 'HOLE is not an answer — the binding stays LIVE')
  assert.match(holeEntry.last_error ?? '', /counterparty kernel did not answer/)
  assert.equal(rejEntry.state, 'REJECTED')
  assert.match(rejEntry.last_error ?? '', /refused the envelope/)
  assert.equal(rejEntry.receipt, null, 'rejection carries no receipt')
})

test('ingest DELIVERED wallet-bind: kernel answer accepted, gated, receipt recorded', async () => {
  const d = new CarryDaemon({ store: memoryOutboxStore(), relayStore: memoryRelayOutboxStore(), fetchImpl: throwingFetch() })
  await d.enqueue(walletEntry('sha256:ingest-wallet'))
  await d.pump()
  const kernelAnswer = { accepted: true, box: 'sha256:ingest-wallet', at: '2026-10-04T22:00:00.000Z' }
  const result = await d.ingestRelayReceipts(receiptImportFor('sha256:ingest-wallet', 'DELIVERED', kernelAnswer, 'kernel accepted the box'))
  assert.equal(result.applied, 1)
  const [entry] = await d.list()
  assert.equal(entry.state, 'DELIVERED')
  assert.deepEqual(entry.receipt, kernelAnswer)
  assert.equal(entry.relayed, true, 'the relay flag stays — the ledger shows it arrived via relay')
})

test('a receipt replayed under a different manifest is refused — MANIFEST_MISMATCH', async () => {
  const d = new CarryDaemon({ store: memoryOutboxStore(), relayStore: memoryRelayOutboxStore(), fetchImpl: throwingFetch() })
  const father = await makeFather()
  const wallet = await makeWallet()
  await fatherBindEntry(d, father, wallet, 'sha256:replay-a')
  await fatherBindEntry(d, father, wallet, 'sha256:replay-b')
  await d.pump()
  // The counterparty's real answer for A is countersigned for A's manifest.
  const kernelAnswerA = await countersignedReceipt(father.priv, 'sha256:replay-a', wallet)
  // Replay it under B's manifest_hash: the ingest must refuse, never deliver B.
  const result = await d.ingestRelayReceipts(receiptImportFor('sha256:replay-b', 'DELIVERED', kernelAnswerA, 'forged relay'))
  assert.equal(result.applied, 0)
  assert.equal(result.rejected, 1)
  assert.match(result.reasons.join(' '), /MANIFEST_MISMATCH/)
  const entries = await d.list()
  const b = entries.find(e => e.manifest_hash === 'sha256:replay-b')!
  assert.notEqual(b.state, 'DELIVERED', 'a cross-manifest receipt never seals')
  assert.equal(b.receipt, null, 'no receipt recorded on the wrong bind')
})
