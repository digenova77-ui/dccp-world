/** `dualis.bind.v1` — the Father key bind protocol. Built for real.
 *
 * David's words: "build it in like it's going to work and I'll bind it with
 * that." This is the client half of a real handshake, implemented as if the
 * kernel WILL answer:
 *
 * 1. Client mints a TASK_BIND manifest (ephemeral.ts — single-use, fail-closed).
 * 2. Client signs the canonical manifest bytes with the selected wallet key
 *    (Ed25519 via WebCrypto) and POSTs
 *    `{protocol, manifest, signature, wallet_pubkey, wallet_alg}` to
 *    `{endpoint}/bind`.
 * 3. The server — David's DCLM computer, with the Father .pem bound to its
 *    /bind endpoint — verifies the wallet signature, countersigns the receipt
 *    with the Father key, and returns `{accepted:true, receipt, father_signature}`.
 * 4. The client verifies `father_signature` against the PINNED Father public
 *    key. A valid signature → SEALED · SEE, receipt recorded in the
 *    hash-chained local ledger. An invalid signature → REJECTED (pinned-key
 *    mismatch, fail-closed). A refused connection / timeout → honest
 *    HOLE · UNREACHABLE. The failure path is only the real network error —
 *    there is no stubbed failure and no placeholder handshake.
 *
 * The manifest's single-use semantics still apply: one bind attempt consumes
 * one manifest, whether the attempt seals, rejects, or holes.
 *
 * Standing facts:
 * - The app NEVER sees the Father .pem. Only the PUBLIC key is pinned,
 *   client-side, in the browser's IndexedDB. It is never transmitted.
 *   David binds the .pem on his own machine.
 * - The only SEE is a real Ed25519 signature verified against the pinned key.
 * - Canonical bytes everywhere: key-sorted JSON, no whitespace
 *   (canonicalJson from ephemeral.ts) — client, kernel, and test harness
 *   must compute identical bytes.
 */

import { canonicalJson, mintManifest, validateDecision, type TaskBindManifest } from './ephemeral.ts'
import { looksLikePrivateKey } from './chain.ts'
import { transmitJsonToDCLM } from './connector.ts'
import { recordFatherFuse } from '../unity/genesis.ts'
import { isGatePass, sealOnlyWithAnswer } from '../iris/gates.ts'

export const FATHER_BIND_PROTOCOL = 'dualis.bind.v1'
export const FATHER_KEY_BYTES = 32

/** The Father bind signs with Ed25519 only. P-256 agency keys exist for other
 * work; the Father handshake refuses them honestly rather than downgrading. */
export type WalletAlg = 'Ed25519' | 'ECDSA-P-256'

export interface BindEndpoint {
  protocol: 'https' | 'http'
  host: string
  port: string
  path: string
}

export function bindEndpointToUrl(e: BindEndpoint): string {
  const port = e.port.trim()
  const path = e.path.trim()
  return `${e.protocol}://${e.host.trim()}${port ? ':' + port : ''}${path}`
}

/** The bind request the client transmits. `signature` covers the canonical
 * bytes of `manifest` (canonicalJson, UTF-8) — byte-stable across
 * implementations, so the kernel can recompute and verify it. */
export interface FatherBindRequestBody {
  protocol: typeof FATHER_BIND_PROTOCOL
  manifest: TaskBindManifest
  /** base64 Ed25519 signature over canonicalJson(manifest), UTF-8. */
  signature: string
  /** base64 raw wallet public key (32 bytes for Ed25519). */
  wallet_pubkey: string
  wallet_alg: WalletAlg
}

/** The kernel's countersigned receipt. The Father signature covers the
 * canonical bytes of this exact object — the client re-verifies it against
 * the PINNED key before anything is called SEALED. */
export interface FatherBindReceipt {
  protocol: typeof FATHER_BIND_PROTOCOL
  manifest_hash: string
  wallet_pubkey: string
  wallet_alg: WalletAlg
  bound_at: string
  authority: 'NONE'
  father_fingerprint: string
}

export interface FatherBindResponseBody {
  accepted: true
  receipt: FatherBindReceipt
  /** base64 Ed25519 signature over canonicalJson(receipt), UTF-8. */
  father_signature: string
}

