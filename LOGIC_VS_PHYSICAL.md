# Logic vs Physical — the audit

**Date:** 2026-10-04. **Ordered by:** David. **Standard:** David's own six operations.

> "we become the world's greatest engineers of logical and physical mapping.
> nothing will keep up — I hypothesize that above all else."
> — David, Oct 4, 2026. **This is the program's north star.** This audit is its first demonstration.

> "all we care about is the decisions and that the answers follow logic to the
> truest path of pure logic it can assess, find, measure, observe, test, conclude."
> — David, Sept 28, 2026. **This is the method.** Every claim below is run through
> all six. Where an operation cannot be performed honestly, it is marked — never faked.

**The audit's own standard:** the proof is in the carrying, not the building.
A claim is PROVEN only when something physical carried it. Logic mapped without
a physical carry is PREDICTED. A claim with no physical path yet is an HONEST GAP.

David's other words, framing this audit: "the logic mapped but the physicals did
not because we did not have the circuit closed." The circuit is the physical carry.
Everything PREDICTED below names the exact physical event that would close it.

---

## 1. Claim inventory

Status key: **PROVEN** (physical carried it — evidence cited) · **PREDICTED**
(logic mapped — the named physical event would prove it) · **HONEST GAP**
(no physical path yet — what is missing is named).

### L1. Pinning Law — decentralized distribution, 12h republish · SEALED

- **Assess:** everything ships on IPFS/IPNS; no Cloudflare, no GitHub, no centralized host.
- **Find:** `~/workspace/PINNING_LAW.md`; pins in `~/workspace/ipfs-publish/PUBLISH_LOG.md`.
- **Measure:** 6 MAIN pins, 3 Playground pins, 2 showcase pins (all via Pinata, named);
  3 IPNS names published via w3name, each resolver-verified to its CID at publish;
  2 keepalive crons on 12h cadence.
- **Observe:** every IPNS update resolved back to the intended CID (seqno tracked).
- **Test:** re-pin chains executed 4 times Oct 4; CID-differ checks passed each time.
- **Conclude:** **PROVEN** for pin + name + keepalive. Residual: public-gateway
  retrieval of our CIDs is throttled from the sandbox — the read path is UNMEASURED,
  logged as such, never claimed.

### L2. CID Mapping Law — new release, new CID · ED-SEALED-20261004-CIDLAW-V1

- **Assess:** every material update is a new release with a new CID; fingerprints
  recorded; no silent remapping.
- **Find:** `~/workspace/dccp-world/CID_MAPPING_ENACTMENT.md`, `PUBLISH_LOG.md`.
- **Measure:** 11 releases across 3 surfaces — every CID differs from its predecessor;
  SHA-256 fingerprints recorded per release.
- **Observe:** no CID ever relabeled; v1s retained as historical evidence only.
- **Test:** each re-pin verified CID(new) ≠ CID(old) before the IPNS move.
- **Conclude:** **PROVEN.** The one allowance the enactment itself records: IPNS
  updates ship without independent gateway verification (unmeasurable from here),
  logged as UNVERIFIED-RETRIEVAL, never claimed verified.

### L3. Change Protocol — proposal → law-check → ratification → implementation → evidence → seal · ED-SEALED-20261004-CHANGE-V1

- **Assess:** nothing is implemented without a proposal; law changes by version.
- **Find:** `~/workspace/CHANGE_PROTOCOL.md`.
- **Measure:** this audit is itself the protocol in motion — David's order is the
  ratification; the audit is the evidence step.
- **Observe:** the relay, the gate, the manifesto check, and this audit all
  arrived as David's direct orders and were built after them — the order held.
- **Test:** Amendment 1 exercised once (CID law self-enactment, logged with evidence).
- **Conclude:** **PROVEN** as enacted, operating law.

### L4. Relay protocol `dualis.relay.v1` — BUILD → RELAY → LIVE · ED-DECISION-20261004-RELAY-V1

- **Assess:** async portable relay bundles; fail-closed parsing; DELIVERED only on
  real countersigned receipt + gate pass; RELAYED never presented as DELIVERED.
