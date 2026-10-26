/** DAG mapper source data — claims → tests → receipts.
 *
 * Sole source: /tmp/DCLM_claims_register.md (builder hand-off), the claims-register
 * discipline: reference → measurement → receipt. If a claim cannot name its test, it
 * is not published as a claim.
 *
 * Nodes: the register's own claims C1–C5, O1–O7, and rewords R1–R4. (The register
 * defines C1–C5 only — C6/C7 have no entries and are NOT invented here. R5 is noted
 * in the close-out rather than added silently.)
 * Edges: claim → test only where the register names one; test → receipt only where
 * the register carries an adjudication. UNTESTED claims render as open/hollow nodes
 * with an honest "no receipt" state. Nothing is inferred.
 *
 * "Receipt" nodes here are the register's own adjudications (KEEP / REWORD / REMOVE /
 * evidence required) — explicitly not kernel receipts; no kernel is mounted.
 */

export type ClaimStatus = 'KEEP' | 'KEEP_GAP' | 'KEEP_COND' | 'REWORD' | 'REMOVE' | 'REWORD_REQ'

export interface DagClaim {
  id: string
  title: string
  wording: string
  status: ClaimStatus
  statusLabel: string
  testId?: string
  note?: string
}

export type TestState = 'NAMED' | 'DESCRIBED' | 'PROPOSED'

export interface DagTest {
  id: string
  name: string
  detail: string
  state: TestState
  receiptId?: string
}

export interface DagReceipt {
  id: string
  label: string
  note: string
}

export const REGISTER_REF = '/tmp/DCLM_claims_register.md (builder hand-off)'
export const RECEIPT_NOTE =
  "The register's adjudication on this claim — per the claims register. Not a kernel receipt; no kernel is mounted."

