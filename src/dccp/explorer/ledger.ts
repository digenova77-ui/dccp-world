/** Pilot receipt ledger — hash-chained block records of the app's own transmission pathways.
 *
 * Rule, per ~/workspace/dclm-origin/INGRESS_CONTRACT.md (append-only, each receipt
 * hash-linked to the previous):
 *   hash = sha256(prev_hash || canonical(receipt))
 *
 * The seed blocks below are PATH / OBSERVATION records compiled from this app's own
 * source (the connector, the agency key desk, the honest HOLE paths). Each records a
 * genuine transmission pathway — not a network event that happened, and not a claim
 * about a live kernel. Everything is labeled PILOT · LOCAL · UNVERIFIED.
 *
 * The kernel is not mounted, so there are no sealed live blocks — only these records
 * and the honest empty slots that follow them. Read-only: the ledger is never written
 * by this route.
 */

export const LABEL = 'PILOT · LOCAL · UNVERIFIED'
export const LABEL_FIRST = 'PILOT · LOCAL · FIRST JOB'
export const GENESIS_PREV = '0'.repeat(64)
/** When this seed manifest was compiled. All seed blocks share it; they are path
 *  records, not a timeline of network events. */
export const COMPILED_AT = '2026-10-04T16:30:00.000Z'

export type ReceiptKind = 'GENESIS' | 'PATH' | 'OBSERVATION' | 'TASK_BIND'

export interface Receipt {
  seq: number
  ts: string
  kind: ReceiptKind
  event: string
  detail: string
  ref: string
  label: string
}

export interface ChainedBlock {
  receipt: Receipt
  prev_hash: string
  hash: string
}

export interface LinkReport {
  seq: number
  valid: boolean
  expected: string
  actual: string
}

/** Deterministic canonical form: recursively sorted keys, compact JSON. */
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'
  const keys = Object.keys(value as Record<string, unknown>).sort()
  return (
    '{' +
    keys.map(k => JSON.stringify(k) + ':' + canonical((value as Record<string, unknown>)[k])).join(',') +
    '}'
  )
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

/** The link function: hash = sha256(prev_hash || canonical(receipt)). */
export async function linkHash(prevHash: string, receipt: Receipt): Promise<string> {
  return sha256Hex(prevHash + canonical(receipt))
}

/* ------------------------------------------------------------------ */
/* Seed: the app's own honest transmission history, as path records.    */
/* ------------------------------------------------------------------ */

const S = COMPILED_AT

