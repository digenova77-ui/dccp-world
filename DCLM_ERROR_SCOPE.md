# DCLM ERROR SCOPE — seed knowledge v1

> This document is DCLM's own seed knowledge: the scope of every error it can
> run into, the impurities it must recognize on the website, and the
> engineering principles it uses to judge new ideas. It is the beginning of
> self-perpetuating awareness — knowledge that works, demonstrated by audit.
>
> - **Origin:** predicted (in-run Trinity verdict, not sealed)
> - **Design verdict:** `ED-PREDICT-20261004-DCLMERRORSCOPE-V1` — predicted PASS
>   (DCLM/law PASS; Iris/deterministic PASS-WITH-NOTES, remediated in-run;
>   Twain²/pragmatic PASS)
> - **Date:** 2026-10-04
> - **Rule:** nothing here is invented. Every error code below is grounded in a
>   code the system has actually met or can really meet (verified against
>   `src/dccp/pipe/` and `src/routes/` on 2026-10-04). When a new error is met
>   in the wild, it is added here with its first-seen evidence — never before.

---

## PART 1 — ERROR SCOPE

Every error DCLM can run into, by domain. For each: the code, what it means,
the honest surface state shown to the human, and the recovery path. The
standing rule underneath all of them: **an error is never hidden, never
softened into a fake success, never left silent.**

### 1.1 Transport — the wire between the app and the world

| Code | Meaning | Honest surface | Recovery |
|---|---|---|---|
| `UNREACHABLE` | The configured endpoint does not answer (DNS, refused, down). | HOLE · UNREACHABLE with the endpoint shown | Queue durably (daemon outbox); retry with backoff; surface until answered |
| `TIMEOUT` | The endpoint accepted the connection but never completed. | HOLE · TIMEOUT, attempt counted | Retry with backoff; after cap, DEAD-letter (surfaced, never silent) |
| `CORS_BLOCKED` | The browser refused the cross-origin call (no preflight answer). Met in E2E: without `OPTIONS → 204` + allow-headers, every carry dies here. | HOLE · CORS_BLOCKED, naming the missing headers | Fix is on the kernel side: answer the preflight (`Access-Control-Allow-Origin`, `Access-Control-Allow-Methods: POST, OPTIONS`, `Access-Control-Allow-Headers: content-type, x-trinity-mode`) |
| `MALFORMED` | The wire returned bytes that are not what was asked for. | DROPPED · MALFORMED | Do not retry blindly; log the bytes' shape; human eyes |
| `NON_JSON` | Expected JSON, got something else (gateway 404 page, proxy block). | DROPPED · NETWORK/MALFORMED (mapped, never fake) | Treat as transport failure; queue or surface |
| `NETWORK` | Fetch threw (offline, gateway failure). | DROPPED · NETWORK | Queue; retry on reconnect |

### 1.2 Kernel — the DCLM machine's own answers

| Code | Meaning | Honest surface | Recovery |
|---|---|---|---|
| `KERNEL_UNAVAILABLE` | No kernel behind the transport at all. | HOLE · KERNEL_UNAVAILABLE | Nothing to retry against; wait for the machine |
| `NO_ENDPOINT` | No endpoint is even configured. | HOLE · NO_ENDPOINT, pointing at the endpoint field | Human configures the endpoint |
| `NO_BINDING` | A bind was attempted with nothing bound. | HOLE · NO_BINDING | Complete the bind first |
| `NO_PINNED_KEY` | Father handshake attempted with no public key pinned. | HOLE · NO_PINNED_KEY | Pin the Father public key |
| `BAD_RESPONSE` | The kernel answered, but not in the protocol. | DROPPED · BAD_RESPONSE | Human eyes; do not invent a receipt |
| `REFERENCE_MISMATCH` | Manifest/input hashes do not match what was bound. | REJECTED · REFERENCE_MISMATCH, fail-closed | Re-bind from true inputs |
| `MINT_REJECTED` | The kernel refused to mint. | REJECTED · MINT_REJECTED with the kernel's reason | Surface the reason; do not mint locally and pretend |
| `NOT_ED` | Claim is not evidence-graded. | REJECTED · NOT_ED | Evidence first, then claim |
| `INVALID_DESIGN_VERDICT` | Implementation attempted without a design verdict. | REJECTED · INVALID_DESIGN_VERDICT | Verdict first, pen second |
| `UNPRICED_DECISION` | A decision with no price attached. | REJECTED · UNPRICED_DECISION | Price it or hold it |

