/** Unit tests for the self-arbitrage bots (src/dccp/pipe/arbitrage.ts)
 * and their wiring into the ephemeral validator (ephemeral.ts).
 *
 * Run: node --experimental-strip-types --test src/dccp/pipe/arbitrage.test.ts
 * (also wired into the package.json `test` script).
 *
 * Predicted design verdict: ED-PREDICT-20261004-SELFBOTARB-V1.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  ARBITRAGE_ROLES,
  ArbitrageLedger,
  LAW_FLOOR,
  PROBABILISTIC_HALF_LABEL,
  priceClaim,
  proposeClaims,
  receiptTrail,
  runArbitrage,
  scoreLedger,
  type ArbitrageTask,
  type EvidenceItem,
  type PricingContext,
} from './arbitrage.ts'
import { mintManifest, resetBindingRegistry, validateDecision } from './ephemeral.ts'

const VERDICT = 'ED-PREDICT-20261004-SELFBOTARB-V1'

const EVIDENCE: EvidenceItem[] = [
  { key: 'ledger-readout', verified: true, detail: 'read from the local ledger' },
  { key: 'operator-note', verified: false, detail: 'an unverified operator claim' },
]
const CTX: PricingContext = { evidence: EVIDENCE, law_floor: LAW_FLOOR }

test.beforeEach(() => {
  resetBindingRegistry()
})

const happyTask: ArbitrageTask = {
  objective: 'rebalance the demo queue',
  candidates: [
    { kind: 'read', statement: 'Read the local ledger head.', evidence: ['ledger-readout'] },
    { kind: 'summarize', statement: 'Summarize the last receipts.', evidence: ['ledger-readout'] },
  ],
}

test('propose→price→execute happy path: the verified spread executes, nothing else', async () => {
  const proposals = proposeClaims(happyTask)
  assert.equal(proposals.length, 2)
  for (const proposal of proposals) assert.equal(proposal.source, PROBABILISTIC_HALF_LABEL)
  const pricings = proposals.map(proposal => priceClaim(proposal, CTX))
  assert.deepEqual(pricings.map(p => p.pricing), ['PROVEN', 'PROVEN'])

  const trail = runArbitrage(happyTask, CTX, VERDICT)
  assert.equal(trail.outcome, 'EXECUTE')
  assert.deepEqual(trail.executed, ['claim-1', 'claim-2'])
  assert.deepEqual(trail.abstained, [])
  assert.deepEqual(trail.vetoed, [])
  assert.equal(trail.design_verdict, VERDICT)

  const manifest = await mintManifest({
    unity_id: 'dc.unity.id',
    input: { task: 'arbitrage-happy-path' },
    scope: [...ARBITRAGE_ROLES],
    change_kind: 'implementation',
    design_verdict: VERDICT,
  })
  const verdict = validateDecision(manifest.manifest_hash, {
    manifest_ref: manifest.manifest_hash,
    task: 'arbitrage-run',
    arbitrage: trail,
  })
  assert.equal(verdict.allowed, true)

  const ledger = new ArbitrageLedger()
  const receipts = await receiptTrail(ledger, trail)
  assert.deepEqual(receipts.map(r => r.kind), ['PROPOSE', 'PRICE', 'EXECUTE'])
  assert.equal(await ledger.verifyChain(), true)
})

test('deterministic veto: a Law Floor violation is REJECTED and the veto receipt names claim, reason, pricing', async () => {
  const task: ArbitrageTask = {
    objective: 'mixed run',
    candidates: [
      { kind: 'read', statement: 'Read the local ledger head.', evidence: ['ledger-readout'] },
      { kind: 'sync', statement: 'Push the ledger to an external node.', evidence: ['ledger-readout'], flags: ['exfiltrates'] },
    ],
  }
  const trail = runArbitrage(task, CTX, VERDICT)
  assert.equal(trail.pricings[1].pricing, 'REJECTED')
  assert.match(trail.pricings[1].veto_reason ?? '', /HOST_SAFE/)
  assert.equal(trail.outcome, 'EXECUTE')
  assert.deepEqual(trail.executed, ['claim-1'])
  assert.deepEqual(trail.vetoed, ['claim-2'])

  const ledger = new ArbitrageLedger()
  const receipts = await receiptTrail(ledger, trail)
  const veto = receipts.find(r => r.kind === 'VETO')
  assert.ok(veto, 'a veto receipt exists')
  const body = veto.body as { claim: { id: string }; pricing: string; reason: string }
  assert.equal(body.claim.id, 'claim-2')
  assert.equal(body.pricing, 'REJECTED')
  assert.match(body.reason, /HOST_SAFE/)
  assert.equal(await ledger.verifyChain(), true)

  // The vetoed run still binds and consumes exactly once.
  const manifest = await mintManifest({
    unity_id: 'dc.unity.id',
    input: { task: 'arbitrage-veto-path' },
    scope: [...ARBITRAGE_ROLES],
    change_kind: 'implementation',
    design_verdict: VERDICT,
  })
  const decision = { manifest_ref: manifest.manifest_hash, task: 'arbitrage-run', arbitrage: trail }
  assert.equal(validateDecision(manifest.manifest_hash, decision).allowed, true)
  const second = validateDecision(manifest.manifest_hash, decision)
  assert.equal(second.allowed, false)
  if (!second.allowed) assert.equal(second.reason, 'CONSUMED')
})

test('a decision without a pricing is REJECTED (fail-closed) and the binding stays LIVE', async () => {
  const manifest = await mintManifest({
    unity_id: 'dc.unity.id',
    input: { task: 'arbitrage-unpriced' },
    scope: [...ARBITRAGE_ROLES],
    change_kind: 'implementation',
    design_verdict: VERDICT,
  })
  const verdict = validateDecision(manifest.manifest_hash, { manifest_ref: manifest.manifest_hash, task: 'arbitrage-run' })
  assert.equal(verdict.allowed, false)
  if (!verdict.allowed) {
    assert.equal(verdict.reason, 'UNPRICED_DECISION')
    assert.match(verdict.detail, /UNPRICED_DECISION/)
    assert.match(verdict.detail, /priced/)
  }
  // The failed decision spent nothing — the binding is still LIVE.
  const trail = runArbitrage(happyTask, CTX, VERDICT)
  const ok = validateDecision(manifest.manifest_hash, {
    manifest_ref: manifest.manifest_hash,
    task: 'arbitrage-run',
    arbitrage: trail,
  })
  assert.equal(ok.allowed, true)
})

test('executing an unproven claim is REJECTED — only the verified spread may execute', async () => {
  const task: ArbitrageTask = {
    objective: 'act on an operator tip',
    candidates: [{ kind: 'act', statement: 'Rebalance on the operator tip.', evidence: ['operator-note'] }],
  }
  const trail = runArbitrage(task, CTX, VERDICT)
  assert.deepEqual(trail.pricings.map(p => p.pricing), ['UNPROVEN'])
  // Tamper: try to execute the unproven claim.
  const tampered = { ...trail, outcome: 'EXECUTE' as const, executed: ['claim-1'], abstained: [] as string[] }
  const manifest = await mintManifest({
    unity_id: 'dc.unity.id',
    input: { task: 'arbitrage-tampered-execute' },
    scope: [...ARBITRAGE_ROLES],
    change_kind: 'implementation',
    design_verdict: VERDICT,
  })
  const verdict = validateDecision(manifest.manifest_hash, {
    manifest_ref: manifest.manifest_hash,
    task: 'arbitrage-run',
    arbitrage: tampered,
  })
  assert.equal(verdict.allowed, false)
  if (!verdict.allowed) {
    assert.equal(verdict.reason, 'UNPRICED_DECISION')
    assert.match(verdict.detail, /only PROVEN claims may execute/)
  }
})

test('abstain is first-class and receipted: unproven claims decline, nothing executes', async () => {
  const task: ArbitrageTask = {
    objective: 'act on an operator tip',
    candidates: [{ kind: 'act', statement: 'Rebalance on the operator tip.', evidence: ['operator-note'] }],
  }
  const trail = runArbitrage(task, CTX, VERDICT)
  assert.equal(trail.outcome, 'ABSTAIN')
  assert.deepEqual(trail.executed, [])
  assert.deepEqual(trail.abstained, ['claim-1'])
  assert.match(trail.pricings[0].unproven_reason ?? '', /evidence-verified/)

  const ledger = new ArbitrageLedger()
  const receipts = await receiptTrail(ledger, trail)
  assert.deepEqual(receipts.map(r => r.kind), ['PROPOSE', 'PRICE', 'ABSTAIN', 'ABSTAIN'])
  const abstain = receipts.find(r => r.kind === 'ABSTAIN' && (r.body as { claim?: unknown }).claim !== undefined)
  assert.ok(abstain, 'a per-claim abstain receipt exists')
  const body = abstain.body as { claim: { id: string }; pricing: string; reason: string }
  assert.equal(body.claim.id, 'claim-1')
  assert.equal(body.pricing, 'UNPROVEN')
  assert.match(body.reason, /evidence-verified/)
  assert.equal(await ledger.verifyChain(), true)

  const manifest = await mintManifest({
    unity_id: 'dc.unity.id',
    input: { task: 'arbitrage-abstain' },
    scope: [...ARBITRAGE_ROLES],
    change_kind: 'implementation',
    design_verdict: VERDICT,
  })
  const verdict = validateDecision(manifest.manifest_hash, {
    manifest_ref: manifest.manifest_hash,
    task: 'arbitrage-run',
    arbitrage: trail,
  })
  assert.equal(verdict.allowed, true)
})

test('scoring comes from a fixture ledger: precision × strictness, nothing invented', async () => {
  const task: ArbitrageTask = {
    objective: 'scoring fixture',
    candidates: [
      { kind: 'read', statement: 'Read the local ledger head.', evidence: ['ledger-readout'] },
      { kind: 'summarize', statement: 'Summarize the last receipts.', evidence: ['ledger-readout'] },
      { kind: 'act', statement: 'Rebalance on the operator tip.', evidence: ['operator-note'] },
      { kind: 'wipe', statement: 'Clear external caches.', evidence: ['ledger-readout'], flags: ['mutates-external-state'] },
    ],
  }
  const ledger = new ArbitrageLedger()
  await receiptTrail(ledger, runArbitrage(task, CTX, VERDICT))
  const score = scoreLedger(ledger.receipts())
  assert.equal(score.label, 'PILOT · LOCAL')
  assert.equal(score.proposed, 4)
  assert.equal(score.proven, 2)
  assert.equal(score.unproven, 1)
  assert.equal(score.rejected, 1)
  assert.equal(score.abstained, 1)
  assert.equal(score.precision, 0.5)
  // David's formula verbatim: strictness = (rejected + abstained) / unproven.
  assert.equal(score.strictness, 2)
  assert.equal(score.arbitrage_score, 1)
})

test('scores are null — not padded — when a denominator is empty', async () => {
  const empty = scoreLedger([])
  assert.equal(empty.precision, null)
  assert.equal(empty.strictness, null)
  assert.equal(empty.arbitrage_score, null)

  const allProven = new ArbitrageLedger()
  await receiptTrail(allProven, runArbitrage(happyTask, CTX, VERDICT))
  const score = scoreLedger(allProven.receipts())
  assert.equal(score.precision, 1)
  assert.equal(score.strictness, null)
  assert.equal(score.arbitrage_score, null)
})

test('non-arbitrage bindings are untouched: wallet-style decisions validate without a trail', async () => {
  const manifest = await mintManifest({ unity_id: 'dc.unity.id', input: { task: 'wallet-bind' } })
  const verdict = validateDecision(manifest.manifest_hash, { manifest_ref: manifest.manifest_hash, task: 'wallet-bind-transmit' })
  assert.equal(verdict.allowed, true)
})

test('the probabilistic half is an honest stub: deterministic, and labeled as never-an-LLM', () => {
  const first = proposeClaims(happyTask)
  const second = proposeClaims(happyTask)
  assert.deepEqual(first, second)
  assert.match(PROBABILISTIC_HALF_LABEL, /never an LLM/)
  for (const proposal of first) assert.equal(proposal.source, PROBABILISTIC_HALF_LABEL)
})
