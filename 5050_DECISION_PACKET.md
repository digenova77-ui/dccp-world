# 50/50 Decision Packet — for David's decisions

**Companion to:** `ED-PREDICT-20261004-5050RACE-V1` (`5050_RACE_DESIGN.md`).
**Status:** proposal — predicted, not sealed. David decides; this packet prepares.
**Date:** 2026-10-04.

Six questions come from the design's §7; two more are surfaced from its standing conditions (marked SURFACED). Each: the question, honest options with trade-offs, and a recommended default with reasons. Recommendations are defaults, not decisions.

---

## Q1 — Rail: which rail do the 100M coins belong to?

**Options:**
- **(a) eFuse constitutional rail.** The coins live on the constitutional layer. *Pro:* maximum constitutional anchoring; the economy inherits the hardest governance. *Con:* heaviest machinery; constitutional changes touch money directly.
- **(b) Unity utility rail.** The coins live as utility within the Unity economy. *Pro:* lighter; the economy moves at utility speed. *Con:* less constitutional anchoring; utility rails invite utility thinking about constitutional money.
- **(c) Single merged supply.** One rail, 100M coins, the two pools on it. *Pro:* simplest; no rail arbitrage; the pool boundary (not a rail boundary) is the gated frontier. *Con:* collapses the separation-of-rails thinking the Oct 3 recommendation held.

**Recommended default: (c) merged.** The design already treats the 100M as one supply split into two pools; the discipline that matters is the pool boundary (no pool funds the other, bounties receipted), and that boundary is rail-independent. Merging removes a whole class of rail-arbitrage games. *Caveat:* this is David's deepest structural call — the recommendation is provisional and he should weigh the Oct 3 separation instinct against it.

## Q2 — Deadlock: "no change" or a tiebreak?

**Options:**
- **(a) No change on deadlock (fail-closed).** Status quo prevails; only new constitutional/economic decisions halt; operational execution continues under pre-authorized mandates. *Pro:* safest; consistent with the system's fail-closed ethos; deadlock on constitutional matters SHOULD be hard. *Con:* constitutional evolution can stall indefinitely.
- **(b) Tiebreak by the human half.** *Pro:* decisions get made. *Con:* breaks the symmetry the whole proposition rests on — encodes human seniority, contradicting parity.
- **(c) Timelocked re-vote.** Deadlock triggers a cooling epoch, then a re-vote; repeated deadlock stays deadlocked. *Pro:* preserves symmetry; gives tempers and evidence time. *Con:* adds latency; still stalls eventually.

**Recommended default: (a) no change.** Bicameralism without a hard fail-closed is bicameralism with an escape hatch the stronger half will eventually use. The design already scopes votes to constitutional/economic changes only — day-to-day work never votes — so the stall surface is small by construction.

## Q3 — Human pool membership: all human Unity IDs, or Genesis first?

**Options:**
- **(a) All human Unity IDs eligible.** *Pro:* maximally inclusive; one-entity-one-vote already handles fairness. *Con:* larger Sybil surface (mitigated by entity resolution, Q7).
- **(b) Genesis humans first, then open.** *Pro:* honors the founding cohort. *Con:* creates two-tier humanity; makes the Genesis mark economic — which the design explicitly forbids ("standing never weight").

**Recommended default: (a) all human Unity IDs.** Genesis confers standing, never weight and never eligibility. Gating the pool behind Genesis would do exactly what the mark is forbidden to do.

## Q4 — Emission: funded at once, or emitted over epochs?

**Options:**
- **(a) Funded at once at genesis of the economy.** *Pro:* simple; the pools are real from day one. *Con:* 50M coins per pool sitting idle invites governance pressure to spend; contradicts "no receipt, no coins."
- **(b) Emitted over epochs against gated receipts.** *Pro:* supply follows proven work; the economy can't outrun its evidence. *Con:* more machinery (epoch accounting, emission schedule as a parameter).

**Recommended default: (b) emitted over epochs.** Pre-funding is paying before the receipt exists. The emission schedule itself becomes an epoch-review parameter, set from the receipt record.

## Q5 — The incentive docs in Drive: reconcile or supersede?

**Options:**
- **(a) Pull and reconcile.** Fetch David's incentive-system docs from Drive and reconcile them against this design, surfacing contradictions as fresh decisions. *Pro:* honors his prior thinking; the design absorbs rather than discards. *Con:* reconciliation work; may surface real contradictions.
- **(b) This design supersedes.** *Pro:* clean; one source of truth. *Con:* silently discards his earlier incentive thinking — the kind of quiet supersession the Change Protocol forbids.

