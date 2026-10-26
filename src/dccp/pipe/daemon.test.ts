/** `dualis.daemon.v1` tests — the carry daemon.
 * Design: DAEMON_DESIGN.md. Verdict: ED-PREDICT-20261004-DAEMON-V1 (predicted).
 *
 * Every test is honest: a receipt exists only when the (doubled) kernel
 * answers; unreachable means QUEUED with the true reason, never a fake
 * delivery; the same manifest_hash is never delivered twice. */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { webcrypto } from 'node:crypto'
import {
  CarryDaemon,
  DAEMON_BACKOFF_MS,
  DAEMON_MAX_ATTEMPTS,
  memoryOutboxStore,
  type NewOutboxEntry,
} from './daemon.ts'
import {
  FATHER_BIND_PROTOCOL,
  bytesToBase64,
  base64ToBytes,
  fatherKeyFingerprint,
  prepareFatherBind,
  type FatherBindRequestBody,
  type FatherBindReceipt,
  type FatherBindWallet,
  type PinnedFather,
  type BindEndpoint,
} from './fatherBind.ts'
import { canonicalJson } from './ephemeral.ts'
import { bindingState, resetBindingRegistry } from './ephemeral.ts'

const subtle = webcrypto.subtle

const ENDPOINT: BindEndpoint = { protocol: 'http', host: '127.0.0.1', port: '18099', path: '' }

function throwingFetch(): typeof fetch {
  return (async () => {
    throw new Error('connect ECONNREFUSED 127.0.0.1:18099')
  }) as unknown as typeof fetch
}

function okBoxFetch(calls: { n: number }): typeof fetch {
  return (async () => {
    calls.n += 1
    return new Response(JSON.stringify({ accepted: true }), { status: 200 })
  }) as unknown as typeof fetch
}

