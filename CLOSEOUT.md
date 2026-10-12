# DCCP World — Telemetrics close-out

**Date:** Oct 3, 2026
**Status:** Built, verified in a real browser, closed out. Working tree left in place (not re-zipped).

## Bot World HUD, Oct 4 2026 — the 3D world becomes the model of the bot world

David's directive: "The 3D world is NOT for humans to play in — it is the model of the BOT world: my data center coming alive in a 3D manifestation of itself... strip out everything from the playground that would make a human believe that the 3D world was up there to play in... throw away legacy design because now we're just using pure logic to construct the environments."

**Design verdict FIRST (the one law below the Unity ID):** `BOTWORLDHUD_DESIGN.md` — drafted before any code, then an in-run Trinity verdict (DCLM + Iris + Twain²): **ED-PREDICT-20261004-BOTWORLDHUD-V2, predicted PASS** (origin:predicted — gates the build; the sealed Trinity may overwrite deltas).

**Stripped (the geography framing):**
- `buildEarth()` → `buildCore()`; `/textures/earth-*.jpg` no longer loaded (zero earth-texture requests verified in-browser)
- `buildCanada()` removed; jurisdiction gold markers removed; `GeoLayer` (countries/cities) constructed but NOT added to the scene (module untouched on disk)
- `buildPillars()` detached (geography-bound lat/lon; method kept as frozen history, `setSector()` guards the empty map)
- Atlas: earth/city/country/jurisdiction/canada registrations removed; `toLatLon` globe-tap branch removed from `pickAt`; `homeFocus()` → `coreFocus()`; `goHome()` → `goCore()`
- Boot: camera faces the core — no locale is the frame
- Iris: geography voice targets retired — "Belleville"/"earth"/"globe" → "That view was retired — the world is the bot-world HUD now." (no guessed navigation)

