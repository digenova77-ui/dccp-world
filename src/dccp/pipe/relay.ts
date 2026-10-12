/** `dualis.relay.v1` — the relay protocol.
 *
 * David's three steps: BUILD (the app mints binds) → RELAY (async holding,
 * neither side ever dials the other) → LIVE (David's machine consumes relayed
 * binds, completes them against the real kernel/Father key, publishes
 * receipts back through the relay).
 *
 * Design: RELAY_DESIGN.md. Verdict: ED-PREDICT-20261004-RELAY-V1 (predicted).
 *
 * The relay never claims a live connection. Its whole point is async
 * operation with no live link. A relayed bind is NOT a delivered bind —
 * status says RELAYED, never DELIVERED.
 *
 * Honesty invariants:
 * - Replays are impossible by construction: the counterparty dedupes on
 *   manifest_hash. The same hash is never relayed twice, never receipted twice.
 * - Malformed bundles are REJECTED with reasons — never thrown, never trusted.
 * - The relay carries envelopes and receipts only. Never secrets: no
 *   passwords, no seed phrases, no private keys. (The pinned Father PUBLIC
 *   key may ride along — it is public by definition.)
 * - Import never invents receipts. DELIVERED requires a real kernel answer
 *   behind the receipt, gated like every other settle.
 * - Every relay write and every receipt settle passes the Iris gates.
 */

import type { DaemonKind, OutboxEntry } from './daemon.ts'
import type { BindEndpoint } from './fatherBind.ts'
import { canonicalJson, sha256Hex } from './chain.ts'

export const RELAY_SCHEMA = 'dualis.relay.v1'

/** A bind held for the counterparty. Portable, IPFS-shaped JSON. */
export interface RelayBundle {
  schema: typeof RELAY_SCHEMA
  /** Idempotency key, end to end. The counterparty dedupes on this. */
  manifest_hash: string
  kind: DaemonKind
  /** Signed bytes. For wallet-bind: the box string. For father-bind: the JSON
   * of the FatherBindRequestBody. Never keys. */
  envelope: string
  /** Origin descriptor — where the live attempt was aimed. */
  endpoint: BindEndpoint
  unity_id: string
  /** Pinned Father PUBLIC key (raw bytes as base64). Public by definition. */
  father_pubkey_b64?: string
  father_fingerprint?: string
  /** ISO-8601 timestamp of the relay write. */
  relayed_at: string
  /** Per-daemon monotonic ordering hint. NOT a security property —
   * idempotency lives on manifest_hash. */
  relay_sequence: number
  /** The true reason the bind entered the relay (e.g. HOLE · UNREACHABLE). */
  reason: string
}

/** What comes back from the counterparty for one relayed bind. */
export type RelayReceiptOutcome = 'DELIVERED' | 'HOLE' | 'REJECTED'

export interface RelayReceiptBundle {
  schema: typeof RELAY_SCHEMA
  manifest_hash: string
  outcome: RelayReceiptOutcome
  /** Only with DELIVERED — a real kernel answer, never invented. */
  receipt?: unknown
  /** The true reason (or the kernel's true answer description). */
  reason: string
  /** ISO-8601 timestamp of the counterparty's answer. */
  answered_at: string
}

/** The portable export: what the counterparty ingests, what gets pinned. */
export interface RelayExportBundle {
  schema: typeof RELAY_SCHEMA
  exported_at: string
  exporter: 'dualis.app.v1'
  bundles: RelayBundle[]
  /** Swarm paging: present when this export is one page of a larger outbox.
   * A page is a complete, valid export — the counterparty needs no new code
   * path, only the discipline to follow next_after_sequence. */
  page?: RelayExportPage
}

/** One page of a volley export. Bounded, deterministic, resumable.
 *
 * IDEMPOTENCY LAW: manifest_hash is the one and only idempotency key, end to
 * end — the same bind is never delivered twice. chunk_id is a publisher-side
 * dedupe hint (skip re-pinning / re-advertising an identical page); it is
 * NEVER consulted by ingest, never a delivery identity, never a second
 * scheme. A page carrying the same manifest twice collapses to one by
 * manifest_hash; a replayed page is ignored by manifest_hash. The invariant
 * holds at swarm scale exactly as at single-bind scale, because it never
 * depended on scale. */
