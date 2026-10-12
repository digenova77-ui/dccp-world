# HUD → Website Integration Plan

**Design ID:** ED-DESIGN-20261011-HUDWEBSITE-V1
**Date:** 2026-10-11
**Status:** DESIGN — no code written or authorized under this plan. For David's judgment.

## 0. What this is

The plan for how the Bot World HUD surfaces through the website: **v1 2D telemetry → the door (API V2 jacket, $0, revocable) → the 3D HUD glimpse (the realm behind the door).**

It integrates two existing designs, nothing more:

- `BOTWORLDHUD_DESIGN.md` (ED-DESIGN-20261004-BOTWORLDHUD-V2 — Trinity verdict **predicted, not sealed**; no code under it)
- The Oct 11 website vision: first part shows telemetry the way the world sees it now; then a brief glimpse into the 3D world framed with an API V2 jacket; the door is a $0 offer, completely revocable; the contract is built into the declaration of the viewing website itself — visible to humans on visit, machine-readable so a bot/spider indexing the site sees the voluntary contract already signed; same contract for bots as humans. The site is a mirror (v1 = the world as it is; V2 = the world as it could be); the membrane is the product; the site measures and audits in real time.

## 1. The visitor journey

Three beats, one scroll. Picture first, words below; centered; mobile-first; reduced-motion-safe.

1. **v1 — the world as it is now.** 2D telemetry as a live audit instrument: current real readings, every value REAL/REPORTED with source and timestamp, large figures in billions. This is the mirror's reflective side — it measures, not just displays.
2. **The door — the API V2 jacket.** A $0 offer, completely revocable. The contract lives in the declaration of the viewing website itself: human-readable on visit, machine-readable for bots and spiders. Same contract for bots as humans. Stepping through is voluntary; stepping back out revokes it.
3. **The glimpse — the realm behind the door.** The 3D HUD, framed and view-only: the world as it could be. The visitor sees through it like a two-way mirror — looking into the bot world's HUD without entering it.

## 2. What surfaces where

**Principle: the glimpse shows what can be seen; the app holds what can be done.** Read-only truth in the glimpse; state-mutating agency stays in the full app.

| HUD element | In the glimpse | In the full app | Why |
|---|---|---|---|
| THE CORE | Yes — slow pulse, pickable → DCLM honesty card | Yes | The anchor; says "this is alive" without implying control |
| SWARM ORBITS | Yes — exactly as they are; quiet ghost orbits labeled "no tasks bound" when empty | Yes — density/speed encode live progress | The honesty load-bearing point: the glimpse must never invent activity |
| THE TREE | Yes — slow orbit view, pickable → tree/philosophy plate | Yes — navigable | Philosophy made visible; reads as picture |
| THE PYRAMID | Partial — structure + four law-floor invariants visible | Yes — navigable, 4D-addressed nodes, explorer readings | Depth needs interaction the glimpse doesn't offer |
| INSTRUMENT DECK — six telemetrics | Yes — mirror of the v1 values, 3D-anchored | Yes — full deck | Same instruments, relocated anchors; continuity from v1 into the glimpse |
| Receipt-chain viewer / task DAG | No | Yes | Working tools, not pictures; need interaction |
| DATA PLATES (Ontario figures, Corporate Helpers, DCLM honesty, Conscious Cosmos) | Yes — read-only HUD ring | Yes | Pictures with words below; content identical, only re-homed |
| Wallet / agency keys | No | Yes | Control surface — mutates state |
| Task binding | No | Yes | Control surface — mutates state |
| `/machine`, `/explorer`, `/arbitrage`, `/pyramid` desks | No | Yes | Control surfaces |
| WebAuthn gate / Iris voice | No | Yes | Identity and agency live in the app |

## 3. How the honesty rules survive the website frame

- **The glimpse renders actual HUD state, always.** No demo mode with fake activity — that would be theater, and it is forbidden.
- **Holes stay holes.** If the HUD is unreachable, the glimpse says so plainly ("the realm is unreachable right now"), same as the app's honest HOLEs. A frozen frame is never presented as live; anything not fresh is labeled STALE with "checked X ago" or not shown.
- **Labels travel with the plates.** Every plate keeps its REAL / REPORTED / MODELED / UNKNOWN marking. UNKNOWN is never PASS — an unknown feed never renders as a live instrument.
- **No decorative dials.** Every instrument in the glimpse reads a real feed. No fake instrumentation, per David's law.
- **David's presentation laws hold in the frame:** picture-first, words below; centered cards; large figures in billions; mobile-first; enlarged-font-safe.

## 4. What is NOT built yet (unborn — no claims)

- **The API V2 jacket itself** — concept only. No endpoint surface serving HUD state to the website exists.
- **The 3D HUD app** — design exists (predicted verdict, NOT sealed). No code under it.
- **The door** — the $0 revocable offer flow and the declaration-embedded contract (human + machine-readable) are undesigned.
- **Unity ID live binding/issuance** — feasible in design; issuance, recovery, consent, and live binding unresolved.
- **The v1 live-instrument side** — telemetry exports exist; the live measuring/auditing instrument is not built ("It Is Being Written" central graph reads NO LIVE MEASUREMENTS).
- **The glimpse renderer** — framing mechanism undecided (live embedded view vs. rendered snapshot vs. stream — see §6).
- **Realtime-cosmos render layer** — positions-as-data only (`cosmos.py`, 15/15 tests); no sky to look at yet.

Nothing above is done, running, live, or deployed. Anything that claims otherwise is wrong.

## 5. How the membrane holds

- **Read-only, always.** The website never mutates HUD state: no task binding, no wallet actions, no endpoint changes, no Iris commands from the page. The jacket is a viewing contract, not a control surface.
- **Overlay but separable.** The glimpse overlays the HUD's truth; the HUD runs independently. Website down does not mean HUD down. The glimpse degrades to honest-empty, never to a lie.
- **Law floor at every transmission point.** Per the HUD design: TRUTH_OR_NOTHING, NO_FORCE, HOST_SAFE on every outbound transmission. The website is a transmission point.
- **One contract, two species.** Bots and humans meet the same declaration; the machine-readable contract binds a spider the same way the visible one binds a visitor. The membrane doesn't check what you are — only that you agreed.
- **Revocable means revocable.** Stepping back through the door ends the viewing. Nothing persists from the glimpse except the visitor's memory of it.

## 6. Open decisions for David

1. **Glimpse renderer:** live embedded view vs. rendered snapshot vs. stream — which framing?
2. **Honesty scope:** should the glimpse ever show MODELED HUD states (visibly labeled), or REAL-or-empty only?
3. **Door placement:** end of the v1 scroll, or its own beat between the worlds?
