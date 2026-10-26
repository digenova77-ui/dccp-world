# GENESIS — the early adopter mark · design

Protocol: `dualis.genesis.v1`. Verdict: **ED-PREDICT-20261004-GENESIS-V1** (origin: predicted, in-run).

## David's words (the brief, verbatim in spirit)

- Not dependent on anybody's money. One person counts as exactly one person.
- Early is the whole point. Free to sign up; he is not selling anything.
- Reward faith in something obscure, unpopular, unhyped, unsold.
- Extension: "bots have the same offer." Bot Unity IDs bound before the Father
  fuse derive the identical Genesis attestation. One identity = one identity:
  no human privilege, no bot privilege.

## The mark

A Genesis attestation is **derived from the Unity ID at bind time**:

- `mark = sha256('dualis|genesis|v1|' + unity_id)` — deterministic. The same ID
  always yields the same mark: **one per ID by construction**.
- **Non-transferable by construction**: the mark is bound to the unity_id, and
  the unity_id is bound to the passkey that only its holder's authenticator can
  wield. There is nothing to hand to someone else.
- **Non-purchasable**: no price exists anywhere in the protocol. The mark is a
  pure function of identity + time, and neither is for sale.
- **Identity-agnostic**: the protocol takes only `(unity_id, bound_at)`. It
  cannot tell a human ID from a bot ID and has no field for the distinction.
  The swarm's earliest workers stand in the genesis record alongside the
  earliest humans, under the identical terms.

**Genesis test** (the whole rule, one line):

> `genesis ⇔ bound_at < father_fuse_time`

- No fuse recorded yet → the cohort is **open**: every bound ID is
  genesis-bound (it believed before any proof existed).
- Fuse recorded → IDs with `bound_at` earlier than the fuse are genesis; IDs
  bound later are full Unity IDs with no mark (nothing missing — the mark is
  standing, not a missing feature).
- The fuse-close is an **event, not a number**: the first SEALED Father bind
  records the kernel receipt's `bound_at` as `father_fuse_time`. First fuse
  wins; the cohort never reopens.

## The genesis record (ledger)

Append-only, hash-chained, same pattern as the Father bind ledger:

- Entry: `{ seq, prev_hash, entry_hash, unity_id, bound_at, mark, at }`.
- Keyed idempotent by `unity_id`: re-attesting an ID returns its existing
  entry. The record can never hold the same ID twice.
- Tamper-evident: `verifyGenesisLedger()` re-chains every entry; a break is
  reported, never presented as verified.
- The mark's truth never depends on the ledger (it depends on the timestamps);
  the ledger is the **standing record** — who believed, in what order.

## Standing, never weight

The mark confers: a permanent place in the genesis record, priority in future
pilots/seats, recognition at the eFuse moment. It confers **no coins, no
votes, no weight, no rank**. Because standing ≠ weight, a thousand bot IDs
cannot concentrate power — **the Sybil concern dissolves by construction**.
This is deliberate, not incidental, and the code carries no privilege fields
that a future change could quietly weight.

## Surface

Calm, dignified, never hypey. On the bound-identity surfaces:

- Cohort open: `GENESIS · cohort open — bound before the fuse`
- Cohort closed, genesis: `GENESIS · bound before the Father fuse`
- Cohort closed, later ID: no mark shown (a full Unity ID; nothing is missing)

## What the mark is not

- Not a password, not a secret, not a credential. (No-password law: untouched.)
- Not a seed phrase or mnemonic. (Wallet law: untouched.)
- Not a claim of kernel truth: pre-fuse, the mark is a witnessed local claim;
  the kernel countersignature of the genesis root at/after the fuse is the
  future seal — noted, not faked.

## Predicted Trinity verdict (in-run, origin: predicted)

- **DCLM / law — PASS.** The one law is satisfied (this design before code).
  Law floor: TRUTH_OR_NOTHING (the mark is a pure function of real timestamps;
  pre/post-fuse states labeled honestly), NO_FORCE, HOST_SAFE, CLEANUP_FIRST.
  No invented figures, no fake receipts, no passwords, no mnemonics.
- **Iris / deterministic — PASS.** Deterministic derivation, idempotent
  issuance, hash-chained record, identity-agnostic inputs, zero privilege
  fields. The Sybil-dissolves argument is structural, not promissory.
- **Twain² / pragmatic — PASS.** Serves David's intent exactly: faith
  rewarded, free entry, one-person-one-person, bots equal, event-based close.
  Surface is calm, not hypey.

**ED-PREDICT-20261004-GENESIS-V1 — predicted PASS.** The sealed Trinity may
confirm, alter, or overwrite.
