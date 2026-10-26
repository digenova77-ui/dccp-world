/** `dualis.daemon.v1` — the carry daemon.
 *
 * The sandbox (app) mints binds — wallet agency-key manifests, Father binds
 * (`dualis.bind.v1`), ephemeral task binds. The daemon carries each bound
 * envelope through the internal connector (the ONLY transmission path) to
 * David's configured DCLM endpoint, and returns receipts.
 *
 * Design: DAEMON_DESIGN.md. Verdict: ED-PREDICT-20261004-DAEMON-V1 (predicted).
 *
 * Honesty invariants:
 * - No receipt without a kernel answer. Ever.
 * - Endpoint unreachable → the bind queues durably; the UI shows QUEUED/HOLE
 *   with the TRUE reason. Never a fake delivered receipt.
 * - The daemon handles only signed bytes. It never sees private keys, never
 *   invents the endpoint, never touches the Father .pem.
 * - `expires: on_receipt`: a HOLE is not an answer — the binding stays LIVE
 *   and the identical signed bytes are carried again (at-least-once delivery
 *   of the SAME bind; the kernel dedupes by manifest_hash).
 */

import { transmitBoxToDCLM, type DropReason } from './connector.ts'
import {
  bindEndpointToUrl,
  deliverFatherBind,
  importFatherVerifyKey,
  verifyFatherSignature,
  FATHER_BIND_PROTOCOL,
  type BindEndpoint,
  type FatherBindRequestBody,
  type FatherBindResult,
  type FatherBindReceipt,
} from './fatherBind.ts'
import { validateDecision } from './ephemeral.ts'
import { gateEnqueue, gateSettle, isGatePass } from '../iris/gates.ts'
import {
  RELAY_SCHEMA,
  RELAY_EXPORT_PAGE_LIMIT,
  createRelayOutboxStore,
  isRelayRecord,
  isRelayable,
  isUnreachableHole,
  pageRelayExport,
  parseRelayReceiptImport,
  toRelayBundle,
  type RelayBundle,
  type RelayExportBundle,
  type RelayOutboxStore,
  type RelayReceiptBundle,
} from './relay.ts'

export const DAEMON_SCHEMA = 'dualis.daemon.v1'
/** Safety valve: the relay outbox is bounded so a swarm volley can't drown
 * the store — browser IndexedDB most of all. At ~600 bytes a bundle, 10,000
 * is ≈6MB: far beyond any sane single volley, far below tab-killing. When
 * saturated, binds are NOT relayed — they stay honestly QUEUED in the retry
 * queue with their true state, a `relay-saturated` event fires, and the next
 * export cycle drains the backlog. Backpressure, never loss. */
export const RELAY_OUTBOX_MAX_DEFAULT = 10_000
const OUTBOX_DB = 'dclm-daemon-outbox.v1'
const OUTBOX_STORE = 'outbox'

/** Backoff between attempts: 5s, 15s, 60s, 5min, 15min, then 60min. */
export const DAEMON_BACKOFF_MS = [5_000, 15_000, 60_000, 300_000, 900_000, 3_600_000]
/** After this many attempts the entry is DEAD — surfaced honestly, never silent. */
export const DAEMON_MAX_ATTEMPTS = 12

export type DaemonKind = 'wallet-bind' | 'father-bind'
export type DaemonEntryState = 'QUEUED' | 'IN_FLIGHT' | 'DELIVERED' | 'REJECTED' | 'DEAD'
export interface OutboxEntry {
  schema: typeof DAEMON_SCHEMA
  /** Idempotency key, end to end. The daemon never enqueues the same hash twice
   * and never delivers it twice. */
  manifest_hash: string
  kind: DaemonKind
  /** Signed bytes. For wallet-bind: the box string. For father-bind: the JSON
   * of the FatherBindRequestBody. Never keys. */
  envelope: string
  /** David's endpoint, copied at enqueue time. The daemon never invents it. */
  endpoint: BindEndpoint
  /** For father-bind: the pinned Father PUBLIC key (raw bytes as base64) the
   * receipt must verify against. The .pem is never here. */
  father_pubkey_b64?: string
  father_fingerprint?: string
  unity_id: string
  state: DaemonEntryState
  attempts: number
  next_attempt_at: number
  created_at: number
  last_error: string | null
  /** Only ever a kernel answer. Never invented. */
  receipt: unknown | null
  /** True once the bind entered the relay outbox (`dualis.relay.v1`).
   * A relayed bind is NOT a delivered bind — the ledger must say RELAYED,
   * never imply DELIVERED. */
  relayed?: boolean
  relayed_at?: string | null
}