- **Find:** `src/dccp/pipe/relay.ts`, `src/dccp/pipe/daemon.ts`, `RELAY_DESIGN.md`.
- **Measure:** 260/260 suite green; 12 malformed bundle shapes rejected; replay /
  wrong-key / double-delivery adversarial cases verified.
- **Observe:** typecheck clean; paged exports tile exactly; backpressure sheds honestly.
- **Test:** `relay.test.ts` (16), `relayVolley.test.ts` (11) — all green.
- **Conclude:** **PROVEN as logic.** Seal is **PREDICTED**: the physical event is a
  real counterparty round-trip against David's machine — bind relayed out,
  countersigned receipt ingested back, DELIVERED through the gates. The
  round-trip simulator (built with this audit, `relayRoundTrip.test.ts`) proves
  the machinery with a test key; it cannot seal — only his machine seals.

### L5. Derived Unity identity — `unity:` + SHA-256(Father SPKI) · ED-PREDICT-20261004-DERIVEDID-V1 (ratified)

- **Assess:** the identity already exists; WebAuthn validates a device against it,
  never mints it; one root → one entity → one vote.
- **Find:** `DERIVED_IDENTITY_DESIGN.md`; implemented in the MAIN site v6
  (`bafybeihk6kre6fdymevncwrzybafbvemruqtebmafhtr3lmglgvni6wtfy`).
- **Measure:** derivation function `handleFromPublicKey` implemented; gate
  `passkeyGate()` settles all 8 failure reasons + unknown fail-closed.
- **Observe:** Android preview WebView honestly reported UNSUPPORTED — nothing faked.
- **Test:** ceremony self-test (built with this audit) exercises the shipped gate
  code against all reasons. No live ceremony has completed anywhere.
- **Conclude:** **PREDICTED.** The physical event: the legitimate bind-then-return
  test on `https://daviddigenova.com` — derive, bind one device, validate on return,
  receipted, gated. Blocked on: the stable origin (see §4, the bucket).

### L6. Father↔manifesto binding — the key pinned to the document · (ordered, unsealed)

- **Assess:** the Father key is pinned to the eFuse Cosmogenesis manifesto document;
  the document is pinned to IPFS; the page carries only the manifesto CID and runs
  `checkFatherBinding()`.
- **Find:** MAIN site v6 (`checkFatherBinding`, `MANIFESTO_CID`).
- **Measure:** `MANIFESTO_CID = null`. Zero key/paste references in the pinned page.
- **Observe:** the page honestly reports MANIFESTO NOT PINNED — the check exists,
  the document does not.
- **Test:** the check's three honest failures are coded; none can fire until the CID exists.
- **Conclude:** **HONEST GAP.** Blocked on David: the manifesto document itself
  (which file, or its existing IPFS CID). This is the missing logic of what pins
  the Father — named by David, not yet in hand.

### L7. Iris deterministic gates `iris.gates.v1` · ED-PREDICT-20261004-IRISGATES-V1

- **Assess:** seven gates; pure functions; no SEALED without a real answer;
  UNKNOWN never PASS.
- **Find:** `src/dccp/iris/gates.ts`, `IRIS_GATES_DESIGN.md`.
- **Measure:** unit suite green (in the 260).
- **Observe:** gates wired at connector, daemon settle points, father-bind SEALED
  construction, wallet verdict claim.
- **Test:** `gates.test.ts` green. The `?iris-audit=1` browser hook exists as designed.
- **Conclude:** **PROVEN** at unit level. Browser-E2E (a gate catching a real
  violation in a real browser) is **PREDICTED** — the hook exists; its execution
  is not evidenced in the record.

### L8. Daemon `dualis.daemon.v1` — the carrier · ED-PREDICT-20261004-DAEMON-V1

- **Assess:** durable outbox, retry with backoff, relay bake-in, consume-on-answer,
  manifest_hash idempotency end to end.