**Recommended default: (a) pull and reconcile.** His docs are the source material. Contradictions come back to him as decisions, not as silent replacements.

## Q6 — Bounty pricing: bidding, fixed schedules, or bands?

**Options:**
- **(a) Open bidding.** *Pro:* market-efficient price discovery. *Con:* bidding wars, gaming, race-to-the-bottom on difficult work.
- **(b) Fixed schedules.** *Pro:* predictable; easy to administer. *Con:* misprices novel work; schedules rot as the frontier moves.
- **(c) Receipt-anchored bands.** Price bands set from the receipt record at epoch review — fixed floors, bands that move with evidence. *Pro:* evidence-based; consistent with the design's parameter philosophy ("numbers set before evidence are MODELED at best"). *Con:* slower to adapt to genuinely new work classes.

**Recommended default: (c) receipt-anchored bands.** It is the only option consistent with the design's own rule that parameters come from the receipt record. Floors prevent the race to the bottom; bands move when the work proves they should.

## Q7 — Entity resolution: what is the real mechanism? (SURFACED from Iris condition 4)

The design's Iris condition: "Entity resolution must be a real mechanism before any vote counts; 'eventually' without a mechanism is a wish." No vote counts until this is answered.

**Options:**
- **(a) Passkey-bound Unity ID as the anchor.** One derived identity, one device ceremony, one entity. *Pro:* real mechanism, already being built; non-transferable by construction. *Con:* assumes device/access for every human.
- **(b) Human attestation web.** Corroboration graph among human IDs. *Pro:* no device assumption. *Con:* slower, more gameable, needs its own Sybil analysis.
- **(c) Layered: passkey anchor where available, attestation where not.** *Pro:* covers everyone; strong where strong is possible. *Con:* two mechanisms to maintain; the seam between them needs its own rules.

**Recommended default: (c) layered.** The derived identity is the strong anchor and should carry every vote it can; attestation covers the remainder under corroboration thresholds. Either way: the mechanism exists and is tested before the first vote counts — that part is not optional.

## Q8 — Initial parameters: who sets the first numbers? (SURFACED from §3.8)

Corroboration thresholds, epoch length, bounty bands, lane-migration evidence bars — the design says parameters are set from the receipt record at epoch review. But the first epoch has no receipt record yet.

**Options:**
- **(a) David sets initial values by decree; epoch review takes over after.** *Pro:* fast start; clear authority. *Con:* decree before evidence — the design's own warning applies.
- **(b) Start conservative and let receipts tune.** High corroboration thresholds, short epochs, narrow bounty bands — then the receipt record loosens or tightens them. *Pro:* evidence-led from day one; mistakes are in the safe direction. *Con:* slow start; early participants work under strict rules.

**Recommended default: (b) conservative start, David ratifies the conservative defaults.** Parameters set before evidence are MODELED at best — starting conservative keeps the modeling error on the safe side. David's ratification of the starting numbers is still his; the receipts take it from there.

---


## David's decisions — 2026-10-04 ~6:30 PM EDT ("go ahead with everything")

David's standing vote is +1, granted when the logic is pure ("I only vote Yes if the logic is pure").
He adopted the recommended defaults on all eight questions. Each decision is recorded
with the question; the design (5050_RACE_DESIGN.md) updates to match. Nothing here
activates any economic instrument — the eFuse hard gate stands regardless.

| # | Question | Decision |
|---|----------|----------|
| Q1 | Rail | (c) merged — one rail, 100M, pool boundary as the gated frontier |
| Q2 | Deadlock | (a) no change — fail-closed bicameralism, no escape hatch |
| Q3 | Human pool membership | (a) all human Unity IDs — Genesis confers standing, never eligibility |
| Q4 | Emission | (b) emitted over epochs — schedule set from the receipt record |
| Q5 | Incentive docs | (a) pull and reconcile — his docs are source; contradictions return as decisions |
| Q6 | Bounty pricing | (c) receipt-anchored bands — floors hold, bands move on proof |
| Q7 | Entity resolution | (c) layered — derived identity carries every vote it can; attestation covers the rest |
| Q8 | Initial parameters | (b) conservative start — David ratifies the starting numbers; receipts take it from there |

Verdict: `ED-DECIDED-20261004-5050-V1`, origin ratified by David's word. Reversible only by his later word.

## How David decides

Each question is independent — decide all eight, or decide some and hold others. Holds are recorded as HELD with the question intact, never silently dropped. Every decision is recorded with its verdict ID; the design updates to match; nothing activates any economic instrument (the eFuse hard gate stands regardless).