export type NewOutboxEntry = Pick<
  OutboxEntry,
  'manifest_hash' | 'kind' | 'envelope' | 'endpoint' | 'unity_id'
> &
  Partial<Pick<OutboxEntry, 'father_pubkey_b64' | 'father_fingerprint'>>

export type DaemonEventType = 'enqueued' | 'attempt' | 'delivered' | 'rejected' | 'hole' | 'dead' | 'relayed' | 'relay-saturated'
export interface DaemonEvent {
  type: DaemonEventType
  entry: OutboxEntry
}

/* ------------------------------------------------------------------ */
/* outbox store                                                        */
/* ------------------------------------------------------------------ */

export interface OutboxStore {
  get(manifestHash: string): Promise<OutboxEntry | null>
  put(entry: OutboxEntry): Promise<void>
  all(): Promise<OutboxEntry[]>
  delete(manifestHash: string): Promise<void>
}

export function memoryOutboxStore(): OutboxStore {
  const map = new Map<string, OutboxEntry>()
  return {
    get: async h => map.get(h) ?? null,
    put: async e => void map.set(e.manifest_hash, { ...e }),
    all: async () => [...map.values()].map(e => ({ ...e })),
    delete: async h => void map.delete(h),
  }
}

function idbOutboxStore(): OutboxStore {
  let dbPromise: Promise<IDBDatabase> | null = null
  const db = (): Promise<IDBDatabase> => {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(OUTBOX_DB, 1)
        req.onupgradeneeded = () => {
          req.result.createObjectStore(OUTBOX_STORE, { keyPath: 'manifest_hash' })
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
    }
    return dbPromise
  }
  const run = <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> =>
    db().then(
      d =>
        new Promise<T>((resolve, reject) => {
          const tx = d.transaction(OUTBOX_STORE, mode)
          const req = fn(tx.objectStore(OUTBOX_STORE))
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        }),
    )
  return {
    get: async h => (await run('readonly', s => s.get(h))) ?? null,
    put: async e => void (await run('readwrite', s => s.put(e))),
    all: async () => (await run('readonly', s => s.getAll())) ?? [],
    delete: async h => void (await run('readwrite', s => s.delete(h))),
  }
}

/** IndexedDB in browsers, memory elsewhere (tests, SSR). */
export function createOutboxStore(): OutboxStore {
  try {
    if (typeof indexedDB !== 'undefined') return idbOutboxStore()
  } catch {
    // iris-gate: deliberate — SSR/test contexts have no indexedDB; the memory
    // store is the correct non-durable fallback and the in-memory pump still carries.
  }
  return memoryOutboxStore()
}

/* ------------------------------------------------------------------ */
/* the daemon                                                          */
/* ------------------------------------------------------------------ */

export interface DaemonOptions {
  store?: OutboxStore
  /** The relay outbox (`dualis.relay.v1`) — durable, exportable, alongside
   * the retry queue. Defaults to the same durability discipline as the
   * outbox (IndexedDB in browsers, memory elsewhere). */
  relayStore?: RelayOutboxStore
  fetchImpl?: typeof fetch
  now?: () => number
  onEvent?: (e: DaemonEvent) => void
  /** Backoff schedule override (ms). Production default: 5s→15s→60s→5min→15min→60min.
   * A test seam so retry timing is provable without waiting minutes. */
  backoffMs?: number[]
  /** Relay-outbox saturation valve (see RELAY_OUTBOX_MAX_DEFAULT). A test
   * seam and a deployment knob — not a second idempotency scheme. */
  relayOutboxMax?: number
}