export interface RelayExportPage {
  /** sha256(canonicalJson(page bundles)) — publisher dedupe hint only. */
  chunk_id: string
  /** Outbox size (deduped) when the page was cut. May be stale under racing
   * writes — the cursor next_after_sequence is authoritative, not this. */
  total_bundles: number
  /** Cut after this relay_sequence (exclusive). null = last page. */
  next_after_sequence: number | null
}

/** Default page bound: 500 bundles ≈ ~330KB, a comfortable pin and a
 * comfortable browser parse. Benchmarked linear: 5k binds ≈ 3.3MB / ~47ms
 * serialize+parse in-process — the monolith is the wrong shape for volleys. */
export const RELAY_EXPORT_PAGE_LIMIT = 500

/** Cut one page from an outbox snapshot. Deterministic: the same bundles
 * always cut the same page (same chunk_id). Dedupes by manifest_hash — first
 * in relay_sequence order wins — so a snapshot carrying one manifest twice
 * collapses to one, by the one idempotency key. Pages tile exactly: feed
 * page.next_after_sequence back as afterSequence until it is null. */
export async function pageRelayExport(
  bundles: RelayBundle[],
  afterSequence: number,
  limit: number,
): Promise<{ bundles: RelayBundle[]; page: RelayExportPage }> {
  const saneLimit =
    Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : RELAY_EXPORT_PAGE_LIMIT
  const seen = new Set<string>()
  const deduped: RelayBundle[] = []
  const ordered = [...bundles].sort((a, b) => a.relay_sequence - b.relay_sequence)
  for (const b of ordered) {
    if (seen.has(b.manifest_hash)) continue
    seen.add(b.manifest_hash)
    deduped.push(b)
  }
  const start = deduped.findIndex(b => b.relay_sequence > afterSequence)
  const slice = start === -1 ? [] : deduped.slice(start, start + saneLimit)
  const hasMore = start !== -1 && start + saneLimit < deduped.length
  const page: RelayExportPage = {
    chunk_id: 'sha256:' + (await sha256Hex(canonicalJson(slice))),
    total_bundles: deduped.length,
    next_after_sequence: hasMore ? slice[slice.length - 1].relay_sequence : null,
  }
  return { bundles: slice, page }
}

/** The portable receipt import: what the counterparty publishes back. */
export interface RelayReceiptImport {
  schema: typeof RELAY_SCHEMA
  exported_at: string
  receipts: RelayReceiptBundle[]
}

export type RelayParseOk<T> = { ok: true; value: T }
export type RelayParseFail = { ok: false; reason: string }
export type RelayParse<T> = RelayParseOk<T> | RelayParseFail

/* ------------------------------------------------------------------ */
/* relayability                                                        */
/* ------------------------------------------------------------------ */

/** The marker for "the kernel endpoint did not answer" — the only HOLE the
 * relay accepts. A relayed bind is a bind with no live counterparty, not a
 * bind that faulted locally or was rejected on the merits. The marker is
 * matched as a substring so DEAD entries (whose last_error reads
 * `DEAD · … Last: HOLE · UNREACHABLE — …`) stay relayable after honest
 * exhaustion. */
export function isUnreachableHole(reason: string | null | undefined): boolean {
  return typeof reason === 'string' && reason.includes('HOLE · UNREACHABLE')
}

/** A bind may enter the relay only while it is still live (QUEUED, or DEAD
 * after honest exhaustion) and its last word was UNREACHABLE. Terminal
 * REJECTED/DELIVERED binds are never relayable. */
export function isRelayable(entry: {
  state: string
  last_error: string | null
}): boolean {
  return (
    (entry.state === 'QUEUED' || entry.state === 'DEAD') &&
    isUnreachableHole(entry.last_error)
  )
}

/* ------------------------------------------------------------------ */
/* bundle construction                                                 */
/* ------------------------------------------------------------------ */