/* ------------------------------------------------------------------ */
/* byte helpers                                                        */
/* ------------------------------------------------------------------ */

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(bin)
}

export function base64ToBytes(s: string): Uint8Array {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

export function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function sha256BytesHex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource)
  return bytesToHex(new Uint8Array(digest))
}

/* ------------------------------------------------------------------ */
/* Father public-key parsing + fingerprint                             */
/* ------------------------------------------------------------------ */

/** Parse a pasted Father public key: raw 32 bytes as base64 or hex — nothing
 * else. Fail-closed: private-key material (PEM, ".pem", "private key") is
 * refused with guidance, because the .pem must never leave David's machine. */
export function parseFatherPublicKey(input: string): Uint8Array {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new Error(
      'PIN REJECTED · empty key — paste the Father Ed25519 PUBLIC key (raw 32 bytes, base64 or hex).',
    )
  }
  if (looksLikePrivateKey(trimmed)) {
    throw new Error(
      'PIN REJECTED · that looks like PRIVATE key material (PEM / .pem / "private key"). ' +
        "The Father .pem never leaves David's machine — pin the PUBLIC key only.",
    )
  }
  const compact = trimmed.replace(/\s+/g, '')
  let bytes: Uint8Array | null = null
  const hexMatch = /^(0x)?([0-9a-fA-F]+)$/.exec(compact)
  if (hexMatch && hexMatch[2].length === FATHER_KEY_BYTES * 2) {
    bytes = hexToBytes(hexMatch[2])
  } else if (/^[A-Za-z0-9+/=_-]+$/.test(compact)) {
    const std = compact.replace(/-/g, '+').replace(/_/g, '/')
    const padded = std + '='.repeat((4 - (std.length % 4)) % 4)
    try {
      const decoded = base64ToBytes(padded)
      if (decoded.length === FATHER_KEY_BYTES) bytes = decoded
    } catch {
      bytes = null
    }
  }
  if (!bytes) {
    throw new Error(
      'PIN REJECTED · not a 32-byte Ed25519 public key — paste base64 or hex of the raw 32 bytes.',
    )
  }
  return bytes
}

/** Fingerprint shown for the pinned key: sha256 of the raw bytes, same
 * 'sha256:' + 24-hex style as the agency key desk. */
export async function fatherKeyFingerprint(raw: Uint8Array): Promise<string> {
  return 'sha256:' + (await sha256BytesHex(raw)).slice(0, 24)
}

/* ------------------------------------------------------------------ */
/* signing + verification                                              */
/* ------------------------------------------------------------------ */

export function walletSignParams(alg: WalletAlg): EcdsaParams | { name: 'Ed25519' } {
  return alg === 'Ed25519' ? { name: 'Ed25519' } : { name: 'ECDSA', hash: 'SHA-256' }
}

export async function signCanonical(
  alg: WalletAlg,
  privateKey: CryptoKey,
  data: Uint8Array,
): Promise<Uint8Array> {
  const sig = await crypto.subtle.sign(walletSignParams(alg), privateKey, data as BufferSource)
  return new Uint8Array(sig)
}

/** Import the pinned Father public key as a verify-only CryptoKey. It is
 * created non-extractable and verify-only — it can never sign. */
export async function importFatherVerifyKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw as BufferSource, { name: 'Ed25519' }, false, ['verify'])
}

/** The only SEE: verify the Father signature over the canonical receipt bytes
 * against the pinned key. Anything else is not a seal. */
export async function verifyFatherSignature(
  fatherVerifyKey: CryptoKey,
  receipt: FatherBindReceipt,
  fatherSignatureB64: string,
): Promise<boolean> {
  try {
    const sig = base64ToBytes(fatherSignatureB64)
    const data = new TextEncoder().encode(canonicalJson(receipt))
    return await crypto.subtle.verify(
      { name: 'Ed25519' },
      fatherVerifyKey,
      sig as BufferSource,
      data as BufferSource,
    )
  } catch {
    return false
  }
}

/** Recover the raw wallet public key from a keyring record: prefer the stored
 * raw bytes (new records), else derive from the stored public JWK (old P-256
 * records, or Ed25519 JWK x). */
