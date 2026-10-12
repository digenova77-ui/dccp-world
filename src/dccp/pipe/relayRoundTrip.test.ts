/** Relay round-trip simulator — the full circuit without a live counterparty.
 *
 * David: "check our logic against our physical." The physical counterparty
 * (his machine) does not exist yet, so this simulator plays its role — with
 * REAL cryptography, not mocks of the crypto: a TEST Ed25519 Father keypair
 * (generated in-test, never David's key), real countersignatures, verified by
 * the real production verifier (`verifyRelayReceipt`), settled through the
 * real daemon settle paths and the real Iris gates.
 *
 * The round trip: enqueue → pump (no live kernel) → HOLE/UNREACHABLE →
 * relay outbox → export page (what gets pinned) → simulated counterparty
 * consumes the page and countersigns → receipt import → DELIVERED.
 *
 * What it proves: the machinery carries a bind out through the relay and a
 * countersigned receipt back — export → counterparty → import — with DCLM
 * idempotency (manifest_hash, the one and only key) throughout.
 *
 * What it does NOT prove (and cannot): the seal. Only David's machine,
 * countersigning with the real Father key, seals ED-PREDICT-20261004-RELAY-V1.
 * A simulator that claimed the seal would be the lie the gates exist to catch.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CarryDaemon,
  memoryOutboxStore,
  type NewOutboxEntry,
} from './daemon.ts'
import {
  RELAY_SCHEMA,
  memoryRelayOutboxStore,
  parseRelayExport,
  parseRelayReceiptImport,
  toRelayReceiptBundle,
  type RelayReceiptBundle,
} from './relay.ts'
import { canonicalJson } from './chain.ts'
import { FATHER_BIND_PROTOCOL, type BindEndpoint } from './fatherBind.ts'

const ENDPOINT: BindEndpoint = { protocol: 'http', host: '127.0.0.1', port: '18099', path: '' }

function throwingFetch(): typeof fetch {
  return (async () => {
    throw new Error('connect ECONNREFUSED 127.0.0.1:18099')
  }) as unknown as typeof fetch
}

const b64 = (bytes: Uint8Array): string => Buffer.from(bytes).toString('base64')

/** A TEST Father keypair. Generated fresh per test run. Never David's key —
 *  the simulator must never touch, derive from, or resemble the real root. */
async function testFatherKeypair(): Promise<{
  pubkeyB64: string
  fingerprint: string
  sign: (data: Uint8Array) => Promise<string>
}> {
  const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey))
  const fp = new Uint8Array(await crypto.subtle.digest('SHA-256', raw as BufferSource))
  return {
    pubkeyB64: b64(raw),
    fingerprint: b64(fp).slice(0, 16),
    sign: async (data: Uint8Array) =>
      b64(new Uint8Array(await crypto.subtle.sign({ name: 'Ed25519' }, kp.privateKey, data as BufferSource))),
  }
}

function fatherEntry(hash: string, pubkeyB64: string, fingerprint: string): NewOutboxEntry {
  return {
    manifest_hash: hash,
    kind: 'father-bind',
    envelope: JSON.stringify({ protocol: FATHER_BIND_PROTOCOL, manifest_hash: hash, test: true }),
    endpoint: { ...ENDPOINT },
    unity_id: 'unity:simulated',
    father_pubkey_b64: pubkeyB64,
    father_fingerprint: fingerprint,
  }
}

function walletEntry(hash: string): NewOutboxEntry {
  return {
    manifest_hash: hash,
    kind: 'wallet-bind',
    envelope: JSON.stringify({ kind: 'wallet-bind', v: '2', authority: 'NONE' }),
    endpoint: { ...ENDPOINT },
    unity_id: 'unity:simulated',
  }
}

/** The simulated counterparty: consumes an export page, countersigns what a
 *  real kernel would answer. For father-bind: a real Ed25519 countersignature
 *  over the canonical receipt bytes, made with the TEST key. */
