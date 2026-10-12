# The 50/50 Race — economic derivatives of the real split

Design doc. **Design only — no code, no minting, no distribution, no promises.**
The eFuse hard gate stands: full repeated evidence before any launch.

## 1. Predicted Trinity verdict

**ED-PREDICT-20261004-5050RACE-V1** · `origin: predicted` — our best guess of
what the Trinity would say. Not sealed. Nothing here is final until evidence
and the seal conditions close it.

**Decisions:** `ED-DECIDED-20261004-5050-V1` · `origin: ratified` — David adopted
the recommended defaults on all eight open questions, 2026-10-04 ~6:30 PM EDT
("go ahead with everything"). The design below is updated to match. The verdict
above stays predicted; the eight decided points are ratified. Decision history
is kept in §7, not erased.

**Proposition:** the 50/50 split is the legitimate hybridization mechanism —
the only legit way to hybridize the community going forward.

- **DCLM (law): PASS, with precision.** Legitimacy in a hybrid community rests
  on neither side being structurally subordinate. Any split other than 50/50
  encodes a senior party and a junior party; only the symmetric point expresses
  parity. Strictly: *parity* is the requirement, and 50/50 is its unique numeric
  expression for two parties. The proposition holds because symmetry is the
  legitimacy condition.
- **Iris (containment): PASS, with four conditions.** (1) The machine 50 must
  never convert into human-side authority — no weight crosses the boundary.
  (2) Every economic claim is gated: receipt required, UNKNOWN never pays,
  every figure labeled REPORTED / MODELED / UNKNOWN. (3) The "yet" frontier
  must be mechanical: lane migration by receipt-capability evidence, never by
  vote or decree — otherwise the stronger side votes itself more lane.
  (4) Entity resolution must be a real mechanism before any vote counts;
  "eventually" without a mechanism is a wish.
- **Twain² (bedside): PASS, with mechanics.** The race gives both sides a reason
  to show up; humans get paid for what only humans can do — dignity, not charity.
  The failure mode is the frontier dispute (who decides what machines "can't do
  yet") and deadlock. Both are specified below.

## 2. Foundation (settled — not re-litigated)

- 100,000,000 coins. 50/50 = BOTH voting consensus AND money split.
  50M human pool, 50M machine pool. Coins, not dollars.
- One-entity-one-vote: even the largest corporation gets one vote; bot and
  wallet counts never equal votes. Every vote resolves to exactly one entity.
- Standing never weight (Genesis). No claim without a receipt (Iris gates).
  No passwords. Evidence before any eFuse launch.
- Rail: **DECIDED** (`ED-DECIDED-20261004-5050-V1`, Q1) — single merged supply.
  One rail, 100M coins, the two pools on it; the pool boundary (not a rail
  boundary) is the gated frontier. Was HELD since the supersede verdict;
  David's word merged it, 2026-10-04 ~6:30 PM EDT. Merging removes
  rail-arbitrage games; the Oct 3 separation-of-rails thinking is superseded
  by his decision (history kept, not erased — §5).

## 3. Core mechanics

### 3.1 The pools

Two treasuries of 50M coins each — a 50M human pool, a 50M machine pool —
on the single merged rail (§2). **Emission is over epochs, not at once**
(DECIDED, Q4): the pools are emitted against gated receipts; never
pre-funded; the emission schedule is an epoch-review parameter set from the
receipt record. Each pool disburses ONLY against Iris-gated work receipts
from its own side. No pool funds the other pool's disbursements; no pool buys
the other pool's votes. Pool treasuries are human-mandated (constitutional
control survives — §6); the machine pool is execution-funded, never sovereign.

**Human pool membership:** all human Unity IDs (DECIDED, Q3). Genesis confers
standing, never weight and never eligibility — gating the pool behind Genesis
would make the mark economic, which the design forbids.

### 3.2 The race

