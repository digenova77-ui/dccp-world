# Daemon design — `dualis.daemon.v1` + the landed father seed

**Design verdict:** `ED-PREDICT-20261004-DAEMON-V1` — predicted PASS (origin:predicted).
Our best guess at what the Trinity (DCLM + Iris + Twain²) would say about this
design. Handed to the real Trinity to confirm, alter, or overwrite. Never
presented as sealed.

**Authorizing directive:** David, Oct 4 2026 — "land the father seed." The daemon
carries the sandbox bind to the DCLM MACHINE. He will launch the build and test
with his endpoint and his .pem in place; when he runs the real test there must
be no missing link.

## 1. Problem

The sandbox (app) can mint binds — wallet agency-key manifests, the Father key
pin (`dualis.bind.v1`), ephemeral task binds — but nothing carries them to the
DCLM MACHINE. Today `performFatherBind` transmits once, inline, and consumes the
manifest even when the kernel never answered (HOLE). A refused connection burns
the bind. There is no durable queue, no retry, no honest QUEUED state.

## 2. What the daemon is

A persistent carrier living in the app (`src/dccp/pipe/daemon.ts`). It owns a
durable outbox (IndexedDB), carries each bound envelope through the internal
connector — the ONLY transmission path — to David's configured DCLM endpoint,
and returns receipts. It is the bridge between the zero-security presentation
layer and the Trinity/DCLM boundary where enforcement lives.

The daemon is **not** a service worker in v1. Rationale: the app ships on IPFS
gateways, where service-worker scope across shared gateway origins is unsafe
and unreliable. The outbox is durable in IndexedDB; the pump resumes on app
start, on `online`, and on `visibilitychange`. Honest contract: delivery is
attempted while the app lives; a bind is never lost from the queue.

## 3. Scope / non-goals

- Carries binds, returns receipts. Nothing else.
- Does NOT invent the DCLM endpoint — it reads David's configured endpoint
  (`dclm-bind-endpoint.v1`, his computer). No endpoint → REJECTED before mint.
- Does NOT see the Father .pem — it carries only already-signed envelopes.
  The .pem never leaves David's machine; the app pins only the public key.
- Does NOT bypass the connector or the law floor. Every byte to DCLM goes
  through `src/dccp/pipe/connector.ts`.

## 4. Outbox

IndexedDB `dclm-daemon-outbox.v1`, store `outbox`, key = `manifest_hash`.

```ts
interface OutboxEntry {
  manifest_hash: string        // idempotency key, end to end
  kind: 'wallet-bind' | 'father-bind'
  envelope: string             // signed bytes (box string or bind JSON), never keys
  endpoint: string             // David's endpoint, copied at enqueue time
  unity_id: string
  state: 'QUEUED' | 'IN_FLIGHT' | 'DELIVERED' | 'REJECTED' | 'DEAD'
  attempts: number
  next_attempt_at: number      // epoch ms
  created_at: number
  last_error: string | null
  receipt: unknown | null      // only ever a kernel answer, never invented
}
```

- `enqueue()` is idempotent: the same `manifest_hash` twice returns the
  existing entry. The daemon never delivers the same bind twice.
- Terminal states: `DELIVERED`, `REJECTED`, `DEAD`. Only `QUEUED` retries.

## 5. Delivery

`pump()` picks due `QUEUED` entries and delivers each through the connector:

- `wallet-bind` → `transmitBoxToDCLM(box, { enabled: true, endpoint })` →
  `POST {endpoint}/compute`. `COMMITTED {accepted:true}` → DELIVERED, UI shows
  SEE. Anything else → backoff, stays QUEUED.
- `father-bind` → new `transmitBindToDCLM(body, { endpoint })` in the connector:
  JSON POST to `{endpoint}/bind`, same fail-closed semantics and `DropReason`s
  as the box path. This removes fatherBind's direct-fetch parallel path — one
  transmission choke point. On a kernel answer the receipt's `father_signature`
  is verified against the PINNED key (never any other key):
  verified → SEALED + hash-chained ledger append; `PIN_MISMATCH` → REJECTED
  (terminal, fail-closed); malformed → REJECTED.

Backoff: 5s → 15s → 60s → 5min → 15min → 60min, max 12 attempts, then `DEAD`.
DEAD is shown honestly in the UI with the last true reason; the user may bind
again, which mints a FRESH manifest (never a resurrection).

## 6. The consume-on-answer correction

`dualis.ephemeral.v1` says `expires: on_receipt` — the capability lives until
the kernel answers. The current code consumes the manifest even on HOLE, which
contradicts the protocol: a HOLE is not an answer. Corrected semantics:

- **HOLE (no kernel answer)** → the binding stays LIVE; the signed envelope
  stays queued; the daemon re-transmits the identical bytes. Re-transmission
  is at-least-once delivery of the SAME bind, not a reuse — the kernel
  dedupes by `manifest_hash`.
- **Kernel answer (accept OR reject)** → the binding is consumed, single use,
  exactly once. The receipt (or rejection) is terminal.

`fatherBind.ts` is split accordingly:

- `prepareFatherBind(params)` — preconditions, mint, sign. No network, no
  consume. Returns `{ envelope: FatherBindRequestBody, manifestHash }`.