/** Consume the ephemeral binding on a kernel answer — best effort. After a
 * reload the in-memory registry is gone (by design); the outbox entry state
 * is then authoritative. Never throws. */
function consumeBindingBestEffort(manifestHash: string, task: string): void {
  try {
    validateDecision(manifestHash, { manifest_ref: manifestHash, task })
  } catch {
    // iris-gate: deliberate — best-effort only: the outbox state machine is
    // the cross-reload guard, so a consumption miss here changes nothing.
  }
}

export class CarryDaemon {
  private store: OutboxStore
  private relayStore: RelayOutboxStore
  /** Per-daemon relay sequence counter. Lazily initialized from the
   * highest stored sequence — an ordering hint only, never a security
   * property (idempotency lives on manifest_hash). */
  private relaySequence = -1
  private fetchImpl?: typeof fetch
  private listeners = new Set<(e: DaemonEvent) => void>()
  private timer: ReturnType<typeof setInterval> | null = null
  /** Wake-up scheduled when an entry's next attempt falls due. Without this,
   * a queued bind would wait for the 30s interval (or a reload) even though
   * the backoff says 5s. */
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private retryDueAt = 0
  private pumping = false
  private now: () => number
  private backoffSchedule: number[]
  /** Saturation valve for the relay outbox (see RELAY_OUTBOX_MAX_DEFAULT). */
  private relayOutboxMax: number

  constructor(options: DaemonOptions = {}) {
    this.store = options.store ?? createOutboxStore()
    this.relayStore = options.relayStore ?? createRelayOutboxStore()
    this.fetchImpl = options.fetchImpl
    this.now = options.now ?? (() => Date.now())
    this.backoffSchedule = options.backoffMs ?? DAEMON_BACKOFF_MS
    this.relayOutboxMax = options.relayOutboxMax ?? RELAY_OUTBOX_MAX_DEFAULT
    if (options.onEvent) this.listeners.add(options.onEvent)
  }

  onEvent(fn: (e: DaemonEvent) => void): () => void {
    this.listeners.add(fn)
    return () => void this.listeners.delete(fn)
  }

  private emit(type: DaemonEventType, entry: OutboxEntry): void {
    const snapshot = { ...entry }
    for (const fn of this.listeners) {
      try {
        fn({ type, entry: snapshot })
      } catch {
        // iris-gate: deliberate — listener isolation: a faulting subscriber
        // must never break carriage for the rest. The event was snapshotted.
      }
    }
  }

  /** Enqueue a bound envelope. Idempotent: the same manifest_hash twice
   * returns the existing entry — the daemon never queues the same bind twice. */
  async enqueue(input: NewOutboxEntry): Promise<OutboxEntry> {
    // Iris gate: the daemon never queues a bind it cannot dedupe.
    const g = gateEnqueue(input)
    if (!isGatePass(g)) throw new Error('IRIS-GATE-VIOLATION · ' + g.reason)
    const existing = await this.store.get(input.manifest_hash)
    if (existing) return existing
    const now = this.now()
    const entry: OutboxEntry = {
      schema: DAEMON_SCHEMA,
      manifest_hash: input.manifest_hash,
      kind: input.kind,
      envelope: input.envelope,
      endpoint: { ...input.endpoint },
      unity_id: input.unity_id,
      ...(input.father_pubkey_b64 ? { father_pubkey_b64: input.father_pubkey_b64 } : {}),
      ...(input.father_fingerprint ? { father_fingerprint: input.father_fingerprint } : {}),
      state: 'QUEUED',
      attempts: 0,
      next_attempt_at: now,
      created_at: now,
      last_error: null,
      receipt: null,
    }
    await this.store.put(entry)
    this.emit('enqueued', entry)
    return entry
  }

  async list(): Promise<OutboxEntry[]> {
    return this.store.all()
  }

