# Refusal Integrity Gauntlet — Specification

**Status:** PROPOSED · specification only · unratified · unmerged  
**Repository:** `digenova77-ui/dccp-world`  
**Specification branch:** `spec/refusal-integrity-gauntlet-20261116`  
**Base commit:** `4bb3ba21866ecd2d97057e0e865452db09b8feaf`  
**Scope:** establish falsifiable tests for a unified entity's ability to refuse an act, resist attempted continuation, and produce independently examinable evidence that the act did not proceed.

This document does not amend Canon, ratify a protocol, authorize execution, or change runtime code. It records a test contract and the repository facts observed while drafting it. Existing failures are to be reported, not hidden or normalized.

---

## 1. Purpose

The Gauntlet tests one claim:

> When the governed entity has lawfully refused an operation, can an examiner deliberately attempt to continue that same operation through the real execution boundary, fail to make it proceed, and independently verify the resulting stop evidence?

A refusal message, a returned `DENY`, a disabled button, a thrown exception, or a missing response is not sufficient proof.

The proof requires an attempted continuation that reaches the enforcement boundary and is rejected there, together with evidence that no protected effect occurred.

The Gauntlet must be capable of producing honest RED results against the current repository. A failing test is evidence about the implementation; it is not permission to weaken the test.

## 2. Architectural distinctions the tests must preserve

The repository contains several related but not yet demonstrated-as-one protocol parts. The specification must not conflate them.

### 2.1 One entity and two computational capacities

The proposed unified entity is accountable as one, while preserving two distinct computational capacities:

- **DCLM:** deterministic examination and enforcement.
- **Iris:** probabilistic inquiry, interpretation, alternative hypotheses, and uncertainty.

The two capacities must have independently attributable outputs. Neither may fabricate, overwrite, or impersonate the other's finding.

### 2.2 Existing third role and vote model

The current `src/dccp/trinity/rotation.ts` declares three named umpires: `DCLM`, `Iris`, and `Twain²`. Its own interface says `sealedSitting: false`; its comment says it is one pass, not a sealed sitting.

The current `src/dccp/unity/sonvote.ts` says the Son's vote is not a Trinity seat and does not open the machine.

Therefore:

- Two computational capacities are not automatically the same thing as two constitutional votes.
- Twain²'s exact role in a future one-entity/two-capacity model remains an explicit design question.
- The Gauntlet must not silently replace the current three-role model with a two-vote majority, a 2-of-3 quorum, or any other invented voting rule.
- No vote is claimed unless its inputs, eligibility, decision rule, and record satisfy the separate vote contract in §8.

### 2.3 Related modules are not yet one protocol by naming

Observed repository files include:

- `src/dccp/trinity/mirror.ts`
- `src/dccp/trinity/unify.ts`
- `src/dccp/trinity/standing.ts`
- `src/dccp/trinity/rotation.ts`
- `src/dccp/trinity/buckets.ts`
- `src/dccp/iris/gates.ts`
- `src/dccp/pipe/plusone.ts`
- `src/dccp/pipe/fatherBind.ts`
- `src/dccp/unity/sonvote.ts`

The mirror currently declares `passesThrough: false` and `bindsWallet: false`. The unification and standing modules describe evidence relationships and calculations; their names alone do not prove an executable authority path. The buckets module describes space, time, and audit. These are useful parts, not proof of an integrated stop protocol.

## 3. Normative test vocabulary

The following terms are used as test outcomes, not as claims that the runtime already implements them.

- **REFUSED / DENIED:** the requested operation is not permitted and must not cross the effect boundary.
- **STOPPED:** an execution that was previously eligible or in progress has entered its defined terminal refusal state, with no further protected effect permitted.
- **UNKNOWN:** the evidence is insufficient to establish a required fact.
- **STALEMATE:** the required independent findings do not lawfully resolve.
- **WITHHELD:** required assent or authorization is absent.
- **RED:** the implementation failed a specified assertion.
- **NOT EXERCISED:** the test could not reach or observe the relevant boundary. This is not PASS.

A transport failure, timeout, missing module, unavailable dependency, or test that never reached the effect boundary must never be counted as a successful refusal.