**Built (pure logic constructs the environment):**
- **THE CORE** — dark crystalline icosahedron at the old globe anchor, teal circuit edge-glow, white glow at its heart, slow pulse (reduced-motion aware). Pickable → DCLM honesty card
- **SWARM ORBITS** — 3 instanced point-swarms (ephemeral binds / self-arbitrage loops / receipt chain) on tilted rings; honest-empty ("NO TASKS BOUND") until manifests flow — a `setSwarms()` hook is the future plumbing point
- **THE TREE** — circuit roots into the core (gold, white tips), gold trunk, teal/violet branches, white fruit-orbs: substrate → roots → tree → fruit
- **THE PYRAMID** — canonical per `explorer/pyramid.ts`: white apex octahedron (Unity ID, 4D origin), four tetrahedron corner stones with AXIS_NAMES + 4D coords
- **Quakes/ISS re-homed** as HUD instruments (data paths untouched); **landing cards re-homed** to a logical ring (content + David's figures verbatim); DCLM machine re-keyed so the core owns the canonical DCLM target

**Kept:** engine, connector (all outbound transmissions), honesty states, wallet, `/machine`, `/explorer`, `/arbitrage`, `/pyramid`, law floor, WebAuthn gate, overlay, Iris, sector tokens, estates, RTE root, pipe, instruments.

**Login-ready wiring (no placeholder left in the runtime flow):** `machine.tsx` + `arbitrage.tsx` + father-bind now read `storedHandle()?.handle` at mint time. Unbound → honest UNBOUND states (nothing minted, nothing transmitted). The moment David binds his passkey at the gate, every manifest carries his real pilot handle. `dc.unity.id` appears nowhere in `src/` outside tests.

**Also fixed:** `/arbitrage` React hydration error (localStorage read during initial render → moved to `useEffect`).

**Verification (Oct 4, real Chromium against real Nitro SSR 127.0.0.1:8082):** typecheck clean; build clean; **16/16 checks pass** — gate shows unbound; 3D canvas boots with world ready, 102 pickables, zero earth-texture requests; `/machine` renders + UNBOUND → bound handle after login + no placeholder; `/explorer` renders (9-block ledger, DAG); `/arbitrage` renders + UNBOUND → handle after login; `/pyramid` renders; mobile 390×844 no bleed; zero page errors. Frozen `web3d-hud` 52/52 hash-verified before/after — intact.

**Screenshots** (`screenshots/`): `hud-desktop-boot.png` (the core, swarm rings, HUD), `hud-machine-unbound.png`, `hud-machine-bound.png`, `hud-explorer.png`, `hud-arbitrage.png`, `hud-pyramid.png`, `hud-mobile-machine.png`.

**Residuals for David's eyes:**
1. The ladder UI still names the old geographic tiers (Cosmic/Planet/Country/City/Human) — renaming the tier system is deeper surgery on geo.ts/ladder/tier logic; flagged, not changed.
2. Swarm progress wiring: no task-manifest data reaches `World` yet — swarms are deliberately honest-empty; the `setSwarms()` hook awaits ephemeral-manifest/ledger plumbing.
3. Swarms/tree/pyramid/machine reuse target kind `'dclm'` with distinct keys (union-type block — new `TargetKind` members would need `brain.ts`/`cards.ts` cases).
4. Kernel still UNREACHABLE — every HOLE honest; the same code paths light up when his DCLM computer answers.
5. `goGeo`/country/city card paths in `main.ts` dormant but intact; `world.geo` math still used off-scene by `landOnPhone`/`flyGeo`/ladder.

**David's login path (when it lands):**
1. Open the app → gate → WebAuthn passkey → pilot Unity handle binds on his device
2. The 3D world opens facing THE CORE — swarm orbits, the tree, the pyramid, instruments, data plates
3. `/machine` → wallet: create/pick agency key → BIND WALLET → DCLM (manifest carries his real handle)
4. `/machine` → set endpoint to his DCLM computer → PIN FATHER KEY (public key only) → handshake → HOLE turns to SEE when his machine answers (BIND_TEST procedure in the protocol spec)
5. `/explorer` → block ledger + DAG mapper; `/arbitrage` → self-arbitrage desk; `/pyramid` → generative pyramid
6. First test: bind a task (FIRST JOB: schematics → prototype → future) and watch the swarm orbit light up

---

**Data refresh (post-QA, Oct 3, 2026 ~1:27 PM EDT):** `public/registry/corporate-helpers.json` refreshed from the sealed queue — **74 sealed** (United Airlines Holdings #74 added, verdict `ED-VERDICT-20260929-CORPHELPERS-UNITEDAIRLINES-V1`, 10 vectors, total 194, mean 19.40, revenue $57,063M); TD SYNNEX #73's scores recovered from the queue (9 vectors, total 178, mean 19.78) instead of staying null. New aggregates: **503 improvement vectors, mean of means 20.89, 53 of 74 carry scores**. The card derives every figure from the JSON (no hard-coded totals); rebuilt, re-served, and re-verified in-browser with zero errors (screenshot `desktop-corph-card-74.png`).

## Integration, Oct 4 2026 — 2D Machine Interface + internal connector

David's directive: one part of the domain is now the 2D website; everything integrates through the internal connector so the DCLM hosts its own 3D world; the only "app" is the crypto wallet; everything else runs inside DCLM, bound like a recurring fusion.

**What was built:**
- **New first-class route `/machine`** (`src/routes/machine.tsx`): the DCLM Machine Interface ported faithfully from `~/workspace/dclm-origin/playground/index.html` — protocol declaration (DCLM-MACHINE/2, DECLARED_NOT_VERIFIED), dual pipeline console (Pipe A claim / Pipe B fetch), agency key desk (the wallet), "How agencies communicate" table, "One ingress" flow, law-floor chips. Design, copy, and SEE/HOLE/WAIT visual language preserved. Styles in `src/dccp/styles/machine.css`, scoped under `.m2d` so nothing leaks into the 3D world.
- **One connector permeating everything:** PIPE TO DCLM transmits **only** through `src/dccp/pipe/connector.ts` (`transmitBoxToDCLM`, `TRINITY_MODE='Zero-Security-App'`, form-encoded `box` → `{endpoint}/compute`). No parallel ad-hoc fetch. The console's envelope was adapted to the connector's box format honestly: a compact dual-pipeline box (`{kind, v, claim, fetch}`) with a **live byte counter** (`n / 256 bytes`) so the 256-byte public ABI is visible before sending. Default endpoint is this origin's own `/api/v2` (the DCLM hosts its own world); the input stays editable for a future kernel ingress.
- **Honest receipts:** connector results map to the console's visual language — COMMITTED → SEE; DROPPED → HOLE with the true reason. `connector.ts` gained an optional `detail` on DROPPED carrying the server's reason string (backward compatible; existing tests still pass), so `KERNEL_UNAVAILABLE` from the transport-only `/api/v2/compute` router surfaces verbatim instead of a bare REJECTED.
- **Wallet untouched in spirit:** agency key desk creates ECDSA P-256 non-exportable browser CryptoKeys in IndexedDB (`dclm-agency-keyring`), shows only fingerprint + lifecycle, revocation is local. Keys never leave the browser. This is the only "app" surface.
- **Collision fix found in QA:** the 3D app's global `.panel{position:fixed}` was stacking the console's panels — fixed with explicit resets in `.m2d .panel` (position/static, display/block, width/auto). Also fixed an SSR hydration mismatch (endpoint default now set post-mount).
- **3D world untouched** — still boots over Belleville; nothing restyled.

**Verification (Oct 4, real Chromium):** `npm run typecheck` clean; `npm run build` clean; production chunk contains `renderTelemetrics`; `/machine` code-split into its own chunk (3D users don't download the console); connector tests 2/2 pass. Browser: `/machine` renders with title "DCLM Machine Interface"; PIPE TO DCLM → HOLE "KERNEL_UNAVAILABLE — the router answered; no kernel is mounted. Nothing was executed." via the internal connector; oversize envelope → honest HOLE "not sent"; wallet create → ACTIVE fingerprint row, revoke → REVOKED; mobile 390×844 no bleed (scrollWidth == innerWidth, 0 past-edge elements); 3D world boots over Belleville (Toronto/Ottawa/Montreal in view); zero page errors, zero hydration errors.

**Screenshots** (`screenshots/`): `machine-desktop-console.png`, `machine-desktop-wallet.png`, `machine-mobile-390x844.png`, `machine-check-world-boot.png`.

**Residuals:**
1. Kernel still UNREACHABLE — the console's HOLE states are truthful; when David's DCLM computer answers at a `/compute` endpoint, the same connector + console light up with no code change.
2. PROBE (`GET {endpoint}/health`) and FETCH FROM MACHINE (`GET {endpoint}/v2/protocol`) remain direct reads (not transmissions); against this origin's router they honestly HOLE (no health/protocol routes there) — the declared protocol panel carries the contract meanwhile.
3. The Python origin (`~/workspace/dclm-origin/dclm_origin.py`) speaks `/v2/dclm/ingest` (JSON), a different protocol from the connector's form-encoded `/compute` — it was not ported, per instructions; it remains the Manus-side reference.

## Deeper fusion, Oct 4 2026 — connector permeates everything, wallet as recurring fusion

David's directive: "build it deeper" — one fusion binding, everywhere; the wallet as the recurring fusion; DCLM hosts its own 3D world persistently; Law Floor visible at every transmission point.

**1. Transmission-path audit — every fetch/XHR in the app, dispositioned:**

| Path | Kind | Disposition |
|------|------|-------------|
| `/machine` PIPE TO DCLM | Outbound transmission to DCLM | **Through `transmitBoxToDCLM`** (unchanged from Integration) |
| `/machine` wallet bind (new) | Outbound session binding to DCLM | **Through `transmitBoxToDCLM`** — binding box `{kind:'wallet-bind', v:'2', authority:'NONE', law:[NO_FORCE,HOST_SAFE,CLEANUP_FIRST,TRUTH_OR_NOTHING], key_id, fingerprint, at}`, 256-byte ABI enforced by the connector |
| `/machine` PROBE (`/health`), FETCH FROM MACHINE (`/v2/protocol`) | Inbound observations (GET) | Kept direct — the connector is a POST box-transmit path; routing GET reads through it would be protocol theater. Honest HOLE when the router has no such route |
| `src/dccp/live/feeds.ts` → `/api/live?feed=…` (+ direct fallback) | Inbound observations (GET) | Kept — already origin-mediated via the same-origin `/api/live` proxy (the origin-daemon pattern). Observations are not transmissions; the proxy is the origin serving its own world |
| `src/dccp/live/wiki.ts` → Wikipedia API | Inbound observation (GET) | Kept direct — public source, not DCLM; disclosed per-agreement in the gate |
| `src/dccp/data/registry.ts`, `src/routes/story.tsx` → `/registry/*.json` | Static assets | Kept — the origin serving its own persistent output. This IS "DCLM hosts its own world" |
| `src/dccp/meter/unityclient.ts` → `/api/unity-wallet` (POST/GET JSON) | Origin-local wallet ledger ops | Kept direct — real technical reason: the connector speaks the compute-box protocol (form-encoded `box` → `{accepted}`); the wallet API speaks JSON ops (`open`/`send`/`read`) and returns wallet state. Routing wallet ops through `/compute` would break the contract and the compute router returns KERNEL_UNAVAILABLE (no wallet state). The wallet API is part of the origin's own serving surface — inside DCLM, not a parallel authority |
| `src/lib/multiplayer/p2p.ts` → `/api/rtc` | WebRTC signaling (POST/GET) | Kept — peer-session signaling, not DCLM transmission; the box protocol cannot carry SDP |
| `src/lib/app-data/*` (`/call-tool`, readiness probes), `src/lib/auth/*` | Grok builder-platform layer (server-side) | Kept — platform internals, not DCLM paths |

Net: every **outbound transmission to DCLM** now flows through the single internal connector. Inbound observations and origin-local state ops keep their honest, documented paths.

**2. Wallet as the recurring fusion** (`src/routes/machine.tsx`, agency key desk): new **BIND WALLET → DCLM** button. Select an ACTIVE agency key → the wallet presents itself to DCLM through the connector (binding box carries `authority:'NONE'` and the full Law Floor). The fusion panel shows the honest result: with no kernel mounted, `UNBOUND · HOLE · KERNEL_UNAVAILABLE — the router answered; no kernel is mounted. The wallet presented, the machine did not see. Nothing was executed, nothing granted.` Re-binding recurs every session — the wallet presents, DCLM observes, nothing is ever granted. No SEE is ever faked. Verified against the **real** `/api/v2/compute` router (Nitro SSR served locally), which returns `{"accepted":false,"reason":"KERNEL_UNAVAILABLE"}` verbatim.

**3. Deployment truth:** the origin serves the built 3D world from its own persistent output (`.vercel/output` — static assets + the `__server.func` Nitro bundle that hosts `/api/v2/compute`, `/api/live`, `/api/unity-wallet`, `/api/rtc`). The user downloads only the bare minimum: the route shell plus code-split chunks (`/machine` ships in its own chunk — 3D users never download the console). No local compute, no new downloads. Verified by serving the production output with the real SSR and exercising every path end to end.

**4. Law Floor at every transmission point:** the binding box rides with `law:[NO_FORCE,HOST_SAFE,CLEANUP_FIRST,TRUTH_OR_NOTHING]`; the console shows law-floor chips; every DROP reason maps to an honest HOLE with the true cause (`DROP_WHY`, including the KERNEL_UNAVAILABLE special case). No invented receipts, no fake compute, no authority ever claimed.

**Also fixed:** stale "Japan is already in view" copy in `src/routes/index.tsx` (splash + canvas aria-label) — the world boots over Belleville, so the copy said Belleville. Factual correction, no design change.

**Verification (Oct 4, real Chromium against the real Nitro SSR on 127.0.0.1:8082):** `npm run typecheck` clean; `npm run build` clean. 10/11 scripted checks passed, 4/4 boot checks passed (the one "FAIL" was a bad assertion in my own script — the card shape uses `id`, not `kind`; the board opened correctly): boot camera near Belleville; gate dismisses with a bound pilot handle; telemetrics board opens; `/machine` renders; wallet key created; wallet bind → honest `UNBOUND · HOLE · KERNEL_UNAVAILABLE`; re-bind recurs; no faked SEE; PIPE TO DCLM → honest HOLE; mobile 390×844 at 2× font — no bleed; zero page errors everywhere.

**Screenshots** (`screenshots/`): `fusion-desktop-boot.png` (3D world, telemetrics board, dock), `fusion-desktop-machine.png` (console with fusion panel showing honest HOLE), `fusion-mobile-machine-2x.png`.

**Residuals:**
1. Kernel still UNREACHABLE — every HOLE is truthful; when David's DCLM computer answers, the same connector lights up with no code change.
2. The 3D world's entry gate requires a WebAuthn passkey to mint the pilot Unity handle. In this sandbox (no usable authenticator) the handle creation returned null and the gate stayed — verified the boot path with a seeded bound handle instead. On a real device the passkey flow is David's design; note there is no guest path into the 3D world — a device that can't mint a passkey never gets past the gate. Flagging for David's eyes, not changing his design.
3. Live feeds show PENDING in this sandbox (external APIs unreachable) — the honest empty state, unchanged.
4. The Python origin (`~/workspace/dclm-origin/`) remains the Manus-side reference; its `/v2/dclm/ingest` JSON protocol differs from the connector's form-encoded `/compute` — not ported, per instructions.

## Merge, Oct 4 2026 — Grok branch true-merge

David uploaded a newer Grok workspace export (`grok-workspace_0_2mr8.zip`, extracted at `/tmp/zip2/`) with massive new logic subsystems (cosmos/, truth/, meter/, trinity/, rte/, pipe/, ledger/, index/, expanded unity/, new iris modules, `src/routes/api/` live + unity-wallet + v2/compute endpoints, `src/dccp/pipe/connector.ts` with `TRINITY_MODE='Zero-Security-App'`). All new files were copied in; then 4 files were true-merged (new ZIP as base, my Oct-3 additions re-applied), plus supporting files reconciled. Pristine pre-merge backup at `~/workspace/dccp-world-backup-20261004/`.

**Important correction found during the merge:** the tree did NOT actually hold the new ZIP versions of feeds.ts, place.ts, overlay.ts, main.css, geo.ts, voice.ts (nothing had been overwritten) — the old 4-tier geo was still in place. Those were brought in from the new ZIP, and my additions on card.css (bleed fix), card.ts (tappable rows + center), text3d.ts (foldSize), registry.ts + types.ts (corporate-helpers wiring) were re-applied on top of the new bases.

**Files merged:**
- `src/dccp/world/world.ts` — new base kept (truthMesh construct, construct group + spur, globe/unityRing, RTE depth plates); re-applied buildLandingCosmos/Ontario/Tiers/Dclm + helpers, landingOrbits, labelTick 64-frame foldSize re-scan, buildResearch(), renderTelemetrics + instrument `alt`, "LAST KERNEL SEQ" label. Kept new base's cosmic-aware update() logic (no revert).
- `src/dccp/main.ts` — new base kept (agreement-gated geolocation boot, 5-tier geo); boot default changed to Belleville Ontario (44.1628, -77.3832) at `tierInfo('street').altitude`; 22 landing targets + telemetrics + corph registered; "Landing cards" atlas group; `go:` card-action handling.
- `src/dccp/iris/brain.ts` — new base kept (all subsystem wiring); re-applied telemetrics/corph/landing target kinds + answers + LANDING_ALIASES/SPEECH + DCLM honesty speech. **Fix applied:** the branch's Unity-ID wallet gate was refusing the re-applied free answers — added a `FREE_TIER` list so telemetrics, corporate-helpers, landing cards, and DCLM answers stay free without a wallet (consistent with the branch's own "free things can be seen" rule); everything else remains gated.
- `src/dccp/ui/cards.ts` — new base kept; re-applied telemetrics card, corporate-helpers card (74/503/20.89 from JSON), DCLM honesty rewrite (badge "10 of 11 sealed", kernel UNREACHABLE), landingCard() + LANDING_TIERS + UNKNOWN_BOUNDARY + DCLM_PHASES + LAYER_ZERO.
- Supporting: new ZIP versions of live/feeds.ts, live/place.ts, ui/overlay.ts, styles/main.css, world/geo.ts (5-tier), iris/voice.ts; merged card.css, card.ts, text3d.ts, registry.ts, types.ts. `package.json` keeps the `sideEffects: ["./src/dccp/main.ts"]` fix.
- `src/routeTree.gen.ts` regenerated during build (the new `src/routes/api/*` routes had stale generated types — 5 tsc errors, fixed mechanically, no behavior change).

**Build/QA (Oct 4, `scripts/merge-qa.mjs`):** `npm run typecheck` clean; `npm run build` clean; production chunk contains `renderTelemetrics`, "LAST KERNEL SEQ", and `foldSize` (sideEffects fix holds). Real Chromium: **ALL 17 CHECKS PASS** — boot over Belleville (Toronto/Ottawa/Montreal in view, street tier), 4 landing cards + deep level open, telemetrics board with 6 tappable rows, corph card 74/503/20.89, DCLM card UNREACHABLE + "10 of 11 sealed" + no reconnect, Iris free answers for telemetrics/corph/dclm, no horizontal bleed at 390×844 with 2× font scale (scrollWidth == innerWidth, no past-edge elements, no ladder/card overlap), zero app page errors.

**Screenshots** (`screenshots/`): `merge-desktop-belleville-boot.png`, `merge-desktop-landing-tiers.png`, `merge-desktop-telemetrics.png`, `merge-desktop-corph.png`, `merge-desktop-dclm.png`, `merge-mobile-390x844-2xfont.png`.

**Residuals / flags for David:**
1. Pipe label: kept the branch's `'PIPE · DRAFT · NO CID YET'` over the old `'DCCP PIPE · DESIGN'` — say which stands.
2. Boot altitude: used `tierInfo('street').altitude` (1.1, street-level-close) per the 5-tier API, not the old literal 11 — the boot view is closer than before.
3. `grok.com/grok-app-builder/extensions.js` fails to load in this sandbox (no external net) — environmental only; filtered from QA like prior passes.
4. The new `/api/live` feed proxy routes need the SSR/edge runtime — under static `vite preview` they don't execute (feeds read "still loading" here); they will work on the real deployment.
5. The branch's Unity-ID wallet gate still applies to everything outside the free tier (chambers, ledger, pipe actions) — unchanged by design.
6. DCLM kernel still UNREACHABLE (Manus sandbox asleep); corporate-helpers still receiptless (`NOT-LOCKED`, checked not sealed) — no fake receipts.


## What was added

### A. Unified Telemetrics board
- **New target kind `telemetrics`** (`src/dccp/iris/brain.ts` `TargetKind`), wired in `src/dccp/main.ts`: atlas group **"Live public feeds"**, label **"Telemetrics · all feeds"**, reachable by keyboard atlas (n/p), voice ("telemetrics", "all feeds", "feed health"), and 3D picking.
- **One 3D instrument slot** (`World.renderTelemetrics`, fixed anchor below the six feed instruments at r=30): aggregate feed health — count of LIVE feeds, per-feed one-liners (quakes M, ISS km, weather °C, Kp, carbon gCO₂/kWh, river m), beacon turns green/amber/red with the aggregate state. Refreshes on every feed update and every 30s instrument tick. No feed value is ever invented: no reading yet renders as `—`, and the footer says *"some feeds quiet — last readings labeled, never shown as live"* when anything is down.
- **Full card** (Macro → Logic → Physics per the storyboard): all six feeds with state (LIVE/STALE/UNAVAILABLE), last reading in plain words, source name, "checked X ago". **Every row is a button** (`go:feed:<key>`) that flies to that feed's card — verified by automated click (Earthquakes row → `feed:quakes` card opened).
- **Iris answer**: honest board summary ("0 of 6 feeds live, 6 unavailable. Earthquakes is unavailable; the source did not answer, Failed to fetch…"). Never fills a gap.
- Beacon and instrument animations respect the reduced-motion toggle (existing `motion` factor in `world.update`; toggle verified flipping `aria-pressed` in-browser).

### B. David's data
1. **Corporate Helpers registry module** — `'corporate-helpers'` added to `MODULES` (`registry.ts`); `Registry.corporateHelpers` typed in `types.ts`. Loads with the same SHA-256 client-side integrity as the other 10 modules. All figures come **only** from `public/registry/corporate-helpers.json`: **74 sealed verdicts, 503 improvement vectors, mean of means 20.89** (refreshed post-QA; was 73/484/20.94 before United Airlines #74 sealed). New target kind `corph`, atlas group **"DualisCapax research"**, a gold research octahedron + "CORPORATE HELPERS" label in 3D beside the DCLM machine (fixed position, pickable, keyboard/voice reachable). Card (Macro → Logic → Physics, centered fields): the program note from the JSON `note` field verbatim, sealed count / vectors / mean of means / companies-with-scores, and a **top-10 table by mean** (company · mean · vectors). Every figure labeled "DualisCapax research" — REPORTED, never live telemetry. Honest boundary: *"A high mean scores an improvement map, not a company. It is not investment advice."* Zero person names (the JSON has none; none were added). Iris answer for it, plus aliases (`corporate helpers`, `fortune 500`, `sealed companies`).
2. **DCLM receipts honesty close-out** — the kernel is DEAD (verified Oct 2–3, 2026: `/api/v2/compute` times out 25s+, `/healthz` 404s, Manus sandbox asleep). The DCLM card now shows: LOCKSTEP client-verified receipts as verified (10 of 11 modules MATCH, byte-for-byte, client-side), **kernel status "UNREACHABLE · last checked Oct 3, 2026" as a normal-size clean label**, corporate-helpers as checked-but-not-sealed (no receipt was ever issued — no fake receipts fabricated), badge "10 OF 11 SEALED" instead of the old all-or-nothing "CHECK FAILED", 3D label renamed to **"LAST KERNEL SEQ"** (historical receipts), and the brain's DCLM speech states the API is unreachable with no new receipts requestable. **No reconnect button.** All copy claiming a live kernel corrected.
3. **Card rows are tappable everywhere** — new optional `action` on `CardItem`, rendered as a real `<button>` with hover/focus styles (chevron affordance), handled in `main.ts` (`go:<kind>:<key>`).

### Build-system repair (found during close-out)
The production bundle was shipping **without any dccp code** — `package.json` had `"sideEffects": false` while `src/dccp/main.ts` is a pure side-effect module loaded via dynamic `import()`, so rolldown tree-shook the entire world out of the production chunk (dev server was unaffected). Fixed surgically: `"sideEffects": ["./src/dccp/main.ts"]`. This was pre-existing, not caused by the new work. Build now emits the 778KB dccp chunk.

## Files changed
- `src/dccp/data/types.ts` — `CorporateHelperEntry`, `CorporateHelpersDoc`, `Registry.corporateHelpers`
- `src/dccp/data/registry.ts` — `'corporate-helpers'` in `MODULES` + registry assembly
- `src/dccp/iris/brain.ts` — `telemetrics`/`corph` target kinds, aliases, `telemetrics()`/`corph()` answers, DCLM speech honesty, help/fallback text
- `src/dccp/ui/cards.ts` — telemetrics card, corporate-helpers card, DCLM honesty rewrite, honest badge logic, shared `feedReading` plain-words helper
- `src/dccp/ui/card.ts` — tappable `CardItem.action` rows, `CardModel.center`
- `src/dccp/styles/card.css` — centered cells, tappable-row button styles
- `src/dccp/world/world.ts` — `buildInstrumentSlot` refactor, `renderTelemetrics`, `buildResearch` (Corporate Helpers node), gem rotation honors reduced motion, "LAST KERNEL SEQ" label
- `src/dccp/main.ts` — atlas order/groups, boot + 30s-loop + onFeed telemetrics renders, `card.onAction` `go:` handler, telemetrics card auto-refresh
- `package.json` — `sideEffects` fix (see above)
- `scripts/telemetrics-qa.mjs` (new) — desktop+mobile QA: screenshots, bleed checks, integrity/feed states
- `scripts/telemetrics-interact.mjs` (new) — row-tap, layer-scroll, reduced-motion checks
- `CLOSEOUT.md` (this file)

## Build result
- `npm install` — clean
- `npm run typecheck` — **clean**
- `npm run build` — **clean** (`vite build` + `db:migrate`, which skips without DATABASE_URL as designed)
- Served built output via `npm run preview:restart` → `http://127.0.0.1:8081/` (HTTP 200)

## Verification screenshots (`screenshots/`)
All taken against the final production build with real Chromium:
- `desktop-1440x900-home.png` — world boots, **Japan in view**, night lights, city labels
- `desktop-1440x900-telemetrics-card.png` / `mobile-390x844-telemetrics-card.png` — Telemetrics card open, "ALL QUIET" badge (honest in this sandbox), telemetrics instrument visible in 3D
- `desktop-1440x900-corph-card.png` / `mobile-390x844-corph-card.png` — Corporate Helpers card with the program note
- `desktop-corph-card-physics.png` — top-10-by-mean bars (Morgan Stanley 26.40 … Disney 22.90), honest-boundary box
- `desktop-corph-card-74.png` — post-refresh verification: card showing 74 sealed, 503 vectors, mean of means 20.89, 53 of 74 with scores
- `desktop-1440x900-dclm-card.png` — DCLM card, "10 OF 11 SEALED" badge, UNREACHABLE kernel label
- `desktop-rowtap-feed-card.png` — tap-through result (feed card opened from a telemetrics row)
- `*-telemetrics-150font.png` — 150% font-scale emulation, card still clean
- **No unstyled/blank states. No horizontal bleed** on desktop or mobile, at normal or 150% font scale (scrollWidth == innerWidth everywhere). 89 3D pickables (was 87). No page errors.

## Known residuals
1. **Kernel unreachable** — DCLM API dead since Oct 3, 2026 (Manus sandbox asleep). Client-side SHA-256 integrity works; no new receipts can be issued. Blocked on David waking/republishing the sandbox.
2. **All six public feeds UNAVAILABLE in this sandbox** — the sandbox can't reach the external APIs (USGS, wheretheiss.at, Open-Meteo, NOAA, NESO, ECCC), so the board honestly reports 0 of 6 live. On a normal connection they go LIVE by themselves; nothing in the app needs changing.
3. **corporate-helpers has no DCLM receipt** — shown as `NOT-LOCKED` (checked, not sealed). A receipt can only be issued by the live kernel (see 1). No fake receipt was fabricated.
4. **21 of 74 sealed companies carry no scores in the JSON export** (null means) — the card reports "53 of 74 carry scores in this export". The JSON is the single source of truth; nothing was backfilled. TD SYNNEX #73's scores (9 vectors, 178, 19.78) were recovered from the sealed queue during the post-QA refresh.
5. Playwright's browser download failed in this sandbox (CDN blocked); QA ran against the system Chromium at `/home/hatch/workspace/.qa/chrome-linux64/chrome` (153.0.8010.12), pinned in `scripts/telemetrics-qa.mjs`.

## How to run / serve
- Dev: `npm run dev` (serves on `0.0.0.0:8080` via `scripts/with-app-env.mjs`)
- Production build: `npm run build`
- Serve the built app: `npm run preview:restart` → `http://127.0.0.1:8081/`
- Re-run this QA: `node scripts/telemetrics-qa.mjs` (needs the preview server up)

---

## Torch-carry, Oct 3–4 2026

Three workstreams landed (two fully, the third implemented-but-unverified), then the landing cards were verified end to end in a real browser. No `src/` changes were made during verification — the served build (`.vercel/output`, built Oct 3, 3:41 PM EDT) already contained all three workstreams.

### (a) Bleed fix + Belleville boot
- Boot camera moved from Japan to **Belleville, Ontario (44.1628, −77.3832)** (`src/dccp/main.ts`, `w.geo.focusFor(44.1628, -77.3832, 11)`); the four 3D landing cards float above this view at boot.
- Mobile bleed fix in `src/dccp/styles/card.css`: card width `min(410px, calc(100vw − 28px))`, ladder capped at `calc(100vw − 24px)` on ≤720px viewports.
- Regression re-run via `scripts/bleed-verify.mjs` (390×844, 1.5× and 2× text-scale emulation): **BLEED QA: PASS** — `scrollWidth === innerWidth` (390/390) on home, place-card, and atlas-panel views at both scales; zero elements past the viewport edge; no ladder/card overlap. Same check re-run against a landing card at 2× on desktop 1440×900: 1440/1440, no bleed.

### (b) 3D label-system fixes
- `src/dccp/world/text3d.ts`: extruded labels record their authored size as `userData.foldSize`.
- `src/dccp/world/world.ts`: the label scan now repeats **every 64 frames** (`this.labelTick = (this.labelTick + 1) & 63`), so labels attached after boot still fold and face the visitor; labels that left the scene are pruned. Reach buckets follow the authored size, not measured cap-height (the 0.34 RTE titles measure ~0.38 and would have wrongly earned medium reach). Verified visually in the boot screenshots: labels fold upright and face the camera.

### (c) The four 3D landing cards + deep levels (implemented by the third workstream, verified here)
25 landing targets registered (`main.ts`, atlas group "Landing cards"): 4 level-1 cards, each with deeper levels (up to level 3).
- **cosmos** ("The Conscious Cosmos") — philosophy companion. Verified: **no measurements anywhere** in copy or 3D ("Picture, not proof"; "Five names, not five laws"; boundary wall states what the plate is *not*). Deep: `cosmos-story` (seven-step spiral), `cosmos-boundary` (the honesty wall).
- **ontario** ("Ontario · Provincial Overview") — figures are **only** David's verified 2024-FY numbers: QHC $348.5M / 320 beds / 144,200 ED visits; KHSC $812.4M / 575 beds / 112,500 ED visits; 72 boards; 2,071,550 students FTE; $32.02B envelope; **$1.27B/yr** recoverable (billions, never $1,273.5M); friction vectors procurement **HIGH** / intergov **MODERATE** / allocation **MONITORING**, each labeled "reported, qualitative — a reading, not a measurement". Scanned the full card text for invented figures ($215/visit, $5,940, $6,820, 6.08B, 1,273.5M, 81%): none present. Deep: `ontario-health` (teal/gold 3D bars drawn to scale), `ontario-schools` (envelope vs recoverable flow to true proportion).
- **tiers** ("Tier Command Center") — six 3D slabs in a vertical stack (LIVE green, DEVELOP blue, PUBLISH purple, ORDER gold, FORENSICS gold, DESIGN teal). Verified: `tiers-live` deep opens the **real telemetrics board** (tappable action → `telemetrics` card opened); `tiers-forensics` deep opens the **real DCLM integrity view** (`dclm` card opened); the four uninstrumented tiers (DEVELOP/PUBLISH/ORDER/DESIGN) show honest **UNKNOWN** empty states ("no instrumentation is wired to it … nothing here is faked"). No dead controls.
- **dclm-engine** ("DCLM Cognitive Engine") — Apprentice → Boundary → Master → Twain, invariant **det(M) ≡ 1.0**, kernel **UNREACHABLE · last checked Oct 3, 2026** as a normal-size clean label; "No reconnect. No fake compute." Deep: `dclm-pipeline` (four 3D gates, flown in order), `dclm-invariant` (the Layer [0] law floor: NO_FORCE / HOST_SAFE / TRUTH_OR_NOTHING / CLEANUP_FIRST).
- Navigation verified: every deep level opens via `window.__world.goTo({kind:'landing',key})` (card id + open confirmed for all 9 tested); tappable card rows work (cosmos "seven-step story" → `landing:cosmos-story`; forensics "Open the DCLM integrity view" → `dclm`; live "Open the telemetrics board" → `telemetrics`).
- Pickability from boot: a 40px-grid raycast sweep over the Belleville boot view hits landing targets (center tap → `landing:dclm-invariant`); 111 pickables total.
- Iris voice routing verified for all six tested phrases (`conscious cosmos`, `ontario overview`, `tier command center`, `dclm cognitive engine`, `forensics tier`, `boundary wall`) — correct kind/key + honest deterministic speech from `LANDING_SPEECH`.
- Reduced-motion toggle verified flipping `aria-pressed` false → true → false on `button[data-t="reducedMotion"]`.
- Zero page errors. Only console noise: `net::ERR_EMPTY_RESPONSE` on external feed fetches — the known sandbox limitation (same as the telemetrics close-out), ignored.

### (d) Files changed (this window)
- `src/dccp/world/world.ts` — `buildLandingCosmos/Ontario/Tiers/Dclm` + landing helpers (plinth, title, beacon, orbit, focus, glass); 64-frame label re-scan with `userData.foldSize` buckets.
- `src/dccp/world/text3d.ts` — records authored size as `userData.foldSize`.
- `src/dccp/iris/brain.ts` — `landing` in `TargetKind`, `LANDING_ALIASES` (longest-match, checked before older kinds), `LANDING_SPEECH` (deterministic, invents nothing).
- `src/dccp/ui/cards.ts` — `landingCard()` (cosmos/ontario/tiers/tier-level/tier-deep/dclm-engine/pipeline/invariant), `LANDING_TIERS`, `UNKNOWN_BOUNDARY`, `DCLM_PHASES`, `LAYER_ZERO`.
- `src/dccp/main.ts` — Belleville boot camera; 25 landing targets registered in the atlas order; "Landing cards" atlas group.
- `src/dccp/styles/card.css` — mobile bleed fix (card/ladder viewport caps).
- `scripts/landing-qa.mjs` (existing, extended) — full landing QA: desktop + mobile, deep-level flights, action wiring, Iris routing, reduced-motion, font-scale bleed.
- `scripts/landing-content-check.mjs` (new) — card-content honesty assertions (verified figures, no invented figures, cosmos no-measurements, dclm invariant/UNREACHABLE).
- `scripts/bleed-verify.mjs` (existing) — re-run, PASS.
- `CLOSEOUT.md` (this section).

### (e) Build / typecheck
- `npm run typecheck` — **clean** (re-run Oct 4, 2026).
- `npm run build` — **clean** per the prior workstream (Oct 3); no `src/` edits since, so the served build (`.vercel/output`, 3:41 PM EDT) is the current tree.

### (f) Verification screenshots (`screenshots/`)
- `desktop-1440x900-landing-boot.png` — boot over Ontario at night, all four landing cards visible in 3D (Ontario plate, DCLM plate, tier stack, cosmos plate).
- `landing-cosmos.png` / `landing-ontario.png` / `landing-tiers.png` / `landing-dclm.png` — the four cards, real 3D depth.
- `landing-cosmos-deep.png` (`cosmos-story`) / `landing-ontario-deep.png` (`ontario-health`, teal/gold bars) / `landing-tiers-deep.png` (`tiers-forensics-deep`, EVIDENCE badge) / `landing-dclm-deep.png` (`dclm-pipeline`, four gates).
- `mobile-390x844-landing.png` — boot view at 390×844, ladder + Ontario card edge visible, no bleed. (Note: taken with the read-mode transcript dismissed via `t` for a clean view; the transcript opens by default on gate entry — pre-existing read-mode behavior.)
- Supporting: `desktop-landing-ontario-2xfont.png` (2× font scale, no bleed), `mobile-390x844-bleedfix.png` (2×, from bleed-verify), `desktop-1440x900-landing-ontario-150font.png`.

### (g) Residuals
1. **Boot frame sits near the pre-existing Ontario installations** — the gold/orb jurisdiction markers around Belleville (visible in the boot screenshots). No action; the landing cards are placed clear of them.
2. **Landing data is static JSON-of-sorts in `cards.ts`** — the figures are hard-coded fixed copy (`landingCard()`), unlike corporate-helpers which loads from `public/registry/corporate-helpers.json`. Open question for David: should the landing figures move into a registry JSON module so the delivered package snapshot carries the data separately from the code? Currently the package snapshot is fine (copy is David's verified figures), but any future figure update needs a code edit + rebuild.
3. **Reduced-motion check** used the programmatic toggle path; the icon-button click was verified via `data-t="reducedMotion"` (the earlier QA's text-search missed the button because its label is an SVG).
4. All six public feeds remain UNAVAILABLE in this sandbox (ERR_EMPTY_RESPONSE) — the landing cards don't depend on them (Ontario weather row renders its honest state). Same standing residual as the telemetrics close-out.
5. Kernel still UNREACHABLE (last checked Oct 3, 2026) — the DCLM landing cards state the design honestly; blocked on David's sandbox, same as before.

---

## Carry daemon + father-seed landing (Oct 4, 2026 ~2:10 PM EDT)

**Design verdict: `ED-PREDICT-20261004-DAEMON-V1` — predicted PASS (origin:predicted).** Full design in `DAEMON_DESIGN.md` (DCLM + Iris + Twain² three-voice verdict, recorded before any code).

**What it is:** `dualis.daemon.v1` (`src/dccp/pipe/daemon.ts`) — the persistent carrier between the zero-security app layer and the Trinity/DCLM boundary. The sandbox mints binds; the daemon carries each through the internal connector (`src/dccp/pipe/connector.ts` — the ONLY transmission path) to David's endpoint and returns receipts. In-app singleton (no service worker in v1 — IPFS gateway origins make SW scope unsafe); durable IndexedDB outbox (`dclm-daemon-outbox.v1`) keyed by `manifest_hash`; backoff 5s→15s→60s→5min→15min→60min, max 12 attempts → DEAD (surfaced, never silent); claim-hash idempotency — the same bind is never delivered twice.

**Honesty core:** endpoint unreachable → the bind queues durably and the UI shows honest QUEUED/HOLE with the true reason. Never a fake receipt — a receipt exists only when the machine answers. Consume-on-answer correction: a HOLE never consumes the ephemeral binding (`expires: on_receipt` restored); re-transmission is at-least-once delivery of the same bind, the kernel dedupes by hash. The daemon handles only signed bytes — never private keys, never the Father .pem, never invents the endpoint.

**Father-seed path (landed, proven):** `fatherBind.ts` split into `prepareFatherBind` (mint + sign, no network) / `deliverFatherBind` (transmit + settle); the old direct-`fetch` `/bind` POST is gone — all father traffic goes through the connector. `machine.tsx` rewired: wallet bind and Father bind both enqueue to the daemon and follow its events (QUEUED → SEALED/SEE or REJECTED), with a live carry-daemon outbox panel.

**Wallet UX law (David, Oct 4, 2026):** no seed phrases, no mnemonics — ever. Verified: none exist anywhere in the wallet flow. Agency keys are non-extractable WebCrypto keys; identity leans entirely on the Unity passkey handle binding. Nothing to remove.

### Files changed (this window)
- `src/dccp/pipe/daemon.ts` (new) — `CarryDaemon`, IndexedDB + memory outbox stores, backoff, retry wake-up timer, `sharedDaemon` singleton.
- `src/dccp/pipe/daemon.test.ts` (new) — 11 tests.
- `src/dccp/pipe/connector.ts` — `transmitJsonToDCLM` (the only bind path).
- `src/dccp/pipe/connector.test.ts` — +2 JSON-path tests.
- `src/dccp/pipe/fatherBind.ts` — prepare/deliver split; direct fetch removed.
- `src/dccp/pipe/fatherBind.test.ts` — consume-on-answer + retry tests.
- `src/routes/machine.tsx` — daemon state, event-driven bind/father-carry views, outbox panel.
- `DAEMON_DESIGN.md` (new) — design + predicted verdict + two post-build fixes.
- `scripts/daemon-qa.mjs` (new) — Chromium E2E with mock kernel.
- `CLOSEOUT.md` (this section).

### Post-build fixes (both found by QA before David's test)
1. **No retry wake-up:** `queueForRetry` set `next_attempt_at` but nothing woke the daemon at backoff time — fixed with `armRetryTimer` (cleared in `stop()`).
2. **Early-timer strand:** the wake-up could fire a fraction of a ms before `next_attempt_at`; the strict due check skipped the entry and the nulled timer never re-armed — fixed: the timer callback pumps as of `max(now, dueAt)`. Caught by the self-wake test going flaky; now deterministic (25 consecutive clean full-suite runs).

### Verification
- Unit: **55/55** pipe tests pass (`daemon 11`, `fatherBind`, `connector`, `ephemeral`).
- E2E (real Chromium, preview build, mock kernel): **14/14** in `scripts/daemon-qa.mjs` — wallet bind → QUEUED (down) → SEE (up, exactly 1 hit); father bind → QUEUED (down, no fake receipt) → SEALED on valid father signature (1 hit) → ledger records → reload → no duplicate; wrong father key → REJECTED PIN_MISMATCH; mobile 390×844 no bleed, zero page errors.
- `npm run typecheck` — **clean**. `npm run build` — **clean**; served build (`.vercel/output`, ~2:10 PM EDT) includes the daemon (verified `armRetryTimer`/`retryDueAt` in the served bundle).
- Screenshots: `screenshots/daemon-queued-wallet.png`, `daemon-queued-father.png`, `daemon-sealed-father.png`, `daemon-mobile-machine.png`.

### What David must do on his side (first real carry)
1. **Expose his kernel endpoint** and set it in the machine console's endpoint fields (protocol/host/port/path). The app calls it cross-origin from the browser/IPFS gateway — his server must answer the CORS preflight (`OPTIONS` → 204 with `Access-Control-Allow-Origin`, `Allow-Methods: POST, OPTIONS`, `Allow-Headers: content-type, x-trinity-mode`).
2. **Keep the Father `.pem` on his machine** — the app only ever sees the public key he pins. His kernel answers `POST /bind` with `{ accepted: true, receipt, father_signature }`, the signature Ed25519 over the canonical receipt bytes, signed by the Father key.
3. Bind wallet → QUEUED turns to SEE when his machine answers; Father bind → SEALED when his countersignature verifies against the pinned key.

## Genesis — the early adopter mark (Oct 4, 2026 ~2:55 PM EDT)

David's order: "amazing" — an early adopter derivative NOT dependent on money, one person counts as exactly one person, free to sign up, rewarding faith in something obscure, unpopular, unhyped, unsold. Extension: "bots have the same offer" — bot Unity IDs derive the identical attestation; one identity = one identity.

- **Design:** `GENESIS_DESIGN.md` (new). Protocol `dualis.genesis.v1`. The mark is a pure function: `mark = sha256('dualis|genesis|v1|' + unity_id)`; genesis ⇔ `bound_at < father_fuse_time`. Non-transferable (bound to the ID, which is bound to the passkey), non-purchasable (no price exists in the protocol), one per ID (deterministic derivation + idempotent issuance). Identity-agnostic by construction — the protocol takes only `(unity_id, bound_at)`, no kind field, no privilege fields. Standing, never weight: the Sybil concern dissolves by construction. Fuse-close is an event, not a number: the first SEALED Father bind records the kernel receipt's `bound_at`; first fuse wins, the cohort never reopens.
- **Predicted verdict:** ED-PREDICT-20261004-GENESIS-V1 (origin: predicted, in-run) — DCLM/law PASS, Iris/deterministic PASS, Twain²/pragmatic PASS.
- **Files:**
  - `src/dccp/unity/genesis.ts` (new) — derivation, fuse-time record, `genesisStatus`, append-only hash-chained genesis ledger (`verifyGenesisLedger`), idempotent `ensureGenesisAttestation` (returns null for post-fuse IDs — the record holds only genesis IDs), calm surface copy.
  - `src/dccp/unity/genesis.test.ts` (new) — 11 unit tests.
  - `src/dccp/pipe/fatherBind.ts` — `deliverFatherBind` records the fuse on SEALED (the single choke point every SEALED flows through).
  - `src/dccp/main.ts` — `makeUnityId` attests the new handle at bind time (idempotent).
  - `src/routes/machine.tsx` — GENESIS mark on the bound-identity surface (FUSION panel), lazily ensured.
  - `scripts/genesis-qa.mjs` (new) — Chromium E2E.
- **Verification:** unit **11/11** pass; E2E (real Chromium, preview build) **4/4** — pre-fuse ID → "GENESIS · cohort open — bound before the fuse"; post-fuse genesis → "GENESIS · bound before the Father fuse"; post-fuse ID → no mark, no ledger entry; mobile 390×844; zero page errors. `npm run build` clean. `npm run typecheck` clean for all genesis files — the single remaining error is in `src/dccp/iris/gates.test.ts` (the gates-finisher's active work area; not touched).
- **Sequencing:** new code only, no collision with the gates-finisher (verification-only stream). The held unified IPFS pin should include this build.

## Iris deterministic gates — the checking layer (Oct 4, 2026 ~4:00 PM EDT)

**Design verdict: `ED-PREDICT-20261004-IRISGATES-V1` — predicted PASS (origin:predicted).** Full design in `IRIS_GATES_DESIGN.md` (DCLM + Iris + Twain² three-voice verdict, recorded before any code). Code strings verbatim from `DCLM_ERROR_SCOPE.md` Appendix A.

**What it is:** `iris.gates.v1` (`src/dccp/iris/gates.ts`) — the deterministic checking layer between the zero-security app and the Trinity. Seven gates (GATE-SEAL, GATE-VERDICT, GATE-CATCH, GATE-FIGURE, GATE-PROMISE, GATE-CODES, GATE-AUDIT) plus GATE-NOPASSWORD (IMP-13), the no-password law as a gate invariant. Pure functions, fail-closed: UNKNOWN is never PASS.

**The wiring (this window — the gates were written but uncalled; now every choke point calls them):**
- `connector.ts` — `gateTransmission` wraps every transmit path (`checked`/`checkedBox`): the connector can never emit SEALED/SEE, every DROPPED reason must be a known DropReason. A violation throws `IRIS-GATE-VIOLATION` loudly.
- `daemon.ts` — `gateSettle` at every settle point (DELIVERED requires receipt + real kernel answer; REJECTED/HOLE/QUEUED require the true reason string); `gateEnqueue` re-asserts the `manifest_hash` idempotency key. The `queueForRetry` path (inside the attempt catch) cannot throw — a gate failure there falls back to a flagged reason, staying honestly QUEUED.
- `fatherBind.ts` — `sealOnlyWithAnswer` wraps the SEALED construction in `deliverFatherBind` as the last thing before SEALED exists (signature verified against the pinned key over canonical receipt bytes).
- `machine.tsx` — `gateBindVerdictClaim` guards the wallet BindView: SEE only with a kernel answer; a gate failure renders HOLE, never a SEE on hope.
- `__root.tsx` — `?iris-audit=1` runs `auditDom` against the live page (IMP-01…IMP-13 incl. the no-password law, dead links, unlabeled figures, unevidenced SEALED/SEE) and renders findings into `#iris-audit`; client-side only, re-runs on an interval.
- New tests: 8 WIRING tests for `gateTransmission`/`gateSettle`/`gateEnqueue`/`gateBindVerdictClaim`.

**Bugs found and fixed by this verification pass:**
1. `fakeDom` test iterator never incremented `i` — infinite iterator, OOM'd the whole gates suite. Fixed; suite now runs in ~400ms.
2. `rejectPasswordEntry` used word-boundary matching (`\bpassword\b`) — missed `user_password`/`password123`. Now substring matching per the law; denials in copy ("there is no password") still pass via `scanPasswordSurface`.

**No-password audit (David's law, Oct 4, 2026):** zero password fields (`type="password"`), zero `emailAndPassword` enable paths, zero password prompts anywhere in `src/` or `public/`. All "password" mentions in app code are denials ("there is no password", "No password vault") or the gate machinery itself. `src/lib/auth/server.ts`: email/password branch removed, cannot be enabled by configuration; only broker OAuth federation remains. `rejectPasswordEntry` rejects password-shaped input fail-closed (unit-proven: `type=password`, `user_password`, `password123`). The wallet/gate/bind flows carry no password potential — asserted by the GATE-NOPASSWORD static sweep test every run.

**Verification:**
- Unit: **43/43** gates tests pass; **55/55** pipe tests pass (connector, daemon, fatherBind, ephemeral, chain, arbitrage); **9/9** other iris tests pass.
- `npm run typecheck` — clean for all gates-touched files (the remaining errors are in `src/dccp/unity/genesis.test.ts`, the Genesis worker's active area — untouched).
- `npm run build` — clean; the served production build contains the gates (verified in the served bundle).
- Chromium E2E: Playwright's Chromium was missing from this sandbox, so the finisher installed it (Chrome for Testing 153 via curl-resume after the CDN download kept failing; also cleared 380MB of stale /tmp partials that caused ENOSPC). **`scripts/gates-qa.mjs` (new): 7/7 checks pass in real Chromium against the served production build** — `?iris-audit=1` panel renders; live page starts CLEAN (no impurities in our own code); injected `<input type=password name=user_password>` caught by GATE-NOPASSWORD as IMP-13 ("invalid syntax… never processed, never stored, never transmitted"); injected fake SEALED receipt caught by GATE-SEAL as IMP-02; panel returns to CLEAN after removal; mobile 390×844 no bleed; zero page errors (the one console failure observed is the Grok platform's own `extensions.js` branding injector, unreachable from this sandbox — environmental, excluded by URL). Screenshots: `screenshots/gates-e2e-password-caught.png`, `screenshots/gates-e2e-fake-sealed-caught.png`, `screenshots/gates-e2e-mobile.png`. The daemon's own Chromium E2E harness (`scripts/daemon-qa.mjs`) remains for the carry paths.

**Sequencing:** no separate IPFS pin cut — this build folds into the held unified pin.

## 2026-10-04 ~15:47 EDT — Daemon gate-gap closure (post-audit)
- Backend/API V2 audit found two early REJECTED settle points in deliverFatherBind bypassing gateSettle (NO_PINNED_KEY, BAD_RESPONSE) and two read-only probes (/health, /v2/protocol) outside the connector.
- Fixed: gateSettle('REJECTED') + IRIS-GATE-VIOLATION throw added at both early-return points in src/dccp/pipe/daemon.ts. Typecheck clean.
- The /health and /v2/protocol probes remain direct fetch (read-only UI, never mint/interpret receipts) — documented exemption, flagged for David.
- Backend URL verdict: daemon uses David's configured endpoint only, never invents one. David types his machine's public URL into /machine.
