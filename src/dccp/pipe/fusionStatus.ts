/** Fusion Confirmation — read-only connection-status surface.
 *
 * David's law: "the user should have confirmation that something fused and
 * bound when it does" — and nobody should sit in limbo wondering about the
 * status of their connection.
 *
 * This module READS ONLY. It never enqueues, pumps, requeues, dismisses, or
 * otherwise mutates the daemon outbox; it subscribes to the existing daemon
 * event emitter (`delivered`, `hole`, `rejected`, `dead`, `attempt`,
 * `enqueued`) and re-reads. Iris gate logic is untouched — this is a view,
 * not a participant.
 *
 * Honesty labels: REPORTED = read from this browser's storage or from a
 * kernel answer carried by the daemon. UNKNOWN is never PASS — a storage
 * failure surfaces as UNKNOWN, never as a passing state. FUSED & BOUND is
 * shown only for a daemon DELIVERED entry, which exists only after a real
 * kernel answer (a countersigned Father receipt for father-bind, an accepted
 * box receipt for wallet-bind). No fake SEALED, no simulated receipts. If the
 * daemon has never attempted a bind, the snapshot says so plainly.
 */

import { sharedDaemon, type DaemonEntryState, type OutboxEntry } from './daemon.ts'
import { bindEndpointToUrl, type BindEndpoint, type FatherBindReceipt } from './fatherBind.ts'

export const FUSION_ENDPOINT_KEY = 'dclm-bind-endpoint.v1'
/** Dispatched (window CustomEvent) when /machine changes the endpoint or the
 * Father pin in the same tab, so compact HUD pills re-read without polling. */
export const FUSION_CHANGED_EVENT = 'dccp:fusion-changed'

export function notifyFusionChanged(): void {
  try {
    window.dispatchEvent(new CustomEvent(FUSION_CHANGED_EVENT))
  } catch {
    // non-browser contexts: nothing to notify.
  }
}

export interface FusionEndpointView {
  configured: boolean
  url: string
  protocol: string
  host: string
  port: string
  path: string
  label: 'REPORTED'
}

export type FatherPinView =
  | { state: 'PINNED'; fingerprint: string; pinnedAt: string | null; label: 'REPORTED' }
  | { state: 'UNPINNED'; label: 'REPORTED' }
  | { state: 'UNKNOWN'; detail: string; label: 'UNKNOWN' }

export interface FusionReceiptView {
  manifestHash: string
  /** Kernel's bound_at — present on Father receipts only. Null for wallet
   * binds, where the kernel's answer carries no bound_at. */
  boundAt: string | null
  fatherFingerprint: string | null
  kind: 'wallet-bind' | 'father-bind'
  label: 'REPORTED'
}

export interface FusionLatestView {
  kind: 'wallet-bind' | 'father-bind'
  state: DaemonEntryState
  manifestHash: string
  endpointUrl: string
  attempts: number
  lastError: string | null
  /** Non-null only on DELIVERED. A kernel answer, never invented. */
  receipt: FusionReceiptView | null
  /** True once the bind entered the relay outbox. A relayed bind is NOT a
   * delivered bind — the panel says RELAYED, never implies DELIVERED. */
  relayed: boolean
  label: 'REPORTED'
}

export interface FusionSnapshot {
  endpoint: FusionEndpointView
  father: FatherPinView
  /** The most recent outbox entry, or null when the daemon has never
   * carried a bind in this browser. */
  latest: FusionLatestView | null
  counts: { queued: number; inFlight: number; delivered: number; rejected: number; dead: number; total: number }
}

/* ------------------------------------------------------------------ */
/* readers — storage only, no daemon writes                             */
/* ------------------------------------------------------------------ */

export function readEndpointView(): FusionEndpointView {
  let ep: Partial<BindEndpoint> | null = null
  try {
    const raw = localStorage.getItem(FUSION_ENDPOINT_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (p && (p.protocol === 'https' || p.protocol === 'http') && typeof p.host === 'string') {
        ep = { protocol: p.protocol, host: p.host, port: String(p.port ?? ''), path: String(p.path ?? '/api/v2') }
      }
    }
  } catch {
    ep = null
  }
  const host = (ep?.host ?? '').trim()
  if (!host) {
    return { configured: false, url: 'NO ENDPOINT CONFIGURED', protocol: '', host: '', port: '', path: '', label: 'REPORTED' }
  }
  const full: BindEndpoint = {
    protocol: ep!.protocol === 'http' ? 'http' : 'https',
    host,
    port: String(ep!.port ?? ''),
    path: String(ep!.path ?? '/api/v2'),
  }
  return {
    configured: true,
    url: bindEndpointToUrl(full),
    protocol: full.protocol,
    host: full.host,
    port: full.port,
    path: full.path,
    label: 'REPORTED',
  }
}

const FATHER_DB = 'dclm-agency-keyring'

