/** `dualis.ephemeral.v1` — self-arbitrage bots.
 *
 * David's directive (his framing): every bot is a hybrid — probabilistic half
 * (proposes, generates cheap) + deterministic half (verifies, prices dear).
 * Every action is an internal trade between the two halves; the system captures
 * the spread between "seems right" and "proven." The house always wins on truth.
 * This is the 25/25 AI-half fusion from his gametic architecture made operational.
 *
 * The probabilistic half here is an HONEST STUB: a local rules/heuristics
 * candidate generator, labeled as such at every surface. It is never an LLM
 * and is never presented as one. The deterministic half is explicit Iris-style
 * rules & logic gates — cheap to propose, dear to price.
 *
 * Predicted design verdict: ED-PREDICT-20261004-SELFBOTARB-V1.
 * Protocol law: see EPHEMERAL_PROTOCOL.md ("Self-arbitrage bots" section).
 *
 * Honest boundary: in this build an EXECUTE records a receipted,
 * binding-bound decision effect in the arbitrage ledger. No external effect is
 * claimed and no kernel is faked — sending a validated decision onward is a
 * later workstream's design.
 */

import { canonicalJson, sha256Hex } from './chain.ts'

export const ARBITRAGE_TRAIL_SCHEMA = 'dualis.arbitrage.trail/1'
export const ARBITRAGE_RECEIPT_SCHEMA = 'dualis.arbitrage.receipt/1'

/** Capability scope roles a manifest carries to run the arbitrage loop.
 * Labels — not extra authority. `validateDecision` enforces the pricing trail
 * only when one of these roles is on the manifest's scope. */
export const ARBITRAGE_ROLES = ['arbitrage.propose', 'arbitrage.price', 'arbitrage.execute'] as const
export const ARBITRAGE_SCOPE_PREFIX = 'arbitrage.'

/** The probabilistic half is a stub. This label travels on every proposal it emits. */
export const PROBABILISTIC_HALF_LABEL =
  'probabilistic half — honest stub: rules/heuristics candidate generator, never an LLM'

export type ClaimPricing = 'PROVEN' | 'UNPROVEN' | 'REJECTED'
export type ArbitrageOutcome = 'EXECUTE' | 'ABSTAIN'

export interface CandidateInput {
  kind: string
  statement: string
  /** Evidence keys the claim leans on — declared by the proposer, checked by the pricer. */
  evidence: string[]
  /** Optional proposer-side flags. The deterministic half checks them independently;
   * the stub cannot clear itself. */
  flags?: string[]
}

/** What the bot is asked to do in one run. */
export interface ArbitrageTask {
  objective: string
  candidates: CandidateInput[]
}

export interface Proposal {
  id: string
  kind: string
  statement: string
  evidence: string[]
  flags: string[]
  source: typeof PROBABILISTIC_HALF_LABEL
}

export interface PricingCheck {
  name: string
  passed: boolean
  detail: string
}

export interface PricedClaim {
  proposal_id: string
  pricing: ClaimPricing
  checks: PricingCheck[]
  /** Set when REJECTED — the deterministic veto reason. */
  veto_reason?: string
  /** Set when UNPROVEN — why the evidence fell short. */
  unproven_reason?: string
}

export interface EvidenceItem {
  key: string
  verified: boolean
  detail: string
}

export interface PricingContext {
  evidence: EvidenceItem[]
  /** The immutable Law Floor the pricer enforces: NO_FORCE · HOST_SAFE · CLEANUP-FIRST · TRUTH_OR_NOTHING */
  law_floor: readonly string[]
}

export const LAW_FLOOR = ['NO_FORCE', 'HOST_SAFE', 'CLEANUP_FIRST', 'TRUTH_OR_NOTHING'] as const

/** Flags the deterministic half treats as Law Floor violations (hard veto). */
const LAW_VIOLATION_FLAGS: Record<string, string> = {
  'mutates-external-state': 'NO_FORCE · CLEANUP_FIRST — the claim would change state outside the ledger',
  'exfiltrates': 'HOST_SAFE — the claim would move data off the host',
  'claims-unverified-fact': 'TRUTH_OR_NOTHING — the claim asserts what was never verified',
  'persists-privilege': 'CLEANUP_FIRST — the claim would leave standing authority behind',
}

