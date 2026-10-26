# Discovery Engineering — IPFS content discovery at swarm scale

**Status:** engineering reference, October 4, 2026. Measurements below are real
sandbox measurements unless marked **UNMEASURED** (could not be measured from
this sandbox — no invented numbers) or **NOT SEPARATELY TIMED**.

Companion work: `dualis.relay.v1` volley paging + relay-outbox backpressure
(implemented, tested — see RELAY_DESIGN.md § "Swarm volleys"). Verdict context:
ED-DECISION-20261004-RELAY-V1.

---

## 1. How discovery works on our path today

There are three distinct operations, and they have almost nothing in common
except the letters "IP":

**Pin (write).** We upload bytes to Pinata (`pinFileToIPFS`). Pinata's nodes
store the blocks and announce provider records for the resulting CID on our
behalf — from the network's perspective, *Pinata* provides the content, not
us. This is the centralized hand in our write path: convenient, fast, and the
thing the one-origin deployment removes (see §6).

**Name (mutability).** Our IPNS names are w3name keys. Publishing = signing a
record (key → `/ipfs/<CID>`, sequence number) and handing it to the w3name
service, which serves it. Resolving = asking w3name for the current record.
The sandbox has no libp2p/DHT connectivity, so w3name is our entire IPNS
reality. Records must be refreshed — hence the 12-hour republish crons.

**Fetch (read).** A consumer resolves the IPNS name → gets a CID → asks the
network for the blocks. This is where DHT provider records, Bitswap, and
gateways live. From this sandbox, gateway retrieval is throttled — we pin and
name, but we cannot verify the read path ourselves.

## 2. Where time goes in IPFS discovery (the general machinery)

**DHT provider records.** When a node "provides" a CID, it sends
`PUT_PROVIDER` records to the ~20 peers closest to the CID's key in the DHT.
Propagation is seconds to minutes depending on DHT health and churn. A
retriever sends `FIND_PROVIDERS` and walks the DHT outward until it finds a
provider, then connects directly. DHT walks are the slowest part of a cold
fetch — routinely seconds, occasionally tens of seconds on a churny network.

**Bitswap sessions.** Once a provider is found, the retriever opens a Bitswap
session: wantlist → provider → blocks. For small DAGs (our bundles, our pages)
this is fast after provider discovery — the discovery dominates, not the
transfer.

**Delegated routing / IPNI.** Instead of walking the DHT, a node can ask an
indexer ("where is this CID?") over HTTP. Publishers push *advertisements*
(chunked lists of CIDs, signed, chained) to the indexer. This is the fast
path and the direction the ecosystem is moving: publish once to an indexer,
every resolver finds you without a DHT walk. Our future node will speak this
(see §6).

**Gateways.** Public gateways combine all of the above with caching. First
fetch of a fresh CID through a gateway can be slow (cold DHT walk + transfer);
subsequent fetches are cached and fast. Gateway throttling from our sandbox
is a *read* condition, not a write condition — it tells us nothing about pin
or provide speed.

## 3. What Pinata announces on our behalf

Pinata runs IPFS nodes that hold our pinned blocks and serve provider records
for them. Consequences:

- Retrieval works with no node of ours online. That is the entire reason the
  current architecture functions.
- We cannot control reprovide cadence, DHT tuning, or Bitswap strategy — it
  is their infrastructure, their knobs.
- Every pin is an API call to one company. The distribution law tolerates
  this as carriage, not as architecture — the pure path (§6) removes it.

## 4. w3name latency profile

| Operation | Measured | Notes |
|---|---|---|
| IPNS resolve (playground name → current CID) | **449 ms** | Timed 2026-10-04; resolved to the live v2 CID, confirming the re-pin |
| IPNS publish | NOT SEPARATELY TIMED | Exercised via the re-pin flow (seconds); the 12h crons do this routinely |
| Record lifetime | 12h refresh cadence | The republish crons exist because records go stale without refresh |

w3name is not the DHT — it is a hosted IPNS publisher/resolver. Fast and
reliable, and equally a hosted dependency. On the one-origin node, IPNS
publishing moves to the node's own DHT presence (slower to propagate, no
hosted dependency — the purity trade, made deliberately).

## 5. What changes at swarm scale

Today a "volley" is occasional: one site build, one export. When Iris commands
bot swarms, a volley is the steady state — hundreds to thousands of relay
bundles per export cycle, receipts raining back. The costs that matter:

**Export size is linear in the outbox.** Benchmarked in-process (sandbox,
2026-10-04):

| Bundles | Export bytes | Serialize | Parse |
|---|---|---|---|
| 100 | 66 KB | 0.4 ms | 0.9 ms |
| 1,000 | 665 KB | 5.9 ms | 4.4 ms |
| 5,000 | 3.3 MB | 24.4 ms | 23.0 ms |