/** Build the relay bundle for a relayable outbox entry. Pure. */
export function toRelayBundle(
  entry: OutboxEntry,
  relayedAt: string,
  relaySequence: number,
): RelayBundle {
  const bundle: RelayBundle = {
    schema: RELAY_SCHEMA,
    manifest_hash: entry.manifest_hash,
    kind: entry.kind,
    envelope: entry.envelope,
    endpoint: { ...entry.endpoint },
    unity_id: entry.unity_id,
    relayed_at: relayedAt,
    relay_sequence: relaySequence,
    reason: entry.last_error ?? 'UNKNOWN · relayed with no recorded reason',
  }
  if (entry.father_pubkey_b64) bundle.father_pubkey_b64 = entry.father_pubkey_b64
  if (entry.father_fingerprint) bundle.father_fingerprint = entry.father_fingerprint
  return bundle
}

/** Build a receipt bundle — the counterparty's answer for one relayed bind. */
export function toRelayReceiptBundle(input: {
  manifest_hash: string
  outcome: RelayReceiptOutcome
  receipt?: unknown
  reason: string
  answered_at: string
}): RelayReceiptBundle {
  const bundle: RelayReceiptBundle = {
    schema: RELAY_SCHEMA,
    manifest_hash: input.manifest_hash,
    outcome: input.outcome,
    reason: input.reason,
    answered_at: input.answered_at,
  }
  if (input.receipt !== undefined) bundle.receipt = input.receipt
  return bundle
}

/* ------------------------------------------------------------------ */
/* fail-closed parsing — malformed bundles are REJECTED, never thrown  */
/* ------------------------------------------------------------------ */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Structural record check, shared with the daemon's receipt verification. */
export function isRelayRecord(v: unknown): v is Record<string, unknown> {
  return isRecord(v)
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0
}

function validEndpoint(v: unknown): v is BindEndpoint {
  return (
    isRecord(v) &&
    nonEmptyString(v['protocol']) &&
    nonEmptyString(v['host']) &&
    typeof v['port'] === 'string' &&
    typeof v['path'] === 'string'
  )
}

/** Parse one relay bundle. Fail-closed: malformed input returns a reason,
 * never throws, never trusts. */
export function fromRelayBundle(json: unknown): RelayParse<RelayBundle> {
  try {
    if (!isRecord(json)) return { ok: false, reason: 'REJECTED · bundle is not an object' }
    if (json['schema'] !== RELAY_SCHEMA)
      return { ok: false, reason: `REJECTED · unknown schema ${String(json['schema'])}` }
    if (!nonEmptyString(json['manifest_hash']))
      return { ok: false, reason: 'REJECTED · bundle has no manifest_hash idempotency key' }
    if (json['kind'] !== 'wallet-bind' && json['kind'] !== 'father-bind')
      return { ok: false, reason: `REJECTED · unknown kind ${String(json['kind'])}` }
    if (!nonEmptyString(json['envelope']))
      return { ok: false, reason: 'REJECTED · bundle carries no envelope' }
    if (!validEndpoint(json['endpoint']))
      return { ok: false, reason: 'REJECTED · bundle endpoint descriptor is malformed' }
    if (!nonEmptyString(json['unity_id']))
      return { ok: false, reason: 'REJECTED · bundle has no unity_id' }
    if (!nonEmptyString(json['relayed_at']))
      return { ok: false, reason: 'REJECTED · bundle has no relayed_at timestamp' }
    if (typeof json['relay_sequence'] !== 'number' || !Number.isFinite(json['relay_sequence']) || json['relay_sequence'] < 0)
      return { ok: false, reason: 'REJECTED · bundle relay_sequence is not a valid number' }
    if (!nonEmptyString(json['reason']))
      return { ok: false, reason: 'REJECTED · bundle carries no true reason' }
    if (json['father_pubkey_b64'] !== undefined && typeof json['father_pubkey_b64'] !== 'string')
      return { ok: false, reason: 'REJECTED · father_pubkey_b64 is not a string' }
    if (json['father_fingerprint'] !== undefined && typeof json['father_fingerprint'] !== 'string')
      return { ok: false, reason: 'REJECTED · father_fingerprint is not a string' }
    const bundle: RelayBundle = {
      schema: RELAY_SCHEMA,
      manifest_hash: json['manifest_hash'],
      kind: json['kind'],
      envelope: json['envelope'],
      endpoint: {
        protocol: (json['endpoint'] as BindEndpoint).protocol,
        host: (json['endpoint'] as BindEndpoint).host,
        port: (json['endpoint'] as BindEndpoint).port,
        path: (json['endpoint'] as BindEndpoint).path,
      },
      unity_id: json['unity_id'],
      relayed_at: json['relayed_at'],
      relay_sequence: json['relay_sequence'],
      reason: json['reason'],
    }
    if (typeof json['father_pubkey_b64'] === 'string') bundle.father_pubkey_b64 = json['father_pubkey_b64']
    if (typeof json['father_fingerprint'] === 'string') bundle.father_fingerprint = json['father_fingerprint']
    return { ok: true, value: bundle }
  } catch (e) {
    return { ok: false, reason: `REJECTED · bundle parse fault: ${(e as Error).message}` }
  }
}

