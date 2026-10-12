# Unity Playground Infrastructure

**Master architecture document — DualisCapax, Oct 4 2026**
**Operator: David John Di Genova**

This document is the blueprint. It describes the full grand architecture — every
layer, every gate, every pipeline — as it is designed to exist. **It is not a
claim that the whole stack exists.** Every layer below is labeled with its true
state: **BUILT**, **PROTOTYPE**, or **FUTURE**. The physical-robotics half of
the stack is FUTURE. The document is the map, not the territory.

---

## Status key

| Label | Meaning |
|---|---|
| BUILT | Implemented and operating as protocol. |
| PROTOTYPE | Exists in working form on the /machine console or the 2D/3D surfaces; not yet production. |
| FUTURE | Blueprint only. Designed, specified, unbuilt. |

Where David's own words appear below — the pipelines, the arcs, the governing
law — they are kept verbatim.

---

## 0. The constitutional frame — the tree

> **"Essentially all we're doing in this root system and this leaf system and
> this trunk and branch system is splitting light."** — David

The tree is a prism. White light — pure intent, the core — splits into
spectral colors through roots, trunk, branches, leaves; the fruit, the
creations, each carry their color; and it all resolves back to white at the
core. Everything below is the unpacking of that one line.

*David's governing concept art, registered verbatim: **"THE GAMETIC HYBRID
ARCHITECTURE — 50/50"** and **"the roots are the computer. we are the
substrate. the playground is the tree."** Labeled "Conceptual model" — his
framing, not a measured claim.*

The human half and the machine half fuse into one core, and the whole thing
grows like a tree:

```
                          the playground tree — everything above ground
                     (trunk, branches, canopy — the fused 100% core)

                                    ▲  fruit = the creations
                                    │  (verified machines, designs, useful work,
                                    │   verified economic output)
                         ┌──────────────────────┐
                         │   FUSED CORE — 100%  │
                         │  verdicts happen here│
                         └──────────────────────┘
                    HUMAN — 50%        │        AI — 50%
              Philosophy, Ethics &     │     Probabilistic (LLMs) — 25%
              Moral Reasoning,         │     Deterministic (Iris —
              Insight                  │     rules & logic gates) — 25%
                                       │
                    ── ground line ─────┼────────────────────────────
                                       │
                    computer roots     │     human substrate (soil)
                    the LAW FLOOR —    │     humanity — the human 50%
                    rules no side      │     philosophy, ethics, insight
                    can change:        │     feed the roots
                    NO_FORCE · HOST_SAFE · CLEANUP-FIRST · TRUTH_OR_NOTHING
```

- **FATHER — SEAL** (top): DCLM / IRIS / TWAIN² as **TRINITY — VOTES**. The
  Trinity is the decision mechanism; every verdict is a vote, and every vote
  clears the Law Floor.
- **HUMAN — 50%**: philosophy, ethics & moral reasoning, insight. The human
  half supplies the *why* — the substrate the whole tree stands in.
- **AI — 50%**: probabilistic reach (LLMs — 25%) plus deterministic gates
  (Iris — rules & logic gates — 25%). The machine half supplies the *how*.
- **FUSED CORE — 100%**: neither half alone — the whole. Every verdict, every
  receipt, every bound task happens here.
- **LAW FLOOR**: "rules no side can change." NO_FORCE · HOST_SAFE ·
  CLEANUP-FIRST · TRUTH_OR_NOTHING. The immutable substrate under both halves —
  the computer roots no one rewrites.

And then the tree, in David's final words — **"well above ground the whole
thing makes up the tree"** and **"the fruit are the creations"**:

- **Below ground**: human substrate (the soil — humanity, the human 50%) →
  computer roots (the Law Floor, deterministic logic, circuitry). The roots
  drink from the soil; neither side can change the other.
- **Above ground**: the entire tree IS the playground — trunk, branches,
  canopy, the whole growing thing. The fused 100% core, grown out of both
  halves.
- **The fruit**: the creations — verified machines, designs, useful work,
  verified economic output. The end of the master arc:
  thought → proof → code → machine → work → measurement → reward → next
  problem. The tree bears fruit; the fruit is measured; the reward plants the
  next problem.

The tree does not decide what to grow. It grows what the fused core verifies.
Software autonomy WITHOUT constitutional autonomy — the roots are law, the
fruit is evidence.