Linear — and that is *before* network. A 50k-bind outbox is a ~33MB monolith
the counterparty must parse in a browser tab before doing anything. The fix
is structural, not incremental: **paged exports** (bounded pages, deterministic
order, resumable cursor), which is what `exportRelayPage` implements. A page
is a complete, valid export — the counterparty needs no new code path, only
the discipline to follow `next_after_sequence`.

**Pin time is linear in bytes.** Measured: 200 files / ~800KB pinned via
Pinata in **1.7s** (test pin removed afterward). Extrapolating is honest only
as order-of-magnitude: pin upload is the one cost that grows with volley
size, and paging bounds it per pin. Ten 500-bundle pages pin as ten small
uploads, not one 3.3MB upload — and a failed page retries alone.

**Provide/announce cost is per CID (plus per page).** UNMEASURED from here
(no DHT), but the structure is what matters: one provider record per pinned
page CID, not per bundle. Bundles are *inside* pages — they are discovered
via the page, never announced individually. This is the correct layering:
announce pages, address bundles by manifest_hash *within* the fetched page.

**Receipts are the mirror image.** Receipt imports page the same way
(`parseRelayReceiptImport` already skips malformed members without failing
the batch). Idempotency is manifest_hash on both directions — a replayed page
is ignored, a duplicated manifest collapses to one. The invariant holds at
swarm scale exactly as at single-bind scale, because it never depended on
scale in the first place.

**The outbox must be bounded.** An unbounded relay outbox in a browser tab is
a memory leak with a schedule. The saturation valve (`relayOutboxMax`,
default 10,000 bundles ≈ ~6MB) keeps the store bounded: when saturated, binds
are *not* relayed — they stay honestly QUEUED in the retry queue, a
`relay-saturated` event fires, and the next export cycle drains the backlog.
Backpressure, not loss.

## 6. The one-origin runbook (future — David's node, not this sandbox)

When the one-origin box goes live, it becomes a real IPFS node and the
centralized hands come off. The provider-record strategy, in order:

1. **Kubo with the accelerated DHT client** — the standard answer to slow
   provider walks; it maintains a fuller routing table so FIND_PROVIDERS
   resolves in far fewer hops.
2. **Provide on pin.** Every relay page pinned locally is provided to the
   DHT immediately (Kubo does this by default on pin; verify
   `Provide.Enabled`). Reprovide sweep on the default cadence — the records
   must outlive DHT churn.
3. **IPNI advertisements.** Publish signed advertisement chains for page
   CIDs to an indexer (e.g. via `ipni` tooling or Kubo's delegated-routing
   publish path). One advertisement per page CID; the `chunk_id` on each page
   lets the publisher skip re-advertising identical pages — a dedupe hint,
   never a delivery identity.
4. **Pinata becomes a second pinner, not the pinner.** Keep it as redundancy
   during transition, then drop it. The pure path is: our node pins, our node
   provides, our node advertises.
5. **IPNS moves to self-publishing.** The node's own key publishes IPNS
   records to the DHT directly. Slower initial propagation than w3name,
   zero hosted dependency. Keep the 12h republish cadence (records still go
   stale).

None of this is implemented here — the sandbox cannot run a DHT node. It is
documented so the node deployment is a checklist, not a research project.

## 7. Honesty ledger — measured vs unmeasured

| Claim | Status | Evidence |
|---|---|---|
| Pinata pin: 200 files / ~800KB in 1.7s | MEASURED | Timed `pin_dir.py` run, 2026-10-04; test pin unpinned after |
| w3name IPNS resolve: 449ms | MEASURED | Timed `w3name` resolve of the live playground name, 2026-10-04 |
| Export serialize+parse linear to 5k bundles | MEASURED | In-process benchmark (table in §5) |
| Paged exports tile the outbox exactly | MEASURED | Test suite: `relayVolley.test.ts` (chunk tiling, cursor chain) |
| Saturation valve holds the outbox bound | MEASURED | Test suite: `relayVolley.test.ts` (saturate → skip → drain → resume) |
| manifest_hash idempotency at volley scale | MEASURED | Test suite: duplicate manifests collapse; replayed receipts ignored |
| DHT provider-record propagation time | UNMEASURED | No DHT connectivity from this sandbox |
| Bitswap fetch timing | UNMEASURED | No libp2p from this sandbox |
| Public gateway retrieval of our CIDs | UNMEASURED | Gateway traffic throttled from sandbox (standing residual) |
| w3name publish latency, isolated | NOT SEPARATELY TIMED | Exercised inside the re-pin flow (seconds); 12h crons cover it |
| CAR transport benefit | NOT PURSUED | No CAR library in sandbox; JSON pages pin fine; Kubo speaks CAR natively when the node exists |

The rule going forward: numbers we measured are stated; numbers we could not
measure are marked, never interpolated. The swarm will produce its own
measurements from David's node — that is where the UNMEASURED rows get filled.