async function makeWallet(): Promise<FatherBindWallet> {
  const kp = (await subtle.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify'])) as CryptoKeyPair
  const raw = new Uint8Array(await subtle.exportKey('raw', kp.publicKey))
  return { id: 'agency-test-1', fingerprint: 'sha256:testfp00000000000000', alg: 'Ed25519', privateKey: kp.privateKey, publicRaw: raw }
}

async function makeFather(): Promise<{ priv: CryptoKey; pinned: PinnedFather }> {
  const kp = (await subtle.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify'])) as CryptoKeyPair
  const raw = new Uint8Array(await subtle.exportKey('raw', kp.publicKey))
  return { priv: kp.privateKey, pinned: { raw, fingerprint: await fatherKeyFingerprint(raw) } }
}

/** Kernel double for /bind: verifies the wallet signature, countersigns the
 * receipt with the father key. `signer` selects the honest or the wrong key. */
function kernelBindDouble(signer: CryptoKey) {
  return (async (_url: string | URL | Request, init?: { body?: unknown }): Promise<Response> => {
    const body = JSON.parse(String((init as { body?: unknown })?.body)) as FatherBindRequestBody
    assert.equal(body.protocol, FATHER_BIND_PROTOCOL)
    const receipt: FatherBindReceipt = {
      protocol: FATHER_BIND_PROTOCOL,
      manifest_hash: body.manifest.manifest_hash,
      wallet_pubkey: body.wallet_pubkey,
      wallet_alg: body.wallet_alg,
      bound_at: new Date().toISOString(),
      authority: 'NONE',
      father_fingerprint: 'sha256:testfather0000000000',
    }
    const sig = await subtle.sign({ name: 'Ed25519' }, signer, new TextEncoder().encode(canonicalJson(receipt)))
    return new Response(JSON.stringify({ accepted: true, receipt, father_signature: bytesToBase64(new Uint8Array(sig)) }), {
      status: 200,
    })
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

test.beforeEach(() => {
  resetBindingRegistry()
})

test('enqueue is idempotent: the same manifest_hash twice queues one bind', async () => {
  const d = new CarryDaemon({ store: memoryOutboxStore() })
  const first = await d.enqueue(walletEntry('sha256:aaa'))
  const second = await d.enqueue(walletEntry('sha256:aaa'))
  assert.equal(first.manifest_hash, second.manifest_hash)
  assert.equal((await d.list()).length, 1)
})

test('endpoint down: the bind queues durably with an honest HOLE, binding stays LIVE', async () => {
  let now = 1_000_000
  const d = new CarryDaemon({ store: memoryOutboxStore(), fetchImpl: throwingFetch(), now: () => now })
  // mint a real binding so we can assert the daemon does NOT consume it on HOLE
  const { mintManifest } = await import('./ephemeral.ts')
  const manifest = await mintManifest({ unity_id: 'dc.unity.test', input: { t: 1 }, change_kind: 'trivial-local' })
  await d.enqueue(walletEntry(manifest.manifest_hash))
  await d.pump()
  const [entry] = await d.list()
  assert.equal(entry.state, 'QUEUED')
  assert.equal(entry.attempts, 1)
  assert.match(entry.last_error ?? '', /UNREACHABLE/)
  assert.equal(entry.receipt, null, 'no receipt without a kernel answer')
  assert.equal(bindingState(manifest.manifest_hash), 'LIVE', 'HOLE does not consume: expires on receipt')
  // backoff: next attempt is 5s out
  assert.equal(entry.next_attempt_at, now + DAEMON_BACKOFF_MS[0])
})

test('backoff grows per attempt: 5s, 15s, 60s …', async () => {
  let now = 2_000_000
  const d = new CarryDaemon({ store: memoryOutboxStore(), fetchImpl: throwingFetch(), now: () => now })
  await d.enqueue(walletEntry('sha256:backoff'))
  const seen: number[] = []
  for (let i = 0; i < 3; i++) {
    await d.pump()
    const [e] = await d.list()
    seen.push(e.next_attempt_at - now)
    now = e.next_attempt_at // fast-forward to the due time
  }
  assert.deepEqual(seen, [DAEMON_BACKOFF_MS[0], DAEMON_BACKOFF_MS[1], DAEMON_BACKOFF_MS[2]])
})

test('endpoint answers: DELIVERED exactly once, receipt recorded, no duplicate on re-pump', async () => {
  const calls = { n: 0 }
  const d = new CarryDaemon({ store: memoryOutboxStore(), fetchImpl: okBoxFetch(calls) })
  await d.enqueue(walletEntry('sha256:once'))
  await d.pump()
  await d.pump()
  await d.pump()
  assert.equal(calls.n, 1, 'the kernel was hit exactly once')
  const [entry] = await d.list()
  assert.equal(entry.state, 'DELIVERED')
  assert.deepEqual(entry.receipt, { accepted: true })
})

test('no answer, ever: DEAD after max attempts — surfaced, never silent', async () => {
  let now = 3_000_000
  const d = new CarryDaemon({ store: memoryOutboxStore(), fetchImpl: throwingFetch(), now: () => now })
  await d.enqueue(walletEntry('sha256:dead'))
  for (let i = 0; i < DAEMON_MAX_ATTEMPTS; i++) {
    await d.pump()
    const [e] = await d.list()
    if (e.state === 'DEAD') break
    now = e.next_attempt_at
  }
  const [entry] = await d.list()
  assert.equal(entry.state, 'DEAD')
  assert.equal(entry.attempts, DAEMON_MAX_ATTEMPTS)
  assert.match(entry.last_error ?? '', /DEAD/)
  // a dead entry is never retried
  now += 10_000_000
  await d.pump()
  const [still] = await d.list()
  assert.equal(still.attempts, DAEMON_MAX_ATTEMPTS)
})

test('dismiss removes terminal entries only — a QUEUED bind cannot be deleted', async () => {
  const d = new CarryDaemon({ store: memoryOutboxStore(), fetchImpl: throwingFetch() })
  await d.enqueue(walletEntry('sha256:nodelete'))
  assert.equal(await d.dismiss('sha256:nodelete'), false, 'QUEUED is fail-closed')
  assert.equal((await d.list()).length, 1)
})

test('father-bind through the daemon: valid father signature → DELIVERED (SEALED)', async () => {
  const wallet = await makeWallet()
  const father = await makeFather()
  const prepared = await prepareFatherBind({
    unityId: 'dc.unity.test',
    wallet,
    pinnedFather: father.pinned,
    endpoint: ENDPOINT,
  })
  assert.equal(prepared.ok, true)
  if (!prepared.ok) return
  const d = new CarryDaemon({ store: memoryOutboxStore(), fetchImpl: kernelBindDouble(father.priv) })
  await d.enqueue({
    manifest_hash: prepared.prepared.manifestHash,
    kind: 'father-bind',
    envelope: JSON.stringify(prepared.prepared.envelope),
    endpoint: ENDPOINT,
    unity_id: 'dc.unity.test',
    father_pubkey_b64: bytesToBase64(father.pinned.raw),
    father_fingerprint: father.pinned.fingerprint,
  })
  await d.pump()
  const [entry] = await d.list()
  assert.equal(entry.state, 'DELIVERED')
  const receipt = entry.receipt as FatherBindReceipt
  assert.equal(receipt.protocol, FATHER_BIND_PROTOCOL)
  assert.equal(receipt.manifest_hash, prepared.prepared.manifestHash)
  assert.equal(bindingState(prepared.prepared.manifestHash), 'CONSUMED', 'the kernel answered: single use spent')
})

test('father-bind through the daemon: wrong father key → REJECTED (PIN_MISMATCH), terminal', async () => {
  const wallet = await makeWallet()
  const father = await makeFather()
  const wrong = await makeFather()
  const prepared = await prepareFatherBind({
    unityId: 'dc.unity.test',
    wallet,
    pinnedFather: father.pinned, // pinned: the RIGHT key
    endpoint: ENDPOINT,
  })
  assert.equal(prepared.ok, true)
  if (!prepared.ok) return
  // …but the kernel countersigns with the WRONG key
  const d = new CarryDaemon({ store: memoryOutboxStore(), fetchImpl: kernelBindDouble(wrong.priv) })
  await d.enqueue({
    manifest_hash: prepared.prepared.manifestHash,
    kind: 'father-bind',
    envelope: JSON.stringify(prepared.prepared.envelope),
    endpoint: ENDPOINT,
    unity_id: 'dc.unity.test',
    father_pubkey_b64: bytesToBase64(father.pinned.raw),
    father_fingerprint: father.pinned.fingerprint,
  })
  await d.pump()
  const [entry] = await d.list()
  assert.equal(entry.state, 'REJECTED')
  assert.match(entry.last_error ?? '', /PIN_MISMATCH/)
  assert.equal(entry.receipt, null, 'no receipt on key mismatch — fail-closed')
})

test('father-bind unreachable: QUEUED with honest HOLE, binding stays LIVE for the retry', async () => {
  const wallet = await makeWallet()
  const father = await makeFather()
  const prepared = await prepareFatherBind({
    unityId: 'dc.unity.test',
    wallet,
    pinnedFather: father.pinned,
    endpoint: ENDPOINT,
  })
  assert.equal(prepared.ok, true)
  if (!prepared.ok) return
  const d = new CarryDaemon({ store: memoryOutboxStore(), fetchImpl: throwingFetch() })
  await d.enqueue({
    manifest_hash: prepared.prepared.manifestHash,
    kind: 'father-bind',
    envelope: JSON.stringify(prepared.prepared.envelope),
    endpoint: ENDPOINT,
    unity_id: 'dc.unity.test',
    father_pubkey_b64: bytesToBase64(father.pinned.raw),
    father_fingerprint: father.pinned.fingerprint,
  })
  await d.pump()
  const [entry] = await d.list()
  assert.equal(entry.state, 'QUEUED')
  assert.match(entry.last_error ?? '', /UNREACHABLE/)
  assert.equal(bindingState(prepared.prepared.manifestHash), 'LIVE')
})

test('daemon events fire: enqueued → hole → delivered across the outage', async () => {
  const seen: string[] = []
  let up = false
  let now = 9_000_000
  const fetchImpl = (async () => {
    if (!up) throw new Error('down')
    return new Response(JSON.stringify({ accepted: true }), { status: 200 })
  }) as unknown as typeof fetch
  const d = new CarryDaemon({
    store: memoryOutboxStore(),
    fetchImpl,
    now: () => now,
    onEvent: e => void seen.push(e.type),
  })
  await d.enqueue(walletEntry('sha256:events'))
  await d.pump() // down → hole, next attempt in 5s; the relay bake-in adds 'relayed'
  assert.deepEqual(seen, ['enqueued', 'attempt', 'relayed', 'hole'])
  up = true
  now += DAEMON_BACKOFF_MS[0] // the outage ends before the retry is due
  await d.pump()
  assert.deepEqual(seen, ['enqueued', 'attempt', 'relayed', 'hole', 'attempt', 'delivered'])
  const [entry] = await d.list()
  assert.equal(entry.state, 'DELIVERED')
})

test('the daemon wakes itself when the retry falls due — no manual pump needed', async () => {
  let up = false
  const fetchImpl = (async () => {
    if (!up) throw new Error('down')
    return new Response(JSON.stringify({ accepted: true }), { status: 200 })
  }) as unknown as typeof fetch
  const d = new CarryDaemon({ store: memoryOutboxStore(), fetchImpl, backoffMs: [60] })
  const seen: string[] = []
  d.onEvent(e => void seen.push(e.type))
  await d.enqueue(walletEntry('sha256:selfwake'))
  await d.pump() // down → hole; the daemon arms its own wake-up in 60ms
  // The relay bake-in: an UNREACHABLE HOLE also writes the relay outbox and
  // emits 'relayed' — the retry queue is untouched by the second path.
  assert.deepEqual(seen, ['enqueued', 'attempt', 'relayed', 'hole'])
  up = true
  // Nobody pumps. The daemon's own retry timer must carry the bind.
  const deadline = Date.now() + 3000
  let entry = (await d.list())[0]
  while (entry.state !== 'DELIVERED' && Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 50))
    entry = (await d.list())[0]
  }
  d.stop()
  assert.equal(entry.state, 'DELIVERED')
  assert.deepEqual(seen, ['enqueued', 'attempt', 'relayed', 'hole', 'attempt', 'delivered'])
})