  /** Dismiss a terminal entry from the outbox (DELIVERED/REJECTED/DEAD only).
   * A QUEUED or IN_FLIGHT bind is never deleted — fail-closed. The relay
   * bundle goes with it so exports never carry stale binds. */
  async dismiss(manifestHash: string): Promise<boolean> {
    const entry = await this.store.get(manifestHash)
    if (!entry) return false
    if (entry.state === 'QUEUED' || entry.state === 'IN_FLIGHT') return false
    await this.store.delete(manifestHash)
    try {
      await this.relayStore.delete(manifestHash)
    } catch {
      // iris-gate: deliberate — relay cleanup is hygiene, never load-bearing.
    }
    return true
  }

  /** Drop the relay bundle once the bind is terminal (DELIVERED/REJECTED).
   * The counterparty dedupes on manifest_hash, so a late receipt for a
   * settled bind is ignored honestly at ingest. Never throws. */
  private async clearRelay(manifestHash: string): Promise<void> {
    try {
      await this.relayStore.delete(manifestHash)
    } catch {
      // iris-gate: deliberate — hygiene only.
    }
  }

  /** Carry every due queued bind. Safe to call any time; entries due in the
   * future are left alone. `asOf` lets the retry timer treat its intended due
   * time as reached even if the callback runs a fraction early. */
  async pump(asOf?: number): Promise<void> {
    if (this.pumping) return
    this.pumping = true
    try {
      const now = asOf ?? this.now()
      const entries = await this.store.all()
      for (const entry of entries) {
        if (entry.state !== 'QUEUED' || entry.next_attempt_at > now) continue
        await this.attempt(entry)
      }
    } finally {
      this.pumping = false
    }
  }

  /** Backoff after `failedAttempts` failures (production: 5s, 15s, 60s, 5min, 15min, 60min cap). */
  private backoffFor(failedAttempts: number): number {
    const s = this.backoffSchedule
    const idx = Math.min(Math.max(failedAttempts - 1, 0), s.length - 1)
    return s[idx]
  }