function readFatherPinView(): Promise<FatherPinView> {
  return new Promise(resolve => {
    try {
      if (typeof indexedDB === 'undefined') {
        resolve({ state: 'UNKNOWN', detail: 'browser key storage unavailable in this context', label: 'UNKNOWN' })
        return
      }
      const req = indexedDB.open(FATHER_DB, 2)
      req.onsuccess = () => {
        const db = req.result
        try {
          if (!db.objectStoreNames.contains('father')) {
            db.close()
            resolve({ state: 'UNPINNED', label: 'REPORTED' })
            return
          }
          const t = db.transaction('father', 'readonly')
          const get = t.objectStore('father').get('father')
          get.onsuccess = () => {
            const rec = get.result as { fingerprint?: string; pinnedAt?: number } | undefined
            db.close()
            if (rec && typeof rec.fingerprint === 'string') {
              resolve({
                state: 'PINNED',
                fingerprint: rec.fingerprint,
                pinnedAt: typeof rec.pinnedAt === 'number' ? new Date(rec.pinnedAt).toISOString() : null,
                label: 'REPORTED',
              })
            } else {
              resolve({ state: 'UNPINNED', label: 'REPORTED' })
            }
          }
          get.onerror = () => {
            db.close()
            resolve({ state: 'UNKNOWN', detail: 'could not read the pinned-key store', label: 'UNKNOWN' })
          }
        } catch (e) {
          try { db.close() } catch { /* already closed */ }
          resolve({ state: 'UNKNOWN', detail: 'could not read the pinned-key store: ' + (e as Error).message, label: 'UNKNOWN' })
        }
      }
      req.onerror = () => resolve({ state: 'UNKNOWN', detail: 'browser key storage unavailable', label: 'UNKNOWN' })
      req.onblocked = () => resolve({ state: 'UNKNOWN', detail: 'key storage blocked', label: 'UNKNOWN' })
    } catch (e) {
      resolve({ state: 'UNKNOWN', detail: 'browser key storage unavailable: ' + (e as Error).message, label: 'UNKNOWN' })
    }
  })
}

function receiptView(entry: OutboxEntry): FusionReceiptView | null {
  const r = entry.receipt as Partial<FatherBindReceipt> | null
  if (!r || typeof r !== 'object') return null
  return {
    manifestHash: typeof r.manifest_hash === 'string' ? r.manifest_hash : entry.manifest_hash,
    boundAt: typeof r.bound_at === 'string' ? r.bound_at : null,
    fatherFingerprint: typeof r.father_fingerprint === 'string' ? r.father_fingerprint : null,
    kind: entry.kind,
    label: 'REPORTED',
  }
}

function latestView(entries: OutboxEntry[]): FusionLatestView | null {
  if (entries.length === 0) return null
  const entry = [...entries].sort((a, b) => b.created_at - a.created_at)[0]
  return {
    kind: entry.kind,
    state: entry.state,
    manifestHash: entry.manifest_hash,
    endpointUrl: bindEndpointToUrl(entry.endpoint),
    attempts: entry.attempts,
    lastError: entry.last_error,
    receipt: entry.state === 'DELIVERED' ? receiptView(entry) : null,
    relayed: entry.relayed === true,
    label: 'REPORTED',
  }
}

export async function readFusionSnapshot(): Promise<FusionSnapshot> {
  const [father, entries] = await Promise.all([readFatherPinView(), sharedDaemon().list().catch(() => [] as OutboxEntry[])])
  const counts = { queued: 0, inFlight: 0, delivered: 0, rejected: 0, dead: 0, total: entries.length }
  for (const e of entries) {
    if (e.state === 'QUEUED') counts.queued++
    else if (e.state === 'IN_FLIGHT') counts.inFlight++
    else if (e.state === 'DELIVERED') counts.delivered++
    else if (e.state === 'REJECTED') counts.rejected++
    else if (e.state === 'DEAD') counts.dead++
  }
  return { endpoint: readEndpointView(), father, latest: latestView(entries), counts }
}

/* ------------------------------------------------------------------ */
/* subscription — the existing daemon emitter, read-only                */
/* ------------------------------------------------------------------ */

/** Subscribe to fusion status. Re-reads on every daemon event and on
 * endpoint/pin changes; never triggers binds, never mutates the outbox.
 * Returns an unsubscribe function. */
export function subscribeFusionStatus(cb: (snap: FusionSnapshot) => void): () => void {
  let alive = true
  const refresh = () => {
    if (!alive) return
    void readFusionSnapshot().then(s => {
      if (alive) cb(s)
    })
  }
  const offDaemon = sharedDaemon().onEvent(() => refresh())
  const onChanged = () => refresh()
  try {
    window.addEventListener(FUSION_CHANGED_EVENT, onChanged)
    window.addEventListener('storage', onChanged)
  } catch {
    // non-browser contexts: daemon events only.
  }
  void refresh()
  return () => {
    alive = false
    offDaemon()
    try {
      window.removeEventListener(FUSION_CHANGED_EVENT, onChanged)
      window.removeEventListener('storage', onChanged)
    } catch {
      // already gone
    }
  }
}

/* ------------------------------------------------------------------ */
/* one-line summary — pure, shared by the panel and the pill            */
/* ------------------------------------------------------------------ */

export type FusionTone = 'see' | 'hole' | 'wait'