/** Parse one receipt bundle. Fail-closed: a DELIVERED claim without a receipt
 * is rejected at parse — import can never invent one. */
export function fromRelayReceiptBundle(json: unknown): RelayParse<RelayReceiptBundle> {
  try {
    if (!isRecord(json)) return { ok: false, reason: 'REJECTED · receipt is not an object' }
    if (json['schema'] !== RELAY_SCHEMA)
      return { ok: false, reason: `REJECTED · unknown schema ${String(json['schema'])}` }
    if (!nonEmptyString(json['manifest_hash']))
      return { ok: false, reason: 'REJECTED · receipt has no manifest_hash idempotency key' }
    const outcome = json['outcome']
    if (outcome !== 'DELIVERED' && outcome !== 'HOLE' && outcome !== 'REJECTED')
      return { ok: false, reason: `REJECTED · unknown outcome ${String(outcome)}` }
    if (outcome === 'DELIVERED' && (json['receipt'] === undefined || json['receipt'] === null))
      return { ok: false, reason: 'REJECTED · DELIVERED claim with no receipt — receipts are never invented' }
    if (!nonEmptyString(json['reason']))
      return { ok: false, reason: 'REJECTED · receipt carries no true reason' }
    if (!nonEmptyString(json['answered_at']))
      return { ok: false, reason: 'REJECTED · receipt has no answered_at timestamp' }
    const bundle: RelayReceiptBundle = {
      schema: RELAY_SCHEMA,
      manifest_hash: json['manifest_hash'],
      outcome,
      reason: json['reason'],
      answered_at: json['answered_at'],
    }
    if (json['receipt'] !== undefined) bundle.receipt = json['receipt']
    return { ok: true, value: bundle }
  } catch (e) {
    return { ok: false, reason: `REJECTED · receipt parse fault: ${(e as Error).message}` }
  }
}

/** Parse a portable export bundle. Malformed members are skipped with
 * counted reasons — the valid members still import. Never throws.
 *
 * The optional page block (swarm paging) is validated fail-closed when
 * present. chunk_id is a publisher hint, never a gate: a tampered chunk_id
 * does not fail the parse — the bundles are trusted on their own validation,
 * never on the digest. */
export function parseRelayExport(json: unknown): {
  ok: boolean
  bundles: RelayBundle[]
  skipped: number
  reasons: string[]
  page?: RelayExportPage
} {
  const reasons: string[] = []
  try {
    if (!isRecord(json)) return { ok: false, bundles: [], skipped: 1, reasons: ['REJECTED · export is not an object'] }
    if (json['schema'] !== RELAY_SCHEMA)
      return { ok: false, bundles: [], skipped: 1, reasons: [`REJECTED · unknown schema ${String(json['schema'])}`] }
    if (!Array.isArray(json['bundles']))
      return { ok: false, bundles: [], skipped: 1, reasons: ['REJECTED · export has no bundles array'] }
    let page: RelayExportPage | undefined
    if (json['page'] !== undefined) {
      const p = json['page']
      const pageOk =
        isRecord(p) &&
        nonEmptyString(p['chunk_id']) &&
        typeof p['total_bundles'] === 'number' &&
        Number.isFinite(p['total_bundles']) &&
        p['total_bundles'] >= 0 &&
        (p['next_after_sequence'] === null ||
          (typeof p['next_after_sequence'] === 'number' && Number.isFinite(p['next_after_sequence'])))
      if (!pageOk)
        return { ok: false, bundles: [], skipped: 1, reasons: ['REJECTED · export page block is malformed'] }
      page = {
        chunk_id: p['chunk_id'] as string,
        total_bundles: p['total_bundles'] as number,
        next_after_sequence: p['next_after_sequence'] as number | null,
      }
    }
    const bundles: RelayBundle[] = []
    let skipped = 0
    for (const member of json['bundles']) {
      const parsed = fromRelayBundle(member)
      if (parsed.ok) bundles.push(parsed.value)
      else {
        skipped += 1
        reasons.push(parsed.reason)
      }
    }
    return { ok: true, bundles, skipped, reasons, page }
  } catch (e) {
    return { ok: false, bundles: [], skipped: 1, reasons: [`REJECTED · export parse fault: ${(e as Error).message}`] }
  }
}