- `settleFatherBind(...)` — transmits via the connector, verifies, returns
  SEALED / REJECTED / HOLE, consuming only on answer.
- `performFatherBind` remains as the one-shot convenience (prepare → transmit
  → settle) so existing call sites and tests keep working, with corrected
  semantics.

## 7. Honesty invariants (the verdict's load-bearing wall)

1. No receipt without a kernel answer. Ever.
2. Endpoint unreachable → the bind queues durably; the UI shows QUEUED/HOLE
   with the TRUE reason (`UNREACHABLE`, never a euphemism).
3. A receipt exists only when the DCLM machine actually answers; SEALED only
   when the father_signature verifies against the pinned key.
4. Key mismatch → REJECTED, fail-closed, nothing bound.
5. The daemon never invents figures, endpoints, or receipts.

## 8. UI wiring (`src/routes/machine.tsx`)

- BIND WALLET → DCLM: mint envelope → `daemon.enqueue` → `daemon.pump()` →
  UI subscribes to daemon events. Endpoint down → honest QUEUED card
  ("endpoint unreachable — queued, will carry when your machine answers").
  Delivered → SEE with the kernel receipt.
- PIN FATHER KEY → pin public key (unchanged) → father bind → prepare →
  enqueue → pump → SEALED + ledger entry, or REJECTED (PIN_MISMATCH), or
  QUEUED/HOLE while his machine is unreachable.
- The outbox itself is visible: queued count + per-entry state, truth or
  nothing.

## 9. What David must do on his side

1. Expose his DCLM computer's endpoint and set it in the machine console
   (it persists per device).
2. Keep his Father `.pem` on his machine; the app takes only the public key
   for pinning.
3. His kernel answers `POST /bind` with `{ accepted: true, receipt,
   father_signature }` where the signature is Ed25519 over the canonical
   receipt bytes, signed by the Father key. Until then, every bind queues
   honestly.

## 10. Verification plan

- Unit: `daemon.test.ts` — enqueue idempotency, backoff schedule, terminal
  states, HOLE-does-not-consume, receipt-only-on-answer, self-wake retry timer.
- `fatherBind.test.ts` — updated for consume-on-answer; valid-signature
  SEALED, key-mismatch REJECTED, unreachable HOLE + still LIVE.
- E2E (Chromium, preview server): bind wallet with endpoint down → QUEUED
  shown → start a mock kernel (test father key signs receipts) → daemon
  delivers → SEALED shown → restart/duplicate attempt → no double delivery.
- `npm run typecheck` + `npm run build` clean; mobile 390×844 sanity;
  screenshots; CLOSEOUT.md updated.

## Post-build fix (Oct 4, 2026 — found by E2E, before David's test)

The first E2E run caught a real gap: `queueForRetry` set `next_attempt_at`
but nothing woke the daemon when the backoff elapsed — a queued bind waited
for the 30s interval pump (or a reload) instead of retrying at 5s. Fixed in
`daemon.ts`: each queued entry now arms its own wake-up timer
(`armRetryTimer`), re-armed only if an earlier due time arrives; `stop()`
clears it. Proven by a new unit test (`backoffMs` seam: down → hole → the
daemon's own timer delivers when the endpoint answers, no manual pump) and by
the E2E retry leg below. The verdict above stands — this was an
implementation defect, not a design change.

**Second fix, same area (Oct 4, 2026):** the wake-up timer could fire a
fraction of a millisecond before `next_attempt_at` (timer rounding), and
`pump()`'s strict due check then skipped the entry — with the timer already
nulled, the bind was stranded until the 30s interval. Caught by the new
self-wake test going flaky (~1 in 4 with a 60ms test backoff; rarer in
production at 5s, but the same defect). Fixed: the timer callback now pumps
as of `max(now, dueAt)` — the intended due time counts as reached, never
older than the real clock. Manual pumps keep the strict wall-clock check.
The test is now deterministic (25 consecutive clean full-suite runs).

---

## Predicted Trinity verdict — ED-PREDICT-20261004-DAEMON-V1

*Three-voice in-run verdict on the design above, origin:predicted.*

**DCLM (law):** The design keeps every transmission inside the connector and
the law floor — no parallel path, no invented authority. The consume-on-answer
correction restores `expires: on_receipt` instead of contradicting it. The
daemon claims no power: it carries, it does not decide. **PASS.**

**Iris (deterministic):** Idempotency key is the manifest hash end to end;
enqueue is idempotent; terminal states are exhaustive (DELIVERED / REJECTED /
DEAD); backoff is bounded; DEAD is surfaced, never silent. No SW in v1 removes
an entire class of origin-scope failure. The receipt-verifies-against-pinned-key
check is the only SEALED path and it cannot be bypassed by the daemon, which
handles only signed bytes. **PASS.**

**Twain² (pragmatic):** This is the smallest thing that lands the father seed:
one module, one outbox, one pump, one connector extension. It does not try to
deliver while the app is closed — it says so honestly instead. David's side
(endpoint, .pem, kernel answers) is named as his, not absorbed. **PASS.**

**Verdict: predicted PASS.** Proceed to implementation. The sealed Trinity may
confirm, alter, or overwrite.