- **Find:** `src/dccp/pipe/daemon.ts`, `DAEMON_DESIGN.md`, `CLOSEOUT.md`.
- **Measure:** 260/260 green; backoff 5s→60min, 12 attempts → DEAD; relay outbox
  cap 10,000.
- **Observe:** post-build defects found by QA (retry timer, timer rounding) and fixed —
  the audit loop working, not failing.
- **Test:** unit + mock-kernel E2E per CLOSEOUT (bind → QUEUED → mock kernel
  answers → SEALED → no double delivery).
- **Conclude:** **PROVEN** against a mock kernel. **PREDICTED** against the real
  kernel — the physical event is David's endpoint answering `POST /bind`.

### L9. Genesis mark `dualis.genesis.v1` · ED-PREDICT-20261004-GENESIS-V1

- **Assess:** `mark = sha256('dualis|genesis|v1|' + unity_id)`; one per ID;
  standing never weight; fuse-close is an event.
- **Find:** `GENESIS_DESIGN.md`; built per CLOSEOUT Oct 4.
- **Measure:** deterministic derivation; idempotent issuance; hash-chained ledger.
- **Observe:** design reviewed in-run (predicted PASS, three voices).
- **Test:** in the 260 suite.
- **Conclude:** **PROVEN** as machinery. The fuse event itself is **PREDICTED** —
  it happens at the first SEALED Father bind, which hasn't happened.

### L10. 50/50 race · ED-PREDICT-20261004-5050RACE-V1

- **Assess:** 100M coins, 50M/50M pools, bicameral consensus, lane-by-receipt,
  standing never weight.
- **Find:** `5050_RACE_DESIGN.md`. Design only — no code, no minting, no promises.
- **Measure:** the 8 open questions (rail, deadlock, membership, emission,
  incentives, bounty pricing, entity resolution, initial parameters) are all
  **decided** — `ED-DECIDED-20261004-5050-V1`, ratified by David's word
  2026-10-04 ~6:30 PM EDT; the design doc is updated to match. Remaining work:
  Q5's Drive-doc reconciliation pull, and Q8's actual starting numbers (HELD
  for his ratification).
- **Observe:** the eFuse hard gate untouched: no launch without repeated full evidence.
- **Test:** none — nothing to run.
- **Conclude:** **PREDICTED** as design, with the eight decisions now ratified;
  **HONEST GAP** on every physical path — no rail live, no emission flowing,
  entity-resolution mechanism decided but unbuilt and untested, no evidence
  yet. Correctly unbuilt.

### L11. Iris app — her own messenger · ED-PREDICT-20261004-IRISAPP-V1

- **Assess:** standalone deterministic messenger; full DCCP depth; human-facing.
- **Find:** `IRIS_APP_DESIGN.md`.
- **Measure:** the static-vs-FULL-DCCP tension honestly reconciled via tiered
  capability (Tier 1 static core / Tier 2 relay path / Tier 3 honest gap);
  no key minted yet (`dualiscapax-iris` proposed only); no IPNS name yet.
- **Observe:** **RATIFIED** — David's word ("go ahead with everything"),
  2026-10-04 ~6:30 PM EDT. Build authorized and in flight (separate agent).
- **Test:** none yet — sealing conditions (§7 of the design) pending.
- **Conclude:** **PREDICTED** — the design is ratified and building; the seal
  waits on the evidence (repeat-question battery, KB versioning, boundary box,
  relay-path honesty, keepalive). Correctly unfired until today; now firing.

### L12. Discovery engineering — IPFS at swarm scale

- **Assess:** where time goes in pin/name/fetch; what changes at swarm scale.
- **Find:** `DISCOVERY_ENGINEERING.md`.
- **Measure:** Pinata 200-file pin 1.7s; w3name resolve 449ms; export linear to
  5k bundles (66KB→3.3MB).
- **Observe:** paged exports + backpressure implemented from these numbers.
- **Test:** benchmarks + `relayVolley.test.ts`.
- **Conclude:** **PROVEN** where measured. **HONEST GAP** where unmeasurable from
  the sandbox: DHT propagation, Bitswap fetch, gateway retrieval — marked
  UNMEASURED, never interpolated. The fill path is named: David's node measures
  them (§4, the bucket).