export const CLAIMS: DagClaim[] = [
  {
    id: 'C1',
    title: 'Grammar-constrained decoding',
    wording:
      'Grammar-constrained decoding yields 0 grammar-invalid outputs, given grammar and tokenizer are aligned.',
    status: 'KEEP',
    statusLabel: 'KEEP',
    testId: 't-c1',
  },
  {
    id: 'C2',
    title: 'Alert delivery is idempotent',
    wording: 'Alert delivery is idempotent and replay-safe, with terminal tombstones.',
    status: 'KEEP',
    statusLabel: 'KEEP',
    testId: 't-c2',
  },
  {
    id: 'C3',
    title: 'Known open defect: stale trigger',
    wording:
      'Known open defect: a delayed old trigger sent directly to PagerDuty after resolve creates a false incident.',
    status: 'KEEP_GAP',
    statusLabel: 'KEEP — as disclosed gap',
    testId: 't-c3',
  },
  {
    id: 'C4',
    title: 'Release evidence bundle',
    wording:
      'Every release has: public URL, hosting ID, release tree, CID, SHA-256, build receipt, governance decision.',
    status: 'KEEP_COND',
    statusLabel: 'KEEP — after Trinity PASS',
    testId: 't-c4',
  },
  {
    id: 'C5',
    title: 'Fail-closed promotion',
    wording:
      'Promotion is fail-closed: a claim is promoted only if the empirical check AND the formal check both pass.',
    status: 'KEEP_COND',
    statusLabel: 'KEEP — once tests exist',
    testId: 't-c5',
  },
  {
    id: 'O1',
    title: 'Person data cannot enter',
    wording:
      'Person data cannot enter: the schema admits only `source` and `payload.nodes`; any other field at any depth is refused.',
    status: 'KEEP',
    statusLabel: 'KEEP · origin_pure 15/15',
    testId: 't-o1',
  },
  {
    id: 'O2',
    title: 'Receipts are recomputable',
    wording: 'Same input at the same reference yields an identical, recomputable receipt.',
    status: 'KEEP',
    statusLabel: 'KEEP · origin_pure 15/15',
    testId: 't-o2',
  },
  {
    id: 'O3',
    title: 'Every verdict links one chain',
    wording: 'Every verdict, including early refusals, links into one chain; memory is bounded.',
    status: 'KEEP',
    statusLabel: 'KEEP · origin_pure 15/15',
    testId: 't-o3',
  },
  {
    id: 'O4',
    title: 'Rejected input is never hashed',
    wording: 'Rejected input is never hashed or echoed.',
    status: 'KEEP',
    statusLabel: 'KEEP · origin_pure 15/15',
    testId: 't-o4',
  },
  {
    id: 'O5',
    title: 'Boundary refusals',
    wording:
      'Foreign Origin/Host, wrong content type, and oversize bodies are refused; purge needs a custom header.',
    status: 'KEEP',
    statusLabel: 'KEEP · origin_pure 15/15',
    testId: 't-o5',
  },
  {
    id: 'O6',
    title: 'HTTP wrapper behaves as core',
    wording: 'The HTTP wrapper (main.py) behaves as the core does.',
    status: 'REWORD',
    statusLabel: 'REWORD — not yet tested',
    note: 'No test names one yet. Until an HTTP test runs, say "not yet tested".',
  },
  {
    id: 'O7',
    title: 'Callers are authenticated',
    wording: 'Callers are authenticated.',
    status: 'REMOVE',
    statusLabel: 'REMOVE',
    note: 'They are not; `source` is a self-chosen label. Removed from public material.',
  },
  {
    id: 'R1',
    title: 'Entailment, not consistency',
    wording:
      'A claim Φ is accepted only if Ω ∧ ¬Φ is UNSAT (Ω entails Φ). SAT alone means consistent and is NOT promoted.',
    status: 'REWORD_REQ',
    statusLabel: 'REWORD — evidence required',
    note: 'Name the logic fragment (e.g. QF_LIA) and its termination guarantee; solver version, fragment, a test showing a consistent-but-unentailed claim is rejected.',
  },
  {
    id: 'R2',
    title: 'Per-step overhead budget',
    wording: 'Per-step verification overhead, excluding remote model inference, is under X ms at p99.',
    status: 'REWORD_REQ',
    statusLabel: 'REWORD — evidence required',
    note: 'State which budget applies where (the deck gives both 4.20 ms and 1.20 ms). Hardware, n runs, p50/p95/p99, harness script.',
  },
  {
    id: 'R3',
    title: 'Session buffers deleted',
    wording: 'Session buffers are deleted at teardown.',
    status: 'REWORD_REQ',
    statusLabel: 'REWORD — evidence required',
    note: 'A test that inspects buffers/files after teardown. No thermodynamic language.',
  },
  {
    id: 'R4',
    title: 'Every number gets provenance',
    wording:
      'Every number (hallucination rate, semantic drift, R_eff, "4/4 theorems", 82 µs) gets sample size, method, hardware, date.',
    status: 'REWORD_REQ',
    statusLabel: 'REWORD — evidence required',
    note: 'Otherwise delete the number.',
  },
]

