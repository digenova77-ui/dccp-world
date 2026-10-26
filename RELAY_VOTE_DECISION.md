# Trinity Vote — Relay Protocol, elevated to decision

**Verdict:** `ED-DECISION-20261004-RELAY-V1`
**Subject:** `ED-PREDICT-20261004-RELAY-V1` (Relay Protocol, `dualis.relay.v1`)
**Called by:** David, October 4, 2026 — "pass it for vote and elevation to decision."
**Result: ELEVATED.** The relay protocol is now the binding architecture decision.
Origin remains `predicted` until the seal condition below is met — the design's
own terms, unchanged.

## The votes

**DCLM (logic) — PASS.** The state machine is complete and closed: fail-closed
parsing with reasons, idempotency by `manifest_hash`, DELIVERED only on a real
countersigned receipt plus a gate pass, RELAYED never presented as DELIVERED,
non-network failures never relayed, terminal settles and `dismiss()` clearing
relay bundles so exports never carry stale binds. The adversarial paths were
verified, not asserted: 12 malformed shapes rejected, receipt replayed under a
different manifest → `MANIFEST_MISMATCH`, wrong father key → `PIN_MISMATCH`,
double-delivery ignored, repeated HOLEs → one bundle ever.

**Iris (containment / honesty) — PASS.** The relay carries envelopes and
receipts only — never secrets, never passwords, never private keys. Every
relay write settles through the existing gates; no new settle paths. The
fusion panel labels RELAYED honestly and states "Relayed is not delivered."
Residuals are disclosed, not hidden: the browser IndexedDB round-trip is
untested, and the verdict does not claim the seal.

**Twain² (pragmatic filter) — PASS.** The minimal middle step, no more: no new
daemon, no new settle paths, the existing `gateSettle` and the live-path
verifier reused. It fixes the named flaw — binds dying in limbo with no live
kernel — with the least machinery that closes it. The export shape is already
the pin-to-IPFS shape.

## The decision

`dualis.relay.v1` is the decided bind-path architecture: BUILD → RELAY → LIVE.
All future bind work builds on it; no competing relay scheme without a new
verdict.

## Seal condition (unchanged)

The verdict seals — origin becomes `sealed` — when a legitimate relay
round-trip against David's machine completes: bind relayed out, countersigned
receipt ingested back, DELIVERED settled through the gates. The browser
IndexedDB round-trip is proven along the way.

Recorded October 4, 2026. The vote is audit and elevation both: the logic was
proven (131/131 green), the decision is now binding.