### L13. MAIN site v6 — the landing contract + ceremony

- **Assess:** the philosophical site; the Unity identity gate; the manifesto check.
- **Find:** pinned `bafybeihk6kre6fdymevncwrzybafbvemruqtebmafhtr3lmglgvni6wtfy`,
  IPNS live (seqno 4, resolver-verified).
- **Measure:** 48MB single file; gate settles 8 reasons + unknown; 0 key/paste refs.
- **Observe:** sitemap glows (see §2) — every root, the trunk, the branches alive.
- **Test:** ceremony self-test (built with this audit) runs the shipped gate code.
- **Conclude:** **PROVEN** as a pinned, honest surface. The ceremony it hosts is
  **PREDICTED** (L5).

### L14. Playground v3 + showcase v2 — the world and the code

- **Assess:** DCCP World with relay volleys; code showcase for the teams.
- **Find:** playground `bafybeieufijc64gu2wkovuvju35y6nyf3chnka6pjrq6frsfpqthuj6pfu`
  (IPNS live); showcase `bafybeihsnykpymm2wvcx47e7hnzyt2geslrfc67skqcu7nnqdaalyjriki`.
- **Measure:** 260/260 green at pin time; bundle markers verified pre-pin.
- **Observe:** swarms honest-empty ("NO TASKS BOUND") until manifests flow.
- **Test:** full suite at each pin.
- **Conclude:** **PROVEN** as pinned builds. Live swarm data is **PREDICTED** —
  the physical event is real manifests flowing.

### L15. The relay practice — BUILD → RELAY → PROPOSE → DISPOSE → SEAL

- **Assess:** the purest way: no centralized intelligence; Idris proposes over our
  context; Iris gates dispose locally.
- **Find:** `~/workspace/RELAY_PRACTICE.md`.
- **Measure:** this session ran it: relay builds → proposals → David's verdicts
  (enactments, corrections, the manifesto redirect).
- **Observe:** the loop carried real work end to end, multiple turns.
- **Test:** — lived, not unit-tested; it is a practice, and practices are proven
  by practice.
- **Conclude:** **PROVEN** — by the carrying. This audit is another carry.

### L16. One-origin `daviddigenova.com` — the stable origin