const SEED: Omit<Receipt, 'seq'>[] = [
  {
    ts: S,
    kind: 'GENESIS',
    event: 'LEDGER_GENESIS',
    detail:
      'Pilot receipt ledger opened. Hash rule: sha256(prev_hash || canonical(receipt)), per the DCLM ingress contract. Quad-Invariant Law Floor clears every cycle: TRUTH_OR_NOTHING · NO_FORCE · HOST_SAFE · CLEANUP_FIRST.',
    ref: '~/workspace/dclm-origin/INGRESS_CONTRACT.md',
    label: LABEL,
  },
  {
    ts: S,
    kind: 'TASK_BIND',
    event: 'TASK_BIND · FIRST JOB — UNITY PLAYGROUND INFRASTRUCTURE',
    detail:
      'Ephemeral capability manifest (dualis.ephemeral.v1) minted locally for the canonical first job: real-world schematics in, prototype spec out, future roadmap receipted. Capability scope + expiry, constraints non_destructive / fail_closed / cleanup_first, input hash, manifest hash. State, honestly: minted locally — no kernel is mounted, so UNBOUND · HOLE · KERNEL_UNAVAILABLE. The task was bound; the machine did not see it. Systems of automation, not autonomous bots.',
    ref: 'dualis.ephemeral.v1 manifest — parallel workstream, seed record',
    label: LABEL_FIRST,
  },
  {
    ts: S,
    kind: 'PATH',
    event: 'CONNECTOR_DROPPED · DISABLED',
    detail:
      "transmitBoxToDCLM() with enabled !== true drops the box before any bytes move — 'transmission is disabled'. Nothing is transmitted, nothing is fabricated.",
    ref: 'src/dccp/pipe/connector.ts',
    label: LABEL,
  },
  {
    ts: S,
    kind: 'PATH',
    event: 'CONNECTOR_DROPPED · NO_ENDPOINT',
    detail:
      'With no ingress endpoint set the box is DROPPED/NO_ENDPOINT. The public builder shows HOLE rather than silently routing to an arbitrary machine.',
    ref: 'src/dccp/pipe/connector.ts · INGRESS_CONTRACT.md',
    label: LABEL,
  },
  {
    ts: S,
    kind: 'PATH',
    event: 'CONNECTOR_DROPPED · OVERSIZE',
    detail:
      'An envelope longer than 256 UTF-8 bytes (DEFAULT_MAX_PAYLOAD_BYTES) is DROPPED/OVERSIZE — it was not sent. The connector enforces the tighter public ABI before the 64 KiB ingress ceiling is ever reached.',
    ref: 'src/dccp/pipe/connector.ts',
    label: LABEL,
  },
  {
    ts: S,
    kind: 'OBSERVATION',
    event: 'KERNEL_UNAVAILABLE · HONEST HOLE',
    detail:
      'The real /api/v2/compute router answers {"accepted":false,"reason":"KERNEL_UNAVAILABLE"} → DROPPED/REJECTED with that detail. A wallet bind presents and is not seen: UNBOUND · HOLE · KERNEL_UNAVAILABLE. No SEE is ever faked.',
    ref: 'src/routes/machine.tsx (bindWallet) · Nitro SSR /api/v2/compute',
    label: LABEL,
  },
  {
    ts: S,
    kind: 'OBSERVATION',
    event: 'AGENCY_KEY_CREATED',
    detail:
      'Agency keys are ECDSA P-256 non-exportable browser CryptoKeys in IndexedDB (dclm-agency-keyring, store "keys", keyPath id). Stored per key: id, sha256 fingerprint of the public JWK, createdAt, status. Private keys never leave the browser.',
    ref: 'src/routes/machine.tsx (createKey)',
    label: LABEL,
  },
  {
    ts: S,
    kind: 'OBSERVATION',
    event: 'AGENCY_KEY_REVOKED',
    detail:
      'Revocation is local: the record flips to REVOKED with a revokedAt timestamp. Revoked keys cannot bind — BIND WALLET → DCLM refuses with HOLE before anything transmits.',
    ref: 'src/routes/machine.tsx (revokeKey)',
    label: LABEL,
  },
  {
    ts: S,
    kind: 'PATH',
    event: 'BIND_WALLET → DCLM · RECURRING FUSION',
    detail:
      "The binding box carries authority NONE and the full Law Floor through the single internal connector — the one transmission path, no parallel authority. Re-binding recurs every session: the wallet presents, DCLM observes, nothing is ever granted. Protocol direction: systems of automation, not autonomous bots.",
    ref: 'src/dccp/pipe/connector.ts · src/routes/machine.tsx',
    label: LABEL,
  },
]

/** Build the full hash-chained ledger from the seed. Deterministic: same seed,
 *  same hashes, every load, on any machine. */
export async function loadChain(): Promise<ChainedBlock[]> {
  const blocks: ChainedBlock[] = []
  let prev = GENESIS_PREV
  for (let i = 0; i < SEED.length; i++) {
    const receipt: Receipt = { seq: i, ...SEED[i] }
    const hash = await linkHash(prev, receipt)
    blocks.push({ receipt, prev_hash: prev, hash })
    prev = hash
  }
  return blocks
}

/** Recompute every link and report VALID / BROKEN per block. Real local work —
 *  the same link function, run again, checked against the stored hashes. */
export async function verifyChain(blocks: ChainedBlock[]): Promise<LinkReport[]> {
  const reports: LinkReport[] = []
  let prev = GENESIS_PREV
  for (const block of blocks) {
    const recomputed = await linkHash(prev, block.receipt)
    reports.push({
      seq: block.receipt.seq,
      valid: recomputed === block.hash && block.prev_hash === prev,
      expected: block.hash,
      actual: recomputed,
    })
    prev = block.hash
  }
  return reports
}

export const SEED_COUNT = SEED.length

/** Seed receipts with sequence numbers assigned, for the pyramid generator's
 *  HOST_SAFE emanation (src/dccp/explorer/pyramid.ts, rule R5). Additive export —
 *  the async chain builders above are unchanged. */
export const SEED_RECEIPTS: Receipt[] = SEED.map((r, i) => ({ seq: i, ...r }))
