# Pin Record — DCCP World v1

- **CID:** `bafybeieufijc64gu2wkovuvju35y6nyf3chnka6pjrq6frsfpqthuj6pfu`
- **Pin name:** `dccp-world-v1`
- **Size:** 4,644,024 bytes
- **Pinned:** 2026-10-05 ~03:49 UTC via Pinata (authenticated pin oracle)
- **Source:** `~/workspace/dccp-world/ipfs-dist/` (4.6 MB — index, assets, explorer/machine/pyramid/story/arbitrage/registry routes, dclm-receipts.json, og.jpg)
- **Excluded:** `.vercel/` build cache (ephemeral, not content)

## Gateway status (observed at pin time)
- Pinata public gateway: 403 for HTML (ERR_ID:00023 — needs dedicated gateway on current plan)
- ipfs.io: 429 (rate limited during check)
- The pin is confirmed and content-addressed. Serving is the failover's job.

## Next
- Replicate to a second pinner in parallel.
- Offload to Cloudflare R2 (needs CF credentials).
- Deploy `dccp-gateway` Worker (parallel race + serial fallback).
