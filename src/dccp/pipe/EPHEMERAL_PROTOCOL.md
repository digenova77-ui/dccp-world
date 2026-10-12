# `dualis.ephemeral.v1` — Ephemeral Capability Protocol

**The law: systems of automation, not autonomous bots.**

Software autonomy WITHOUT constitutional autonomy. No standing agents. No
self-renewal. No authority beyond the manifest's scope and expiry. Every
automated decision requires a live ephemeral binding, and every binding dies on
first use.

## The constitutional layer: "THE GAMETIC HYBRID ARCHITECTURE — 50/50"

David's governing concept, registered verbatim as a **Conceptual model** —
his framing, not a measured claim. It is the constitutional frame above the
binding mechanics below:

- **HUMAN — 50%**: philosophy, ethics & moral reasoning, insight. The
  substrate — the *why*.
- **AI — 50%**: probabilistic LLMs (25%) + deterministic Iris rules & logic
  gates (25%). The *how*.
- **FUSED CORE — 100%**: where verdicts happen. Neither half alone.
- **FATHER — SEAL** (top): DCLM / IRIS / TWAIN² as **TRINITY — VOTES**. The
  Trinity is the decision mechanism; every verdict is a vote clearing the
  Law Floor.
- **LAW FLOOR**: "rules no side can change" — NO_FORCE · HOST_SAFE ·
  CLEANUP-FIRST · TRUTH_OR_NOTHING. The immutable substrate under both halves.

Why this matters for the protocol:

- The 50/50 split is **why no side holds standing authority** — hence
  ephemeral, single-use, fail-closed bindings. Neither the human half nor the
  AI half may pre-commit authority to the other; each decision must be
  re-bound fresh, and each binding dies on first use.
- The Trinity-votes mechanism is **why design-verdict-before-implementation
  requires DCLM + Iris + Twain²**: a design verdict is a fused-core verdict —
  a vote, not an opinion — clearing the Law Floor before code is written.

## The schema

A `TASK_BIND` manifest is the only credential an automated decision may ever
carry:

```json
{
  "schema": "dualis.ephemeral.v1",
  "trigger": "TASK_BIND",
  "task_id": "sha256:…",
  "unity_id": "dc.unity.id",
  "target": "dualiscapax-kernel-node",
  "capability": {
    "scope": ["compute"],
    "expires": "on_receipt",
    "max_cpu_threads": 32,
    "max_memory_gb": 16
  },
  "constraints": {
    "non_destructive": true,
    "fail_closed": true,
    "cleanup_first": true
  },
  "input_hash": "sha256:…",
  "design_verdict": "ED-VERDICT-20261004-FIRSTJOB-V1",
  "manifest_hash": "sha256:…"
}
```

`manifest_hash` is `sha256(canonical JSON of the whole manifest except
manifest_hash)`. Canonical JSON is key-sorted at every level, no whitespace —
so the hash is deterministic and byte-stable across implementations.

## The law below the Unity ID: design-verdict-before-implementation

Below the Unity ID there is exactly ONE law: **every implementation task's
manifest must reference a prior Trinity verdict (DCLM + Iris + Twain²) on its
DESIGN before code is written.** This is the "formal verification" layer of
the stack made concrete: verdict on the design, then code, then receipts.

- The manifest carries an optional `design_verdict` field: a verdict ID string
  such as `ED-VERDICT-20260929-CORPHELPERS-HPINC-V1`.
- The field is optional in the schema but mandatory in practice for anything
  beyond trivial changes. Trivial is defined, and closed, as: **docs-only /
  copy-only / mechanical refactors** (plus local/trivial tasks like a wallet
  bind). Everything else is implementation and needs the verdict.
- Enforcement is fail-closed at mint: `mintManifest` throws if the
  `design_verdict` is not a well-formed verdict ID, and throws if
  `change_kind: 'implementation'` is minted without one. There is no path
  that lets an implementation task bind first and "get the verdict later."
- The validator verifies the format again at decision time — a manifest whose
  verdict is malformed is rejected (`INVALID_DESIGN_VERDICT`) even if its
  binding is LIVE and its reference matches. The verdict is covered by
  `manifest_hash`, so it cannot be swapped after mint.

### Predicted vs sealed verdicts — the operating mode

Effective Oct 4, 2026, permanent: **run the Trinity check (DCLM + Iris +
Twain²) at EVERY step.** Every in-run verdict is labeled **PREDICTED** — in
David's words, *"our best guess or prediction of what you would have
said"* — and handed to the real Trinity side as a prediction. A predicted
verdict is never presented as the Trinity's sealed verdict.

