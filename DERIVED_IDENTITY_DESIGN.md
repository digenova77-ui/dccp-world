# Design Verdict: Derived Unity Identity

**Verdict:** `ED-PREDICT-20261004-DERIVEDID-V1`
**Origin:** `predicted` — not sealed. Nothing here is implemented. Sealing requires David's ratification plus the legitimate Father-key test.
**Date:** 2026-10-04.

## 1. The problem with the mint-new model

The current passkey flow mints a fresh random WebAuthn credential per origin (`user.id = random 16 bytes`). The identity is born from randomness at ceremony time. That models *a login*, not *the thing*: one Unity identity, derived from the one Father root, holding everywhere you go. David's critique stands: "the process of what we're doing is not logical compared to the item we're trying to model."

## 2. The derived model

The identity already exists. It is derived from the Father root:

- **Handle derivation:** `unity:` + first 32 hex chars of `SHA-256(Father SPKI public key)`. One-way, public, deterministic — the same pattern as Grok's `unity:pilot.` derivation, but rooted in the Father key instead of a fresh authenticator key.
- **What the ceremony becomes:** validation, not minting. The WebAuthn credential's `user.id` is the derived handle bytes. First run *binds a device authenticator to the existing identity*; every run after *validates the human against it* (`create()` once per device, `get()` thereafter). The fingerprint authorizes; it never invents.
- **"Minted off the Father root":** where a new credential is needed, it is minted *from* the existing private root's public half — derived, never random.

## 3. Law amendment (ratified — history kept)

The standing separation — "no Father-key concept in MAIN" — was amended:
the Father **public** key enters MAIN as the identity derivation root. The Father
**private** key never leaves David's machine, is never pasted, transmitted,
tunneled, or seen by any app, agent, or jacket. Only the public key is pinned
(existing `/machine` UI), and only the public handle crosses any boundary.

**Status:** this amendment was *proposed* in this document, then **ratified by
David's word**, 2026-10-04 (~6:2x PM EDT): "it's ratified as the binding law."
The verdict itself stays `origin: predicted` until the legitimate Father-key
test (§6) seals it — ratification authorizes, evidence seals.

## 4. What stays

- Passkey ceremony stays local (WebAuthn, no server, no network transmission).
- No passwords, no password-shaped input, no seed phrases — ever.
- Grok's six-reason failure taxonomy and exact FAILURE_SPEECH copy.
- Session-only rule for the static artifact (no localStorage/IndexedDB/cookie persistence of identity data).
- Trinity verdict jacket on all reporting (`origin: predicted`, never sealed).
- Iris gates untouched; every bind still settles through them.

## 5. Consequences

- **One root → one entity → one vote.** The derived model structurally enforces David's one-entity-one-vote law: one Father root yields exactly one Unity identity. Bot/wallet counts cannot multiply it.
- **Genesis ordering is natural:** the derived identity pre-exists the fuse; `genesis ⇔ bound_at < father_fuse_time` reads as the cohort recognizing identities that already existed.
- **"It holds everywhere you go":** the handle is origin-independent (derived from the key, not the hostname). `rp.id` still binds each *ceremony* to its origin per WebAuthn law, but the *identity* is one. This is the honest shape of the landing copy.
- **Elevation alignment:** one identity root is the prerequisite for the one-origin, one-pipeline natural path.

## 6. What would seal this

1. ~~David ratifies the law amendment (§3).~~ **DONE** — ratified by David's
   word, 2026-10-04 ("it's ratified as the binding law").
2. David pins the Father public key (private key never moves).
3. The legitimate Father-key test: derive the handle locally, bind one device authenticator, validate on return — all receipted, all gated.
4. A Trinity verdict upgrades this document from `predicted` to sealed.

## 7. Non-goals / hard stops

- The private key is never transmitted under any jacket, tunnel, or proposal. An offer to paste it is declined every time, including David's.
- No server-backed identity store. No centralized directory of handles.
- No second secret, no recovery phrase, no password-shaped fallback.
- This document changes no code. Implementation waits for ratification.