- **Assess:** one HTTPS origin for both pipes; passkeys bind to it permanently.
- **Find:** `~/workspace/one-origin/Caddyfile`, `SETUP.md`; domain chosen Oct 4;
  registrar Porkbun (David's word).
- **Measure:** DoH (Oct 4): `daviddigenova.com` → 207.207.210.50/.36/.23 —
  a parking/CDN front, **not his machine**. TTL ~12s.
- **Observe:** no A record to his box; Caddy not run; no TLS yet.
- **Test:** none possible from here — the sandbox cannot close this.
- **Conclude:** **HONEST GAP** — the confirmed physical gap holding up the loop.
  This is the bucket (§4).

### Headline counts

- **PROVEN:** 9 (L1, L2, L3, L4-logic, L7-unit, L8-mock, L9-machinery, L12-measured, L13-surface, L14-builds, L15-practice) — count precisely: L1, L2, L3, L4(logic), L7(unit), L8(mock), L9(machinery), L12(measured), L13(surface), L14(builds), L15(practice) = **11 proven facets**
- **PREDICTED:** L4(seal), L5, L7(browser E2E), L8(real kernel), L9(fuse),
  L10(design), L11(build → seal), L13(ceremony), L14(live data) = **9
  predicted**, each with its named physical event
- **HONEST GAP:** L6 (manifesto document), L10 (physical paths), L12
  (unmeasured rows), L16 (origin) = **4 honest gaps**, each with its named
  missing piece

No claim is sealed that isn't. No gap is hidden. That is the whole audit.

---

## 2. The glow audit — the sitemap as a tree

**Ordered by David:** "look at where the sitemap tree isn't glowing in the roots...
and where it's not glowing in the trunk, and where it's not glowing in the branches
— and if it's glowing in all the spots but one that will narrow it down."

Method: parsed the 48MB artifact's section/article ids (61) and anchor graph
(`data-go`, `href`, `data-main-anchor`, `data-ice-jump`, `setSimaPortal`,
`getElementById`) — structure, not raw text, because embedded base64 pollutes
naive greps. **GLOWING** = alive: reachable, with depth, onward links, or live
function. **DARK** = dead end: unreachable, no depth, no onward path.

### Roots — the five tabs: ALL GLOWING

| Root | Target | State |
|---|---|---|
| Orbs | `landing` | GLOWING — the frozen constellation; orb/JS navigation; 7 inbound |
| RTE | `rte-master` | GLOWING — hub: 4 onward links, 4 live buttons |
| Law | `doctrine` | GLOWING — frozen content leaf, full depth |
| Access | `access` | GLOWING — the ceremony lives here: 6 buttons, 5 cross-links |
| Pact | `compact` | GLOWING — hub: 15 onward links to the articles |

### Trunk — the landing narrative spine: GLOWING

`unity-contract` → `who` → `what` → `why` → `where` → `when` — sequential in
document order (a scroll narrative), interlinked, and `when` leads onward to
`playground-threshold` (the world). The contract fans out to the ceremony
(`who`/`what`/`why` each carry "Use Unity passkey" back to the contract).
The spine is intact end to end.

### Branches: GLOWING, two DIM spots

- **Fractals** (residual, edge, research, ai, unity, efuse): GLOWING — frozen,
  reachable via `data-go`, each functional.
- **RTE seats** (ice-rte + 4 divines via `data-ice-jump`; teach-rte; sima-rte +
  9 stages via `setSimaPortal`; canada → province → county → detail drill-down):
  GLOWING — every seat reachable, content + live buttons throughout.
- **Compact articles** (preamble, 1–6, signing, standing, law-beneath,
  primordial-fusion, trinity-proposal, first-signature, machine-reference,
  pledge, compactReceipt): GLOWING — leaves with real copy, all reachable from
  the compact hub.
- **Playground** (threshold → orientation): GLOWING — the threshold has its
  onward path; orientation is full depth.
- **Wallet** (`wallet-depth`): GLOWING — reachable, 3 live buttons.
- **DIM 1 — `unity-wallet-depth`:** a stub duplicate ("02 · ACCESS PREVIEW")
  that only renders as a child card inside `playground-threshold`; not
  independently reachable; its button is disabled; it shadows the real
  `wallet-depth`. Scaffolding residue — flagged for the rip-out, not the fire.
- **DIM 2 — the `access` ceremony, functionally:** structurally complete (gate,
  manifesto check, buttons all live) — but the physical bind hasn't happened.
  **This is the narrowed-down spot.** The tree glows everywhere; the fruit
  hasn't grown. Not a page to fix — an event to occur: the circuit closing.

David's narrowing worked: the sitemap is lit. The one dark spot is not in the
map at all — it is the unclosed circuit itself.

---

## 3. The bucket — smashing three things until one route works

**Ordered by David:** "put them in a bucket. smash the three things around and
close that circuit with logic and physical execution."

Three unrelated things go in the bucket:

1. **DNS mapping** — `daviddigenova.com` must resolve to David's box.
   Physical truth (DoH, Oct 4): 207.207.210.50/.36/.23 — a parking/CDN front,
   NOT his machine. Registrar: Porkbun. **The confirmed gap.**
2. **The Caddy origin** — his box serving TLS for the domain, proxying the
   local IPFS gateway. Written (`one-origin/Caddyfile`), not run.
3. **The IPFS content** — pins + IPNS names. **Done and verified:** MAIN v6,
   Playground v3, showcase v2 pinned; both IPNS names resolver-verified.

Each verified three ways (threes of threes) — see
`~/workspace/one-origin/CIRCUIT_CLOSEOUT.md` and `circuit-check.sh`.
Smashed together until **ONE route works:**

**`https://daviddigenova.com/` serving the MAIN site from IPFS.**

That one route is the **taproot**. The taproot grows the tree (the bound
identity, the relay loop, the swarm volleys). And David's longer word:

> "we're not interested in building trees anymore after this is done we're
> interested in building **forests**" — the one proven route replicates: many
> origins, many bound identities, many relays. The tree seeds the forest.

---

## 4. What remains physically uncloseable from the sandbox

David's side — no agent here can do these; the audit names them so nothing
is silently waited on:

1. **DNS:** Porkbun A record for `daviddigenova.com` → his box's public IP.
   (The single physical step holding up the loop.)
2. **Box:** run Caddy (`one-origin/Caddyfile`), IPFS daemon with gateway on
   127.0.0.1:8080, forward 80/443.
3. **Manifesto:** provide the eFuse Cosmogenesis document (file or existing
   IPFS CID) → it gets pinned → `MANIFESTO_CID` fills → the check goes live.
4. **Ceremony:** run the bind-then-validate on the live origin (his device,
   his fingerprint).
5. **Relay seal:** the first real counterparty round-trip — his machine
   consuming a relay export and returning a countersigned receipt.
6. **Kernel:** his DCLM endpoint answering `POST /bind` (until then: honest HOLE).
7. **Iris app:** RATIFIED (2026-10-04 ~6:30 PM EDT) — verdict revised for FULL
   DCCP via tiered capability, build authorized and in flight (separate agent).
   Key + IPNS name + sealing evidence pending the build.
8. **50/50:** the 8 open questions are DECIDED (`ED-DECIDED-20261004-5050-V1`);
   design updated to match. Remaining: the Drive incentive-docs reconciliation
   pull, and Q8's starting numbers (HELD for David's ratification).