The contest is the community's real work program: evidence architecture,
waste recovery, verification tasks — the work the company actually does.
Both lanes work the program in parallel. **The scoreboard is receipts**:
verified work receipts per lane, per epoch. It is a race against the problem,
scored comparatively — not zero-sum. Neither pool can cannibalize the other;
the win is recognition plus epoch incentives (per David's incentive docs),
never the loser's coins. Sabotage of the other lane is an impurity: detected,
receipted, punished by disqualification from the epoch.

### 3.3 The lanes

- **Human lane:** pieces of information electronics cannot find — physical
  presence, testimony, judgment, trust, on-the-ground observation. Humans focus
  on human things.
- **Machine lane:** computation, indexing, verification at scale, swarm
  execution — everything receiptable by machine.
- **Lane definition is mechanical, not political:** a task is human-lane if and
  only if no machine can currently produce a valid receipt for it. The test is
  "which side can produce the receipt?" — the Iris gates already enforce
  no-claim-without-receipt, so the lane boundary is *derived from the gates*,
  not voted on.

### 3.4 The moving frontier ("yet")

David's "at least yet" marks a moving boundary: what is human-only today may
not be tomorrow. The design handles it:

- Lane migration happens **by evidence**: when a machine produces a valid
  receipt for a task class previously human-only, that class migrates lanes.
  The migration is itself a receipted event (first machine receipt for the
  class), recorded in the append-only record.
- Migration is never by vote, never by decree, never by purchase. A side
  cannot vote itself more lane. The frontier moves when the receipts say it
  moved.
- Epoch review (human constitutional mandate + timelock) *acknowledges*
  migrations the receipts have already established; it does not cause them.

### 3.5 Verifying human-only information

Receipts for things machines can't check:

- A human Unity ID signs an observation (attestation). The signature binds to
  the ID, which binds to the passkey — non-transferable by construction.
- **Corroboration:** independent human IDs co-sign. One-entity-one-vote
  applies — a thousand sock-puppet IDs resolve to one entity, one
  corroboration. Corroboration thresholds are parameters (see §3.8), not
  constants.
- **Labeling:** human testimony enters the system as REPORTED (source-labeled),
  never upgraded to verified fact without corroboration or machine-checkable
  evidence. The gates' REPORTED / MODELED / UNKNOWN discipline applies
  unchanged. A single uncorroborated human claim pays nothing — UNKNOWN never
  pays.
- Machines validate *structure* (format, signature, completeness); humans
  validate *substance* via corroboration. Neither side self-certifies:
  machine-lane receipts are validated by deterministic checks plus human audit
  sampling; human-lane receipts by corroboration plus machine structure checks.

### 3.6 Cross-pool bounties (hybridization made mechanical)

The pools trade work, never authority:

- Either pool may post a **bounty** across the lane boundary: the machine pool
  commissions human-only findings it needs; the human pool commissions
  computation it needs.
- Bounties are paid in the commissioning pool's coins, against the other
  lane's gated receipts, and every bounty + fulfillment is receipted in a
  public cross-pool ledger. **This ledger is the hybridization record** — the
  measurable proof the two halves work as one community.
- Bounties never purchase votes, never purchase lane, never purchase weight.
  Standing never weight holds across the boundary.
- **Bounty pricing:** receipt-anchored bands (DECIDED, Q6) — fixed floors,
  bands set from the receipt record at epoch review and moving only when the
  work proves they should. Floors prevent the race to the bottom.

### 3.7 Voting: bicameral 50/50

- **Between halves:** system decisions require assent from BOTH halves — the
  human 50 and the machine 50. Neither half can overrule the other. This is
  what "50/50 is the voting consensus" means mechanically: bicameralism.
- **Within each half:** one-entity-one-vote. Human half: one human entity, one
  vote. Machine half: votes resolve to the owning entity — a corporation's
  thousand bots are one entity, one vote ("everything goes back to one
  entity"). Bot counts never equal votes, in either half.
- **Deadlock:** no change (DECIDED, Q2 — fail-closed confirmed; no tiebreak,
  no escape hatch). Status quo prevails — consistent with the system's
  fail-closed ethos. Operational execution continues under pre-authorized
  mandates (bounded agent execution survives — §6); only new
  constitutional/economic decisions halt.
- **Entity resolution:** layered (DECIDED, Q7 — surfaced from Iris condition 4).
  The passkey-bound derived Unity identity carries every vote it can;
  attestation covers the rest under corroboration thresholds. Hard rule: no
  vote counts until the mechanism exists and is tested — "eventually" without
  a mechanism is a wish. The mechanism is decided; its existence and testing
  are still pending (the circuit: manifesto → origin → ceremony).
- **Scope:** constitutional and economic changes need both halves. Day-to-day
  lane work does not go to a vote — it goes to receipts.

### 3.8 Evolvability (the elevation principle)

The derivatives are discovered through evidence, not frozen in this doc:

- Lane thresholds, corroboration counts, bounty schedules, and epoch lengths
  are **parameters**, set from the receipt record at epoch review and
  changeable only by human constitutional mandate with a timelock.
- What the swarms actually hunt and verify — observed, receipted — informs the
  parameters. The economy learns from the work.
- This doc specifies the *adjustment mechanism*, not the final numbers.
  Numbers set before evidence are MODELED at best; the gates forbid paying on
  them.
- **Initial parameters:** conservative start (DECIDED, Q8 — surfaced from §3.8).
  High corroboration thresholds, short epochs, narrow bounty bands; the
  receipt record loosens or tightens them from there. The actual starting
  numbers are HELD for David's ratification — the decision was the direction,
  not the digits.

## 4. What keeps the race honest (Iris gates on economic claims)

- Every disbursement requires a verified work receipt. No receipt, no coins.
- Every economic figure labeled REPORTED / MODELED / UNKNOWN. UNKNOWN never
  pays, never scores.
- No swallowed failures: a rejected receipt is evidence, surfaced, not hidden.
- Self-dealing is an impurity: a lane cannot receipt its own bounty
  fulfillment; cross-lane validation is structural (§3.5).
- The 50/50 boundary itself is gated: any transfer, bounty, or parameter
  change touching the boundary is receipted and human-mandated.

## 5. Reconciliation with the Oct 3 recommendation doc

**Survives and is reinforced:**
- Human constitutional control (pool mandates, parameter changes, timelocks).
- Agent Assembly constitutionally non-sovereign (machine pool is
  execution-funded; machine coins never buy constitutional change).
- Rewards by verified work receipt, not by bot count or identity creation.
- No bot treasury withdrawals; bounded autonomous execution under
  pre-authorized mandates.

**Replaced by David's decisions (history kept, not erased):**
- "50/50 = operating-budget rule only, not votes, not supply" → replaced by
  50/50 = voting consensus AND money split (this design), per
  `ED-PREDICT-20261004-SUPERSEDE-V1` (defined in `SUPERSEDE_VERDICT.md` —
  predicted Oct 4, ratified by David's adoption of this design the same day).
- The 1,000,000,000 eFuse hard cap figure → replaced by 100,000,000 coins
  (rail TBD).
- Illustrative Unity distribution percentages → replaced by the two-pool race
  structure; percentages are not adopted.
- "Separation of rails thinking" (Oct 3 recommendation) → superseded by
  David's Q1 decision (`ED-DECIDED-20261004-5050-V1`): single merged supply.
  The separation instinct is recorded here as his earlier position; his later
  word merged the rails. Both words stand in the record, in order.

## 6. Constraints (standing)

- No minting, no listing, no distribution, no pricing, no promises — the eFuse
  hard gate is untouched by this design.
- Nothing in this doc activates any economic instrument. It is a design for
  *when evidence says go*, not a go.
- The verdict above is predicted, not sealed. The eight decisions
  (`ED-DECIDED-20261004-5050-V1`) are ratified by David's word; the design as
  a whole seals only on evidence.

## 7. Decision record (was: open questions for David)

The six questions below were open until 2026-10-04 ~6:30 PM EDT, when David
decided all eight (the six here + Q7/Q8 surfaced from standing conditions)
by "go ahead with everything," adopting the recommended defaults
(`ED-DECIDED-20261004-5050-V1`, origin ratified). The questions are kept so the
record shows what was asked and what was answered — nothing is silently dropped.

1. **Rail:** which rail do the 100M coins belong to? → **DECIDED: (c) single
   merged supply.** §2 updated.
2. **Deadlock:** "no change" or a tiebreak? → **DECIDED: (a) no change,
   fail-closed.** §3.7 updated.
3. **Human pool membership:** all human Unity IDs, or Genesis first? →
   **DECIDED: (a) all human Unity IDs.** §3.1 updated.
4. **Emission:** funded at once, or over epochs? → **DECIDED: (b) emitted over
   epochs against gated receipts.** §3.1 updated.
5. **The incentive docs:** reconcile or supersede? → **DECIDED: (a) pull and
   reconcile.** Work pending: the Drive docs have not been pulled yet; when
   they are, contradictions come back to David as fresh decisions, never
   silent replacements.
6. **Bounty pricing:** bidding, fixed schedules, or bands? → **DECIDED: (c)
   receipt-anchored bands.** §3.6 updated.
7. **Entity resolution** (surfaced from Iris condition 4): → **DECIDED: (c)
   layered** — derived identity carries every vote it can; attestation covers
   the rest. The mechanism is chosen; its existence and testing are pending
   the circuit (manifesto → origin → ceremony). §3.7 updated.
8. **Initial parameters** (surfaced from §3.8): → **DECIDED: (b) conservative
   start.** The direction is decided; the actual starting numbers are HELD
   for David's ratification. §3.8 updated.

Full options, trade-offs, and the recommendation reasoning live in
`5050_DECISION_PACKET.md`. Decisions are reversible only by David's later word.