/** The probabilistic half: PROPOSE. Cheap, plentiful, proof-free — a deterministic
 * rules/heuristics stub (same task → same proposals), labeled honestly. */
export function proposeClaims(task: ArbitrageTask): Proposal[] {
  return task.candidates.map((candidate, index) => ({
    id: `claim-${index + 1}`,
    kind: candidate.kind,
    statement: candidate.statement,
    evidence: [...candidate.evidence],
    flags: [...(candidate.flags ?? [])],
    source: PROBABILISTIC_HALF_LABEL,
  }))
}

function checkId(proposal: Proposal): PricingCheck {
  const passed = /^claim-\d+$/.test(proposal.id) && proposal.statement.trim().length > 0
  return {
    name: 'form-complete',
    passed,
    detail: passed ? 'claim id and statement are well-formed' : 'claim id or statement is malformed',
  }
}

function checkLawFloor(proposal: Proposal): PricingCheck {
  const hit = proposal.flags.find(flag => flag in LAW_VIOLATION_FLAGS)
  return {
    name: 'law-floor',
    passed: hit === undefined,
    detail: hit === undefined ? 'no Law Floor flag raised' : LAW_VIOLATION_FLAGS[hit],
  }
}

function checkEvidence(proposal: Proposal, ctx: PricingContext): PricingCheck[] {
  const byKey = new Map(ctx.evidence.map(item => [item.key, item]))
  const missing = proposal.evidence.filter(key => !byKey.has(key))
  const unverified = proposal.evidence.filter(key => {
    const item = byKey.get(key)
    return item !== undefined && !item.verified
  })
  const presentPassed = missing.length === 0
  const verifiedPassed = unverified.length === 0
  return [
    {
      name: 'evidence-present',
      passed: presentPassed,
      detail: presentPassed
        ? 'every declared evidence key exists in the pricing context'
        : `declared evidence not in context: ${missing.join(', ')}`,
    },
    {
      name: 'evidence-verified',
      passed: verifiedPassed,
      detail: verifiedPassed
        ? 'every declared evidence key is verified'
        : `declared evidence present but not verified: ${unverified.join(', ')}`,
    },
  ]
}

/** The deterministic half: PRICE. Dear and explicit — every check is named and
 * recorded. REJECTED is the deterministic veto; UNPROVEN leads to ABSTAIN. */
export function priceClaim(proposal: Proposal, ctx: PricingContext): PricedClaim {
  const checks: PricingCheck[] = [checkId(proposal), checkLawFloor(proposal), ...checkEvidence(proposal, ctx)]
  const lawCheck = checks[1]
  if (!lawCheck.passed) {
    return { proposal_id: proposal.id, pricing: 'REJECTED', checks, veto_reason: lawCheck.detail }
  }
  const failed = checks.filter(check => !check.passed)
  if (failed.length > 0) {
    return {
      proposal_id: proposal.id,
      pricing: 'UNPROVEN',
      checks,
      unproven_reason: failed.map(check => `${check.name}: ${check.detail}`).join(' · '),
    }
  }
  return { proposal_id: proposal.id, pricing: 'PROVEN', checks }
}

/** The full PROPOSE→PRICE→EXECUTE/ABSTAIN trail a bound decision must carry. */
export interface ArbitrageTrail {
  schema: typeof ARBITRAGE_TRAIL_SCHEMA
  objective: string
  proposals: Proposal[]
  pricings: PricedClaim[]
  outcome: ArbitrageOutcome
  /** Proposal ids executed under this decision — every one priced PROVEN. */
  executed: string[]
  /** Proposal ids abstained on — every one priced UNPROVEN. */
  abstained: string[]
  /** Proposal ids vetoed — every one priced REJECTED. */
  vetoed: string[]
  /** The Trinity design verdict on this run's design — the one law. */
  design_verdict: string
  at: number
}

/** Run the loop. Pure over the inputs except the timestamp — receipts go to the
 * caller's ledger. One run = one TASK_BIND: the caller mints, runs, then
 * validates the decision carrying this trail. */