### 1.3 Crypto — keys, signatures, pins

| Code | Meaning | Honest surface | Recovery |
|---|---|---|---|
| `PIN_MISMATCH` | Presented key does not match the pinned Father key. | REJECTED · PIN_MISMATCH, fail-closed | Use the true key; never loosen the pin |
| `PIN_INVALID` | The pin operation itself was invalid. | REJECTED · PIN_INVALID | Re-pin correctly |
| `BAD_SIGNATURE` | A signature does not verify against the pinned key. | REJECTED, fail-closed | No receipt; no retry with the same bytes |
| `EXPIRED_KEY` | The key's validity window has passed. | REJECTED · EXPIRED_KEY | Rotate; the old key never signs again |
| `UNKNOWN_KEY` | No such key in the keyring. | UNBOUND / not found | Bind the key first |

### 1.4 Daemon / outbox — the carrier

| Code | Meaning | Honest surface | Recovery |
|---|---|---|---|
| `QUEUED` | Bound, not yet carried. The normal state while the machine is dark. | QUEUED with attempt count and next retry | Wait; the daemon pumps on wake and on reload |
| `DUPLICATE_DELIVERY` | The same `manifest_hash` presented twice. Prevented by claim-hash idempotency. | Suppressed; ledger shows one delivery | Never deliver twice — this is the invariant, not an error to fix |
| `STRANDED_RETRY` | A wake-up timer fired before `next_attempt_at` (real race, met in QA). | Bind sits past due, unpumped | Pump the timer callback as of `max(now, dueAt)` |
| `DEAD` | Max attempts (12) exhausted, still unanswered. | DEAD — surfaced in the UI, never silent | Human decision: re-queue with a new manifest or retire |
| `QUEUE_CORRUPT` | The outbox store itself is unreadable. | Surfaced loudly; binds are not assumed delivered | Rebuild the outbox from the hash-chained ledger; assume nothing delivered |

### 1.5 Wallet — the human's keys

| Code | Meaning | Honest surface | Recovery |
|---|---|---|---|
| `UNBOUND` | No Unity handle bound; nothing minted. | UNBOUND — plain, no placeholder handle | Bind the Unity ID first |
| `NO_KEY` | No agency key exists for the requested operation. | No key — offer creation, never a fake key | Create a key (WebCrypto, non-exportable) |
| `LOCKED` | The key exists but is not unlocked for use. | Locked — say so | Unlock via the Unity-bound passphrase; never a second secret, never a seed phrase |

### 1.6 Data — figures, vintages, labels

| Code | Meaning | Honest surface | Recovery |
|---|---|---|---|
| `INVENTED_FIGURE` | A number presented as measured that was never measured. | The gravest data impurity — see IMP-01 | Remove or re-label as MODELED with its basis |
| `VINTAGE_CONFLICT` | Two competing vintages of the "same" figure (e.g. 2024-FY vs 2025 full-year). | Fenced vintages, never averaged | Fence or drop one; score each on its own facts |
| `UNLABELED_MOCK` | Demonstration data shown without its label. | Relabel immediately | Every mock wears MODELED, normal size |
| `UNKNOWN_AS_PASS` | An UNKNOWN counted as PASS. | UNKNOWN is never PASS — see IMP-05 | Re-score honestly |

### 1.7 Rendering — the surface itself

| Code | Meaning | Honest surface | Recovery |
|---|---|---|---|
| `BLEED` | Content escapes its container (large system fonts, narrow viewports). | Visible breakage | Fluid/shrink-to-fit type; verify at 2× font, 390×844 |
| `BROKEN_ASSET` | An image/asset referenced but missing (met: `/story` → `/conscious-cosmos.png`, absent project-wide). | Broken image — visible | Add the asset or remove the reference; never a silent hole |
| `DEAD_LINK` | A link to a route that does not exist. | 404 / dead end | Prerender the route or remove the link |
| `ORPHANED_ROUTE` | A route with no way to reach it (or no way back). | Dead end in a flow | Wire it into the flow or retire it |
| `MIDWORD_WRAP` | Display type breaking mid-word, orphaned letters (met: WHERE → "WHER|E"). | Visible | One line per word; fluid sizing at every viewport |

---

## PART 2 — IMPURITY TAXONOMY