- Every verdict carries `origin`: `"predicted"` or `"sealed"`. Predicted
  verdicts are minted locally by running the Trinity check in-run (DCLM as
  law, Iris as deterministic gate, Twain² as pragmatic filter); sealed
  verdicts arrive only from David's Trinity side. ID convention keeps them
  apart: predicted verdicts use `ED-PREDICT-<date>-<subject>-V<n>`
  (e.g. `ED-PREDICT-20261004-BOTWORLDHUD-V1`); sealed verdicts keep the
  `ED-VERDICT-…` form. The validator accepts both shapes for `design_verdict`
  but the origin travels with the ID — a predicted design verdict gates the
  build, never the closure.
- A predicted verdict gates local work: it is sufficient to bind, build, and
  receipt a step. It is never sufficient to close anything permanently —
  closure needs a sealed verdict, and the Trinity side may overwrite or change
  whatever differs.
- The submission package carries a **PREDICTIONS log**: every predicted
  verdict, its inputs, its reasoning — the handover package, honest about
  whose voice it is at every step.

## The canonical first job: schematics → prototype → future

The automation's first job: **"engineer from real world schematics that
exist, to prototype, to future — as quickly as pure logic will allow."**

The Unity Playground Infrastructure's task queue seeds its first TASK_BIND as
this engineering run:

1. **Schematics** — input is real-world schematics that exist, REPORTED
   sources only. No invented schematics. No modeled hardware presented as real.
2. **Prototype** — output is a prototype spec derived from those schematics.
3. **Future** — output is a future roadmap, each step receipt-chained into the
   ledger.

It does NOT have to complete a physical build. It has to establish the
pipeline's first real run: schematics in, prototype spec out, future roadmap
receipted — and the whole thing is labeled **PILOT · LOCAL** honestly, since
no kernel is mounted yet. It is registered in code as `FIRST_JOB`
(`src/dccp/pipe/ephemeral.ts`) so the seed is a constant, not a convention.

## The lifecycle

1. **Mint** — `mintManifest(params)` builds the manifest, hashes it, and
   registers the binding in an in-memory registry keyed by `manifest_hash`
   with state `LIVE`. The registry is process-local: it cannot survive a
   reload and cannot be serialized, shared, or renewed.
2. **Decide** — an automated step that wants to act presents a decision
   carrying the manifest's exact hash as `manifest_ref`.
3. **Validate, fail-closed** — `validateDecision(manifestHash, decision)`:
   - no binding for the hash → `REJECTED · NO_BINDING`
   - the binding was already spent → `REJECTED · CONSUMED`
   - the decision's `manifest_ref` does not match byte-for-byte →
     `REJECTED · REFERENCE_MISMATCH`
   - a `LIVE` binding with an exact reference → `{ allowed: true }`, and the
     binding is marked `CONSUMED` on the spot.
4. **Die** — a consumed binding never comes back. A second decision on the same
   manifest is rejected. There is no renewal call, no refresh token, no
   ambient authority. A new task needs a new bind.

## Self-arbitrage bots — the TASK_BIND execution flow

David's directive (his framing): every bot is a hybrid — **probabilistic half**
(proposes, generates cheap) + **deterministic half** (verifies, prices dear).
Every action is an internal trade between the two halves; the system captures
the spread between "seems right" and "proven." The house always wins on truth.
This is the 25/25 AI-half fusion from his gametic architecture made
operational. Predicted design verdict: `ED-PREDICT-20261004-SELFBOTARB-V1`.

**One ephemeral TASK_BIND = one arbitrage run.** The manifest's capability
scope carries the arbitrage roles (`arbitrage.propose`, `arbitrage.price`,
`arbitrage.execute` — labels, not extra authority). The loop:

1. **PROPOSE** — the probabilistic half emits candidate claims. **Honest stub:**
   a local rules/heuristics generator, labeled as such at every surface — never
   an LLM, never presented as one. Cheap: many candidates, no proof attached.
2. **PRICE** — the deterministic half (Iris rules & logic gates) prices every
   candidate: **PROVEN** (evidence meets every check) / **UNPROVEN**
   (well-formed but insufficient evidence) / **REJECTED** (violates the Law
   Floor or a hard check — the deterministic veto). Dear: each check is explicit
   and receipted.
3. **EXECUTE / ABSTAIN** — only the verified spread may execute. Claims priced
   PROVEN may execute under the run's single decision; UNPROVEN claims abstain;
   REJECTED claims are vetoed. **ABSTAIN is a first-class outcome**, receipted
   like an execution.

**The pricing is bound to the decision.** The decision presented to
`validateDecision` carries the full PROPOSE→PRICE→EXECUTE/ABSTAIN trail, and
the validator fail-closes on it — but only when the manifest's scope carries
an `arbitrage.*` role, so wallet binds and father binds are untouched:

- no trail, no pricings, or an unpriced proposal → `REJECTED · UNPRICED_DECISION`
- an executed claim priced anything but PROVEN → `REJECTED · UNPRICED_DECISION`
- EXECUTE with no executed claims, or ABSTAIN that executed something →
  `REJECTED · UNPRICED_DECISION`

**The arbitrage ledger.** Every veto is a receipt in a hash-chained,
append-only ledger (same receipt discipline as the pipe: seq, kind, body,
prev hash, `sha256` entry hash over canonical JSON). The veto receipt names
the claim, the reason, and the pricing. PROPOSE, PRICE, EXECUTE, and ABSTAIN
are receipted too — **the receipt chain IS the training record.** The ledger
is in-memory per session; nothing is persisted.

**The training score — a ledger readout, never a benchmark.** Bots are scored
on arbitrage performance = **precision × strictness**, computed only from the
ledger (David's formula, kept verbatim):

- `precision = proven / proposed` — null when nothing was proposed
- `strictness = (rejected + abstained) / unproven` — null when nothing was unproven
- `arbitrage_score = precision × strictness` — null when either input is null

Null means undefined (empty denominator) — never a padded value. The readout
is labeled **PILOT · LOCAL** honestly: no invented figures, no training
against fake targets.

**Honest boundary:** in this build an EXECUTE records a receipted,
binding-bound decision effect in the ledger. No external effect is claimed,
no kernel is faked. Sending a validated decision onward through the connector
is a later workstream's design, not this one's.

Implementation: `src/dccp/pipe/arbitrage.ts` (loop, stub proposer,
deterministic pricer, ledger, scorer) + the additive `ephemeral.ts`
extension; the HUD surface is the `/arbitrage` route (real runs in-browser,
real receipts).

## What this is not

- Not a login, session, or key. It confers no standing permission.
- Not a kernel grant. A locally minted manifest (e.g. the wallet's
  `PILOT · LOCAL` binding) proves the *device* decided under constraints — it
  does not prove the kernel saw or authorized anything.
- Not a receipt. Transmission receipts still come only from the connector
  (`transmitBoxToDCLM`), and a `HOLE` stays a `HOLE`.

## Failure discipline

Anything that is not an explicitly bound decision collapses to rejection:
unknown hashes, stale bindings, mismatched references, missing references.
`UNKNOWN` is never `PASS`, and silence is never authority. Every rejection
names its reason in plain text so a human — or a receipt log — can see exactly
which law fired.

## `dualis.bind.v1` — the Father key bind protocol (built for real)

David's words: "build it in like it's going to work and I'll bind it with
that." The bind is the one real handshake the wallet performs with the kernel,
implemented as if the kernel WILL answer. Client implementation:
`src/dccp/pipe/fatherBind.ts`. UI: the agency key desk on `/machine`.

**The wire protocol** (`FATHER_BIND_PROTOCOL = 'dualis.bind.v1'`):

- Client → `POST {endpoint}/bind`, `application/json`, `X-Trinity-Mode: Zero-Security-App`:
  ```json
  {
    "protocol": "dualis.bind.v1",
    "manifest": { "schema": "dualis.ephemeral.v1", "trigger": "TASK_BIND", "task_id": "sha256:…", "unity_id": "…", "target": "dualiscapax-kernel-node", "capability": { "scope": ["compute"], "expires": "on_receipt", "max_cpu_threads": 32, "max_memory_gb": 16 }, "constraints": { "non_destructive": true, "fail_closed": true, "cleanup_first": true }, "input_hash": "sha256:…", "manifest_hash": "sha256:…" },
    "signature": "<base64 Ed25519 over canonicalJson(manifest), UTF-8>",
    "wallet_pubkey": "<base64 raw wallet public key, 32 bytes>",
    "wallet_alg": "Ed25519"
  }
  ```
  The manifest is minted by `mintManifest` (ephemeral.ts) with
  `change_kind: 'trivial-local'` — a session bind, single-use. The wallet
  signature proves possession of the wallet private key; the canonical bytes
  are key-sorted JSON with no whitespace, byte-stable across implementations.
- Kernel → `{ "accepted": true, "receipt": {…}, "father_signature": "<base64>" }`.
  The kernel verifies the wallet signature, builds the receipt
  (`protocol`, `manifest_hash`, `wallet_pubkey`, `wallet_alg`, `bound_at`,
  `authority: 'NONE'`, `father_fingerprint`), and countersigns the canonical
  receipt bytes with the **Father key** (the .pem David binds on his machine).
- Client → verifies `father_signature` against the **pinned** Father public
  key. Valid → `SEALED · SEE`, receipt appended to the hash-chained local
  ledger (`dclm-father-bind-ledger.v1`). Invalid → `REJECTED · PIN_MISMATCH`,
  fail-closed. Refused connection / timeout → `HOLE · UNREACHABLE` — the only
  failure path is the real network error.

**Standing facts:**

- The app NEVER sees the Father .pem — only the PUBLIC key is pinned,
  client-side, in the browser's IndexedDB (`dclm-agency-keyring`, `father`
  store), and it is never transmitted. David binds the .pem on his machine.