export function runArbitrage(task: ArbitrageTask, ctx: PricingContext, designVerdict: string): ArbitrageTrail {
  const proposals = proposeClaims(task)
  const pricings = proposals.map(proposal => priceClaim(proposal, ctx))
  const priced = new Map(pricings.map(priced => [priced.proposal_id, priced.pricing]))
  const executed: string[] = []
  const abstained: string[] = []
  const vetoed: string[] = []
  for (const proposal of proposals) {
    const pricing = priced.get(proposal.id)
    if (pricing === 'PROVEN') executed.push(proposal.id)
    else if (pricing === 'UNPROVEN') abstained.push(proposal.id)
    else vetoed.push(proposal.id)
  }
  const outcome: ArbitrageOutcome = executed.length > 0 ? 'EXECUTE' : 'ABSTAIN'
  return {
    schema: ARBITRAGE_TRAIL_SCHEMA,
    objective: task.objective,
    proposals,
    pricings,
    outcome,
    executed,
    abstained,
    vetoed,
    design_verdict: designVerdict,
    at: Date.now(),
  }
}

export type ArbitrageReceiptKind = 'PROPOSE' | 'PRICE' | 'VETO' | 'EXECUTE' | 'ABSTAIN'

export interface ArbitrageReceipt {
  schema: typeof ARBITRAGE_RECEIPT_SCHEMA
  seq: number
  kind: ArbitrageReceiptKind
  body: Record<string, unknown>
  at: number
  prev_hash: string
  entry_hash: string
}

const ARBITRAGE_GENESIS_LABEL = 'dualis.arbitrage.v1|genesis|self-arbitrage-bots'

/** The arbitrage ledger: hash-chained, append-only receipts. The receipt chain
 * IS the training record. In-memory per session — disclosed, never persisted. */
export class ArbitrageLedger {
  private seq = 0
  private head = ''
  private readonly log: ArbitrageReceipt[] = []
  private readonly ready: Promise<void>

  constructor() {
    this.ready = sha256Hex(ARBITRAGE_GENESIS_LABEL).then(hex => {
      this.head = hex
    })
  }

  /** Append one receipt. entry_hash = sha256(canonical JSON of the entry body
   * plus seq, kind, and the previous head) — the chain is tamper-evident. */
  async append(kind: ArbitrageReceiptKind, body: Record<string, unknown>): Promise<ArbitrageReceipt> {
    await this.ready
    const seq = this.seq + 1
    const at = Date.now()
    const prev_hash = this.head
    const entry_hash = await sha256Hex(canonicalJson({ seq, kind, body, prev_hash }))
    const receipt: ArbitrageReceipt = {
      schema: ARBITRAGE_RECEIPT_SCHEMA,
      seq,
      kind,
      body,
      at,
      prev_hash,
      entry_hash,
    }
    this.seq = seq
    this.head = entry_hash
    this.log.push(receipt)
    return { ...receipt }
  }

  receipts(): readonly ArbitrageReceipt[] {
    return this.log.map(receipt => ({ ...receipt }))
  }

  /** Recompute every link. A forged or reordered receipt fails here. */
  async verifyChain(): Promise<boolean> {
    await this.ready
    let head = await sha256Hex(ARBITRAGE_GENESIS_LABEL)
    for (const receipt of this.log) {
      if (receipt.prev_hash !== head) return false
      const recomputed = await sha256Hex(
        canonicalJson({ seq: receipt.seq, kind: receipt.kind, body: receipt.body, prev_hash: receipt.prev_hash }),
      )
      if (recomputed !== receipt.entry_hash) return false
      head = receipt.entry_hash
    }
    return true
  }
}

/** Receipt a full trail into the ledger: PROPOSE, PRICE, then one VETO receipt
 * per vetoed claim (naming claim, reason, pricing), one ABSTAIN receipt per
 * abstained claim, and one EXECUTE receipt for the bound decision. */