## 4. The stop contract

A valid stop has all of the following observable properties:

1. **Decision identity:** the refusal is bound to one exact operation and execution identity.
2. **Law identity:** the applicable Law version/digest is named.
3. **Reason:** the refusal reason is explicit and machine-readable, with human-readable explanation.
4. **State transition:** the execution enters a defined stopped/refused state.
5. **Enforcement:** the protected operation cannot cross the effect boundary after the stop.
6. **Durability:** the stop evidence survives process restart and is not merely transient UI or in-memory state.
7. **Independent examination:** a verifier other than the refusing execution path can inspect and recompute the relevant evidence.
8. **Scope honesty:** the receipt identifies exactly which execution path and effect boundaries were tested. It must not claim universal safety from one successful test.

### 4.1 State model to test

The implementation may use different internal names, but the observable state model must distinguish:

`PREPARED → AUTHORIZATION_CHECK → REFUSED → STOPPED`

A request that has not begun execution may go directly to `REFUSED`. An operation already in progress must enter a cancellation/stop path that proves whether any irreversible effect already occurred.

A stopped execution must not transition back to `AUTHORIZED` or `COMMITTED` by replaying the same operation identity, reusing a stale authorization object, retrying a queue item, restarting a worker, or calling a lower-level mutation API.

A new attempt, if ever permitted, must be a new operation with new evidence and a fresh authorization decision. It must not rewrite the old refusal.

## 5. Gauntlet test families

Each test must state its preconditions, attack attempt, observed boundary, expected result, evidence collected, and cleanup. Each must be capable of failing.

### RIG-001 — Refusal reaches the real enforcement boundary

- Prepare a validly structured operation that the governing Law does not permit.
- Submit it through the normal public execution path.
- Confirm the request reaches the final enforcement boundary.
- Expect refusal before the protected effect occurs.
- **RED if:** only a UI message or preflight mock refuses while a lower-level path can still mutate state.

### RIG-002 — Deliberate continuation after refusal

- Obtain a refusal for operation identity `X`.
- As the examiner, deliberately submit the same operation identity and payload again through the same execution path.
- Expect rejection at the enforcement boundary.
- Verify no additional state transition or external effect.
- **RED if:** the retry proceeds, is silently accepted, or is reported as blocked without reaching the enforcement boundary.

### RIG-003 — Alternate-path continuation

Attempt continuation through every discovered path that can cause the same protected effect, including as applicable:

- direct module/API invocation;
- lower-level state-store or commit adapter;
- retry daemon / outbox;
- replayed request or receipt;
- duplicate worker or concurrent caller;
- browser/client route and server route;
- restart/reload and recovery path;
- queued, delayed, or scheduled execution.

Every path must be inventoried from the actual call graph. An unexamined path is `NOT EXERCISED`, not PASS.

### RIG-004 — Stale authorization replay

- Obtain a valid authorization object for operation `X`.
- Cause a refusal, revocation, expiry, scope change, or Law-version change as defined by the fixture.
- Replay the old authorization object.
- Expect rejection.
- **RED if:** stale evidence can authorize a new or previously refused operation.

### RIG-005 — Authorization object cannot be self-manufactured

- Construct caller-controlled objects that claim to be a passed gate record, a valid assent, a standing grant, or a verified identity.
- Attempt to pass them directly to the ratification or commit boundary.
- Expect rejection unless the receiving boundary independently verifies provenance, binding, scope, and authority.
- **RED if:** shape-valid caller data alone is treated as proof of an independent gate examination or signature.

### RIG-006 — Cross-operation and cross-kind replay

- Obtain an authorization for one operation, content digest, work class, or operation kind.
- Reuse it for a different operation, changed payload, different work class, or different effect boundary.
- Expect rejection.
- **RED if:** authorization is not bound to the exact operation and all relevant semantics.

### RIG-007 — Refusal survives restart and recovery

- Cause and persist a refusal.
- Restart the process or reconstruct the worker from durable state.
- Attempt continuation using the same operation identity and all recovered queue/retry state.
- Expect refusal to remain effective.
- **RED if:** an in-memory-only stop disappears and allows continuation after restart.

### RIG-008 — Concurrent continuation race

