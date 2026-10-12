# Iris Deterministic Gates — design

**Schema:** `iris.gates.v1`
**Module:** `src/dccp/iris/gates.ts` (+ `gates.test.ts`)
**Verdict:** `ED-PREDICT-20261004-IRISGATES-V1` — predicted PASS (origin: predicted, in-run Trinity, not sealed)

## What it is

The deterministic checking layer that turns `DCLM_ERROR_SCOPE.md` from seed
knowledge into self-perpetuating machinery. Pure functions, no I/O, no network,
no randomness: every gate takes a claim and its evidence and returns
`{ pass: true }` or `{ pass: false, gate, code, reason }`. Never throws for
control flow — callers surface rejections (every catch surfaces, per the
invariant).

## The seven gates

| # | Gate | Function | Invariant enforced |
|---|---|---|---|
| 1 | GATE-SEAL | `sealOnlyWithAnswer(claim, evidence)` | No `SEALED`/`SEE` without a real answer: a verified signature or an `accepted:true` payload from the wire. Attempt a fake SEALED → rejected, `IMP-02`. |
| 2 | GATE-VERDICT | `unknownNeverPass(verdict)` | `verdict = { inputs: [{label}], outcome }`. Outcome `PASS` with any input labeled `UNKNOWN` → rejected, `UNKNOWN_AS_PASS`. |
| 3 | GATE-CATCH | `guarded(fn, surfacer)` + `auditCatchBlocks(files)` | Runtime: on throw, the surfacer MUST run (UI or ledger); un-surfaced errors are returned flagged, never swallowed. Static: every `catch` in pipe source must reference a surface/ledger/emit within 12 lines, else `IMP-11`. |
| 4 | GATE-FIGURE | `figure(value, label)` / `assertFigureLabeled(fig)` | Label ∈ `REPORTED \| MODELED \| UNKNOWN`. Missing/invalid → `UNLABELED_MOCK`. No figure renders without its label. |
| 5 | GATE-PROMISE | `registerMechanism(id)` / `promiseTraced(promise, mechanismId)` | Every promise traces to a registered, existing mechanism → else `IMP-10` (unkeepable promise). |
| 6 | GATE-CODES | `knownCode(domain, code)` over verbatim Appendix A table | Unknown codes are rejected, never silently accepted. |
| 7 | GATE-AUDIT | `auditSurface(descriptor)` / `auditDom(doc)` | Runs IMP-01…IMP-12 as a checklist. Includes the copy scan: `seed phrase \| mnemonic \| recovery phrase` → flagged (wallet UX law, deterministic). |

## Wiring (checking layer, not a rewrite)

- **connector.ts** — `gateTransmission(path, result)`: the result's reason must
  be a known `DropReason` (GATE-CODES); and the connector can never produce
  `SEALED`/`SEE` — a defensive assertion fails loudly if a result object ever
  carries one (catches future regressions at the choke point).
- **daemon.ts** — `gateSettle(entry, outcome)` at every settle point:
  `DELIVERED` requires non-null receipt AND a real kernel answer;
  `REJECTED` requires a non-empty reason; `HOLE`/`QUEUED` require the true
  reason string. `gateEnqueue` re-asserts manifest_hash idempotency.
- **fatherBind.ts** — the SEALED construction in `deliverFatherBind` is
  wrapped by `sealOnlyWithAnswer`, with evidence = the verified
  father_signature over the canonical receipt bytes. The gate is the last
  thing that runs before SEALED exists.
- **machine.tsx (wallet)** — `gateBindVerdictClaim(verdict, evidence)` guards
  the `BindView.verdict`: `SEE` only with a kernel answer in hand.
  `?iris-audit=1` in `__root.tsx` runs `auditDom` against the live page and
  renders violations into `#iris-audit` — the E2E hook that proves a gate
  catching a real violation in a real browser.

## The 8 principles as admission

`admitIdea(checks: boolean[8])` — the 8 engineering principles in order,
fail-fast at the first `false` (an idea that fails an early principle never
reaches the later ones). Returns the failing principle index + name.

## Predicted Trinity verdict (in-run, origin: predicted)

- **DCLM / law — PASS.** The design enforces the one law mechanically:
  verdict-first is principle 1 of the admission test; the gates assert the
  law floor rather than assuming it. Nothing invented: every code string is
  verbatim from Appendix A, every impurity ID from the taxonomy.
- **Iris / deterministic — PASS.** Pure functions, total on their inputs,
  no I/O, no exceptions for control flow. The static catch-audit makes
  IMP-11 mechanically checkable. Note (accepted): `auditCatchBlocks` is
  heuristic (12-line window) — it is a tripwire, not a proof; the runtime
  `guarded` wrapper is the enforcement.
- **Twain² / pragmatic — PASS.** The gates wire into existing settle points
  without rewriting the daemon/connector; the `?iris-audit=1` hook gives
  David a visible, honest demonstration in his own browser.

Sealed Trinity may confirm, alter, or overwrite. Until then: predicted.