async function counterpartyAnswer(
  exportJson: unknown,
  sign: (data: Uint8Array) => Promise<string>,
  outcome: 'DELIVERED' | 'HOLE' | 'REJECTED' = 'DELIVERED',
  reason = 'simulated kernel answer',
): Promise<unknown> {
  const parsed = parseRelayExport(exportJson)
  assert.equal(parsed.ok, true, 'counterparty must parse a valid export')
  const receipts: RelayReceiptBundle[] = []
  for (const bundle of parsed.bundles) {
    if (outcome !== 'DELIVERED') {
      receipts.push(
        toRelayReceiptBundle({
          manifest_hash: bundle.manifest_hash,
          outcome,
          reason,
          answered_at: new Date().toISOString(),
        }),
      )
      continue
    }
    if (bundle.kind === 'father-bind') {
      const inner = {
        protocol: FATHER_BIND_PROTOCOL,
        manifest_hash: bundle.manifest_hash,
        bound_at: new Date().toISOString(),
        unity_id: bundle.unity_id,
      }
      const sig = await sign(new TextEncoder().encode(canonicalJson(inner)))
      receipts.push(
        toRelayReceiptBundle({
          manifest_hash: bundle.manifest_hash,
          outcome: 'DELIVERED',
          receipt: { receipt: inner, father_signature: sig },
          reason: 'simulated kernel countersigned the bind',
          answered_at: new Date().toISOString(),
        }),
      )
    } else {
      receipts.push(
        toRelayReceiptBundle({
          manifest_hash: bundle.manifest_hash,
          outcome: 'DELIVERED',
          receipt: { accepted: true, box: bundle.manifest_hash },
          reason: 'simulated kernel accepted the box',
          answered_at: new Date().toISOString(),
        }),
      )
    }
  }
  return { schema: RELAY_SCHEMA, exported_at: new Date().toISOString(), receipts }
}

test('round trip: father-bind relayed out and countersigned back → DELIVERED', async () => {
  const father = await testFatherKeypair()
  const d = new CarryDaemon({ store: memoryOutboxStore(), fetchImpl: throwingFetch(), now: () => 0 })
  const events: string[] = []
  d.onEvent(e => events.push(e.type))

  await d.enqueue(fatherEntry('mh-father-1', father.pubkeyB64, father.fingerprint))
  await d.pump() // no live kernel → HOLE/UNREACHABLE → relay outbox

  assert.ok(events.includes('relayed'), 'the bind entered the relay outbox')
  const relayed = await d.relayList()
  assert.equal(relayed.length, 1)
  assert.equal(relayed[0].manifest_hash, 'mh-father-1')

  const page = await d.exportRelayPage()
  const answer = await counterpartyAnswer(page, father.sign)
  const result = await d.ingestRelayReceipts(answer)

  assert.equal(result.applied, 1)
  const entry = await d.list().then(es => es.find(e => e.manifest_hash === 'mh-father-1'))
  assert.equal(entry?.state, 'DELIVERED', 'DELIVERED only on the real countersignature + gate pass')
  assert.ok(entry?.receipt, 'the kernel receipt is kept')
  assert.equal((await d.relayList()).length, 0, 'relay bundle cleared on terminal settle')

  // Replay the same import: idempotent, never settled twice.
  const replay = await d.ingestRelayReceipts(answer)
  assert.equal(replay.applied, 0)
  assert.ok(replay.ignored >= 1, 'already-DELIVERED is ignored honestly')
})

test('round trip: wallet-bind relayed out and accepted back → DELIVERED', async () => {
  const father = await testFatherKeypair()
  const d = new CarryDaemon({ store: memoryOutboxStore(), fetchImpl: throwingFetch(), now: () => 0 })
  await d.enqueue(walletEntry('mh-wallet-1'))
  await d.pump()

  assert.equal((await d.relayList()).length, 1)
  const page = await d.exportRelayPage()
  const answer = await counterpartyAnswer(page, father.sign)
  const result = await d.ingestRelayReceipts(answer)

  assert.equal(result.applied, 1)
  const entry = await d.list().then(es => es.find(e => e.manifest_hash === 'mh-wallet-1'))
  assert.equal(entry?.state, 'DELIVERED')
})

test('round trip: counterparty HOLE keeps the bind live and honestly QUEUED', async () => {
  const father = await testFatherKeypair()
  const d = new CarryDaemon({ store: memoryOutboxStore(), fetchImpl: throwingFetch(), now: () => 0 })
  await d.enqueue(walletEntry('mh-hole-1'))
  await d.pump()

  const page = await d.exportRelayPage()
  const answer = await counterpartyAnswer(page, father.sign, 'HOLE', 'counterparty kernel also unreachable')
  const result = await d.ingestRelayReceipts(answer)

  assert.equal(result.applied, 1)
  const entry = await d.list().then(es => es.find(e => e.manifest_hash === 'mh-hole-1'))
  assert.equal(entry?.state, 'QUEUED', 'a HOLE is not an answer — the binding stays live')
  assert.ok(entry?.last_error?.includes('counterparty kernel also unreachable'))
  assert.equal((await d.relayList()).length, 1, 'the relay bundle stays — the bind is still live')
})

