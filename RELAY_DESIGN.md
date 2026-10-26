# Relay Protocol — Design Verdict

**Verdict:** `ED-PREDICT-20261004-RELAY-V1` · **origin: predicted, not sealed** ·
October 4, 2026

The verdict is predicted because no real counterparty has yet consumed a relay
bundle and published a receipt back. The code path is implemented, typechecked,
and tested (131/131). The verdict seals when a legitimate relay round-trip
against David's machine completes: bind relayed out, countersigned receipt
ingested back, DELIVERED settled through the gates.

## The problem David named

The daemon's bind jacket is correct but binds nothing to anything: when no
live kernel answers, the bind dies in limbo (HOLE → retry queue → DEAD). The
counterparty (his machine) is never dialed and never answers. A relay is the
middle step: async, portable, no live link in either direction.

## The three steps

1. **BUILD** — the app/sandbox produces binds (existing daemon outbox). Unchanged.
2. **RELAY** — when delivery fails with HOLE/UNREACHABLE (no live kernel), the
   daemon ALSO writes the bind to a durable, exportable relay outbox. The retry
   queue keeps working as today; the relay outbox is the second path. Every
   relay write settles through the existing Iris gates (`gateSettle`); a
   relayed bind is a GATE report, never a delivery.
3. **LIVE** — the counterparty consumes exported relay bundles, completes them
   against the real kernel/Father key, and publishes receipt bundles back
   through the relay. Receipts are verified exactly like the live path.

## Protocol: `dualis.relay.v1`

**Relay bundle** (`src/dccp/pipe/relay.ts`): the full bind envelope + the
manifest hash (idempotency key) + origin descriptors (`relayed_at`, `relayer`)
+ a relay sequence + the true reason (`reason`). Replays are impossible by
construction: the counterparty dedupes on manifest_hash.

**Relay receipt** (same schema family): `{ manifest_hash, outcome,
receipt?, reason, answered_at }` where outcome ∈ DELIVERED | HOLE | REJECTED.
A DELIVERED receipt without a receipt field is malformed — receipts are never
invented at ingest.

**Pure functions** (no I/O, no gates, no network):
- `toRelayBundle(outboxEntry, relayedAt, sequence)` → bundle
- `fromRelayBundle(json)` → `{ ok: true, value }` | `{ ok: false, reason }` —
  fail-closed; malformed bundles are REJECTED with reasons, never thrown
- `toRelayReceiptBundle(...)` / `fromRelayReceiptBundle(json)` — same contract
- `parseRelayExport(json)` / `parseRelayReceiptImport(json)` — skip malformed
  members with reasons, keep valid ones, never throw
- `isRelayable(entry)` — QUEUED or DEAD, with an UNREACHABLE-HOLE last error.
  Terminal states, faulted HOLEs, and IN_FLIGHT are never relayable.
- `isUnreachableHole(reason)` — only the no-live-kernel marker relays. The
  daemon's honesty taxonomy distinguishes "the kernel did not answer" from
  "something broke"; only the first enters the relay.

## Daemon bake-in (`src/dccp/pipe/daemon.ts`)

- `queueForRetry` (every HOLE path funnels through it) calls `writeRelay`
  after the retry queue write. `writeRelay` is fail-closed: if the entry is
  not relayable, or a bundle for that manifest already exists, it does
  nothing. The relay write passes `gateSettle('GATE', { detail: 'RELAYED · …' })`
  — no new settle paths without gates.
- `exportRelay()` → portable `dualis.relay.v1` export bundle, sorted by
  relay sequence, JSON-serializable (the pin-to-IPFS shape). This is what
  David's machine ingests.
- `ingestRelayReceipts(import)` → `{ applied, ignored, rejected, reasons }`:
  - DELIVERED + gate pass + real countersigned receipt (father-bind: verified
    against the pinned key with the live-path verifier; wallet-bind: gate
    accepts the kernel answer) → DELIVERED, relay bundle cleared.
  - HOLE → the bind stays QUEUED with the true reason; the binding stays LIVE.
  - REJECTED → terminal REJECTED with the true reason, no receipt.
  - Unknown manifest → ignored. Already-settled → ignored (idempotent).
    Malformed → rejected with reasons, never thrown.
  - Import never invents receipts. DELIVERED is only ever settled on a real
    countersigned receipt plus a gate pass.