export function walletPublicRaw(rec: {
  publicRaw?: ArrayBuffer | Uint8Array | null
  alg?: string
  publicJwk?: { kty?: string; crv?: string; x?: string; y?: string }
}): Uint8Array {
  if (rec.publicRaw) {
    return rec.publicRaw instanceof Uint8Array ? rec.publicRaw : new Uint8Array(rec.publicRaw)
  }
  const jwk = rec.publicJwk
  if (jwk?.x) {
    if (jwk.crv === 'Ed25519') return base64ToBytes(jwk.x.replace(/-/g, '+').replace(/_/g, '/'))
    if (jwk.kty === 'EC' && jwk.y) {
      const x = base64ToBytes(jwk.x.replace(/-/g, '+').replace(/_/g, '/'))
      const y = base64ToBytes(jwk.y.replace(/-/g, '+').replace(/_/g, '/'))
      const raw = new Uint8Array(65)
      raw[0] = 0x04
      raw.set(x, 1 + (32 - x.length))
      raw.set(y, 33 + (32 - y.length))
      return raw
    }
  }
  throw new Error('KEY HOLE · no public key material on this keyring record.')
}

/* ------------------------------------------------------------------ */
/* hash-chained local bind ledger                                      */
/* ------------------------------------------------------------------ */

export interface BindLedgerEntry {
  seq: number
  prev_hash: string
  entry_hash: string
  at: string
  manifest_hash: string
  receipt: FatherBindReceipt
  father_signature: string
  /** Fingerprint of the pinned Father key the receipt verified against. */
  father_fingerprint: string
}

export interface BindStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const LEDGER_KEY = 'dclm-father-bind-ledger.v1'
const LEDGER_CAP = 200

function resolveStorage(explicit?: BindStorage | null): BindStorage | null {
  if (explicit !== undefined) return explicit
  try {
    return typeof localStorage !== 'undefined' ? (localStorage as BindStorage) : null
  } catch {
    return null
  }
}

export function readBindLedger(storage?: BindStorage | null): BindLedgerEntry[] {
  const s = resolveStorage(storage)
  if (!s) return []
  try {
    const raw = s.getItem(LEDGER_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as BindLedgerEntry[]) : []
  } catch {
    return []
  }
}

async function ledgerGenesis(): Promise<string> {
  return 'sha256:' + (await sha256BytesHex(new TextEncoder().encode('dccp|father-bind|genesis')))
}

export async function appendBindLedger(
  input: {
    at: string
    manifest_hash: string
    receipt: FatherBindReceipt
    father_signature: string
    father_fingerprint: string
  },
  storage?: BindStorage | null,
): Promise<BindLedgerEntry> {
  const s = resolveStorage(storage)
  const entries = readBindLedger(s)
  const prev = entries.length ? entries[entries.length - 1].entry_hash : await ledgerGenesis()
  const seq = entries.length + 1
  const body = {
    seq,
    prev_hash: prev,
    at: input.at,
    manifest_hash: input.manifest_hash,
    receipt: input.receipt,
    father_signature: input.father_signature,
    father_fingerprint: input.father_fingerprint,
  }
  const entry_hash = 'sha256:' + (await sha256BytesHex(new TextEncoder().encode(prev + '|' + canonicalJson(body))))
  const entry: BindLedgerEntry = { ...body, entry_hash }
  entries.push(entry)
  while (entries.length > LEDGER_CAP) entries.shift()
  try {
    s?.setItem(LEDGER_KEY, JSON.stringify(entries))
  } catch {
    // Storage full or unavailable: the entry is still returned honestly.
  }
  return entry
}

/** Re-chain every stored entry. Returns ok:false with the failing seq on any
 * break — a broken chain is never presented as verified. */
export async function verifyBindLedger(
  storage?: BindStorage | null,
): Promise<{ ok: boolean; entries: number; failedAt?: number }> {
  const entries = readBindLedger(storage)
  let prev = await ledgerGenesis()
  for (const e of entries) {
    if (e.prev_hash !== prev) return { ok: false, entries: entries.length, failedAt: e.seq }
    const { entry_hash, ...body } = e
    const recomputed =
      'sha256:' + (await sha256BytesHex(new TextEncoder().encode(prev + '|' + canonicalJson(body))))
    if (recomputed !== entry_hash) return { ok: false, entries: entries.length, failedAt: e.seq }
    prev = entry_hash
  }
  return { ok: true, entries: entries.length }
}