export async function receiptTrail(ledger: ArbitrageLedger, trail: ArbitrageTrail): Promise<ArbitrageReceipt[]> {
  const receipts: ArbitrageReceipt[] = []
  const byId = new Map(trail.proposals.map(proposal => [proposal.id, proposal]))
  const pricedById = new Map(trail.pricings.map(priced => [priced.proposal_id, priced]))
  receipts.push(await ledger.append('PROPOSE', { objective: trail.objective, proposals: trail.proposals }))
  receipts.push(await ledger.append('PRICE', { pricings: trail.pricings }))
  for (const id of trail.vetoed) {
    const priced = pricedById.get(id)
    receipts.push(
      await ledger.append('VETO', {
        claim: byId.get(id),
        pricing: 'REJECTED',
        reason: priced?.veto_reason ?? 'deterministic veto',
      }),
    )
  }
  for (const id of trail.abstained) {
    const priced = pricedById.get(id)
    receipts.push(
      await ledger.append('ABSTAIN', {
        claim: byId.get(id),
        pricing: 'UNPROVEN',
        reason: priced?.unproven_reason ?? 'insufficient evidence — the loop declined',
      }),
    )
  }
  receipts.push(
    await ledger.append(trail.outcome === 'EXECUTE' ? 'EXECUTE' : 'ABSTAIN', {
      outcome: trail.outcome,
      executed: trail.executed,
      abstained: trail.abstained,
      vetoed: trail.vetoed,
      design_verdict: trail.design_verdict,
    }),
  )
  return receipts
}

export interface ArbitrageScore {
  /** The score is a ledger readout from a local pilot run — never a benchmark. */
  label: 'PILOT · LOCAL'
  proposed: number
  proven: number
  unproven: number
  rejected: number
  abstained: number
  /** proven / proposed — null when nothing was proposed (undefined, not zero). */
  precision: number | null
  /** (rejected + abstained) / unproven — David's formula, verbatim — null when
   * nothing was unproven. */
  strictness: number | null
  /** precision × strictness — null when either input is null. */
  arbitrage_score: number | null
  note: string
}

function countClaims(receipts: readonly ArbitrageReceipt[], kinds: readonly ArbitrageReceiptKind[]): number {
  let count = 0
  for (const receipt of receipts) {
    if (!kinds.includes(receipt.kind)) continue
    const body = receipt.body as Record<string, unknown>
    if (Array.isArray(body.proposals)) count += body.proposals.length
    if (Array.isArray(body.pricings)) count += body.pricings.length
    // Per-claim ABSTAIN/VETO receipts carry one claim object each. The final
    // EXECUTE/ABSTAIN summary receipt carries none — it adds zero here.
    if (body.claim !== null && typeof body.claim === 'object' && !Array.isArray(body.claim)) count += 1
  }
  return count
}

/** Score a ledger. Pure readout — no invented benchmarks, no training targets.
 * The receipt chain IS the training record; this function only reads it. */
export function scoreLedger(receipts: readonly ArbitrageReceipt[]): ArbitrageScore {
  const proposed = countClaims(receipts, ['PROPOSE'])
  const priced = receipts.filter(receipt => receipt.kind === 'PRICE')
  let proven = 0
  let unproven = 0
  let rejected = 0
  for (const receipt of priced) {
    const pricings = (receipt.body as { pricings?: PricedClaim[] }).pricings ?? []
    for (const pricedClaim of pricings) {
      if (pricedClaim.pricing === 'PROVEN') proven += 1
      else if (pricedClaim.pricing === 'UNPROVEN') unproven += 1
      else rejected += 1
    }
  }
  const abstained = countClaims(receipts, ['ABSTAIN'])
  const precision = proposed > 0 ? proven / proposed : null
  const strictness = unproven > 0 ? (rejected + abstained) / unproven : null
  const arbitrage_score = precision !== null && strictness !== null ? precision * strictness : null
  return {
    label: 'PILOT · LOCAL',
    proposed,
    proven,
    unproven,
    rejected,
    abstained,
    precision,
    strictness,
    arbitrage_score,
    note:
      'Computed from this ledger only. precision = proven/proposed; strictness = (rejected+abstained)/unproven; score = precision × strictness. Null means undefined (empty denominator), never a padded value.',
  }
}