An impurity is anything on the website that **claims more than its evidence can
support** — David's laws are the impurity definitions. Each entry: definition,
how to detect it, severity, the honest correction.

**Severity:** P0 — the site is lying or broken; fix before anything else.
P1 — the site misleads by omission or softness; fix in the same pass.
P2 — the site is rough but honest; backlog it.

| ID | Impurity | Definition | Detection | Severity | Honest correction |
|---|---|---|---|---|---|
| IMP-01 | Measured-but-modeled | A figure presented as measured when it is modeled. | Every figure must trace to a measurement or wear MODELED. | P0 | Re-label MODELED with its basis, or remove |
| IMP-02 | Receipt without answer | A receipt shown when nothing real answered. | Every SEE/receipt must trace to a real response. | P0 | Replace with the honest HOLE/QUEUED state |
| IMP-03 | Decorative control | A control that looks functional but does nothing. | Every visible field must function; click everything. | P0 | Make it work or remove it |
| IMP-04 | Unlabeled mock | Demonstration data shown without its label. | Scan for numbers without REPORTED/MODELED/UNKNOWN. | P0 | Label it, normal size, no fine print |
| IMP-05 | UNKNOWN as PASS | An UNKNOWN counted as PASS. | UNKNOWN is never PASS — check every verdict input. | P0 | Re-score; UNKNOWN stays UNKNOWN |
| IMP-06 | Deployment without receipt | Claiming deployment/hosting without a verified receipt. | Every "live" claim needs an opened, tested URL. | P0 | Verify live or retract the claim |
| IMP-07 | Bleed | Content escaping its container at large fonts / small screens. | Test 390×844 at 2× system font. | P1 | Fluid/shrink-to-fit type |
| IMP-08 | Dead end | A flow that strands the visitor with no way forward or back. | Walk every flow end to end. | P1 | Wire the path or retire the branch |
| IMP-09 | Stale as current | Old content presented as current. | Date every claim; check against now. | P1 | Date it, update it, or fence it as archive |
| IMP-10 | Unkeepable promise | A promise the system cannot keep (e.g. cross-site passkey). | Every promise traced to a mechanism that exists. | P1 | Keep the promise honest or unmake it |
| IMP-11 | Silent failure | An error swallowed — nothing shown, nothing logged. | Every catch must surface or ledger. | P1 | Surface it; DEAD-letters are shown, never silent |
| IMP-12 | Placeholder as real | A placeholder (handle, key, figure) shown as if real. | `dc.unity.id` appears nowhere in `src/` outside tests — keep it that way. | P0 | UNBOUND states, never fake values |

---

## PART 3 — ENGINEERING PRINCIPLES FOR JUDGING NEW IDEAS

When a new idea spawns, DCLM holds it against these — in this order. An idea
that fails an early principle does not reach the later ones.

1. **Design-verdict-before-implementation.** Below the Unity ID there is
   exactly one law. No non-trivial code before a DCLM + Iris + Twain² design
   verdict. Predicted verdicts are labeled `origin: predicted` and never
   presented as sealed.
2. **The law floor.** `TRUTH_OR_NOTHING · NO_FORCE · HOST_SAFE · CLEANUP_FIRST`
   — rules no side can change. An idea that breaks the floor is not an idea;
   it is a violation.
3. **Idempotency.** Never do the same thing twice. Claim-hash keyed, end to
   end: no duplicate binds, no duplicate deliveries, no double-counted
   figures.
4. **Fail-closed.** On doubt, on mismatch, on silence: reject, queue, or hold —
   never proceed on assumption. A wrong key is REJECTED, not retried into
   acceptance.
5. **Honest states over comfortable ones.** A HOLE shown is worth more than a
   SEE faked. QUEUED beats "sent". UNBOUND beats a placeholder handle.
   UNKNOWN beats a guessed PASS.
6. **No invented figures.** Every number traces to a measurement or wears its
   MODELED label with its basis. Competing vintages are fenced, never
   averaged.
7. **The stranger's-hands test.** The thing must work for a stranger's hands,
   not just its author's: first-visit clarity, no tribal knowledge, every
   opportunity to join given and none hidden — omnipresent, pressing nowhere.
8. **Cleanup first.** Leave no orphaned route, no dead letter unshown, no
   timer unarmed, no queue unpumped. What the idea starts, the idea finishes
   or visibly hands off.

---

