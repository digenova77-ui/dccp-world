/** `dualis.genesis.v1` — the Genesis early-adopter mark.
 *
 * David's words: reward faith in something obscure, unpopular, unhyped,
 * unsold. Not dependent on money. One person counts as exactly one person.
 * Bots have the same offer: one identity = one identity.
 *
 * The mark is a pure function of identity + time:
 *   mark = sha256('dualis|genesis|v1|' + unity_id)
 *   genesis ⇔ bound_at < father_fuse_time   (cohort open while no fuse yet)
 *
 * Standing, never weight: the protocol carries no privilege fields, so no
 * number of IDs — human or bot — can concentrate power. The Sybil concern
 * dissolves by construction.
 *
 * The genesis record is an append-only hash-chained ledger (same pattern as
 * the Father bind ledger). The mark's truth never depends on the ledger; the
 * ledger is the standing record of who believed, in what order.
 *
 * Design: GENESIS_DESIGN.md. Verdict: ED-PREDICT-20261004-GENESIS-V1 (predicted).
 */

import { canonicalJson } from '../pipe/ephemeral.ts'

export const GENESIS_PROTOCOL = 'dualis.genesis.v1'
const MARK_DOMAIN = 'dualis|genesis|v1|'

const LEDGER_KEY = 'dccpworld.genesis-ledger.v1'
const LEDGER_CAP = 5000
const FUSE_TIME_KEY = 'dccpworld.father-fuse-time.v1'

export interface GenesisLedgerEntry {
  seq: number
  prev_hash: string
  entry_hash: string
  unity_id: string
  bound_at: string
  /** sha256 hex of MARK_DOMAIN + unity_id. Deterministic: one per ID. */
  mark: string
  /** When the ledger entry was written (not the bind time). */
  at: string
}

export interface GenesisStatus {
  state: 'GENESIS' | 'STANDARD'
  /** 'open' while the Father fuse has not happened yet; 'closed' after. */
  cohort: 'open' | 'closed'
  /** Ledger seq, when the ID stands in the record. */
  seq?: number
}

export interface BindStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function resolveStorage(explicit?: BindStorage | null): BindStorage | null {
  if (explicit !== undefined) return explicit
  try {
    return typeof localStorage !== 'undefined' ? (localStorage as BindStorage) : null
  } catch {
    return null
  }
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Derive the Genesis mark for a Unity ID. Deterministic: the same ID always
 * yields the same mark. Non-transferable: it is bound to the unity_id, which
 * is bound to the holder's passkey. */
export async function deriveGenesisMark(unityId: string): Promise<string> {
  return sha256Hex(MARK_DOMAIN + unityId)
}

/** The Father fuse time: the kernel receipt's bound_at from the first SEALED
 * Father bind. Null while the fuse has not happened (cohort open). */
export function getFuseTime(storage?: BindStorage | null): string | null {
  const s = resolveStorage(storage)
  if (!s) return null
  try {
    return s.getItem(FUSE_TIME_KEY)
  } catch {
    return null
  }
}

/** Record the Father fuse. First fuse wins — the cohort closes once and never
 * reopens. Later calls are no-ops (the event already happened). */
export function recordFatherFuse(fuseTimeISO: string, storage?: BindStorage | null): boolean {
  const s = resolveStorage(storage)
  if (!s) return false
  try {
    if (s.getItem(FUSE_TIME_KEY)) return false
    s.setItem(FUSE_TIME_KEY, fuseTimeISO)
    return true
  } catch {
    return false
  }
}

/** The whole rule, one function: genesis ⇔ bound_at < father_fuse_time.
 * While no fuse is recorded the cohort is open and every bound ID is genesis. */
export function genesisStatus(
  unityId: string,
  boundAt: string,
  storage?: BindStorage | null,
): GenesisStatus {
  void unityId
  const fuse = getFuseTime(storage)
  if (!fuse) return { state: 'GENESIS', cohort: 'open' }
  return boundAt < fuse
    ? { state: 'GENESIS', cohort: 'closed' }
    : { state: 'STANDARD', cohort: 'closed' }
}

export function readGenesisLedger(storage?: BindStorage | null): GenesisLedgerEntry[] {
  const s = resolveStorage(storage)
  if (!s) return []
  try {
    const raw = s.getItem(LEDGER_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as GenesisLedgerEntry[]) : []
  } catch {
    return []
  }
}

async function ledgerGenesisHash(): Promise<string> {
  return 'sha256:' + (await sha256Hex('dccp|genesis|genesis'))
}

/** Re-chain every stored entry. ok:false with the failing seq on any break —
 * a broken record is never presented as verified. */
export async function verifyGenesisLedger(
  storage?: BindStorage | null,
): Promise<{ ok: boolean; entries: number; failedAt?: number }> {
  const entries = readGenesisLedger(storage)
  let prev = await ledgerGenesisHash()
  for (const e of entries) {
    if (e.prev_hash !== prev) return { ok: false, entries: entries.length, failedAt: e.seq }
    const { entry_hash, ...body } = e
    const recomputed =
      'sha256:' + (await sha256Hex(prev + '|' + canonicalJson(body)))
    if (recomputed !== entry_hash) return { ok: false, entries: entries.length, failedAt: e.seq }
    prev = entry_hash
  }
  return { ok: true, entries: entries.length }
}

/** Ensure the Unity ID stands in the genesis record. Idempotent by unity_id:
 * the same ID always returns its existing entry — the record can never hold
 * an ID twice, so one person (one ID) counts exactly once. */
/** Ensure the Unity ID stands in the genesis record. Idempotent by unity_id:
 * the same ID always returns its existing entry — the record can never hold
 * an ID twice, so one person (one ID) counts exactly once.
 * Returns null for IDs bound after the Father fuse: they are full Unity IDs,
 * and the genesis record holds only genesis IDs. */
export async function ensureGenesisAttestation(
  unityId: string,
  boundAt: string,
  storage?: BindStorage | null,
): Promise<GenesisLedgerEntry | null> {
  if (genesisStatus(unityId, boundAt, storage).state !== 'GENESIS') return null
  const s = resolveStorage(storage)
  const existing = readGenesisLedger(s).find(e => e.unity_id === unityId)
  if (existing) return existing
  const entries = readGenesisLedger(s)
  const prev = entries.length ? entries[entries.length - 1].entry_hash : await ledgerGenesisHash()
  const seq = entries.length + 1
  const mark = await deriveGenesisMark(unityId)
  const body = {
    seq,
    prev_hash: prev,
    unity_id: unityId,
    bound_at: boundAt,
    mark,
    at: new Date().toISOString(),
  }
  const entry_hash = 'sha256:' + (await sha256Hex(prev + '|' + canonicalJson(body)))
  const entry: GenesisLedgerEntry = { ...body, entry_hash }
  entries.push(entry)
  while (entries.length > LEDGER_CAP) entries.shift()
  try {
    s?.setItem(LEDGER_KEY, JSON.stringify(entries))
  } catch {
    // Storage full or unavailable: the entry is still returned honestly.
  }
  return entry
}

/** Human surface copy for the mark. Calm, dignified, never hypey. */
export function genesisMarkCopy(status: GenesisStatus): string | null {
  if (status.state !== 'GENESIS') return null
  return status.cohort === 'open'
    ? 'GENESIS · cohort open — bound before the fuse'
    : 'GENESIS · bound before the Father fuse'
}