/** Parse a portable receipt import. Same fail-closed discipline as export. */
export function parseRelayReceiptImport(json: unknown): {
  ok: boolean
  receipts: RelayReceiptBundle[]
  skipped: number
  reasons: string[]
} {
  const reasons: string[] = []
  try {
    if (!isRecord(json)) return { ok: false, receipts: [], skipped: 1, reasons: ['REJECTED · import is not an object'] }
    if (json['schema'] !== RELAY_SCHEMA)
      return { ok: false, receipts: [], skipped: 1, reasons: [`REJECTED · unknown schema ${String(json['schema'])}`] }
    if (!Array.isArray(json['receipts']))
      return { ok: false, receipts: [], skipped: 1, reasons: ['REJECTED · import has no receipts array'] }
    const receipts: RelayReceiptBundle[] = []
    let skipped = 0
    for (const member of json['receipts']) {
      const parsed = fromRelayReceiptBundle(member)
      if (parsed.ok) receipts.push(parsed.value)
      else {
        skipped += 1
        reasons.push(parsed.reason)
      }
    }
    return { ok: true, receipts, skipped, reasons }
  } catch (e) {
    return { ok: false, receipts: [], skipped: 1, reasons: [`REJECTED · import parse fault: ${(e as Error).message}`] }
  }
}

/* ------------------------------------------------------------------ */
/* relay outbox store — durable, exportable, alongside the retry queue  */
/* ------------------------------------------------------------------ */

export interface RelayOutboxStore {
  get(manifestHash: string): Promise<RelayBundle | null>
  put(bundle: RelayBundle): Promise<void>
  all(): Promise<RelayBundle[]>
  delete(manifestHash: string): Promise<void>
}

export function memoryRelayOutboxStore(): RelayOutboxStore {
  const map = new Map<string, RelayBundle>()
  return {
    get: async h => map.get(h) ?? null,
    put: async b => void map.set(b.manifest_hash, { ...b, endpoint: { ...b.endpoint } }),
    all: async () => [...map.values()].map(b => ({ ...b, endpoint: { ...b.endpoint } })),
    delete: async h => void map.delete(h),
  }
}

const RELAY_DB = 'dclm-relay-outbox.v1'
const RELAY_STORE = 'relay'

function idbRelayOutboxStore(): RelayOutboxStore {
  let dbPromise: Promise<IDBDatabase> | null = null
  const db = (): Promise<IDBDatabase> => {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(RELAY_DB, 1)
        req.onupgradeneeded = () => {
          req.result.createObjectStore(RELAY_STORE, { keyPath: 'manifest_hash' })
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
          const tx = d.transaction(RELAY_STORE, mode)
          const req = fn(tx.objectStore(RELAY_STORE))
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        }),
    )
  return {
    get: async h => (await run('readonly', s => s.get(h))) ?? null,
    put: async b => void (await run('readwrite', s => s.put(b))),
    all: async () => (await run('readonly', s => s.getAll())) ?? [],
    delete: async h => void (await run('readwrite', s => s.delete(h))),
  }
}

/** IndexedDB in browsers, memory elsewhere (tests, SSR). */
export function createRelayOutboxStore(): RelayOutboxStore {
  try {
    if (typeof indexedDB !== 'undefined') return idbRelayOutboxStore()
  } catch {
    // iris-gate: deliberate — same non-durable fallback discipline as the
    // daemon outbox: the in-memory relay still holds for the session.
  }
  return memoryRelayOutboxStore()
}