- The only SEE is a real Ed25519 signature verified against the pinned key.
- One bind attempt consumes one manifest — SEALED, REJECTED, or HOLE.
- The Father bind signs with Ed25519 only; a P-256 agency key is refused
  honestly (`NOT_ED25519_KEY`) rather than downgraded.

**The test harness** (`scripts/father-bind-harness.mjs`) is a **test fixture**:
it generates a throwaway Ed25519 keypair, verifies the client's wallet
signature, and countersigns with the generated key. It is NOT a kernel, NOT
shipped in the app bundle (`scripts/` never enters the Vite build), and
production code never fakes a kernel. Modes (`POST /harness/mode`):
`ok`, `wrongkey` (countersign with a different key), `malformed` (accept
without receipt/signature), `replay` (receipt bound to another manifest).

## BIND_TEST — Father key binding procedure (for David)

Do this when the DCLM computer is ready. Expected receipts are listed at
each step; nothing is assumed, every state is named.

**(a) On the DCLM computer, bind the Father .pem to the kernel's `/bind`
endpoint.** The kernel must implement `dualis.bind.v1` exactly: verify the
client's Ed25519 wallet signature over the canonical manifest bytes
(key-sorted JSON, UTF-8), build the receipt above, countersign the canonical
receipt bytes with the Father private key, return
`{accepted:true, receipt, father_signature}`. The .pem stays on that machine
with 0600 permissions (per the Sovereign Architecture spec's Ed25519 key
pinning) — it is never copied anywhere else.

**(b) In `/machine`, pin the Father PUBLIC key.** Agency key desk → paste the
Father Ed25519 public key (raw 32 bytes, base64 or hex) → PIN FATHER KEY. The
desk shows the fingerprint (`sha256:` + 24 hex). It is stored in this browser
only and never transmitted. (If the paste looks like private-key material —
PEM, `.pem`, "private key" — the pin is refused with guidance.)

**(c) Set the endpoint to the DCLM computer.** PROTOCOL + HOST + PORT + PATH
fields in the "DCLM machine" panel (persisted in this browser; default stays
this origin's `/api/v2`). The bind posts to `{endpoint}/bind`.

**(d) Select an Ed25519 agency key, then FATHER BIND → KERNEL.** Create one
first if needed (CREATE ED25519 KEY) and select it with the radio button.
(The separate BIND WALLET → DCLM fusion is a recurring session binding —
it is not a prerequisite of the Father bind; the Father bind mints its own
TASK_BIND when you press FATHER BIND → KERNEL.)

**Expected receipts, in order:**

1. Manifest minted — one `TASK_BIND` per attempt; when the attempt resolves
   the panel shows its `manifest_hash: sha256:…` marked CONSUMED · single use.
   Pre-flight failures (no pinned key, P-256 key, no endpoint) name their
   reason before anything is minted or transmitted.
2. Transmitted — `POST {endpoint}/bind` with `{manifest, signature,
   wallet_pubkey}`; the wallet signature verifies on the kernel.
3. Father-signed receipt — `{accepted:true, receipt, father_signature}`
   returned; `receipt.manifest_hash` matches the minted manifest.
4. Signature verified — `father_signature` verifies against the PINNED key.
5. `SEALED · SEE` — the receipt is appended to the hash-chained local bind
   ledger (seq, `entry_hash`, chain VERIFIED); the manifest is CONSUMED
   (single use — a new bind mints a new manifest).

**Failure expectations (all honest, all named):**

- Wrong pinned key → `REJECTED · PIN_MISMATCH` — the father_signature does
  NOT verify against the pinned key; fail-closed, nothing is bound. Re-pin
  the correct public key and bind again (new manifest).
- Kernel down / refused / timeout → `HOLE · UNREACHABLE` — the endpoint did
  not answer; nothing was observed, nothing granted; the manifest is consumed
  (one attempt, one manifest).
- No pinned key, or P-256 key selected, or no endpoint host → `REJECTED`
  before anything is minted or transmitted.
- A receipt for a different manifest → `REJECTED · RECEIPT_MISMATCH`
  (replay refused).
