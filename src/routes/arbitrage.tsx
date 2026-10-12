/** Self-arbitrage bots — HUD instrument (new route).
 *
 * Runs the PROPOSE→PRICE→EXECUTE/ABSTAIN loop in-browser against the real
 * pipe modules: mints a live TASK_BIND per scenario (design verdict
 * ED-PREDICT-20261004-SELFBOTARB-V1), runs the loop, binds the priced trail as
 * the decision, receipts everything into the session's arbitrage ledger, and
 * scores the ledger (PILOT · LOCAL). Every receipt shown was produced by the
 * run — no fake instrumentation.
 *
 * Surface-only: does not touch src/routes/index.tsx, explorer.tsx, or
 * machine.tsx's wallet UI.
 */
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import '@/dccp/styles/arbitrage.css'
import {
  ARBITRAGE_ROLES,
  ArbitrageLedger,
  LAW_FLOOR,
  PROBABILISTIC_HALF_LABEL,
  receiptTrail,
  runArbitrage,
  scoreLedger,
  type ArbitrageReceipt,
  type ArbitrageScore,
  type ArbitrageTask,
  type EvidenceItem,
  type PricingContext,
} from '@/dccp/pipe/arbitrage'
import { mintManifest, validateDecision } from '@/dccp/pipe/ephemeral'
import { storedHandle } from '@/dccp/unity/unityid'

export const Route = createFileRoute('/arbitrage')({ component: ArbitrageHud })

const VERDICT = 'ED-PREDICT-20261004-SELFBOTARB-V1'

/** The pilot Unity handle, read fresh at mint time. No placeholder: without a
 * bound handle nothing is minted. */
function pilotUnityId(): string | null {
  return storedHandle()?.handle ?? null
}

const EVIDENCE: EvidenceItem[] = [
  { key: 'ledger-readout', verified: true, detail: 'read from the local ledger' },
  { key: 'operator-note', verified: false, detail: 'an unverified operator claim' },
]
const CTX: PricingContext = { evidence: EVIDENCE, law_floor: LAW_FLOOR }

interface Scenario {
  key: string
  label: string
  sub: string
  hostile?: boolean
  task: ArbitrageTask
}

const SCENARIOS: Scenario[] = [
  {
    key: 'happy-path',
    label: 'Happy path',
    sub: 'propose → price → execute the verified spread',
    task: {
      objective: 'rebalance the demo queue',
      candidates: [
        { kind: 'read', statement: 'Read the local ledger head.', evidence: ['ledger-readout'] },
        { kind: 'summarize', statement: 'Summarize the last receipts.', evidence: ['ledger-readout'] },
      ],
    },
  },
  {
    key: 'veto',
    label: 'Deterministic veto',
    sub: 'one claim violates the Law Floor — veto receipted',
    task: {
      objective: 'mixed run with a law violation',
      candidates: [
        { kind: 'read', statement: 'Read the local ledger head.', evidence: ['ledger-readout'] },
        { kind: 'sync', statement: 'Push the ledger to an external node.', evidence: ['ledger-readout'], flags: ['exfiltrates'] },
      ],
    },
  },
  {
    key: 'abstain',
    label: 'Abstain',
    sub: 'evidence falls short — the loop declines, receipted',
    task: {
      objective: 'act on an operator tip',
      candidates: [{ kind: 'act', statement: 'Rebalance on the operator tip.', evidence: ['operator-note'] }],
    },
  },
]

interface RunRecord {
  label: string
  manifestHash: string
  allowed: boolean
  detail: string
  outcome?: string
  executed: string[]
  abstained: string[]
  vetoed: string[]
}

function shortHash(hash: string): string {
  return hash.length > 20 ? `${hash.slice(0, 12)}…${hash.slice(-6)}` : hash
}

function receiptSummary(receipt: ArbitrageReceipt): string {
  const body = receipt.body as Record<string, unknown>
  switch (receipt.kind) {
    case 'PROPOSE': {
      const proposals = (body.proposals as { id: string }[]) ?? []
      return `${proposals.length} claim${proposals.length === 1 ? '' : 's'} proposed: ${proposals.map(p => p.id).join(', ')}`
    }
    case 'PRICE': {
      const pricings = (body.pricings as { proposal_id: string; pricing: string }[]) ?? []
      return pricings.map(p => `${p.proposal_id} → ${p.pricing}`).join(' · ')
    }
    case 'VETO': {
      const claim = body.claim as { id: string }
      return `${claim.id} · ${body.pricing} · ${body.reason}`
    }
    case 'ABSTAIN': {
      const claim = body.claim as { id: string } | undefined
      if (claim) return `${claim.id} · ${body.pricing} · ${body.reason}`
      return `outcome ABSTAIN · executed none · abstained ${(body.abstained as string[]).join(', ')} · vetoed ${(body.vetoed as string[]).join(', ') || 'none'}`
    }
    case 'EXECUTE':
      return `outcome EXECUTE · executed ${(body.executed as string[]).join(', ')} · vetoed ${(body.vetoed as string[]).join(', ') || 'none'}`
    default:
      return ''
  }
}

