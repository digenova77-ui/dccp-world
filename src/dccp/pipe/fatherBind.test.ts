import assert from 'node:assert/strict'
import { test } from 'node:test'
import { webcrypto } from 'node:crypto'
import {
  FATHER_BIND_PROTOCOL,
  parseFatherPublicKey,
  fatherKeyFingerprint,
  performFatherBind,
  prepareFatherBind,
  deliverFatherBind,
  readBindLedger,
  verifyBindLedger,
  bytesToBase64,
  base64ToBytes,
  type FatherBindReceipt,
  type FatherBindRequestBody,
  type FatherBindWallet,
  type PinnedFather,
  type BindStorage,
} from './fatherBind.ts'
import { canonicalJson, bindingState, resetBindingRegistry, validateDecision } from './ephemeral.ts'

const subtle = webcrypto.subtle

function memStorage(): BindStorage {
  const store = new Map<string, string>()
  return {
    getItem: k => store.get(k) ?? null,
    setItem: (k, v) => { store.set(k, v) },
  }
}

async function makeWallet(): Promise<FatherBindWallet> {
  const kp = (await subtle.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify'])) as CryptoKeyPair
  const raw = new Uint8Array(await subtle.exportKey('raw', kp.publicKey))
  return {
    id: 'agency-test-1',
    fingerprint: 'sha256:testfingerprint00000000',
    alg: 'Ed25519',
    privateKey: kp.privateKey,
    publicRaw: raw,
  }
}

async function makeFather(): Promise<{ priv: CryptoKey; pinned: PinnedFather }> {
  const kp = (await subtle.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify'])) as CryptoKeyPair
  const raw = new Uint8Array(await subtle.exportKey('raw', kp.publicKey))
  return {
    priv: kp.privateKey,
    pinned: { raw, fingerprint: await fatherKeyFingerprint(raw) },
  }
}

type KernelMode = 'ok' | 'wrongkey' | 'malformed' | 'replay'

/** In-process kernel double: verifies the client's wallet signature, then
 * countersigns the receipt with the (throwaway) Father key — the same duties
 * the real kernel performs. Modes exercise the client's fail-closed paths. */
function kernelDouble(fatherPriv: CryptoKey, mode: KernelMode, wrongPriv?: CryptoKey) {
  return async (_url: string | URL | Request, init?: { body?: unknown }): Promise<Response> => {
    const body = JSON.parse(String(init?.body)) as FatherBindRequestBody
    assert.equal(body.protocol, FATHER_BIND_PROTOCOL)
    // the kernel's first duty: verify the wallet signature over the canonical manifest bytes
    const walletPub = await subtle.importKey(
      'raw', base64ToBytes(body.wallet_pubkey), { name: body.wallet_alg }, false, ['verify'],
    )
    const clientOk = await subtle.verify(
      body.wallet_alg === 'Ed25519' ? { name: 'Ed25519' } : { name: 'ECDSA', hash: 'SHA-256' },
      walletPub,
      base64ToBytes(body.signature),
      new TextEncoder().encode(canonicalJson(body.manifest)),
    )
    assert.equal(clientOk, true, 'kernel rejects a bad wallet signature')
    if (mode === 'malformed') {
      return new Response(JSON.stringify({ accepted: true }), { status: 200 })
    }
    const receipt: FatherBindReceipt = {
      protocol: FATHER_BIND_PROTOCOL,
      manifest_hash: mode === 'replay' ? 'sha256:' + '0'.repeat(64) : body.manifest.manifest_hash,
      wallet_pubkey: body.wallet_pubkey,
      wallet_alg: body.wallet_alg,
      bound_at: new Date().toISOString(),
      authority: 'NONE',
      father_fingerprint: 'sha256:testfather0000000000',
    }
    const signer = mode === 'wrongkey' && wrongPriv ? wrongPriv : fatherPriv
    const sig = await subtle.sign({ name: 'Ed25519' }, signer, new TextEncoder().encode(canonicalJson(receipt)))
    return new Response(
      JSON.stringify({ accepted: true, receipt, father_signature: bytesToBase64(new Uint8Array(sig)) }),
      { status: 200 },
    )
  }
}

const ENDPOINT = { protocol: 'http' as const, host: '127.0.0.1', port: '18099', path: '' }

test.beforeEach(() => {
  resetBindingRegistry()
})

test('parseFatherPublicKey accepts base64 and hex, 32 bytes exactly', () => {
  const raw = new Uint8Array(32).map((_, i) => i)
  const b64 = bytesToBase64(raw)
  assert.deepEqual(parseFatherPublicKey(b64), raw)
  assert.deepEqual(parseFatherPublicKey('  ' + b64 + '\n'), raw)
  const hex = [...raw].map(b => b.toString(16).padStart(2, '0')).join('')
  assert.deepEqual(parseFatherPublicKey(hex), raw)
  assert.deepEqual(parseFatherPublicKey('0x' + hex), raw)
})

test('parseFatherPublicKey refuses private key material and wrong lengths', () => {
  assert.throws(() => parseFatherPublicKey('-----BEGIN PRIVATE KEY-----\nabc'), /PRIVATE key material/)
  assert.throws(() => parseFatherPublicKey('/var/lib/dualis-capax/worker-ed25519-private.pem'), /PRIVATE key material/)
  assert.throws(() => parseFatherPublicKey(''), /empty key/)
  assert.throws(() => parseFatherPublicKey(bytesToBase64(new Uint8Array(31))), /not a 32-byte/)
  assert.throws(() => parseFatherPublicKey('zzzz-not-key'), /not a 32-byte/)
})

test('fatherKeyFingerprint is sha256: + 24 hex', async () => {
  const fp = await fatherKeyFingerprint(new Uint8Array(32).fill(7))
  assert.match(fp, /^sha256:[0-9a-f]{24}$/)
})

test('a valid handshake seals: real father signature verifies against the pinned key', async () => {
  const wallet = await makeWallet()
  const father = await makeFather()
  const storage = memStorage()
  const result = await performFatherBind({
    unityId: 'dc.unity.id',
    wallet,
    pinnedFather: father.pinned,
    endpoint: ENDPOINT,
    fetchImpl: kernelDouble(father.priv, 'ok') as typeof fetch,
    storage,
  })
  assert.equal(result.state, 'SEALED')
  if (result.state !== 'SEALED') return
  assert.equal(result.receipt.manifest_hash, result.manifestHash)
  assert.equal(result.receipt.authority, 'NONE')
  assert.equal(result.ledgerEntry.seq, 1)
  assert.match(result.ledgerEntry.entry_hash, /^sha256:[0-9a-f]{64}$/)
  // the manifest was consumed by the attempt — single use
  assert.equal(bindingState(result.manifestHash), 'CONSUMED')
  // the ledger entry is really chained and persisted
  const check = await verifyBindLedger(storage)
  assert.equal(check.ok, true)
  assert.equal(check.entries, 1)
  assert.equal(readBindLedger(storage).length, 1)
})

test('a second bind appends a chained second ledger entry', async () => {
  const wallet = await makeWallet()
  const father = await makeFather()
  const storage = memStorage()
  const params = {
    unityId: 'dc.unity.id', wallet, pinnedFather: father.pinned, endpoint: ENDPOINT,
    fetchImpl: kernelDouble(father.priv, 'ok') as typeof fetch, storage,
  }
  const first = await performFatherBind(params)
  const second = await performFatherBind(params)
  assert.equal(first.state, 'SEALED')
  assert.equal(second.state, 'SEALED')
  if (first.state !== 'SEALED' || second.state !== 'SEALED') return
  assert.equal(second.ledgerEntry.seq, 2)
  assert.equal(second.ledgerEntry.prev_hash, first.ledgerEntry.entry_hash)
  const check = await verifyBindLedger(storage)
  assert.equal(check.ok, true)
  assert.equal(check.entries, 2)
})

test('a father signature from the wrong key is REJECTED — pinned-key mismatch, fail-closed', async () => {
  const wallet = await makeWallet()
  const father = await makeFather()
  const other = await makeFather()
  const result = await performFatherBind({
    unityId: 'dc.unity.id',
    wallet,
    pinnedFather: father.pinned,
    endpoint: ENDPOINT,
    fetchImpl: kernelDouble(father.priv, 'wrongkey', other.priv) as typeof fetch,
    storage: memStorage(),
  })
  assert.equal(result.state, 'REJECTED')
  if (result.state !== 'REJECTED') return
  assert.equal(result.reason, 'PIN_MISMATCH')
  assert.match(result.detail, /does NOT verify against the PINNED Father public key/)
  // the attempt still consumed its manifest
  assert.ok(result.manifestHash)
  assert.equal(bindingState(result.manifestHash!), 'CONSUMED')
})

test('a receipt for a different manifest is REJECTED as a replay', async () => {
  const wallet = await makeWallet()
  const father = await makeFather()
  const result = await performFatherBind({
    unityId: 'dc.unity.id',
    wallet,
    pinnedFather: father.pinned,
    endpoint: ENDPOINT,
    fetchImpl: kernelDouble(father.priv, 'replay') as typeof fetch,
    storage: memStorage(),
  })
  assert.equal(result.state, 'REJECTED')
  if (result.state !== 'REJECTED') return
  assert.equal(result.reason, 'RECEIPT_MISMATCH')
})

test('a malformed kernel answer is REJECTED, never sealed', async () => {
  const wallet = await makeWallet()
  const father = await makeFather()
  const result = await performFatherBind({
    unityId: 'dc.unity.id',
    wallet,
    pinnedFather: father.pinned,
    endpoint: ENDPOINT,
    fetchImpl: kernelDouble(father.priv, 'malformed') as typeof fetch,
    storage: memStorage(),
  })
  assert.equal(result.state, 'REJECTED')
  if (result.state !== 'REJECTED') return
  assert.equal(result.reason, 'BAD_RESPONSE')
})

test('a refused connection is an honest HOLE · UNREACHABLE, and the manifest stays LIVE for the daemon retry', async () => {
  const wallet = await makeWallet()
  const father = await makeFather()
  const storage = memStorage()
  const result = await performFatherBind({
    unityId: 'dc.unity.id',
    wallet,
    pinnedFather: father.pinned,
    endpoint: ENDPOINT,
    fetchImpl: (async () => { throw new Error('fetch failed') }) as typeof fetch,
    storage,
  })
  assert.equal(result.state, 'HOLE')
  if (result.state !== 'HOLE') return
  assert.equal(result.reason, 'UNREACHABLE')
  assert.match(result.detail, /did not answer/)
  assert.ok(result.manifestHash)
  // expires: on_receipt — a HOLE is not an answer, the capability stays LIVE
  assert.equal(bindingState(result.manifestHash!), 'LIVE')
  // nothing sealed, nothing ledgered
  assert.equal(readBindLedger(storage).length, 0)
})

test('prepare mints and signs without transmitting; the daemon can deliver the same envelope later', async () => {
  const wallet = await makeWallet()
  const father = await makeFather()
  const params = {
    unityId: 'dc.unity.id',
    wallet,
    pinnedFather: father.pinned,
    endpoint: ENDPOINT,
    storage: memStorage(),
  }
  const prepared = await prepareFatherBind(params)
  assert.equal(prepared.ok, true)
  if (!prepared.ok) return
  // prepared: minted and signed, nothing transmitted, nothing consumed
  assert.equal(bindingState(prepared.prepared.manifestHash), 'LIVE')
  // first delivery attempt: the kernel is down → HOLE, still LIVE
  const hole = await deliverFatherBind({
    prepared: prepared.prepared,
    pinnedFather: father.pinned,
    endpoint: ENDPOINT,
    fetchImpl: (async () => { throw new Error('down') }) as typeof fetch,
    storage: params.storage,
  })
  assert.equal(hole.state, 'HOLE')
  assert.equal(bindingState(prepared.prepared.manifestHash), 'LIVE')
  // the daemon's retry carries the IDENTICAL bytes; the kernel answers → SEALED
  const sealed = await deliverFatherBind({
    prepared: prepared.prepared,
    pinnedFather: father.pinned,
    endpoint: ENDPOINT,
    fetchImpl: kernelDouble(father.priv, 'ok') as typeof fetch,
    storage: params.storage,
  })
  assert.equal(sealed.state, 'SEALED')
  if (sealed.state !== 'SEALED') return
  assert.equal(sealed.receipt.manifest_hash, prepared.prepared.manifestHash)
  assert.equal(bindingState(prepared.prepared.manifestHash), 'CONSUMED')
})

test('a consumed manifest cannot be replayed: validateDecision rejects the second use', async () => {
  const wallet = await makeWallet()
  const father = await makeFather()
  const result = await performFatherBind({
    unityId: 'dc.unity.id',
    wallet,
    pinnedFather: father.pinned,
    endpoint: ENDPOINT,
    fetchImpl: kernelDouble(father.priv, 'ok') as typeof fetch,
    storage: memStorage(),
  })
  assert.equal(result.state, 'SEALED')
  if (result.state !== 'SEALED') return
  const replay = validateDecision(result.manifestHash, { manifest_ref: result.manifestHash, task: 'father-bind-transmit' })
  assert.equal(replay.allowed, false)
  if (!replay.allowed) assert.equal(replay.reason, 'CONSUMED')
})

test('no pinned key and no endpoint refuse before anything is minted', async () => {
  const wallet = await makeWallet()
  const father = await makeFather()
  const noPin = await performFatherBind({
    unityId: 'dc.unity.id', wallet,
    pinnedFather: { raw: new Uint8Array(0), fingerprint: '' },
    endpoint: ENDPOINT, fetchImpl: kernelDouble(father.priv, 'ok') as typeof fetch, storage: memStorage(),
  })
  assert.equal(noPin.state, 'REJECTED')
  if (noPin.state === 'REJECTED') {
    assert.equal(noPin.reason, 'NO_PINNED_KEY')
    assert.equal(noPin.manifestHash, undefined)
  }
  const noEp = await performFatherBind({
    unityId: 'dc.unity.id', wallet, pinnedFather: father.pinned,
    endpoint: { protocol: 'https', host: '', port: '', path: '/api/v2' },
    fetchImpl: kernelDouble(father.priv, 'ok') as typeof fetch, storage: memStorage(),
  })
  assert.equal(noEp.state, 'REJECTED')
  if (noEp.state === 'REJECTED') assert.equal(noEp.reason, 'NO_ENDPOINT')
})

test('a P-256 wallet key is refused for the Father bind — Ed25519 only', async () => {
  const wallet = await makeWallet()
  const father = await makeFather()
  const p256: FatherBindWallet = { ...wallet, alg: 'ECDSA-P-256' }
  const result = await performFatherBind({
    unityId: 'dc.unity.id', wallet: p256, pinnedFather: father.pinned,
    endpoint: ENDPOINT, fetchImpl: kernelDouble(father.priv, 'ok') as typeof fetch, storage: memStorage(),
  })
  assert.equal(result.state, 'REJECTED')
  if (result.state === 'REJECTED') assert.equal(result.reason, 'NOT_ED25519_KEY')
})