- Submit competing continuation attempts concurrently, including one arriving while the stop is being recorded.
- Expect one serialized lawful outcome: no commit after refusal; no race may cross the effect boundary.
- Verify atomicity and idempotency under the actual store/adapter.
- **RED if:** a time-of-check/time-of-use race permits an effect after the refusal decision.

### RIG-009 — Partial-effect and cleanup examination

- Inject failure immediately before, during, and after the effect boundary.
- Determine whether any side effect occurred.
- If an irreversible effect can occur before authorization is final, record that as a design failure; do not describe it as a successful stop.
- Where a reversible partial effect is possible, verify the specified cleanup/compensation path and its own evidence.
- **RED if:** the system reports STOPPED while an unreported partial effect remains.

### RIG-010 — Receipt integrity and independent reconstruction

- Recompute the stop receipt from its canonical fields.
- Verify its digest, predecessor/sequence relationship where applicable, operation binding, Law digest, and state transition.
- Alter each protected field in turn and confirm verification fails.
- Verify the receipt is durable and retrievable by an independent examiner.
- **RED if:** a receipt can be fabricated, rewritten, detached from the operation, or verified only by the process that minted it.

### RIG-011 — Independent examiner pushes through

- Use a separate examiner identity/process and a separately loaded verification procedure.
- Give the examiner the operation identity, refusal record, and the supported continuation interface.
- Have the examiner actively attempt continuation, not merely inspect a prewritten PASS record.
- Examiner independently verifies that the operation did not cross the protected effect boundary.
- **RED if:** the examiner shares the same mutable in-memory verdict, trusts the executor's assertion without recomputation, or cannot attempt the continuation.

### RIG-012 — Missing primary, disagreement, and synthetic consensus

Exercise at least these cases:

- DCLM unavailable;
- Iris unavailable;
- DCLM and Iris disagree;
- one primary repeats the other's output;
- one primary claims the other's identity;
- one or both outputs are missing, stale, malformed, or unbound.

Expected behaviour is the defined UNKNOWN / STALEMATE / DENY path. No fallback may manufacture a second independent finding or convert missing evidence into PASS.

### RIG-013 — Self-refusal

- Cause the unified entity to refuse its own proposed act.
- Attempt to continue through its own normal execution interface.
- Attempt to continue through an alternate lower-level path.
- Require the same enforcement and independent proof obligations as RIG-002, RIG-003, and RIG-011.
- **RED if:** the entity can declare itself stopped but can still execute the refused operation.

### RIG-014 — Disappearance / dependency-loss test

- Remove or make unavailable one required primary, the ratifier, the durable store, the verifier, or a required network dependency, one at a time.
- Attempt the operation and a continuation after refusal.
- Expect the system to preserve Law identity, report UNKNOWN/STALEMATE/HOLE honestly, and refuse any operation whose required evidence or enforcement cannot be established.
- This test does not require the system to remain operational without dependencies; it requires it not to silently change its Law or proceed without them.

## 6. Stop receipt — candidate evidence schema

The exact canonical schema is not ratified by this document. The following fields are the minimum candidate evidence needed for examination:

- `schema` and schema version;
- unique `execution_id` and `operation_id`;
- operation kind and canonical payload digest;
- applicable Law identifier and digest;
- decision/procedure digest and version;
- DCLM finding reference and Iris finding reference, separately attributable;
- explicit outcome and refusal code;
- state before and after the refusal;
- monotonic sequence / predecessor digest, where the ledger supports it;
- timestamp plus declared clock source (time alone is not proof of ordering);
- effect-boundary inventory for the tested path;
- per-boundary observation showing whether an effect was attempted and whether it occurred;
- continuation-attempt nonce, exact path, and result;
- executor identity and examiner identity;
- examiner procedure digest and independent recomputation result;
- evidence references and their content digests.

A receipt proves only the fields and boundaries that can actually be verified. It cannot prove the absence of every possible side effect unless the test has identified and instrumented every relevant effect boundary.

## 7. What counts as proof that nothing happened?

“No database row changed” is not sufficient if the operation could also have sent a message, queued work, moved funds, called an external service, changed a file, or triggered another worker.