export interface FusionSummary {
  tone: FusionTone
  /** Short status line, e.g. "FUSED & BOUND · father-bind". */
  text: string
  /** One honest sentence about what the state means. */
  detail: string
}

export function fusionSummary(snap: FusionSnapshot): FusionSummary {
  const ep = snap.endpoint.configured ? snap.endpoint.url : 'no endpoint'
  const father = snap.father.state === 'PINNED' ? 'Father PINNED' : snap.father.state === 'UNPINNED' ? 'Father UNPINNED' : 'Father key UNKNOWN'
  const base = `${ep} · ${father}`
  const latest = snap.latest
  if (!latest) {
    return {
      tone: 'wait',
      text: 'NO BIND ATTEMPTED',
      detail: `No bind has been carried in this browser. ${base}. (REPORTED)`,
    }
  }
  switch (latest.state) {
    case 'DELIVERED':
      return {
        tone: 'see',
        text: 'FUSED & BOUND',
        detail: latest.receipt?.boundAt
          ? `Fused & bound · ${latest.kind} · manifest ${latest.manifestHash.slice(0, 16)}… · bound ${latest.receipt.boundAt} · ${latest.endpointUrl} (REPORTED)`
          : `Fused & bound · ${latest.kind} · manifest ${latest.manifestHash.slice(0, 16)}… · ${latest.endpointUrl} · kernel answered (REPORTED)`,
      }
    case 'QUEUED':
    case 'IN_FLIGHT':
      return {
        tone: 'wait',
        text: latest.relayed ? `RELAYED · ${latest.state}` : `CARRYING · ${latest.state}`,
        detail: latest.relayed
          ? `This ${latest.kind} is held in the relay for the counterparty — no live kernel answered. Relayed is not delivered. ${latest.lastError ?? ''} ${base}. (REPORTED)`
          : `The daemon carries this ${latest.kind} — ${latest.lastError ?? 'waiting for the kernel to answer'}. Carrying is not a receipt. ${base}. (REPORTED)`,
      }
    case 'REJECTED':
      return {
        tone: 'hole',
        text: 'REJECTED',
        detail: `${latest.lastError ?? 'rejected'} · ${base}. (REPORTED)`,
      }
    case 'DEAD':
      return {
        tone: 'hole',
        text: `DEAD · ${latest.attempts} attempts`,
        detail: `${latest.lastError ?? 'no kernel answer after all attempts'} · ${base}. (REPORTED)`,
      }
    default:
      // Unreachable for known daemon states — fail-closed, never a fake confirmation.
      return {
        tone: 'wait',
        text: 'UNKNOWN STATE',
        detail: `The daemon reports a state this panel does not recognize (${(latest as { state: string }).state}). Nothing is claimed. ${base}. (REPORTED)`,
      }
  }
}

/* ------------------------------------------------------------------ */
/* compact pill — framework-free, for the HUD telemetrics area          */
/* ------------------------------------------------------------------ */

const PILL_STYLE_ID = 'fusion-pill-style'
const PILL_CSS = `
.fusion-pill{display:flex;align-items:center;gap:.5rem;max-width:100%;padding:.45rem .7rem;border:1px solid #31505a;border-radius:999px;background:rgba(7,19,26,.92);color:#e8f4f6;font:600 .72rem/1.3 system-ui,sans-serif;text-decoration:none;overflow-wrap:anywhere}
.fusion-pill .fp-dot{width:.55rem;height:.55rem;border-radius:50%;flex:none;background:#e8c36a;box-shadow:0 0 10px #e8c36a}
.fusion-pill .fp-dot.see{background:#3ddc97;box-shadow:0 0 10px #3ddc97}
.fusion-pill .fp-dot.hole{background:#ff6b6b;box-shadow:0 0 10px #ff6b6b}
.fusion-pill .fp-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:16rem}
@media (prefers-reduced-motion:reduce){.fusion-pill{transition:none}}
`

function ensurePillStyle(): void {
  if (document.getElementById(PILL_STYLE_ID)) return
  const st = document.createElement('style')
  st.id = PILL_STYLE_ID
  st.textContent = PILL_CSS
  document.head.appendChild(st)
}

/** Mount the compact fusion pill into any DOM host (e.g. the HUD overlay or
 * the telemetrics board chrome). Read-only: it subscribes to the daemon and
 * links to /machine. Returns an unmount function. */
export function mountFusionPill(host: HTMLElement): () => void {
  ensurePillStyle()
  const a = document.createElement('a')
  a.className = 'fusion-pill'
  a.href = '/machine'
  a.setAttribute('role', 'status')
  a.setAttribute('aria-live', 'polite')
  const dot = document.createElement('span')
  dot.className = 'fp-dot'
  dot.setAttribute('aria-hidden', 'true')
  const text = document.createElement('span')
  text.className = 'fp-text'
  a.append(dot, text)
  host.appendChild(a)
  const off = subscribeFusionStatus(snap => {
    const s = fusionSummary(snap)
    dot.className = 'fp-dot ' + s.tone
    text.textContent = s.text
    a.title = s.detail
    a.setAttribute('aria-label', 'Fusion status: ' + s.text + '. ' + s.detail)
  })
  return () => {
    off()
    a.remove()
  }
}