- `dismiss()` clears the relay bundle with the entry. Every live-path terminal
  settle (DELIVERED/REJECTED) clears the relay bundle too, so exports never
  carry stale binds. The `relayed` flag on the entry stays in the ledger —
  the machine panel shows it arrived via relay.
- New `relayed` daemon event; the fusion panel (`fusionStatus.ts`, label only)
  shows `RELAYED · QUEUED` with the detail "Relayed is not delivered."

## Laws held

- Every settle passes through `gateSettle`. No fake SEALED, no fake receipts,
  no invented kernel answers.
- The relay carries envelopes and receipts only — never secrets, never
  passwords, never private keys. The counterparty's kernel/Father key never
  enters the relay.
- A relayed bind is not a delivered bind. The status says RELAYED, never
  implies DELIVERED. UNKNOWN is never PASS.
- The relay never claims a live connection. Its whole point is async operation
  with no live link.

## Honest residuals

1. The browser relay store (IndexedDB path in `createRelayOutboxStore`) is not
   covered by the node test suite; the memory store is. The code path is
   shared, but the browser round-trip is untested.
2. The verdict seals only on a real counterparty round-trip (David's machine).
3. Export is portable JSON today; pinning to IPFS is the next step, not this one.

## Swarm volleys — paged exports + outbox backpressure (2026-10-04)

When Iris commands bot swarms, a volley is the steady state: hundreds to
thousands of bundles per export cycle. Two upgrades, both grounded in
manifest_hash as the one idempotency key (David's directive — no second
scheme invented):

**Paged exports** (`pageRelayExport` in relay.ts, `exportRelayPage()` on the
daemon, page limit 500). Benchmarked: export size and parse time grow
linearly — 5k binds ≈ 3.3MB / ~47ms serialize+parse in-process, before any
network. A page is a complete, valid export carrying an optional `page`
block: `chunk_id` (sha256 of the canonical page bytes — a publisher dedupe
hint, never consulted by ingest, never a gate), `total_bundles`, and the
`next_after_sequence` cursor. Pages tile the outbox exactly; the counterparty
follows the cursor until null. `parseRelayExport` validates the page block
fail-closed. Discovery note: announce pages, not bundles — bundles are
addressed by manifest_hash *within* the fetched page.

**Outbox backpressure** (`RELAY_OUTBOX_MAX_DEFAULT = 10_000`, override via
`DaemonOptions.relayOutboxMax`). When saturated, `writeRelay` does not write:
the bind stays honestly QUEUED in the retry queue, a `relay-saturated` event
fires, and relaying resumes once the outbox drains. Backpressure, never loss.
The valve is exact (single-read count shared with the sequence init) and
fail-closed (a valve fault still never breaks the retry queue — writeRelay
never throws).

Tests: `src/dccp/pipe/relayVolley.test.ts` — 11 tests: exact tiling, chunk_id
determinism, duplicate-manifest collapse, page round-trip, malformed page
rejection, tampered chunk_id ignored (hint, not gate), saturation shed +
resume, duplicate-receipt collapse, replayed-import ignored. Full suite
260/260 green, typecheck clean.

Discovery engineering: DISCOVERY_ENGINEERING.md (measured vs unmeasured
latency ledger, the one-origin provider-record runbook).

## Dual-protocol discipline (David, 2026-10-04 ~7:08 PM EDT — law)
- **UDP** is for the live lane (voice, real-time, presence) and nothing more. **TCP** is for the truth lane (receipts, relay, ledger) and nothing more. Never cross the streams: no reliable-UDP reinventions, no real-time-TCP fights against physics. Each protocol for its purpose, nothing more.
- **Harmony** is the two lanes working as one system: the live lane carries presence; the truth lane carries proof. They meet only at defined joints.
- **Idempotency is the bridge and it is protocol-agnostic.** The `manifest_hash` idempotency key doesn't care which lane an operation arrived on: the same valid operation, however it arrives, has exactly one effect. A dropped UDP voice packet never births a ledger entry; a TCP receipt never double-applies. One effect, every lane, every time.