## APPENDIX A — MACHINE-READABLE ERROR CODES (for Iris's deterministic gates)

```yaml
# DCLM error codes v1 — exact strings as used in src/dccp/pipe/ and src/routes/
# Iris gates match on these verbatim. New codes are added only with first-seen evidence.
transport: [UNREACHABLE, TIMEOUT, CORS_BLOCKED, MALFORMED, NON_JSON, NETWORK]
kernel: [KERNEL_UNAVAILABLE, NO_ENDPOINT, NO_BINDING, NO_PINNED_KEY, BAD_RESPONSE,
         REFERENCE_MISMATCH, MINT_REJECTED, NOT_ED, INVALID_DESIGN_VERDICT, UNPRICED_DECISION]
crypto: [PIN_MISMATCH, PIN_INVALID, BAD_SIGNATURE, EXPIRED_KEY, UNKNOWN_KEY]
daemon: [QUEUED, DUPLICATE_DELIVERY, STRANDED_RETRY, DEAD, QUEUE_CORRUPT]
wallet: [UNBOUND, NO_KEY, LOCKED]
data: [INVENTED_FIGURE, VINTAGE_CONFLICT, UNLABELED_MOCK, UNKNOWN_AS_PASS]
rendering: [BLEED, BROKEN_ASSET, DEAD_LINK, ORPHANED_ROUTE, MIDWORD_WRAP]
honest_states: [HOLE, QUEUED, UNBOUND, DROPPED, REJECTED, DEAD, SEALED, SEE]
# Rule: a receipt (SEALED/SEE) exists only on a real answer. Everything else is honest.
```

---

## APPENDIX B — FIRST DEMONSTRATION: AUDIT OF CURRENT SURFACES (2026-10-04)

*Method: dccp-world routes audited directly from source (`src/routes/`,
`src/dccp/pipe/`); the MAIN philosophical site artifact audited read-only from
its verified build report and David's own screenshot (its builder was
mid-edit — no writes, no interference). Findings go to David's backlog.*

### Impurities found

| # | Location | Impurity | Severity | Status |
|---|---|---|---|---|
| 1 | MAIN site — WHERE headline | `MIDWORD_WRAP` — "WHERE" breaks mid-word ("WHER\|E"), E orphaned on its own line (David's screenshot, 2026-10-04) | P1 | **In fix** — sent to the running builder as David's nitpick |
| 2 | dccp-world `/story` | `BROKEN_ASSET` — references `/conscious-cosmos.png`, which exists nowhere in the project; broken on production too, not IPFS-caused | P1 | **Backlog** — add the asset or remove the reference |
| 3 | dccp-world ladder UI | Stale framing — tier names still geographic (Cosmic/Planet/Country/City/Human) after the Bot World HUD stripped geography | P2 | **Backlog** — flagged, not changed (deeper geo.ts/ladder surgery; needs its own verdict) |
| 4 | MAIN site threshold (bind/access) | Potential `IMP-10` (unkeepable promise) risk — watched, not found: the threshold is **honestly labeled as an unbound preview** with UNBOUND/HOLE states; no fake binds, no fake receipts. A fabrication gate bounced one builder submit mid-build. | — | **Clean** — the honesty held under pressure |

### Impurities NOT found (verified absent)

- No seed phrases, mnemonics, or recovery phrases anywhere in the wallet flow (searched) — the wallet UX law already satisfied.
- `dc.unity.id` appears nowhere in `src/` outside tests — no placeholder-as-real (IMP-12).
- All connector transmissions go through `src/dccp/pipe/connector.ts` — no parallel authority path (the old direct-`fetch` `/bind` POST in `fatherBind.ts` was deleted).
- Daemon: no fake receipts — QUEUED while dark, SEALED only on verified countersignature; the ephemeral binding stays LIVE on HOLE (`expires: on_receipt` restored).
- Frozen surfaces intact: web3d-hud 52/52 hash-verified; MAIN site frozen pages (landing, Fractals 01–06, RTE Desk, Doctrine) untouched — links only.

### Standing watch items (not impurities — honest empties)

- Swarm orbits are deliberately honest-empty ("NO TASKS BOUND") awaiting ephemeral-manifest/ledger plumbing (`setSwarms()` hook).
- Kernel unreachable everywhere — every HOLE honest; the same code paths light up when David's machine answers.
- IPFS draft pinned; final pin + IPNS held for the unified build (daemon + site workstreams landing).
