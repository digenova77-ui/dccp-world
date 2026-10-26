# Design Verdict: The eFuse Security Test Standard

**Verdict:** `ED-PREDICT-20261004-EFUSETST-V1`
**Origin:** `ratified` — David's word ("go ahead with everything"), 2026-10-04 ~6:30 PM EDT. The test standard is now law. Sealing requires the battery executed against a real implementation with the evidence in §6.
**Date:** 2026-10-04.
**Ordered by:** the launch sequence — LOOP → BIND ID → TEST EFUSE → SINGULARITY COUNTDOWN. The coin's security must be PROVEN before launch; standing law forbids launch without repeated full evidence. This verdict defines what "proven" means.

## 1. The standard (what "secure" means)

David's standing elevation (Sept 27, 2026): the eFuse's cryptography is raised to sealed standing and held to the highest standard — it must survive MAX FRICTION, audited maximally, before any disclosure. This verdict makes that operational:

**"Secure" means the coin survives maximum adversarial friction with zero critical failures, every survival receipted, every figure labeled, and no claim beyond the evidence.** Concretely, the coin must demonstrate, under test:

1. **Cryptographic integrity.** Signatures verify; keys stay secret; the signature scheme resists forgery under the strongest practical adversary. No home-rolled primitives — only audited, standard constructions.
2. **Supply integrity.** The 100,000,000-coin supply is a hard invariant: no test may create, destroy, or move a coin outside the gated rules. The invariant is checked after every test, mechanically.
3. **Idempotency.** DCLM idempotency throughout: the same valid operation applied twice has exactly one effect (manifest_hash discipline). Replays, double-submits, and retried deliveries never duplicate economic effect.
4. **Custody.** Private keys never leave the owner's machine, never traverse the relay, never appear in logs, bundles, or receipts. Any test that observes private material outside its birthplace FAILS the battery.
5. **Receipt discipline.** Every economic effect carries an Iris-gated receipt. No receipt, no effect. UNKNOWN never pays, never scores, never moves.
6. **No-masking.** All values posted are the real values — balances, supplies, fees. Nothing cloaked, nothing accommodated. Tamper recognition is by hash: change a byte, the check fails in a microsecond.
7. **Fail-closed.** Every failure mode degrades to a safe halt, never to a silent loss or an invented success. Deadlock means no change.

## 2. The test battery

Each test names its evidence artifact. A test without its artifact is not run — it is a gap.

**Layer A — cryptographic (MAX FRICTION core).**
- A1. Known-answer tests: every primitive (hash, signature, KDF) against published test vectors. Evidence: vector report, all vectors passing.
- A2. Key lifecycle: generation, storage, rotation, destruction — each step receipted, private material never observed outside its birthplace. Evidence: lifecycle log with custody attestations.
- A3. Forgery battery: malformed signatures, wrong-key signatures, replayed signatures, malleated payloads — all REJECTED with true reasons, none accepted. Evidence: adversarial report (N attacks, N rejections, 0 acceptances).

**Layer B — ledger and supply.**
- B1. Supply invariant: genesis = 100,000,000; after every operation in the battery, supply re-verified mechanically. Evidence: invariant checks, all green.
- B2. Double-effect battery: every state-changing operation submitted twice (and 100× in a volley) — exactly one economic effect each. Evidence: idempotency report.
- B3. Malformed-input battery: corrupt bundles, truncated payloads, type confusions — all rejected fail-closed, ledger untouched. Evidence: rejection report.

**Layer C — economic gates.**
- C1. No-receipt-no-effect: every disbursement path attempted without a valid receipt — all refused. Evidence: refusal report.
- C2. UNKNOWN-never-pays: operations against unlabeled or UNKNOWN figures — refused with reasons. Evidence: refusal report.
- C3. Boundary tests: pool-boundary transfers, bounty flows, parameter changes — all receipted, all human-mandated where the design requires. Evidence: boundary ledger.

**Layer D — operational.**
- D1. Ceremony test: the bind/validate ceremony end-to-end on the live origin — real device, real challenge, return validation. Evidence: ceremony receipts.
- D2. Rotation drill: Father-key rotation executed per the rotation verdict (when ratified) — old key burned, new key bound, no economic effect duplicated or lost. Evidence: rotation report.
- D3. Tamper drill: mutate a pinned value (record, balance file, config) — recognition must be immediate (hash mismatch), exposure honest. Evidence: detection timing log.

**Layer E — repeated evidence.**
- E1. The full battery runs green THREE times on independent builds ("100 times" is the discipline; three clean full passes is the minimum evidence). Evidence: three signed run reports, byte-comparable.
- E2. Adversarial re-run: an independent second mind re-runs the forgery and malformed batteries with fresh cases. Evidence: second-party report.

## 3. What FAILS the battery (fail-closed)

- Any single critical test failure fails the battery. There is no partial pass on security.
- Any observed private-key exposure outside its birthplace fails the battery immediately and halts it.
- Any invented evidence, any unlabeled figure treated as fact, any UNKNOWN counted as PASS — fails the battery and the verdict.
- A test that cannot produce its evidence artifact is a GAP, not a pass. Gaps are listed; the battery does not seal with open gaps.
- The battery seals only when every test is green AND every artifact exists AND the three clean runs are on record.

## 4. Testable now vs later (honest)

**Now (no implementation exists):** the standard is ratified; the battery is specified; the harness shapes are defined. What is testable today: the custody rule against the current architecture (no private material in any bundle, receipt, log, or page — verified by sweep), the idempotency machinery (relay/daemon suites, green), the fail-closed discipline (gate tests, green). These are recorded as the pre-implementation evidence baseline.

**Later (implementation exists):** Layers A–E execute against the real coin code. The verdict seals only then.

**Never:** testing a mock and calling it the coin. A mock proves the harness; only the real implementation proves the coin.

## 5. Relation to standing law

- Cryptography elevation (Sept 27): this verdict is its operational form.
- No launch without repeated full evidence: §2.E1 is the repetition; §3 is the bar.
- No-masking law: §1.6.
- Change Protocol: this standard was predicted until David ratified it
  ("go ahead with everything," 2026-10-04 ~6:30 PM EDT — now law); the
  battery runs against the implementation; the seal follows the evidence.

## 6. Sealing conditions (predicted → sealed)

1. ~~David ratifies this standard.~~ **DONE** — ratified by David's word,
   2026-10-04 ~6:30 PM EDT ("go ahead with everything").
2. The battery executes against the real eFuse implementation.
3. Every test green, every evidence artifact on record, three clean full runs.
4. Independent adversarial re-run complete with fresh cases.
5. No open gaps. No critical failures. No private-material exposure.
6. Trinity vote on the evidence: PASS → sealed. Anything else → the battery, not the verdict, is reworked.