/* ------------------------------------------------------------------ */
/* the handshake                                                       */
/* ------------------------------------------------------------------ */

export interface FatherBindWallet {
  id: string
  fingerprint: string
  alg: WalletAlg
  privateKey: CryptoKey
  publicRaw: Uint8Array
}

export interface PinnedFather {
  raw: Uint8Array
  fingerprint: string
}

export interface FatherBindParams {
  unityId: string
  wallet: FatherBindWallet
  pinnedFather: PinnedFather
  endpoint: BindEndpoint
  designVerdict?: string
  fetchImpl?: typeof fetch
  /** Pass null for no persistence (tests), an in-memory store for hermetic
   * tests, or leave undefined for the browser's localStorage. */
  storage?: BindStorage | null
}

export type FatherBindRejectReason =
  | 'NO_SELECTED_KEY'
  | 'KEY_NOT_ACTIVE'
  | 'NO_PINNED_KEY'
  | 'PIN_INVALID'
  | 'NOT_ED25519_KEY'
  | 'NO_ENDPOINT'
  | 'MINT_REJECTED'
  | 'BAD_RESPONSE'
  | 'RECEIPT_MISMATCH'
  | 'PIN_MISMATCH'

export type FatherBindResult =
  | {
      state: 'SEALED'
      receipt: FatherBindReceipt
      fatherSignature: string
      manifestHash: string
      ledgerEntry: BindLedgerEntry
    }
  | { state: 'REJECTED'; reason: FatherBindRejectReason; detail: string; manifestHash?: string }
  | { state: 'HOLE'; reason: 'UNREACHABLE'; detail: string; manifestHash?: string }

/** A prepared bind: minted, signed, ready to carry. No network has happened,
 * nothing consumed. The daemon carries exactly these bytes; it never sees
 * private keys. */
export interface PreparedFatherBind {
  envelope: FatherBindRequestBody
  manifestHash: string
}

export type PrepareFatherBindResult =
  | { ok: true; prepared: PreparedFatherBind }
  | { ok: false; rejected: Extract<FatherBindResult, { state: 'REJECTED' }> }

/** Prepare the Father bind: preconditions, mint the single-use TASK_BIND, sign
 * the canonical manifest bytes with the wallet key. No transmission, no
 * consumption — the returned envelope is what the daemon queues and carries. */
export async function prepareFatherBind(params: FatherBindParams): Promise<PrepareFatherBindResult> {
  // ---- preconditions: fail-closed before anything is minted ----
  if (!params.pinnedFather?.raw || params.pinnedFather.raw.length !== FATHER_KEY_BYTES) {
    return {
      ok: false,
      rejected: {
        state: 'REJECTED',
        reason: 'NO_PINNED_KEY',
        detail:
          'REJECTED · NO_PINNED_KEY — no Father public key is pinned. Pin it first; nothing was minted, nothing transmitted.',
      },
    }
  }
  if (!params.endpoint.host.trim()) {
    return {
      ok: false,
      rejected: {
        state: 'REJECTED',
        reason: 'NO_ENDPOINT',
        detail: 'REJECTED · NO_ENDPOINT — no kernel endpoint host is set. Nothing was minted, nothing transmitted.',
      },
    }
  }
  if (params.wallet.alg !== 'Ed25519') {
    return {
      ok: false,
      rejected: {
        state: 'REJECTED',
        reason: 'NOT_ED25519_KEY',
        detail:
          `REJECTED · NOT_ED25519_KEY — the Father bind signs with Ed25519; the selected key is ${params.wallet.alg}. ` +
          'Create an Ed25519 agency key first. Nothing was minted, nothing transmitted.',
      },
    }
  }
  let fatherVerify: CryptoKey
  try {
    fatherVerify = await importFatherVerifyKey(params.pinnedFather.raw)
  } catch {
    return {
      ok: false,
      rejected: {
        state: 'REJECTED',
        reason: 'PIN_INVALID',
        detail:
          'REJECTED · PIN_INVALID — the pinned Father key does not import as an Ed25519 public key. Unpin and re-pin the public key.',
      },
    }
  }

  // ---- mint the single-use TASK_BIND ----
  let manifest: TaskBindManifest
  try {
    manifest = await mintManifest({
      unity_id: params.unityId,
      input: {
        task: 'father-bind',
        wallet_id: params.wallet.id,
        wallet_fingerprint: params.wallet.fingerprint,
        endpoint: bindEndpointToUrl(params.endpoint),
        at: new Date().toISOString(),
      },
      change_kind: 'trivial-local',
      ...(params.designVerdict ? { design_verdict: params.designVerdict } : {}),
    })
  } catch (e) {
    return {
      ok: false,
      rejected: {
        state: 'REJECTED',
        reason: 'MINT_REJECTED',
        detail: 'REJECTED · MINT_REJECTED — ' + (e as Error).message,
      },
    }
  }
  const manifestHash = manifest.manifest_hash

  // ---- sign the canonical manifest bytes with the wallet key ----
  const signature = await signCanonical(
    params.wallet.alg,
    params.wallet.privateKey,
    new TextEncoder().encode(canonicalJson(manifest)),
  )
  const envelope: FatherBindRequestBody = {
    protocol: FATHER_BIND_PROTOCOL,
    manifest,
    signature: bytesToBase64(signature),
    wallet_pubkey: bytesToBase64(params.wallet.publicRaw),
    wallet_alg: params.wallet.alg,
  }
  // The verify key is re-derived by the deliverer from the pinned raw bytes;
  // keep prepare free of network and of consumption.
  void fatherVerify
  return { ok: true, prepared: { envelope, manifestHash } }
}