When 1+2 close, the taproot exists. When 4 closes, the tree stands. The forest
comes after.

---

## 5. Verification layers built — and their first catch

This audit built what the logic lacked (David: "whatever we need now other
validation or verification layers as needed"):

1. **The bucket protocol** — `~/workspace/one-origin/CIRCUIT_CLOSEOUT.md` +
   `circuit-check.sh`: three things × three checks each, run on David's box,
   stops at the first red check naming the broken layer.
2. **Relay round-trip simulator** —
   `~/workspace/dccp-world/src/dccp/pipe/relayRoundTrip.test.ts` (7 tests,
   green): the full daemon circuit without a live counterparty — export →
   simulated counterparty → countersigned import → DELIVERED — with real
   Ed25519 cryptography on a TEST key, adversarial cases (wrong-key signature
   → PIN_MISMATCH; stray receipt ignored; HOLE stays live), and a paged
   volley. It proves the machinery carries; it cannot seal — only his machine
   seals.
3. **Ceremony gate self-test** — `~/workspace/ipfs-publish/ceremony-gate.test.mjs`
   (8 tests, green): mechanically extracts the SHIPPED functions from the
   pinned MAIN artifact (brace-balanced, no hand-copying) and asserts the gate
   contract — every outcome settled, origin always predicted, unknown reasons
   fail closed, derivation exact, the four honest `checkFatherBinding`
   outcomes.

**First catch (the self-test earning its keep):** the shipped `findSpkiInText`
required a base64 run of ≥60 characters — but a canonical 44-byte Ed25519
SPKI encodes to 59 characters + padding, so a legitimately pinned Father key
would NEVER have been found: the check would have reported FATHER NOT PINNED
with the key sitting right there. The logic mapped ("find the key in the
document"); the physical (the actual byte length of a real SPKI) didn't fit.
Fixed in the artifact source: threshold `{60,}` → `{56,}` (still far above
noise; the DER-envelope validation in `decodeBase64Spki` remains the real
filter). The self-test now passes against the fixed shipped bytes.

**Re-pin due:** the fix is a material behavior change, so the CID law fires —
a v7 re-pin is owed. Recommendation: bundle it with the `MANIFESTO_CID` fill
when David provides the manifesto document (one release, not two); until
then the check cannot execute in production anyway (`MANIFESTO_CID` is null),
so nothing live is misbehaving. The parent agent owns the pin.