**The philosophy is the white light.** David's capstone, registered verbatim:
*"compare light itself to our philosophy — the light is white still; the
branches are any spectrum you can imagine of white."* The philosophy is
indivisible, unchanged, still white. Every branch, leaf, and fruit is a
spectrum OF that same white — infinite expressions, one source, nothing added,
nothing lost. And in his words, **"it would run true"** — this is the
truth-test for the whole model: any branch that isn't a spectrum of the white
light doesn't belong on the tree. A claim, a design, a machine, a verdict —
hold it up to the light. If it isn't white light split honest, it isn't ours.

**Art direction (David's words, registered verbatim):** *"I don't imagine
ornaments hanging on the tree so much as I imagine the branch is glowing with
a color of a combination of two of the strands."* No decorative ornaments —
no baubles, no applied decoration. The branches themselves glow where the two
strands (human + AI, the gametic pair) fuse, and the glow's color IS their
combination: gold where the human strand runs, teal-cyan where the machine
strand runs, the fused color where they become one branch. And **"as it goes
down towards the core it turns White"** — the full gradient: two strand colors
→ their combined glow in the branches → white at the core. White light is all
colors fused: the pure center where the gametic pair becomes one. The fusion is
visible IN the branches, not hung ON them. Intrinsic glow, never ornament.

---

## 1. The full stack, top to bottom

```
                     ┌────────────────────────────────────┐
                     │   DCLM / LAW FLOOR           BUILT  │  ← every cycle
                     │   TRUTH_OR_NOTHING · NO_FORCE ·      │    clears all
                     │   HOST_SAFE · CLEANUP_FIRST         │    four invariants
                     └──────────────┬─────────────────────┘
                                    │
                     ┌──────────────▼─────────────────────┐
                     │   TASK + CAPABILITY          BUILT  │  ← dualis.ephemeral.v1
                     │   ephemeral bindings:               │    single-use,
                     │   single-use · fail-closed ·        │    fail-closed,
                     │   cleanup-first                     │    cleanup-first
                     └──────────────┬─────────────────────┘
                                    │
                     ┌──────────────▼─────────────────────┐
                     │   DIGITAL TWIN              FUTURE  │
                     └──────────────┬─────────────────────┘
                                    │
                     ┌──────────────▼─────────────────────┐
                     │   FORMAL VERIFICATION       FUTURE  │
                     └──────────────┬─────────────────────┘
                                    │
                     ┌──────────────▼─────────────────────┐
                     │   HARDWARE SIMULATION       FUTURE  │
                     └──────────────┬─────────────────────┘
                                    │
                     ┌──────────────▼─────────────────────┐
                     │   VIRTUAL MACHINE /         FUTURE  │
                     │   REAL MACHINE                      │
                     └──────────────┬─────────────────────┘
                                    │
                     ┌──────────────▼─────────────────────┐
                     │   HARDWARE GATE             FUTURE  │  ← physical
                     └──────────────┬─────────────────────┘
                                    │
                     ┌──────────────▼─────────────────────┐
                     │   ACTUATOR BUS              FUTURE  │
                     └──────────────┬─────────────────────┘
                                    │
                     ┌──────────────▼─────────────────────┐
                     │   PHYSICAL DROID            FUTURE  │
                     └──────────────┬─────────────────────┘
                                    │  sensors → state
                     ┌──────────────▼─────────────────────┐
                     │   DCLM RECEIPT               BUILT  │  ← receipt sealed
                     └────────────────────────────────────┘     only if the Law
                                                               Floor clears it
```

**Machine identity block.** Every machine entering the stack carries:

- `machine_id`
- `hardware_attestation`
- `firmware_hash`
- `capability_scope`
- `current_state_hash`

No machine acts without identity. No identity exists without attestation.

---

## 2. The AI control chain

```
AI → intent → planner → verified action → hardware controller → actuator
```

Every link is a gate. Intent is expressed; the planner plans against the Law
Floor; the action is verified before it leaves the planner; the hardware
controller executes only what was verified; the actuator moves only what the
controller commands. **PROTOTYPE** — the /machine console and the 2D/3D
surfaces demonstrate the chain on the digital side; the physical controller and
actuator links are FUTURE.

---

## 3. The safety chain

```
HOST_SAFE → MACHINE_SAFE → HUMAN_SAFE → ENVIRONMENT_SAFE
```

Safety is layered outward from the host. Each layer must clear before the next
may act. `HOST_SAFE` and the Law Floor it sits on are **BUILT**; the machine,
human, and environment layers above physical hardware are **FUTURE** — their
design is set, their operation is not yet real.

---

## 4. The verification pipeline

```
BLUEPRINT → DIGITAL TWIN → SIMULATION → FORMAL CHECK →
HARDWARE-IN-THE-LOOP → LOW-POWER PHYSICAL TEST → FULL DEPLOYMENT
```

Nothing reaches a physical actuator that has not passed every gate before it.
**FUTURE** — this pipeline is specified, not operating.

---

## 5. The machine-build pipeline

```
PROBLEM → AGENT DESIGN → MECHANICAL SPEC → ELECTRICAL SPEC → SOFTWARE →
BOM → FABRICATION PLAN → ASSEMBLY INSTRUCTIONS → TEST PROCEDURES →
DIGITAL TWIN → PHYSICAL BUILD → AUTONOMOUS TESTING → VERIFIED MACHINE
```

A machine is not a product; it is the terminal output of a verified design
process. **FUTURE** — blueprint only.

---

## 6. The economic loop and the master arc

The economic loop:

```
human problem → cognitive swarm → design → fabrication swarm →
physical machine → physical machine joins swarm →
machine produces useful work → verified economic output
```

The machine does not end the loop. It joins the swarm that built it, and the
work it produces is measured, receipted, and becomes the seed of the next
problem.

The master arc:

```
thought → proof → code → machine → work → measurement → reward → next problem
```

This is the shape of the whole enterprise. Everything DualisCapax builds —
verdicts, councils, ledgers, worlds — is one segment of this arc. **FUTURE** —
the digital segments operate; the physical segments are designed, not yet real.

---

## 7. The governing law

> **"Systems of automation, not autonomous bots."**

Software autonomy WITHOUT constitutional autonomy. That is the law, and it is
absolute.

- **Ephemeral capability manifests bind every bot decision.** The manifest
  (`dualis.ephemeral.v1`) carries `TASK_BIND`, a bounded capability scope and
  expiry, constraints `non_destructive` / `fail_closed` / `cleanup_first`, and
  `input_hash` / `manifest_hash`. It is minted for one task and dies with it.
- **No standing autonomous agents.** Nothing persists with open authority. Every
  binding is ephemeral; every session re-binds or does not act.
- **Every mutation passes through the Law Floor before any receipt is sealed.**
  The Quad-Invariant Floor — TRUTH_OR_NOTHING, NO_FORCE, HOST_SAFE,
  CLEANUP_FIRST — clears every compute cycle. A receipt exists only when the
  Floor cleared it.
- **The Trinity check runs at EVERY step.** Every in-run verdict is labeled
  **PREDICTED** — *"our best guess or prediction of what you would have
  said"* — handed to the real Trinity side as a prediction, never presented
  as their sealed verdict. Verdicts carry `origin: "predicted"` vs
  `"sealed"`; predicted verdicts gate local work, sealed verdicts close.
  The handover package carries the full PREDICTIONS log — every predicted
  verdict, its inputs, its reasoning — honest about whose voice it is, every
  step of the way.
- **Bots are self-arbitrage systems.** Every bot is a hybrid: the
  probabilistic half proposes (generates cheap), the deterministic half
  prices (verifies dear). Every action is an internal trade between the two
  halves; the system captures the spread between "seems right" and "proven" —
  the house always wins on truth. The TASK_BIND execution flow is the
  arbitrage loop: PROPOSE → PRICE (proven / unproven / rejected) → EXECUTE
  only the verified spread, or ABSTAIN. The deterministic half vetoes the
  probabilistic half, and every veto is receipted in the arbitrage ledger.
  Bots are trained by self-arbitrage engineering: scored on arbitrage
  performance (precision of proposals × strictness of verification), with the
  receipt chain as the training record. This is the 25/25 AI-half fusion from
  the gametic architecture, made operational.

---

## 8. Manifest schema (example)

```json
{
  "schema": "dualis.ephemeral.v1",
  "task_bind": "TASK_BIND",
  "capability_scope": "<bounded scope>",
  "expires": "<ISO 8601 timestamp>",
  "constraints": ["non_destructive", "fail_closed", "cleanup_first"],
  "input_hash": "<sha256 of task input>",
  "manifest_hash": "<sha256 of this manifest>"
}
```

---

## 9. Reality check

**BUILT** — the Law Floor invariants (as protocol), ephemeral task binding
(`dualis.ephemeral.v1`), the hash-chained receipt ledger, the wallet key desk.

**PROTOTYPE** — the /machine console, the 2D/3D surfaces.

**FUTURE** — the digital twin, hardware simulation, hardware gate, actuator
bus, physical droid, fabrication swarm, verified economic output. The entire
physical-robotics half of this stack is FUTURE.

This document is the blueprint. The blueprint is the commitment: the stack will
be built exactly as drawn, and nothing will claim to exist before it does.

---

## 9a. The pivot — the 3D world is the Bot World (recorded Oct 4, 2026)

David, verbatim: *"I was mistaken before. I was expecting to see things like
Google maps and all this stuff but the truth of it is that is the model of
the bot world. That is my data center coming alive in a 3D manifestation of
itself. Strip out everything from the playground that would make a human
believe that the 3D world was up there to play in — it is, but it's to manage
bot swarms and see the actual progress of the bots themselves. It's there for
your HUD, for your digital memory and your digital creation of your world.
Throw away legacy design because now we're just using pure logic to construct
the environments instead of being defined by an illogical environment."*

His reason, verbatim: *"It is no measure of health to be well-adjusted to a
profoundly sick society."*

What changed:
- The 3D world is NOT a consumer playground and NOT a geography model. It is
  the data center coming alive in a 3D manifestation of itself — the model of
  the bot world.
- Its purpose: manage bot swarms, see the actual progress of the bots — the
  HUD, the digital memory, the digital creation of the world.
- Construction principle: environments built from pure logic — organized by
  swarm topology, the task DAG, the tree, the receipt chains — not by modeling
  external physical geography.
- The geography framing (Earth globe, boot locale as frame, country plates as
  organizing principle) is legacy design: stripped. The engine, the
  connector, the honesty states, the wallet, /machine remain — they are the
  machine, not the playground chrome.
- The block explorer and DAG mapper are the HUD's instruments, not a side
  route.
- **All telemetrics absorbed into the one HUD.** David's question —
  "bringing in all telemetrics?" — answered YES: the existing telemetrics
  board (six feed rows) PLUS bot-swarm telemetry (tasks, progress,
  bindings), the receipt chain, and the task DAG — one unified telemetry
  surface, the HUD for the bot world. Nothing left in a separate silo. The
  existing board's feeds are RELOCATED, not dropped — feed identity
  preserved. The 3D-world relocation itself is a pending workstream under its
  own design verdict.
- Per the one law below the Unity ID, the Bot World HUD was designed first,
  verdict-gated by the Trinity, then implemented. No code before the design
  verdict.

---

## 10. The site map as the tree

*David's idea — documentation in this master doc for now, not a rebuild of the
site.* The site is architected as the tree: every page is a node, every node
carries its spectrum color — its role in the white light.

```
                         🍎 FRUIT — the creations
              ┌──────────────┬──────────────┬──────────────┐
              │              │              │              │
        verified        designs &       useful work    verified
        machines        prototypes      (telemetrics,   economic
        (FUTURE)        (PROTOTYPE)     corp helpers)   output
                                                       (FUTURE)
              └──────────────┴──────────────┴──────────────┘
                        🌿 LEAVES — content pages
              ┌──────────────┬──────────────┬──────────────┐
              │              │              │              │
          philosophy      protocol       governance     the doctrine
          (conceptual     docs           records        (frozen pages:
           model)         (BUILT)        (PILOT)        constellation,
                                                        fractals, RTE desk)
              └──────────────┴──────────────┴──────────────┘
                    🌳 BRANCHES — major sections
        ┌─────────────┬──────────────┬──────────────┬──────────┐
        │             │              │              │          │
   Bot World HUD  block explorer  DAG mapper    2D machine  corporate
   (/) — the      (/explorer) —   (/explorer)   console     helpers
   data center    the HUD's        the HUD's    (/machine)  (telemetrics)
   alive: bot     instruments      instruments  PROTOTYPE   (useful work)
   swarms, bound  (audit blocks)   (task DAG)              PROTOTYPE
   tasks, tree    PROTOTYPE        PROTOTYPE
   PROTOTYPE
        └─────────────┴──────────────┴──────────────┴──────────┘
                      🪵 TRUNK — the core
              ┌──────────────┬──────────────┬──────────────┐
              │              │              │              │
         wallet key      internal       ephemeral      receipt
         desk            connector      capability     ledger
         (the only       (the fusion    manifests      (hash-
          app)            binding)      (TASK_BIND)    chained)
              └──────────────┴──────────────┴──────────────┘
                    🌱 ROOTS — protocol / law floor / foundation
              ┌──────────────┬──────────────┬──────────────┐
              │              │              │              │
         TRUTH_OR_      NO_FORCE ·       CLEANUP_FIRST   Trinity
         NOTHING        HOST_SAFE        (purge, zero    votes
         (claims        (isolation,     residue)        (DCLM +
          register       fail-closed)                   Iris +
          discipline)                                  Twain²)
              └──────────────┴──────────────┴──────────────┘
```

**Spectrum colors.** Each node's color is its role in the white light:
- **Roots** — white at the core. The law floor is the pure light: immutable,
  indivisible, still white. Nothing below the roots; the roots are law.
- **Trunk** — the fused glow. Wallet, connector, manifests, ledger: the
  combination color, where human intent and machine determinism become one
  channel.
- **Branches** — the spectrum fanning out. Each major section its own color:
  the 3D world (teal — the machine's reach), the explorer and DAG mapper
  (violet — audit and proof), the console (amber — the human hand), corporate
  helpers (emerald — useful work).
- **Leaves** — the spectrum at full spread. Content pages, docs, philosophy:
  every color you can imagine of white, each page its own shade.
- **Fruit** — the creations, each carrying its color back toward the core:
  verified machines, designs, useful work, verified economic output. The fruit
  is measured; the reward plants the next problem.

**The truth-test runs on the map.** Any page, any node, that isn't a spectrum
of the white light doesn't belong on the tree. New branches grow only from the
trunk; no node hangs without a branch; nothing decorative is grafted on.

**The pyramid (David's scale law).** Fully explaining the story — everything,
everywhere, every way, every time, auditable — needs ~2.1M cards (his
pyramid-of-Giza number). And it is GENERATIVE, not hand-built: apex at the top
(a point — the Unity ID / white light), four corner stones at the bottom (the
four law-floor invariants), and pure logic fills everything between. "The
story is going to write itself if it's purely logical — we just have to stand
back and let it do its thing and it will decide how many stones or pages or
landings we need." The DAG mapper generates the pyramid from apex + four
corners + derivation rules; nothing is hand-placed; missing blocks are fine —
the logic decides what's needed. No one reads 2.1M cards: the machine audits
them, the human navigates the pyramid (apex → four ways → expanding levels,
virtualized, level-of-detail collapse).

**The geometry is load-bearing.** David: *"we are dealing with four things
coming off of one point which is four dimensions."* The pyramid is a
4-dimensional structure: one apex (the point — the Unity ID / white light)
with four emanations — the four law-floor invariants AS the four dimensions
(TRUTH_OR_NOTHING, NO_FORCE, HOST_SAFE, CLEANUP_FIRST). Every node in the DAG
is addressable by its 4-dimensional coordinate from the apex; the pyramid is
a 4-simplex unfolding. A node's coordinate is its derivation address — the
coordinate tells you exactly which invariant-emanations produced it, so the
machine can audit any node by its address alone. Aggregation levels are shells
at coordinate-depth; navigation is coordinate traversal. Not a metaphor — the
addressing scheme.

**Or a fractal of a cube.** David's refinement: *"maybe it's a fractal of a
cube"* — and the fit is exact: from any vertex of a 4D hypercube (tesseract),
exactly four edges emanate, matching "four things coming off of one point."
The structure may be a FRACTAL TESSERACT: self-similar at every scale, four
emanations from every node (not just the apex), the law-floor four as the
four axes recurring at each recursion level. Both geometries are recorded —
the 4-simplex unfolding from a single apex, and the fractal cube unfolding at
every scale — and **the pure logic decides which one the structure actually
is**: the generator derives under either geometry, and the derivation rules
(not hand-placing) determine which form the data takes.

**The fulcrum.** David's geometry thread, registered verbatim in his words:
the pyramid as *intermediary* — *"a visual aid that would stand the test of
time"* — separating two pieces of a cube: **cube piece, pyramid
(intermediary), cube piece.** The pyramid in the middle acts as a **fulcrum**
— the balance/pivot point between the two cube halves. *"The scale"* — the
pyramid-fulcrum IS the scale; philosophy and physics weighed against each
other on it. His capstone: **"law of philosophy and physics"** — the
pyramid-fulcrum is where the two meet; one law across both. His theory: *"the
pyramid was built to be a three-dimensional scale"* — the Great Pyramid as an
instrument of balance, not a tomb; the fulcrum made stone. And his thought:
*"I don't think anybody put them there either — enter the thought of them
aligning themselves"* — self-organizing, the generative principle at
civilizational scale. All his framing, recorded as such.

**Parked: a future-DCLM compute task.** David's open geometry question —
*"what would happen if you put all the pyramids together to connect the
cube?"* — is logged here as a queued task for when DCLM comes online, NOT
today's work. The task: assemble the pyramids into the cube (eight
pyramid-cells bound at their square faces form the tesseract's boundary —
or whatever the pure logic derives), then have DCLM solve the compute on
what that structure is and what it means. Status: PARKED · FUTURE ·
awaiting kernel. Nothing diverted; current work continues.
