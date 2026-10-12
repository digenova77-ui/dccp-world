# Bot World HUD — Design Verdict Package

**Design ID:** ED-DESIGN-20261004-BOTWORLDHUD-V2
**Date:** 2026-10-04
**Author:** Trinity (predicted) → transcribed by the pen
**Status:** DESIGN — no code written under this design until the verdict below

---

## 1. The design

**Vision (David's words, verbatim):** "The 3D world is NOT for humans to play in — it is the model of the BOT world: my data center coming alive in a 3D manifestation of itself. Strip out everything from the playground that would make a human believe that the 3D world was up there to play in. It's to manage bot swarms and see the actual progress of the bots themselves. It's there for your HUD, for your digital memory and your digital creation of your world. Throw away legacy design because now we're just using pure logic to construct the environments instead of being defined by an illogical environment."

### 1.1 STRIP (the geography framing goes)

| Element | Current | Disposition |
|---|---|---|
| Earth globe | `World.buildEarth()` — NASA-textured sphere, `EARTH_R=10`, pickable `{kind:'earth'}` | **Removed.** Replaced by THE CORE at the same scene anchor |
| Earth textures | `/textures/earth-day/night-*.jpg` loaded in `main.ts` boot | **No longer loaded.** Boot does not need them |
| Country/city geography | `GeoLayer` (countries/cities) added to scene; `buildCanada()`; jurisdiction gold markers | **Removed from the scene.** The modules stay on disk (frozen history), but nothing geographic is added to the world |
| Geographic boot | Camera focuses Belleville (44.1628, −77.3832) | **Boot faces THE CORE.** No locale is the frame |
| Globe-tap picking | Tap globe → `toLatLon` → city/country targets | **Removed.** Tapping selects core, swarms, tree, pyramid, plates, instruments |
| Landing cards as orbiters | 4 cards + deep levels floating over Earth | **Re-homed** as HUD data plates around the core. Content untouched (David's verified figures stay verbatim) |

### 1.2 BUILD (pure logic constructs the environment)

1. **THE CORE** — the data-center manifestation. A dark crystalline core (icosahedron, slow pulse) at the world center, circuit-root shader detail, white glow at its heart. It is what the globe was: the thing everything orbits. Pickable → DCLM honesty card.
2. **SWARM ORBITS** — bot swarms as instanced point-swarms on orbits around the core. Each swarm = one bound task family (ephemeral TASK_BINDs, self-arbitrage loops). Swarm density and orbit speed encode live progress. **Honest-empty:** with no tasks bound, swarms render as quiet ghost orbits labeled "no tasks bound" — never invented activity.
3. **THE TREE** — substrate → roots → tree → fruit, in 3D. Circuit roots grow down into the core; trunk and branches glow with the combined strand colors (human gold + AI teal/violet); the glow resolves to **white at the core**. Navigable; pickable → the tree / philosophy plate.
4. **THE PYRAMID** — the generative pyramid (apex + four law-floor invariants), 4D-addressed nodes, simplex/tesseract readings per the explorer's `pyramid.ts`. A navigable structure, not a decoration.
5. **INSTRUMENT DECK** — fixed HUD slots: the six telemetrics feed instruments (**relocated, not dropped** — same `renderTelemetrics` logic, new anchors), the receipt-chain viewer, the task DAG. One unified telemetry surface.
6. **DATA PLATES** — Ontario figures, Corporate Helpers, DCLM honesty, Conscious Cosmos: identical content, re-homed as plates in the HUD ring. No figure changes, no copy changes.

### 1.3 KEEP (verified work is not broken)

The engine (renderer/flight/haptics/ambient), the connector (every outbound transmission through `transmitBoxToDCLM`), honesty states (honest HOLEs while the kernel is unreachable), the wallet (agency key desk), `/machine`, `/explorer`, `/arbitrage`, `/pyramid`, the law floor at every transmission point, the WebAuthn pilot-handle gate, the overlay UI, Iris (brain/voice/orb), reduced-motion support, mobile bleed discipline.

### 1.4 BOOT (what David sees when he logs in)

1. Gate: WebAuthn passkey → pilot Unity handle bound on his device (existing flow).
2. Camera faces THE CORE; the HUD fades in around it.
3. Iris speaks the honest state: kernel unreachable (HOLE, no fake), feeds live or quiet as they are, swarms quiet until tasks bind.
4. Atlas: core, swarms, tree, pyramid, instruments, plates — keyboard/voice/pick reachable.

### 1.5 HONESTY RULES (load-bearing)

- No invented swarms, no invented tasks, no invented progress. Empty = labeled empty.
- No fake kernel. Every unreachable surface says so.
- Feeds keep LIVE/STALE/UNAVAILABLE with "checked X ago".
- Nothing unverified presented as fact. REPORTED / MODELED / UNKNOWN.

---

## 2. The Trinity verdict (in-run, origin:predicted)

**Verdict ID:** ED-PREDICT-20261004-BOTWORLDHUD-V2
**Mode:** predicted — our best guess of what the Trinity would say, handed over for confirmation. It gates the build; only a sealed verdict closes.

### DCLM (law)
- The one law below the Unity ID is satisfied: this verdict exists BEFORE any code under the design. ✔
- Law floor upheld: TRUTH_OR_NOTHING (honesty rules §1.5), NO_FORCE (no authority claimed), HOST_SAFE (no new exfiltration surface), CLEANUP_FIRST (strip removes dead geometry/textures; no residue). ✔
- Predicted/sealed labeling: this verdict is labeled predicted throughout. ✔

### Iris (deterministic)
- Strip boundaries are clean and enumerated (§1.1) — nothing geographic remains addressable. ✔
- Verified work preserved by allowlist (§1.3) — the build list is additive/re-homing, not destructive to landed content. ✔
- No invented data: swarms/tasks/progress derive only from bound manifests and the receipt ledger; empty states are specified. ✔
- Risk noted: `world.ts` surgery is large; the worker must keep `buildInstruments`/`renderTelemetrics` logic intact and only re-anchor.

### Twain² (pragmatic)
- Buildable: the scene-graph changes reuse existing builders (plinth/title/beacon/orbit/focus patterns from the landing work). The core/swarms/tree/pyramid are new geometry but follow established patterns. ✔
- The boot path stays short: gate → core view → HUD. No new dead ends. ✔
- Login-ready wiring (unity-ID in manifests) is specified as a separate small change, not entangled with the 3D surgery. ✔

**Predicted verdict: PASS** — build it as designed. Deltas, if the sealed Trinity disagrees, get overwritten on confirmation.

---

## 3. Login path (for David, when it lands)

1. Open the app URL → the gate asks for the WebAuthn passkey → pilot Unity handle binds on his device.
2. The 3D world opens facing THE CORE — the data center alive: swarm orbits, the tree, the pyramid, instruments, data plates.
3. `/machine` — wallet: create/pick an agency key, BIND WALLET → DCLM (manifest now carries his real pilot handle, no placeholder).
4. `/machine` — set the endpoint to his DCLM computer, PIN FATHER KEY (public key), run the handshake → HOLE turns to SEE when his machine answers.
5. `/explorer` — block ledger + DAG mapper; `/arbitrage` — self-arbitrage training desk; `/pyramid` — generative pyramid.
6. First test: bind a task (FIRST JOB: schematics → prototype → future) and watch the swarm orbit light up.