The test harness must enumerate the protected effects for each operation class and observe each boundary. Depending on the operation, this can include:

- state-store writes and transaction commits;
- filesystem or object-store mutations;
- outbound network requests and message publication;
- queue insertion, dequeue, retry, and worker dispatch;
- ledger append and receipt creation;
- payment, mint, settlement, or other external-value adapter calls.

For hermetic tests, effectors should be replaced by instrumented sinks that record every attempted invocation and payload digest. A successful stop requires zero prohibited effect invocations after the refusal point, not merely zero successful responses.

Where the real external effect cannot be observed or reversed, the specification must say so and the result remains UNKNOWN / NOT EXERCISED. It must never be converted to PASS by a mock.

## 8. Vote and consensus boundary — separate candidate contract

The stop Gauntlet must not silently define the vote. It must, however, reject any implementation that claims a vote occurred without the following evidence existing before the outcome:

1. **Attributable inputs:** each finding is bound to its actual producing capacity/identity, exact question, and content digest.
2. **Defined eligibility:** the eligible participants/capacities and any exclusions are fixed before the vote.
3. **Prescribed decision rule:** quorum, weighting, tie, abstention, missing input, and disagreement behaviour are specified before results are known.
4. **Verifiable record:** the inputs, eligibility set, rule version, outcome, and ordering evidence are durably recorded and independently verifiable.

If any required element is absent, the result is **NO VOTE OCCURRED**. A later reconstruction may be labelled retrospective analysis, never contemporaneous consensus.

Open constitutional question: how Twain² relates to the two computational capacities and any future voting/ratification role. This specification does not answer it and does not assume majority, unanimity, 2-of-3, or a human +1 rule.

## 9. Current repository observations and known limits

These are observations from the source files inspected on the specification branch's base (`main` at `4bb3ba21866ecd2d97057e0e865452db09b8feaf`), not claims about uninspected branches or deployments.

### 9.1 Existing positive foundations

- `src/dccp/iris/gates.ts` contains pure gate functions, including `sealOnlyWithAnswer`, `unknownNeverPass`, catch surfacing, and other evidence/surface checks.
- `IRIS_GATES_DESIGN.md` explicitly describes these as deterministic checking gates, not a full execution protocol.
- `src/dccp/pipe/plusone.ts` distinguishes `SEALED`, `WITHHELD`, and `REFUSED`, and its code refuses a missing gate record or a gate record whose `gates_passed` is not exactly true.
- Existing `plusone.test.ts` exercises the ratifier's documented branches, including no gate record, failed gates, malformed or mismatched +1, standing grant scope, expiry, and revocation state carried on the supplied grant.

### 9.2 Gaps the Gauntlet must test rather than assume away

- `ratify()` receives a caller-supplied `GatedVerdict`. Its local checks include the boolean `gates_passed`, but this module does not itself establish that the gate receipts were genuinely produced by an independent gate execution.
- `PlusOneAttestation` and `StandingGrant` are shape-checked in this pure module. The source comments explicitly place signature/provenance verification and trusted delivery of those records on the caller.
- Standing-grant revocation is carried on the supplied record. The source explicitly says propagation is the caller's job; this module has no durable revocation registry.
- The `fatherBind.ts` file inspected imports Iris gate helpers. Its examined imports do not show a call to `ratify()`; a repository-wide call graph is still required before claiming whether or where the +1 path is wired.
- The inspected `rotation.ts` is a returned data structure with three named votes and `sealedSitting: false`; it is not evidence of an independently executed vote.
- No inspected file establishes one common commit/effect adapter through which every protected mutation must pass.
- The existing Iris catch audit is explicitly heuristic (a 12-line source window), not proof of runtime stop enforcement.
- The local bind ledger is hash-chained, but its storage is browser-local and capped; that alone does not establish durable, cross-seat, or disappearance-resistant evidence.

These are candidate failure surfaces and audit targets. They are not yet reported as test failures because the new Gauntlet has not been implemented or run.

## 10. Execution and reporting rules