  /** Wake the daemon when the earliest due entry falls due. One timer is
   * enough: pump() carries every due entry in one pass. */
  private armRetryTimer(dueAt: number): void {
    if (this.retryTimer && dueAt >= this.retryDueAt) return // already waking in time
    if (this.retryTimer) clearTimeout(this.retryTimer)
    this.retryDueAt = dueAt
    const delay = Math.max(dueAt - this.now(), 0)
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      // The callback can run a hair before dueAt (timer rounding); carry as
      // of the intended due time so the entry is never stranded by its own
      // wake-up. Never older than the real clock.
      void this.pump(Math.max(this.now(), dueAt))
    }, delay)
    // Never let a daemon timer keep a Node process alive in tests.
    try {
      ;(this.retryTimer as unknown as { unref?: () => void }).unref?.()
    } catch {
      // iris-gate: deliberate — unref is Node-only and already optional-chained;
      // this is belt-and-braces for exotic timers. Nothing to surface.
    }
  }

  private async queueForRetry(entry: OutboxEntry, why: string): Promise<void> {
    // Iris gate: a HOLE is settled only with the true reason string.
    // Cannot throw here — this runs inside the attempt() catch path, so a
    // gate failure falls back to a flagged reason and stays honestly QUEUED.
    const g = gateSettle('HOLE', { reason: why })
    const honestWhy = isGatePass(g) ? why : `HOLE · no reason recorded (gate: ${g.code})`
    entry.attempts += 1
    if (entry.attempts >= DAEMON_MAX_ATTEMPTS) {
      entry.state = 'DEAD'
      entry.last_error = `DEAD · ${entry.attempts} attempts, no kernel answer. Last: ${honestWhy}`
      await this.store.put(entry)
      // The bind is still live signed bytes with no live counterparty — the
      // relay is its second path, same as on every UNREACHABLE HOLE.
      await this.writeRelay(entry)
      this.emit('dead', entry)
      return
    }
    entry.state = 'QUEUED'
    entry.next_attempt_at = this.now() + this.backoffFor(entry.attempts)
    entry.last_error = honestWhy
    await this.store.put(entry)
    // Bake-in: no live kernel → the bind ALSO enters the relay outbox.
    // The retry queue keeps working as before; the relay is the second path.
    // Neither side ever dials the other — the counterparty consumes the
    // portable bundle asynchronously.
    await this.writeRelay(entry)
    this.armRetryTimer(entry.next_attempt_at)
    this.emit('hole', entry)
  }

  /** Write a relay bundle for an unreachable bind. Idempotent (dedupe on
   * manifest_hash — the same bind is never relayed twice), gated (HOLE with
   * the true relay reason), and never throwing: a relay fault must never
   * break the retry queue. */
  private async writeRelay(entry: OutboxEntry): Promise<void> {
    try {
      if (!isRelayable({ state: entry.state, last_error: entry.last_error })) return
      const existing = await this.relayStore.get(entry.manifest_hash)
      if (existing) return
      // Saturation valve: exact count from a single read, shared with the
      // sequence init below. When saturated the bind is NOT relayed — it stays
      // honestly QUEUED in the retry queue with its true state; the event
      // tells the ledger why. Backpressure, never loss.
      const snapshot = await this.relayStore.all()
      if (snapshot.length >= this.relayOutboxMax) {
        this.emit('relay-saturated', entry)
        return
      }
      if (this.relaySequence < 0) {
        this.relaySequence = snapshot.reduce((m, b) => Math.max(m, b.relay_sequence), 0)
      }
      this.relaySequence += 1
      const g = gateSettle('HOLE', {
        reason:
          `RELAYED · ${entry.last_error} — holding for the counterparty; no live kernel. ` +
          `A relayed bind is not a delivered bind.`,
      })
      if (!isGatePass(g)) return // fail-closed: no gate pass, no relay write
      const bundle = toRelayBundle(entry, new Date(this.now()).toISOString(), this.relaySequence)
      await this.relayStore.put(bundle)
      entry.relayed = true
      entry.relayed_at = bundle.relayed_at
      await this.store.put(entry)
      this.emit('relayed', entry)
    } catch {
      // iris-gate: deliberate — the relay is the second path; a relay fault
      // (store failure, clock fault) must never break carriage. The bind
      // stays QUEUED/DEAD with its true reason, honestly.
    }
  }

  /** The portable relay export — what the counterparty ingests, what gets
   * pinned to IPFS. Sorted by relay sequence. */
  async exportRelay(): Promise<RelayExportBundle> {
    const bundles = await this.relayStore.all()
    bundles.sort((a, b) => a.relay_sequence - b.relay_sequence)
    return {
      schema: RELAY_SCHEMA,
      exported_at: new Date(this.now()).toISOString(),
      exporter: 'dualis.app.v1',
      bundles,
    }
  }

  /** The relay outbox, for ledgers and tests. */
  async relayList(): Promise<RelayBundle[]> {
    return (await this.exportRelay()).bundles
  }

  /** One page of the relay export — bounded, resumable, deterministic.
   * Pages tile the outbox exactly: feed page.next_after_sequence back as
   * afterSequence until it is null. Each page is a complete, valid export
   * (parseRelayExport handles it); the full unpaged export stays on
   * exportRelay(). Dedupe stays on manifest_hash — paging invents no second
   * idempotency scheme. */
  async exportRelayPage(
    afterSequence = -1,
    limit = RELAY_EXPORT_PAGE_LIMIT,
  ): Promise<RelayExportBundle> {
    const bundles = await this.relayStore.all()
    const { bundles: slice, page } = await pageRelayExport(bundles, afterSequence, limit)
    return {
      schema: RELAY_SCHEMA,
      exported_at: new Date(this.now()).toISOString(),
      exporter: 'dualis.app.v1',
      bundles: slice,
      page,
    }
  }

  /** Ingest receipt bundles published back by the counterparty. Settles the
   * matching outbox entries — DELIVERED only on a real, verified kernel
   * answer plus a gate pass; HOLE/REJECTED with true reasons otherwise.
   * Import never invents receipts. Idempotent: already-DELIVERED entries
   * and unknown hashes are ignored honestly, never settled twice. */
  async ingestRelayReceipts(json: unknown): Promise<{
    applied: number
    ignored: number
    rejected: number
    reasons: string[]
  }> {
    const reasons: string[] = []
    let applied = 0
    let ignored = 0
    let rejected = 0
    const parsed = parseRelayReceiptImport(json)
    if (!parsed.ok) {
      return { applied: 0, ignored: 0, rejected: 1, reasons: parsed.reasons }
    }
    rejected += parsed.skipped
    reasons.push(...parsed.reasons)
    for (const receipt of parsed.receipts) {
      const entry = await this.store.get(receipt.manifest_hash)
      if (!entry) {
        ignored += 1
        reasons.push(
          `IGNORED · no outbox entry for manifest ${receipt.manifest_hash} — nothing to settle`,
        )
        continue
      }
      if (entry.state === 'DELIVERED') {
        ignored += 1
        reasons.push(
          `IGNORED · manifest ${receipt.manifest_hash} already DELIVERED — idempotent, never settled twice`,
        )
        continue
      }
      if (receipt.outcome === 'HOLE') {
        // The counterparty tried and got no kernel answer either — the bind
        // stays live and honestly QUEUED with the counterparty's true reason.
        await this.queueForRetry(entry, receipt.reason)
        applied += 1
        continue
      }
      if (receipt.outcome === 'REJECTED') {
        const gr = gateSettle('REJECTED', { reason: receipt.reason })
        if (!isGatePass(gr)) {
          rejected += 1
          reasons.push(
            `REJECTED · gate refused the counterparty rejection for ${receipt.manifest_hash}: ${gr.reason}`,
          )
          continue
        }
        consumeBindingBestEffort(entry.manifest_hash, 'relay-receipt-reject')
        entry.state = 'REJECTED'
        entry.last_error = receipt.reason
        await this.store.put(entry)
        await this.clearRelay(entry.manifest_hash)
        this.emit('rejected', entry)
        applied += 1
        continue
      }
      // DELIVERED — verify exactly like the live path, then gate.
      const verified = await this.verifyRelayReceipt(entry, receipt)
      if (!verified.ok) {
        rejected += 1
        reasons.push(verified.reason)
        continue
      }
      const gd = gateSettle('DELIVERED', { receipt: verified.receipt, kernelAnswered: true })
      if (!isGatePass(gd)) {
        rejected += 1
        reasons.push(`REJECTED · gate refused DELIVERED for ${receipt.manifest_hash}: ${gd.reason}`)
        continue
      }
      consumeBindingBestEffort(entry.manifest_hash, 'relay-receipt-deliver')
      entry.state = 'DELIVERED'
      entry.receipt = verified.receipt
      entry.last_error = null
      await this.store.put(entry)
      await this.clearRelay(entry.manifest_hash)
      this.emit('delivered', entry)
      applied += 1
    }
    return { applied, ignored, rejected, reasons }
  }

  /** Verify a relayed DELIVERED claim like the live path would. For
   * father-bind the countersignature is checked against the PINNED Father
   * public key — the only SEE. For wallet-bind the receipt is the kernel's
   * accepted answer as relayed. Never invents, never trusts blindly. */
  private async verifyRelayReceipt(
    entry: OutboxEntry,
    receipt: RelayReceiptBundle,
  ): Promise<{ ok: true; receipt: unknown } | { ok: false; reason: string }> {
    const fail = (reason: string): { ok: false; reason: string } => ({ ok: false, reason })
    if (entry.kind === 'father-bind') {
      const payload = receipt.receipt
      if (!isRelayRecord(payload))
        return fail(`REJECTED · relay receipt for ${receipt.manifest_hash} is not an object`)
      const inner = payload['receipt']
      const fatherSignature = payload['father_signature']
      if (!isRelayRecord(inner) || typeof fatherSignature !== 'string')
        return fail(
          `REJECTED · relay receipt for ${receipt.manifest_hash} lacks a countersigned receipt`,
        )
      if (inner['protocol'] !== FATHER_BIND_PROTOCOL || inner['manifest_hash'] !== entry.manifest_hash)
        return fail(
          `REJECTED · MANIFEST_MISMATCH — relay receipt for ${receipt.manifest_hash} is not bound to this manifest ` +
            `(protocol or manifest_hash mismatch); replay refused`,
        )
      if (!entry.father_pubkey_b64 || !entry.father_fingerprint)
        return fail(
          `REJECTED · no pinned Father public key for ${receipt.manifest_hash} — cannot verify the countersignature`,
        )
      let key: CryptoKey
      try {
        key = await importFatherVerifyKey(
          Uint8Array.from(atob(entry.father_pubkey_b64), c => c.charCodeAt(0)),
        )
      } catch {
        return fail(`REJECTED · pinned Father key does not import for ${receipt.manifest_hash}`)
      }
      const verified = await verifyFatherSignature(key, inner as unknown as FatherBindReceipt, fatherSignature)
      if (!verified)
        return fail(
          `REJECTED · PIN_MISMATCH — the relayed father_signature for ${receipt.manifest_hash} ` +
            `does NOT verify against the PINNED Father public key`,
        )
      return { ok: true, receipt: inner }
    }
    // wallet-bind: the kernel's accepted answer, relayed by the counterparty.
    return { ok: true, receipt: receipt.receipt }
  }

  private async attempt(entry: OutboxEntry): Promise<void> {
    entry.state = 'IN_FLIGHT'
    await this.store.put(entry)
    this.emit('attempt', entry)
    try {
      if (entry.kind === 'wallet-bind') await this.deliverWalletBind(entry)
      else await this.deliverFatherBind(entry)
    } catch (e) {
      // Defensive: a throw inside delivery is a HOLE, never a receipt.
      await this.queueForRetry(entry, `HOLE · daemon fault: ${(e as Error).message}`)
    }
  }

  private async deliverWalletBind(entry: OutboxEntry): Promise<void> {
    const result = await transmitBoxToDCLM(entry.envelope, {
      enabled: true,
      endpoint: bindEndpointToUrl(entry.endpoint),
      fetchImpl: this.fetchImpl,
    })
    if (result.state === 'COMMITTED') {
      // Iris gate: DELIVERED only with a receipt AND a real kernel answer.
      const g = gateSettle('DELIVERED', { receipt: result.receipt, kernelAnswered: true })
      if (!isGatePass(g)) throw new Error('IRIS-GATE-VIOLATION · ' + g.reason)
      consumeBindingBestEffort(entry.manifest_hash, 'wallet-bind-transmit')
      entry.state = 'DELIVERED'
      entry.receipt = result.receipt
      entry.last_error = null
      await this.store.put(entry)
      await this.clearRelay(entry.manifest_hash)
      this.emit('delivered', entry)
      return
    }
    const reason: DropReason = result.reason
    if (reason === 'NETWORK') {
      // No answer — the bind stays queued, honestly.
      await this.queueForRetry(entry, `HOLE · UNREACHABLE — the kernel endpoint did not answer.`)
      return
    }
    // The kernel (or its router) answered with a rejection, or the envelope
    // could not be formed: terminal, consumed, honestly reported.
    const rejectReason = `REJECTED · ${reason}${result.detail ? ' — ' + result.detail : ''}`
    // Iris gate: a REJECTION is settled only with its true reason.
    const gr = gateSettle('REJECTED', { reason: rejectReason })
    if (!isGatePass(gr)) throw new Error('IRIS-GATE-VIOLATION · ' + gr.reason)
    consumeBindingBestEffort(entry.manifest_hash, 'wallet-bind-transmit')
    entry.state = 'REJECTED'
    entry.last_error = rejectReason
    await this.store.put(entry)
    await this.clearRelay(entry.manifest_hash)
    this.emit('rejected', entry)
  }

  private async deliverFatherBind(entry: OutboxEntry): Promise<void> {
    if (!entry.father_pubkey_b64 || !entry.father_fingerprint) {
      consumeBindingBestEffort(entry.manifest_hash, 'father-bind-transmit')
      // Iris gate: every REJECTED settle passes the gate, no exceptions.
      const g = gateSettle('REJECTED', { reason: 'NO_PINNED_KEY — the queued bind carries no pinned Father public key.' })
      if (!isGatePass(g)) throw new Error('IRIS-GATE-VIOLATION · ' + g.reason)
      entry.state = 'REJECTED'
      entry.last_error = 'REJECTED · NO_PINNED_KEY — the queued bind carries no pinned Father public key.'
      await this.store.put(entry)
      await this.clearRelay(entry.manifest_hash)
      this.emit('rejected', entry)
      return
    }
    let envelope: FatherBindRequestBody
    try {
      envelope = JSON.parse(entry.envelope) as FatherBindRequestBody
    } catch {
      consumeBindingBestEffort(entry.manifest_hash, 'father-bind-transmit')
      // Iris gate: every REJECTED settle passes the gate, no exceptions.
      const g = gateSettle('REJECTED', { reason: 'BAD_RESPONSE — the queued envelope is not a valid bind body.' })
      if (!isGatePass(g)) throw new Error('IRIS-GATE-VIOLATION · ' + g.reason)
      entry.state = 'REJECTED'
      entry.last_error = 'REJECTED · BAD_RESPONSE — the queued envelope is not a valid bind body.'
      await this.store.put(entry)
      await this.clearRelay(entry.manifest_hash)
      this.emit('rejected', entry)
      return
    }
    const raw = Uint8Array.from(atob(entry.father_pubkey_b64), c => c.charCodeAt(0))
    const settled: FatherBindResult = await deliverFatherBind({
      prepared: { envelope, manifestHash: entry.manifest_hash },
      pinnedFather: { raw, fingerprint: entry.father_fingerprint },
      endpoint: entry.endpoint,
      fetchImpl: this.fetchImpl,
      // storage undefined → the browser's localStorage ledger, so the bind
      // ledger UI shows daemon-delivered binds; null in non-browser tests.
      storage: undefined,
    })
    if (settled.state === 'SEALED') {
      // Iris gate: DELIVERED only with the countersigned receipt AND the
      // kernel's real answer behind it.
      const g = gateSettle('DELIVERED', { receipt: settled.receipt, kernelAnswered: true })
      if (!isGatePass(g)) throw new Error('IRIS-GATE-VIOLATION · ' + g.reason)
      entry.state = 'DELIVERED'
      entry.receipt = settled.receipt
      entry.last_error = null
      await this.store.put(entry)
      await this.clearRelay(entry.manifest_hash)
      this.emit('delivered', entry)
      return
    }
    if (settled.state === 'HOLE') {
      await this.queueForRetry(entry, settled.detail)
      return
    }
    // Iris gate: a REJECTION is settled only with its true reason.
    const gr = gateSettle('REJECTED', { reason: settled.detail })
    if (!isGatePass(gr)) throw new Error('IRIS-GATE-VIOLATION · ' + gr.reason)
    entry.state = 'REJECTED'
    entry.last_error = settled.detail
    await this.store.put(entry)
    await this.clearRelay(entry.manifest_hash)
    this.emit('rejected', entry)
  }

  /** Start the carrier: pump now, then on an interval, on online, and when
   * the tab becomes visible. The outbox is durable — anything queued while
   * the app was closed is picked up here. */
  start(): void {
    void this.pump()
    if (this.timer) return
    this.timer = setInterval(() => void this.pump(), 30_000)
    try {
      if (typeof window !== 'undefined') {
        window.addEventListener('online', () => void this.pump())
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') void this.pump()
        })
      }
    } catch {
      // iris-gate: deliberate — environmental containment: in non-browser
      // runtimes there is no window/document; the 30s interval pump already
      // carries. Nothing lost, nothing to surface.
    }
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    if (this.retryTimer) clearTimeout(this.retryTimer)
    this.retryTimer = null
  }
}

/** The app-wide carrier. UI routes enqueue binds here and subscribe to events. */
let shared: CarryDaemon | null = null
export function sharedDaemon(options?: DaemonOptions): CarryDaemon {
  if (!shared) shared = new CarryDaemon(options)
  return shared
}