export const TESTS: DagTest[] = [
  {
    id: 't-c1',
    name: 'grammar-constrained decode validation',
    detail: 'Generate N outputs, validate each against the same grammar. Report N, grammar version, tokenizer.',
    state: 'DESCRIBED',
    receiptId: 'r-c1',
  },
  {
    id: 't-c2',
    name: 'test_dccp_partition_replay_integration.py',
    detail: 'Loopback only.',
    state: 'NAMED',
    receiptId: 'r-c2',
  },
  {
    id: 't-c3',
    name: 'test_required_gate_never_forward_terminal_trigger_to_pagerduty',
    detail: 'Same file; fails under DCCP_STRICT_SAFETY=1 — the disclosed gap, kept as one.',
    state: 'NAMED',
    receiptId: 'r-c3',
  },
  {
    id: 't-c4',
    name: 'CID Mapping Law (draft)',
    detail: 'Draft document; backs the release evidence bundle after Trinity PASS.',
    state: 'DESCRIBED',
    receiptId: 'r-c4',
  },
  {
    id: 't-c5',
    name: 'single-check promotion unit tests',
    detail:
      'Specified in the register — "each single-check pass must still fail promotion". Not yet written ("once tests exist").',
    state: 'PROPOSED',
  },
  {
    id: 't-o1',
    name: 'test_person_fields_cannot_enter_under_any_name · test_strict_types',
    detail: 'origin_pure core logic, tested 15/15.',
    state: 'NAMED',
    receiptId: 'r-o1',
  },
  {
    id: 't-o2',
    name: 'test_receipt_is_recomputable_and_deterministic',
    detail: 'origin_pure core logic, tested 15/15.',
    state: 'NAMED',
    receiptId: 'r-o2',
  },
  {
    id: 't-o3',
    name: 'test_every_verdict_links_including_early_holes · test_memory_is_bounded_but_chain_continues',
    detail: 'origin_pure core logic, tested 15/15.',
    state: 'NAMED',
    receiptId: 'r-o3',
  },
  {
    id: 't-o4',
    name: 'test_rejected_input_is_never_hashed_or_echoed',
    detail: 'origin_pure core logic, tested 15/15.',
    state: 'NAMED',
    receiptId: 'r-o4',
  },
  {
    id: 't-o5',
    name: 'boundary and purge tests',
    detail: 'Boundary and purge tests per the register.',
    state: 'DESCRIBED',
    receiptId: 'r-o5',
  },
]

export const RECEIPTS: DagReceipt[] = [
  { id: 'r-c1', label: 'KEEP', note: RECEIPT_NOTE },
  { id: 'r-c2', label: 'KEEP', note: RECEIPT_NOTE },
  { id: 'r-c3', label: 'KEEP — as disclosed gap', note: RECEIPT_NOTE },
  { id: 'r-c4', label: 'KEEP — after Trinity PASS', note: RECEIPT_NOTE },
  { id: 'r-o1', label: 'KEEP · origin_pure 15/15', note: RECEIPT_NOTE },
  { id: 'r-o2', label: 'KEEP · origin_pure 15/15', note: RECEIPT_NOTE },
  { id: 'r-o3', label: 'KEEP · origin_pure 15/15', note: RECEIPT_NOTE },
  { id: 'r-o4', label: 'KEEP · origin_pure 15/15', note: RECEIPT_NOTE },
  { id: 'r-o5', label: 'KEEP · origin_pure 15/15', note: RECEIPT_NOTE },
]

export interface DagEdge {
  from: string
  to: string
}

/** The ephemeral capability system's first bound task — the Unity Playground
 * Infrastructure's canonical first job. The manifest is minted locally; the design
 * verdict is honestly absent (no kernel mounted), so the node renders hollow. */
export interface DagTask {
  id: string
  title: string
  wording: string
  statusLabel: string
  note: string
}

export const TASKS: DagTask[] = [
  {
    id: 'T1',
    title: 'Unity Playground Infrastructure — first job',
    wording:
      'Schematics → prototype → future: real-world schematics in, prototype spec out, future roadmap receipted. Bound under the ephemeral capability manifest dualis.ephemeral.v1 — TASK_BIND, capability scope/expiry, constraints non_destructive / fail_closed / cleanup_first, input_hash, manifest_hash.',
    statusLabel: 'MANIFEST MINTED LOCALLY — design verdict absent',
    note: 'No kernel is mounted, so no design verdict exists: UNBOUND · HOLE · KERNEL_UNAVAILABLE. The task was bound; the machine did not see it. Shown hollow — an honest absent state, not a verdict.',
  },
]

/** Edges are derived, never authored: claim → its named test, test → its register receipt. */
export function buildEdges(): DagEdge[] {
  const edges: DagEdge[] = []
  for (const c of CLAIMS) {
    if (!c.testId) continue
    edges.push({ from: c.id, to: c.testId })
    const t = TESTS.find(t => t.id === c.testId)
    if (t?.receiptId) edges.push({ from: t.id, to: t.receiptId })
  }
  return edges
}

export const EDGES: DagEdge[] = buildEdges()