test('round trip: counterparty REJECTED settles terminal with the true reason', async () => {
  const father = await testFatherKeypair()
  const d = new CarryDaemon({ store: memoryOutboxStore(), fetchImpl: throwingFetch(), now: () => 0 })
  await d.enqueue(walletEntry('mh-rej-1'))
  await d.pump()

  const page = await d.exportRelayPage()
  const answer = await counterpartyAnswer(page, father.sign, 'REJECTED', 'kernel refused: malformed box')
  const result = await d.ingestRelayReceipts(answer)

  assert.equal(result.applied, 1)
  const entry = await d.list().then(es => es.find(e => e.manifest_hash === 'mh-rej-1'))
  assert.equal(entry?.state, 'REJECTED')
  assert.equal(entry?.last_error, 'kernel refused: malformed box')
  assert.equal((await d.relayList()).length, 0, 'relay bundle cleared on terminal settle')
})

test('round trip: countersignature from the WRONG key is PIN_MISMATCH, never DELIVERED', async () => {
  const father = await testFatherKeypair()
  const impostor = await testFatherKeypair()
  const d = new CarryDaemon({ store: memoryOutboxStore(), fetchImpl: throwingFetch(), now: () => 0 })
  await d.enqueue(fatherEntry('mh-father-2', father.pubkeyB64, father.fingerprint))
  await d.pump()

  const page = await d.exportRelayPage()
  // The counterparty signs with a DIFFERENT key than the pinned one.
  const answer = await counterpartyAnswer(page, impostor.sign)
  const result = await d.ingestRelayReceipts(answer)

  const entry = await d.list().then(es => es.find(e => e.manifest_hash === 'mh-father-2'))
  assert.notEqual(entry?.state, 'DELIVERED', 'a forged countersignature never delivers')
  assert.ok(
    result.rejected >= 1 || result.reasons.some(r => r.includes('PIN_MISMATCH')),
    'the gate refuses it loudly: ' + result.reasons.join(' | '),
  )
})

test('round trip: receipt for an unknown manifest is ignored, never invented into a bind', async () => {
  const father = await testFatherKeypair()
  const d = new CarryDaemon({ store: memoryOutboxStore(), fetchImpl: throwingFetch(), now: () => 0 })
  const answer = {
    schema: RELAY_SCHEMA,
    exported_at: new Date().toISOString(),
    receipts: [
      toRelayReceiptBundle({
        manifest_hash: 'mh-ghost',
        outcome: 'DELIVERED',
        receipt: { accepted: true },
        reason: 'nobody asked for this',
        answered_at: new Date().toISOString(),
      }),
    ],
  }
  const result = await d.ingestRelayReceipts(answer)
  assert.equal(result.applied, 0)
  assert.equal(result.ignored, 1)
  assert.equal((await d.list()).length, 0, 'no bind is conjured from a stray receipt')
})

test('round trip: volley — many binds across pages, cursor walked, all settle by manifest_hash', async () => {
  const father = await testFatherKeypair()
  const d = new CarryDaemon({
    store: memoryOutboxStore(),
    relayStore: memoryRelayOutboxStore(),
    fetchImpl: throwingFetch(),
    now: () => 0,
  })
  const N = 7
  for (let i = 0; i < N; i++) {
    await d.enqueue(
      i % 2 === 0
        ? fatherEntry(`mh-volley-${i}`, father.pubkeyB64, father.fingerprint)
        : walletEntry(`mh-volley-${i}`),
    )
  }
  await d.pump()
  assert.equal((await d.relayList()).length, N)

  // The counterparty walks the cursor, page by page (limit 3 forces paging).
  let after = -1
  let settled = 0
  for (;;) {
    const page = await d.exportRelayPage(after, 3)
    assert.ok(parseRelayExport(page).ok, 'every page is a complete valid export')
    const answer = await counterpartyAnswer(page, father.sign)
    const parsed = parseRelayReceiptImport(answer)
    assert.equal(parsed.ok, true)
    const result = await d.ingestRelayReceipts(answer)
    settled += result.applied
    if (page.page?.next_after_sequence == null) break
    after = page.page.next_after_sequence
  }
  assert.equal(settled, N, 'every bind settled exactly once, by manifest_hash')
  const states = await d.list().then(es => es.map(e => e.state))
  assert.ok(states.every(s => s === 'DELIVERED'), 'all DELIVERED, none lost, none doubled')
  assert.equal((await d.relayList()).length, 0, 'outbox drained')
})