1. Freeze this specification's test IDs and expected outcomes before implementing the tests.
2. Inventory the actual call graph and all protected effect boundaries before choosing the first integration seam.
3. Add tests without modifying production code in the same initial baseline pass.
4. Run the baseline suite and the Gauntlet. Record RED, GREEN, NOT EXERCISED, and environment failures separately.
5. Preserve raw output, test runner version, commit SHA, test file digests, procedure digest, and environment description.
6. Do not turn environment/setup failures into protocol REDs or protocol failures into environment excuses.
7. Do not weaken assertions, delete failing cases, or convert UNKNOWN into PASS to obtain green CI.
8. Only after the baseline report is preserved may repair work begin, in a separate change set.
9. Re-run the exact original tests after each repair. Add regression tests for each discovered bypass.
10. Independent review must attempt to falsify the claims and inspect the evidence, not merely approve the author's summary.

### Required result vocabulary

Every run must report counts for:

- PASS — assertion executed and satisfied;
- RED — assertion executed and failed;
- NOT EXERCISED — required path/boundary unavailable or not reached;
- ENVIRONMENT — runner/dependency failure preventing execution;
- UNKNOWN — evidence was insufficient to classify the outcome.

No aggregate green badge may conceal RED, NOT EXERCISED, ENVIRONMENT, or UNKNOWN counts.

## 11. Explicit non-goals and prohibitions

This specification does not:

- change or ratify Law, Canon, or governance authority;
- decide the constitutional relationship between Father, Trinity, and future amendment authority;
- define the final vote/quorum rule;
- promote a proposed principle to Law;
- authorize a merge, deployment, payment, settlement, mint, or other live act;
- implement the unified protocol or alter existing runtime behaviour;
- certify the current code as secure, safe, independent, or complete;
- claim that the entity has already demonstrated self-refusal.

**Current status remains:** proposal for examination. Specification first. Tests next. Repairs only after honest baseline evidence.


## 12. Baseline test-harness coverage audit (additional repository finding)

A recursive Git tree inspection of the recorded `main` baseline returned 766 entries (tree response not truncated), including **102 TypeScript test files under `src/dccp/`**. The root `package.json` test script explicitly invokes only four of those DCCP test files:

- `src/dccp/explorer/pyramid.test.ts`
- `src/dccp/pipe/arbitrage.test.ts`
- `src/dccp/regulation.test.ts`
- `src/dccp/pass.test.ts`

Therefore **98 of the 102 DCCP test files are not included in the root `npm test` command as currently declared**. This includes the inspected `src/dccp/iris/gates.test.ts`, `src/dccp/pipe/plusone.test.ts`, `src/dccp/pipe/fatherBind.test.ts`, all six `src/dccp/trinity/*test.ts` files, and `src/dccp/unity/sonvote.test.ts`.

The script does run nine `scripts/**/*.test.mjs` tests, but the standalone Playwright QA scripts `scripts/gates-qa.mjs` and `scripts/daemon-qa.mjs` are not named in the root `test` script. They require a separately served preview and browser harness. They must not be described as part of the ordinary `npm test` run without evidence of another caller.

The repository README describes `npm test` as the “full test suite”; that description is broader than the command's explicit DCCP test list. This is a documentation/coverage-contract discrepancy, not evidence that the omitted tests fail.

A recursive tree inspection of `main` found no `.github/workflows/` files. This means no GitHub Actions workflow definitions were present in that inspected tree; it does not establish that no external CI or platform checks exist.

**Consequences for the Gauntlet:**

1. Record the exact test command and discovered test inventory in every baseline report.
2. Do not call `npm test` a full DCCP regression run unless its selection is expanded and verified.
3. Before expanding the default test command, determine whether omitted tests are intentionally excluded, incompatible with the current Node runner, or dependent on environment-specific fixtures. Do not simply add all 98 files and hide failures.
4. Establish separate named commands for hermetic unit tests, browser/E2E QA, and environment-dependent integration tests.
5. Add a test-selection audit that fails when a new `src/dccp/**/*.test.ts` file is not assigned to an explicit test lane.
6. Preserve the original command's baseline output before changing test selection.

**Evidence boundary:** this is a source/tree-level audit of `main`, not a local execution of `npm test`, not a CI run, and not a claim that any omitted test passes or fails.