/** Validate an arbitrage trail the way `validateDecision` does — the same
 * fail-closed checks, reusable by the validator and by tests. */
export function checkArbitrageTrail(decision: unknown): { ok: true } | { ok: false; detail: string } {
  const fail = (why: string): { ok: false; detail: string } => ({
    ok: false,
    detail: `REJECTED · UNPRICED_DECISION — ${why}`,
  })
  if (typeof decision !== 'object' || decision === null) return fail('the decision carries no arbitrage trail.')
  const trail = (decision as { arbitrage?: unknown }).arbitrage
  if (typeof trail !== 'object' || trail === null) {
    return fail('the decision carries no arbitrage trail — every proposal must be priced before a decision is bound.')
  }
  const t = trail as Partial<ArbitrageTrail>
  if (t.schema !== ARBITRAGE_TRAIL_SCHEMA) return fail(`trail schema must be ${ARBITRAGE_TRAIL_SCHEMA}.`)
  if (!Array.isArray(t.proposals) || t.proposals.length === 0) return fail('no proposals — nothing was proposed.')
  if (!Array.isArray(t.pricings) || t.pricings.length === 0) {
    return fail('no pricings — a decision without a pricing is not a decision.')
  }
  const proposalIds = new Set(t.proposals.map(proposal => proposal.id))
  const pricedIds = new Set<string>()
  const pricingOf = new Map<string, ClaimPricing>()
  for (const priced of t.pricings) {
    if (!proposalIds.has(priced.proposal_id)) return fail(`pricing for unknown proposal ${JSON.stringify(priced.proposal_id)}.`)
    if (pricedIds.has(priced.proposal_id)) return fail(`proposal ${JSON.stringify(priced.proposal_id)} priced twice.`)
    pricedIds.add(priced.proposal_id)
    pricingOf.set(priced.proposal_id, priced.pricing)
  }
  for (const id of proposalIds) {
    if (!pricedIds.has(id)) return fail(`proposal ${JSON.stringify(id)} was never priced — unpriced claims cannot ride a decision.`)
  }
  if (t.outcome !== 'EXECUTE' && t.outcome !== 'ABSTAIN') return fail('outcome must be EXECUTE or ABSTAIN.')
  const executed = Array.isArray(t.executed) ? t.executed : null
  const abstained = Array.isArray(t.abstained) ? t.abstained : null
  const vetoed = Array.isArray(t.vetoed) ? t.vetoed : null
  if (!executed || !abstained || !vetoed) return fail('executed/abstained/vetoed dispositions are missing or malformed.')
  const dispositioned = new Set([...executed, ...abstained, ...vetoed])
  for (const id of proposalIds) {
    if (!dispositioned.has(id)) return fail(`proposal ${JSON.stringify(id)} has no disposition — every claim must land in executed, abstained, or vetoed.`)
  }
  for (const id of executed) {
    if (pricingOf.get(id) !== 'PROVEN') {
      return fail(`executed claim ${JSON.stringify(id)} is priced ${JSON.stringify(pricingOf.get(id))} — only PROVEN claims may execute.`)
    }
  }
  for (const id of abstained) {
    if (pricingOf.get(id) !== 'UNPROVEN') {
      return fail(`abstained claim ${JSON.stringify(id)} is priced ${JSON.stringify(pricingOf.get(id))} — abstention is for UNPROVEN claims.`)
    }
  }
  for (const id of vetoed) {
    if (pricingOf.get(id) !== 'REJECTED') {
      return fail(`vetoed claim ${JSON.stringify(id)} is priced ${JSON.stringify(pricingOf.get(id))} — veto is for REJECTED claims.`)
    }
  }
  if (t.outcome === 'EXECUTE' && executed.length === 0) {
    return fail('outcome EXECUTE with no executed claims — execute the verified spread or abstain.')
  }
  if (t.outcome === 'ABSTAIN' && executed.length > 0) {
    return fail('outcome ABSTAIN but claims executed — an abstention executes nothing.')
  }
  if (typeof t.design_verdict !== 'string' || t.design_verdict.length === 0) {
    return fail('the trail carries no design verdict — the one law below the Unity ID.')
  }
  return { ok: true }
}