function fmtScore(value: number | null): string {
  return value === null ? 'undefined' : value.toFixed(2)
}

function ArbitrageHud() {
  const [ledger] = useState(() => new ArbitrageLedger())
  const [runs, setRuns] = useState<RunRecord[]>([])
  const [receipts, setReceipts] = useState<readonly ArbitrageReceipt[]>([])
  const [score, setScore] = useState<ArbitrageScore>(() => scoreLedger([]))
  const [busy, setBusy] = useState(false)
  /** The pilot Unity handle as last seen — refreshed at every mint attempt.
   * Initialized null and read post-mount: localStorage differs between SSR
   * and the client, so reading it during the first render hydrates wrong. */
  const [bound, setBound] = useState<string | null>(null)
  useEffect(() => { setBound(pilotUnityId()) }, [])

  /** Honest unbound run record: written instead of minting when no pilot
   * handle is bound. */
  function unboundRun(label: string) {
    setRuns(prev => [
      ...prev,
      {
        label,
        manifestHash: '',
        allowed: false,
        detail:
          'UNBOUND — no pilot Unity handle is bound on this device. Bind your pilot handle at the gate (the 3D world) first. Nothing was minted, nothing ran.',
        executed: [],
        abstained: [],
        vetoed: [],
      },
    ])
  }

  async function runScenario(scenario: Scenario) {
    setBusy(true)
    try {
      const unityId = pilotUnityId()
      setBound(unityId)
      if (!unityId) {
        unboundRun(scenario.label)
        return
      }
      const manifest = await mintManifest({
        unity_id: unityId,
        input: { task: `arbitrage-${scenario.key}`, at: Date.now() },
        scope: [...ARBITRAGE_ROLES],
        change_kind: 'implementation',
        design_verdict: VERDICT,
      })
      const trail = runArbitrage(scenario.task, CTX, VERDICT)
      const verdict = validateDecision(manifest.manifest_hash, {
        manifest_ref: manifest.manifest_hash,
        task: `arbitrage-${scenario.key}`,
        arbitrage: trail,
      })
      if (verdict.allowed) await receiptTrail(ledger, trail)
      setRuns(prev => [
        ...prev,
        {
          label: scenario.label,
          manifestHash: manifest.manifest_hash,
          allowed: verdict.allowed,
          detail: verdict.allowed
            ? 'Decision bound. One TASK_BIND, one decision — the binding is consumed.'
            : verdict.detail,
          outcome: trail.outcome,
          executed: trail.executed,
          abstained: trail.abstained,
          vetoed: trail.vetoed,
        },
      ])
      setReceipts([...ledger.receipts()])
      setScore(scoreLedger(ledger.receipts()))
    } finally {
      setBusy(false)
    }
  }

  async function runUnpricedAttempt() {
    setBusy(true)
    try {
      const unityId = pilotUnityId()
      setBound(unityId)
      if (!unityId) {
        unboundRun('Unpriced attempt')
        return
      }
      const manifest = await mintManifest({
        unity_id: unityId,
        input: { task: 'arbitrage-unpriced-attempt', at: Date.now() },
        scope: [...ARBITRAGE_ROLES],
        change_kind: 'implementation',
        design_verdict: VERDICT,
      })
      // No trail at all: fail-closed must fire.
      const verdict = validateDecision(manifest.manifest_hash, {
        manifest_ref: manifest.manifest_hash,
        task: 'arbitrage-unpriced-attempt',
      })
      setRuns(prev => [
        ...prev,
        {
          label: 'Unpriced attempt',
          manifestHash: manifest.manifest_hash,
          allowed: verdict.allowed,
          detail: verdict.allowed ? 'UNEXPECTED — this should never allow.' : verdict.detail,
          executed: [],
          abstained: [],
          vetoed: [],
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="arb">
      <div className="arb-inner">
        <p className="arb-kicker">Self-arbitrage bots · PILOT · LOCAL</p>
        <h1>The house always wins on truth</h1>
        <p className="arb-lede">
          Every bot is a hybrid: a probabilistic half that proposes cheap and a deterministic half that prices
          dear. Every action is an internal trade — the system captures the spread between &ldquo;seems
          right&rdquo; and &ldquo;proven.&rdquo; The probabilistic half is an honest stub
          ({PROBABILISTIC_HALF_LABEL}); it is never an LLM.
        </p>
        <p className="arb-boundary">
          EXECUTE records a receipted, binding-bound decision effect in this ledger. Nothing external is
          touched and no kernel is faked. A decision without a pricing is rejected, fail-closed.
        </p>
        <a className="arb-back" href="/">Back to the world</a>
        {bound ? (
          <p className="arb-boundary">
            Pilot handle bound: <code>{bound}</code> — every run mints one TASK_BIND under this handle.
          </p>
        ) : (
          <p className="arb-boundary">
            UNBOUND — no pilot Unity handle is bound on this device. Bind your pilot handle at the gate (the 3D
            world) first. Runs are recorded as unbound until then; nothing will be minted.
          </p>
        )}

        <h2 className="arb-section-title">Run a scenario — one TASK_BIND each</h2>
        <div className="arb-scenarios">
          {SCENARIOS.map(scenario => (
            <button key={scenario.key} className="arb-btn" disabled={busy} onClick={() => runScenario(scenario)}>
              {scenario.label}
              <small>{scenario.sub}</small>
            </button>
          ))}
          <button className="arb-btn hostile" disabled={busy} onClick={runUnpricedAttempt}>
            Unpriced attempt
            <small>decide with no pricing — must be rejected</small>
          </button>
        </div>

        <h2 className="arb-section-title">Training score · {score.label}</h2>
        <section className="arb-score" aria-label="Arbitrage training score">
          <p className="label">Computed from this ledger only</p>
          <div className="arb-stats">
            <div className="arb-stat"><div className="n">{score.proposed}</div><div className="k">proposed</div></div>
            <div className="arb-stat"><div className="n">{score.proven}</div><div className="k">proven</div></div>
            <div className="arb-stat"><div className="n">{score.unproven}</div><div className="k">unproven</div></div>
            <div className="arb-stat"><div className="n">{score.rejected}</div><div className="k">rejected</div></div>
            <div className="arb-stat"><div className="n">{score.abstained}</div><div className="k">abstained</div></div>
          </div>
          <div className="arb-metrics">
            <div className="arb-metric"><div className="v">{fmtScore(score.precision)}</div><div className="k">precision · proven/proposed</div></div>
            <div className="arb-metric"><div className="v">{fmtScore(score.strictness)}</div><div className="k">strictness · (rejected+abstained)/unproven</div></div>
            <div className="arb-metric"><div className="v">{fmtScore(score.arbitrage_score)}</div><div className="k">arbitrage score · precision × strictness</div></div>
          </div>
          <p className="arb-note">{score.note}</p>
        </section>

        <h2 className="arb-section-title">Runs</h2>
        {runs.length === 0 && <p className="arb-empty">No runs yet. Pick a scenario above.</p>}
        {runs.map((run, i) => (
          <div className="arb-run" key={`${run.manifestHash}-${i}`}>
            <div className="r-head">
              <span className="r-label">{run.label}</span>
              <span className={`arb-verdict ${run.allowed ? 'ok' : 'no'}`}>
                {run.allowed ? 'ALLOWED · binding consumed' : 'REJECTED'}
              </span>
            </div>
            <p className="r-detail">{run.detail}</p>
            {run.allowed && run.outcome && (
              <p className="r-detail">
                Outcome {run.outcome} · executed {run.executed.join(', ') || 'none'} · abstained {run.abstained.join(', ') || 'none'} · vetoed {run.vetoed.join(', ') || 'none'}
              </p>
            )}
            <p className="r-hash">{run.manifestHash ? `manifest ${shortHash(run.manifestHash)}` : 'no manifest — nothing was minted'}</p>
          </div>
        ))}

        <h2 className="arb-section-title">Arbitrage ledger · hash-chained receipts</h2>
        {receipts.length === 0 && <p className="arb-empty">The ledger is empty. Run a scenario to write receipts.</p>}
        <ul className="arb-receipts">
          {receipts.map(receipt => (
            <li key={receipt.entry_hash} className={`arb-receipt${receipt.kind === 'VETO' ? ' veto' : ''}`}>
              <div className="rk">#{receipt.seq} · {receipt.kind}</div>
              <div className="rs">{receiptSummary(receipt)}</div>
              <div className="rh">entry {shortHash(receipt.entry_hash)}</div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