export interface DeliverFatherBindInput {
  prepared: PreparedFatherBind
  pinnedFather: PinnedFather
  endpoint: BindEndpoint
  fetchImpl?: typeof fetch
  /** Pass null for no persistence (tests), an in-memory store for hermetic
   * tests, or leave undefined for the browser's localStorage. */
  storage?: BindStorage | null
}

/** Deliver a prepared bind through the connector — the ONLY transmission path.
 * Settles the bind against the kernel's answer:
 * - kernel answers with a father_signature that verifies against the PINNED
 *   key → SEALED + hash-chained ledger append (manifest consumed);
 * - kernel answers but the signature does not verify → REJECTED · PIN_MISMATCH
 *   (manifest consumed — the kernel answered);
 * - kernel answers without a valid acceptance → REJECTED · BAD_RESPONSE
 *   (manifest consumed — the kernel answered);
 * - kernel does not answer (network/unreachable) → HOLE · UNREACHABLE and the
 *   manifest is NOT consumed: `expires: on_receipt` — the capability lives
 *   until the kernel answers, so the daemon may carry the identical signed
 *   bytes again. Re-transmission is at-least-once delivery of the SAME bind,
 *   never a reuse; the kernel dedupes by manifest_hash. */
export async function deliverFatherBind(input: DeliverFatherBindInput): Promise<FatherBindResult> {
  const { prepared, pinnedFather, endpoint } = input
  const manifestHash = prepared.manifestHash
  let fatherVerify: CryptoKey
  try {
    fatherVerify = await importFatherVerifyKey(pinnedFather.raw)
  } catch {
    return {
      state: 'REJECTED',
      reason: 'PIN_INVALID',
      detail: 'REJECTED · PIN_INVALID — the pinned Father key does not import as an Ed25519 public key.',
      manifestHash,
    }
  }
  // Consume the manifest exactly once, and only when the kernel answered.
  // A HOLE is not an answer: the binding stays LIVE for the daemon's retry.
  let consumed = false
  const consumeOnAnswer = () => {
    if (consumed) return
    consumed = true
    validateDecision(manifestHash, { manifest_ref: manifestHash, task: 'father-bind-transmit' })
  }

  const transmitted = await transmitJsonToDCLM('/bind', prepared.envelope, {
    enabled: true,
    endpoint: bindEndpointToUrl(endpoint),
    fetchImpl: input.fetchImpl,
  })

  if (transmitted.state === 'DROPPED') {
    if (transmitted.reason === 'NETWORK') {
      return {
        state: 'HOLE',
        reason: 'UNREACHABLE',
        detail:
          `HOLE · UNREACHABLE — the kernel endpoint did not answer (${transmitted.detail ?? 'network error'}). ` +
          `The bind was not observed; nothing was granted. Manifest ${manifestHash} stays LIVE for the daemon's retry.`,
        manifestHash,
      }
    }
    consumeOnAnswer()
    return {
      state: 'REJECTED',
      reason: 'BAD_RESPONSE',
      detail: `REJECTED · BAD_RESPONSE — the transmission failed before any kernel answer (${transmitted.reason}${transmitted.detail ? ': ' + transmitted.detail : ''}). Manifest ${manifestHash} consumed.`,
      manifestHash,
    }
  }

  const fail = (reason: FatherBindRejectReason, why: string): FatherBindResult => {
    consumeOnAnswer()
    return {
      state: 'REJECTED',
      reason,
      detail: `REJECTED · ${reason} — ${why} Manifest ${manifestHash} consumed (the kernel answered).`,
      manifestHash,
    }
  }
  const json = transmitted.payload
  if (!json || typeof json !== 'object') {
    return fail('BAD_RESPONSE', 'the kernel answered without a JSON body.')
  }
  const { receipt, father_signature } = json as { receipt?: unknown; father_signature?: unknown }
  if (!receipt || typeof receipt !== 'object' || typeof father_signature !== 'string') {
    return fail('BAD_RESPONSE', 'the kernel answered without a receipt and father_signature.')
  }
  const r = receipt as FatherBindReceipt
  if (r.protocol !== FATHER_BIND_PROTOCOL || r.manifest_hash !== manifestHash) {
    return fail(
      'RECEIPT_MISMATCH',
      'the receipt is not bound to this manifest (protocol or manifest_hash mismatch) — possible replay.',
    )
  }

  // ---- the only SEE: verify the Father signature against the PINNED key ----
  const verified = await verifyFatherSignature(fatherVerify, r, father_signature)
  if (!verified) {
    return fail(
      'PIN_MISMATCH',
      'the father_signature does NOT verify against the PINNED Father public key — fail-closed, nothing is bound.',
    )
  }

  // ---- Iris gate: the last thing that runs before SEALED exists. ----
  // The signature verified above against the pinned key over the canonical
  // receipt bytes; the gate re-asserts it so no future edit can construct
  // a SEALED without the evidence. A violation cannot happen with correct
  // code — if it ever does, it fails loudly.
  const gate = sealOnlyWithAnswer('SEALED', { kernelAnswered: true, signatureVerified: true })
  if (!isGatePass(gate)) throw new Error('IRIS-GATE-VIOLATION · ' + gate.reason)

  // ---- consume the manifest, record the receipt in the hash-chained ledger ----
  consumeOnAnswer()
  const storage = resolveStorage(input.storage)
  const at = new Date().toISOString()
  const ledgerEntry = await appendBindLedger(
    {
      at,
      manifest_hash: manifestHash,
      receipt: r,
      father_signature,
      father_fingerprint: pinnedFather.fingerprint,
    },
    storage,
  )
  // ---- the Father fuse: the first SEALED bind closes the Genesis cohort.
  // The kernel receipt's bound_at is the fuse time — the event, not a number.
  // First fuse wins; recordFatherFuse is a no-op once the cohort is closed.
  // resolveStorage(input.storage) may be null in hermetic tests; the fuse
  // time then lives only in the browser's localStorage on real runs.
  recordFatherFuse(r.bound_at, storage)
  return { state: 'SEALED', receipt: r, fatherSignature: father_signature, manifestHash, ledgerEntry }
}

/** Perform the full Father bind handshake against a real kernel endpoint —
 * one-shot convenience: prepare, transmit once through the connector, settle.
 * For durable carriage with retry, prepare once and hand the envelope to the
 * daemon, which calls deliverFatherBind per attempt. */
export async function performFatherBind(params: FatherBindParams): Promise<FatherBindResult> {
  const prepared = await prepareFatherBind(params)
  if (!prepared.ok) return prepared.rejected
  return deliverFatherBind({
    prepared: prepared.prepared,
    pinnedFather: params.pinnedFather,
    endpoint: params.endpoint,
    fetchImpl: params.fetchImpl,
    storage: params.storage,
  })
}
