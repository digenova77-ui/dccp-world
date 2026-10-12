import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import '@/dccp/styles/explorer.css'
import {
  LABEL,
  SEED_COUNT,
  loadChain,
  verifyChain,
  type ChainedBlock,
  type LinkReport,
} from '@/dccp/explorer/ledger'
import {
  RECEIPT_NOTE,
  REGISTER_REF,
  type DagClaim,
  type DagTest,
  type DagReceipt,
  type DagTask,
} from '@/dccp/explorer/dag'
import {
  APEX_INPUT,
  CORNER_INPUTS,
  rulesV1,
  derivePyramid,
  dagView,
} from '@/dccp/explorer/pyramid'
import { PyramidInstrument } from '@/dccp/explorer/pyramidView'

export const Route = createFileRoute('/explorer')({
  component: Explorer,
  head: () => ({ meta: [{ title: 'Bot World HUD — DCCP World' }] }),
})

const short = (h: string) => h.slice(0, 20) + '…' + h.slice(-10)

type Selected =
  | { kind: 'claim'; node: DagClaim }
  | { kind: 'test'; node: DagTest }
  | { kind: 'receipt'; node: DagReceipt; claimId: string }
  | { kind: 'task'; node: DagTask }
  | null

/* ------------------------------------------------------------------ */
/* DAG glyphs — the Iris/company glyph set as node markers.             */
/* Claims: an asymmetrical five-point glyph (faceted, never mirrored).  */
/* Tests: a diamond. Receipts: the Iris twin-orb cluster — her eyes.    */
/* Open/hollow glyphs = untested, reword, removed, or evidence-awaiting.*/
/* ------------------------------------------------------------------ */

const ASYM = '0,-24 20,-10 14,18 -12,20 -22,-4'
const DIAMOND = '0,-20 16,0 0,20 -16,0'

function ClaimGlyph({ status }: { status: DagClaim['status'] }) {
  if (status === 'KEEP' || status === 'KEEP_GAP' || status === 'KEEP_COND')
    return <polygon points={ASYM} fill="#14b8a6" opacity={0.92} />
  const stroke = status === 'REMOVE' ? '#ff8a88' : status === 'REWORD' ? '#f4c96d' : '#b9a4ff'
  return <polygon points={ASYM} fill="none" stroke={stroke} strokeWidth={2.5} />
}

function TestGlyph({ proposed }: { proposed: boolean }) {
  return proposed ? (
    <polygon points={DIAMOND} fill="none" stroke="#b9a4ff" strokeWidth={2.5} strokeDasharray="5 4" />
  ) : (
    <polygon points={DIAMOND} fill="#a855f7" opacity={0.92} />
  )
}

function ReceiptGlyph() {
  return (
    <g>
      <circle cx={-8} cy={0} r={10} fill="#14b8a6" opacity={0.9} />
      <circle cx={8} cy={0} r={10} fill="#a855f7" opacity={0.9} />
    </g>
  )
}

/** The bound task: hollow, dashed — the manifest is minted but the design verdict
 *  is honestly absent (no kernel mounted). */
function TaskGlyph() {
  return <polygon points={ASYM} fill="none" stroke="#5ef2cf" strokeWidth={2.5} strokeDasharray="6 4" />
}

const ROW_H = 64
const X_TASK = 150
const X_CLAIM = 450
const X_TEST = 750
const X_RECEIPT = 1050
const DAG_W = 1200
const claimY = (i: number) => 56 + i * ROW_H + ROW_H / 2
/* taskY and dagH live in the component now — the DAG's node set is generated,
 * so its height derives from the generated claim count. */

/* The tree — David's stated Unity Playground Infrastructure pipeline, rendered as
 * pure logic. The roots are the computer; the playground is the tree. T1 (the
 * first bound task) lives at the TASK+CAPABILITY stage; every other stage is an
 * honest "no bound tasks" state. */
const TREE_STAGES = [
  { name: 'DCLM / LAW FLOOR', note: 'TRUTH_OR_NOTHING · NO_FORCE · HOST_SAFE · CLEANUP_FIRST — rules no side can change' },
  { name: 'TASK + CAPABILITY', note: 'T1 · Unity Playground Infrastructure first job — manifest minted locally, verdict absent', lit: true },
  { name: 'DIGITAL TWIN', note: 'no bound tasks' },
  { name: 'FORMAL VERIFICATION', note: 'no bound tasks' },
  { name: 'HARDWARE SIMULATION', note: 'no bound tasks' },
  { name: 'VM / REAL MACHINE', note: 'no bound tasks' },
  { name: 'HARDWARE GATE', note: 'no bound tasks' },
  { name: 'ACTUATOR BUS', note: 'no bound tasks' },
  { name: 'PHYSICAL DROID', note: 'no bound tasks' },
  { name: 'SENSORS → DCLM RECEIPT', note: 'no receipts — kernel not mounted' },
]
const SAFETY_CHAIN = ['HOST_SAFE', 'MACHINE_SAFE', 'HUMAN_SAFE', 'ENVIRONMENT_SAFE']

function Explorer() {
  /* The global stylesheet pins html/body to overflow:hidden for the 3D world
   * canvas. This route is a long instrument deck — restore viewport scrolling
   * while it is mounted, and hand the world's rule back on unmount. Route-scoped;
   * the world itself is untouched. */
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    html.style.overflow = 'auto'
    body.style.overflow = 'auto'
    return () => {
      html.style.overflow = ''
      body.style.overflow = ''
    }
  }, [])

  const [blocks, setBlocks] = useState<ChainedBlock[] | null>(null)
  const [reports, setReports] = useState<Map<number, LinkReport> | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null)
  const [selected, setSelected] = useState<Selected>(null)
  const [keys, setKeys] = useState<
    { id: string; fingerprint: string; createdAt: number; status: string }[] | null
  >(null)

  useEffect(() => {
    let live = true
    void loadChain().then(chain => {
      if (live) setBlocks(chain)
    })
    return () => {
      live = false
    }
  }, [])

  /* This device: the real local agency keyring (IndexedDB, read-only, never leaves the browser). */
  useEffect(() => {
    let live = true
    try {
      if (typeof indexedDB === 'undefined') return
      const req = indexedDB.open('dclm-agency-keyring', 1)
      // Same store shape as the /machine key desk; creating it empty on a fresh
      // profile is benign and keeps this read honest (empty keyring, not an error).
      req.onupgradeneeded = () => {
        req.result.createObjectStore('keys', { keyPath: 'id' })
      }
      req.onsuccess = () => {
        const db = req.result
        const t = db.transaction('keys', 'readonly').objectStore('keys').getAll()
        t.onsuccess = () => {
          if (!live) return
          const rows = (t.result as any[]).map(k => ({
            id: String(k.id),
            fingerprint: String(k.fingerprint ?? ''),
            createdAt: Number(k.createdAt ?? 0),
            status: String(k.status ?? 'UNKNOWN'),
          }))
          setKeys(rows)
          db.close()
        }
        t.onerror = () => live && setKeys([])
      }
      req.onerror = () => live && setKeys([])
    } catch {
      if (live) setKeys([])
    }
    return () => {
      live = false
    }
  }, [])

  const runVerify = async () => {
    if (!blocks || verifying) return
    setVerifying(true)
    try {
      const list = await verifyChain(blocks)
      setReports(new Map(list.map(r => [r.seq, r])))
      setVerifiedAt(new Date().toISOString())
    } finally {
      setVerifying(false)
    }
  }

  const validCount = useMemo(
    () => (reports ? [...reports.values()].filter(r => r.valid).length : null),
    [reports],
  )

  /* The DAG mapper renders the GENERATED structure: the pyramid generator derives
   * the node set + edges from the claims register (unit-tested to reproduce the
   * 16·10·9·1 DAG exactly). Layout columns stay presentational and unchanged. */
  const GEN = useMemo(() => derivePyramid(APEX_INPUT, CORNER_INPUTS, rulesV1('simplex')), [])
  const DV = useMemo(() => dagView(GEN), [GEN])
  const dagH = 56 + DV.claims.length * ROW_H + 40
  const taskY = dagH / 2

  const testById = useMemo(() => new Map(DV.tests.map(t => [t.id, t])), [DV])
  const receiptById = useMemo(() => new Map(DV.receipts.map(r => [r.id, r])), [DV])
  const pos = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>()
    DV.claims.forEach((c, i) => m.set(c.id, { x: X_CLAIM, y: claimY(i) }))
    for (const t of DV.tests) {
      const c = DV.claims.find(c => c.testId === t.id)
      if (c) m.set(t.id, { x: X_TEST, y: claimY(DV.claims.indexOf(c)) })
    }
    for (const r of DV.receipts) {
      const t = DV.tests.find(t => t.receiptId === r.id)
      const c = t && DV.claims.find(c => c.testId === t.id)
      if (c) m.set(r.id, { x: X_RECEIPT, y: claimY(DV.claims.indexOf(c)) })
    }
    return m
  }, [DV])

  const pick = (s: Selected) => setSelected(s)
  const onKey = (s: Selected) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      pick(s)
    }
  }

  const detailFor = (s: Selected) => {
    if (!s) return null
    if (s.kind === 'task') {
      const t = s.node
      return (
        <div className="panel detail" aria-live="polite">
          <h3>
            Task {t.id} · {t.title}
          </h3>
          <dl>
            <dt>Bound task</dt>
            <dd>{t.wording}</dd>
            <dt>State</dt>
            <dd>{t.statusLabel}</dd>
            <dt>Design verdict</dt>
            <dd className="mut">{t.note}</dd>
          </dl>
        </div>
      )
    }
    if (s.kind === 'claim') {
      const c = s.node
      const t = c.testId ? testById.get(c.testId) : undefined
      return (
        <div className="panel detail" aria-live="polite">
          <h3>
            {c.id} · {c.title}
          </h3>
          <dl>
            <dt>Claim</dt>
            <dd>{c.wording}</dd>
            <dt>Register status</dt>
            <dd>{c.statusLabel}</dd>
            {t ? (
              <>
                <dt>Test</dt>
                <dd className="mut">{t.name}</dd>
              </>
            ) : (
              <>
                <dt>Test</dt>
                <dd className="mut">No test named — UNTESTED. No receipt.</dd>
              </>
            )}
            {c.note && (
              <>
                <dt>Note</dt>
                <dd className="mut">{c.note}</dd>
              </>
            )}
          </dl>
        </div>
      )
    }
    if (s.kind === 'test') {
      const t = s.node
      return (
        <div className="panel detail" aria-live="polite">
          <h3>Test · {t.name}</h3>
          <dl>
            <dt>Detail</dt>
            <dd className="mut">{t.detail}</dd>
            <dt>State</dt>
            <dd>
              {t.state === 'NAMED'
                ? 'Named test file'
                : t.state === 'DESCRIBED'
                  ? 'Described in the register (no filename)'
                  : 'Proposed — not yet written'}
            </dd>
            <dt>Receipt</dt>
            <dd className="mut">
              {t.receiptId ? 'Register receipt issued — see the twin-orb node.' : 'None — no receipt without a run test.'}
            </dd>
          </dl>
        </div>
      )
    }
    const r = s.node
    const claim = DV.claims.find(c => c.id === s.claimId)
    return (
      <div className="panel detail" aria-live="polite">
        <h3>
          Receipt · {claim ? `${claim.id} — ${claim.title}` : r.id}
        </h3>
        <dl>
          <dt>Adjudication</dt>
          <dd>{r.label}</dd>
          <dt>What this is</dt>
          <dd className="mut">{r.note}</dd>
        </dl>
      </div>
    )
  }

  return (
    <div className="ex2d">
      <main>
        <div className="top">
          <div className="kicker">Bot World HUD · Instrument Deck</div>
          <h1 className="brand">Bot World HUD</h1>
          <p className="lede">
            The operator&apos;s instrument deck for the bot world — the data center&apos;s
            manifestation, managed through instruments, not played in. Audit the receipt
            chain. Trace every claim to its test to its receipt. See what is bound, and
            what is honestly absent. Nothing here is mainnet, nothing is invented.
          </p>
          <div className="badges">
            <span className="badge">{LABEL}</span>
            <span className="badge amber">KERNEL NOT MOUNTED</span>
            <span className="badge purple">READ-ONLY</span>
          </div>
          <a className="backlink" href="/">
            ← back to the world
          </a>
        </div>

        <section aria-label="Ledger statistics">
          <div className="stats">
            <div className="stat">
              <b className="teal">{blocks ? blocks.length : '…'}</b>
              <span>path records sealed</span>
            </div>
            <div className="stat">
              <b>0</b>
              <span>live kernel receipts</span>
            </div>
            <div className="stat">
              <b className={'small ' + (validCount === null ? '' : validCount === SEED_COUNT ? 'teal' : 'amber')}>
                {validCount === null ? 'UNVERIFIED' : `${validCount}/${SEED_COUNT} VALID`}
              </b>
              <span>chain status</span>
            </div>
            <div className="stat">
              <b className="purple">
                {DV.claims.length}·{DV.tests.length}·{DV.receipts.length}·{DV.tasks.length}
              </b>
              <span>claims · tests · receipts · tasks</span>
            </div>
            <div className="stat">
              <b>0</b>
              <span>swarms bound</span>
            </div>
          </div>
        </section>

        <section aria-label="Block explorer">
          <div className="sechead">
            <h2>Block explorer</h2>
            <p>
              Each block carries a receipt hash-linked to the previous: hash =
              sha256(prev_hash ‖ canonical(receipt)). Run the verification and every link is
              recomputed locally, on this device.
            </p>
          </div>
          <div className="actions">
            <button className="primary" onClick={runVerify} disabled={!blocks || verifying}>
              {verifying ? 'VERIFYING…' : reports ? 'RE-VERIFY CHAIN' : 'VERIFY CHAIN'}
            </button>
          </div>
          {verifiedAt && (
            <p className="verifyline">
              Chain recomputed locally at {verifiedAt} —{' '}
              {validCount === SEED_COUNT ? 'every link VALID.' : 'BROKEN links found — see the blocks below.'}
            </p>
          )}
          <div className="blocks">
            {!blocks && (
              <div className="slot">
                <b>LOADING</b>Computing the chain…
              </div>
            )}
            {blocks?.map(b => {
              const rep = reports?.get(b.receipt.seq)
              return (
                <article className="block" key={b.receipt.seq} aria-label={`Block ${b.receipt.seq}`}>
                  <div className="row">
                    <span className="seq">BLOCK {b.receipt.seq}</span>
                    <span className="kind">{b.receipt.kind}</span>
                    {rep ? (
                      <span className={'valid ' + (rep.valid ? 'ok' : 'bad')}>
                        {rep.valid ? '✓ VALID' : '✗ BROKEN'}
                      </span>
                    ) : (
                      <span className="valid idle">UNVERIFIED</span>
                    )}
                  </div>
                  <div className="event">{b.receipt.event}</div>
                  <p className="detail">{b.receipt.detail}</p>
                  <div className="hashes">
                    <div className="hashline">
                      <b>hash</b> {short(b.hash)}
                    </div>
                    <div className="hashline prev">
                      <b>prev</b> {short(b.prev_hash)}
                    </div>
                  </div>
                  <details className="fullhash">
                    <summary>full hashes</summary>
                    <div className="hashline">
                      <b>hash</b> {b.hash}
                    </div>
                    <div className="hashline prev">
                      <b>prev</b> {b.prev_hash}
                    </div>
                    <div className="hashline">
                      <b>canonical receipt</b>{' '}
                      {JSON.stringify(b.receipt)}
                    </div>
                  </details>
                  <div className="meta">
                    <span className="pill">{b.receipt.ts}</span>
                    <span className="pill">{b.receipt.ref}</span>
                    <span className="pill label">{b.receipt.label}</span>
                  </div>
                </article>
              )
            })}
          </div>

          <div className="slots" aria-label="Future blocks">
            {[SEED_COUNT, SEED_COUNT + 1, SEED_COUNT + 2].map(seq => (
              <div className="slot" key={seq}>
                <b>BLOCK {seq} · AWAITING SEAL</b>
                No sealed blocks yet — kernel not mounted. When a kernel mounts and issues a
                real receipt, it chains here.
              </div>
            ))}
          </div>
        </section>

        <section aria-label="This device">
          <div className="sechead">
            <h2>This device</h2>
            <p>
              The agency keyring as it exists on this browser right now — read locally, never
              transmitted. Private keys are never read.
            </p>
          </div>
          <div className="panel device">
            <h3>Local agency keyring</h3>
            <p className="sub">IndexedDB · dclm-agency-keyring · this browser only</p>
            {keys === null && <div className="empty">Reading the local keyring…</div>}
            {keys !== null && keys.length === 0 && (
              <div className="empty">
                No agency keys on this device — the keyring is empty. Create one on the /machine
                key desk and it will appear here.
              </div>
            )}
            {keys !== null &&
              keys.length > 0 &&
              keys.map(k => (
                <div className="keyrow" key={k.id}>
                  <span>{k.id}</span>
                  <span>{k.fingerprint ? short(k.fingerprint.replace('sha256:', '')) : 'no fingerprint'}</span>
                  <span>{k.createdAt ? new Date(k.createdAt).toISOString().slice(0, 10) : 'no date'}</span>
                  <span className={k.status === 'ACTIVE' ? 'st-active' : 'st-revoked'}>{k.status}</span>
                </div>
              ))}
          </div>
        </section>

        <section aria-label="Swarm status">
          <div className="sechead">
            <h2>Swarm status</h2>
            <p>
              The instrument that manages bot swarms — and refuses to fake one. Zero swarms
              are bound; the swarm layer awaits the ephemeral capability runtime.
            </p>
          </div>
          <div className="panel">
            <h3>Bound swarms</h3>
            <p className="sub" style={{ fontSize: 34, color: 'var(--etext)', fontWeight: 800, margin: '6px 0' }}>
              0
            </p>
            <p className="sub">
              No bot swarms are bound. When swarms bind, this instrument shows bound tasks
              per swarm, manifest hashes, and capability scope and expiry. Nothing here is
              simulated — an empty instrument is the honest one.
            </p>
          </div>
        </section>

        <section aria-label="The tree">
          <div className="sechead">
            <h2>The tree</h2>
            <p>
              The grand architecture as pure logic — the roots are the computer, the
              playground is the tree. One real task sits in its real place; everything
              else is honestly empty.
            </p>
          </div>
          <div className="panel">
            <h3>Unity Playground Infrastructure pipeline</h3>
            <div className="tree">
              {TREE_STAGES.map(s => (
                <div className={'stage' + (s.lit ? ' lit' : '')} key={s.name}>
                  <b>{s.name}</b>
                  <span>{s.note}</span>
                </div>
              ))}
            </div>
            <div className="safety" aria-label="Safety chain">
              {SAFETY_CHAIN.map((s, i) => (
                <span key={s} className="pill">
                  {s}
                  {i < SAFETY_CHAIN.length - 1 ? ' →' : ''}
                </span>
              ))}
            </div>
            <p className="sub" style={{ marginTop: 14, marginBottom: 0 }}>
              Safety chain: each stage clears before the next begins.
            </p>
          </div>
        </section>

        <section aria-label="DAG mapper">
          <div className="sechead">
            <h2>DAG mapper</h2>
            <p>
              Claims → tests → receipts, from the DCLM claims register ({REGISTER_REF}).
              Tap any glyph for its full record. Edges exist only where the register names a
              test — nothing is inferred.
            </p>
          </div>
          <div className="dagwrap">
            <svg
              className="dag"
              viewBox={`0 0 ${DAG_W} ${dagH}`}
              role="img"
              aria-label={`Claims DAG: ${DV.tasks.length} task, ${DV.claims.length} claims, ${DV.tests.length} tests, ${DV.receipts.length} receipts`}
            >
              <text x={X_TASK} y={26} textAnchor="middle" fontSize={12} fill="#93a8ad" letterSpacing={3}>
                TASK
              </text>
              <text x={X_CLAIM} y={26} textAnchor="middle" fontSize={12} fill="#93a8ad" letterSpacing={3}>
                CLAIMS
              </text>
              <text x={X_TEST} y={26} textAnchor="middle" fontSize={12} fill="#93a8ad" letterSpacing={3}>
                TESTS
              </text>
              <text x={X_RECEIPT} y={26} textAnchor="middle" fontSize={12} fill="#93a8ad" letterSpacing={3}>
                RECEIPTS
              </text>
              {DV.edges.map(e => {
                const a = pos.get(e.from)
                const b = pos.get(e.to)
                if (!a || !b) return null
                return (
                  <line
                    key={e.from + '>' + e.to}
                    x1={a.x + 28}
                    y1={a.y}
                    x2={b.x - 28}
                    y2={b.y}
                    stroke="#23404b"
                    strokeWidth={1.5}
                  />
                )
              })}
              {DV.tasks.map(t => (
                <g
                  key={t.id}
                  className="node"
                  transform={`translate(${X_TASK},${taskY})`}
                  onClick={() => pick({ kind: 'task', node: t })}
                  onKeyDown={onKey({ kind: 'task', node: t })}
                  tabIndex={0}
                  role="button"
                  aria-label={`Task ${t.id}: ${t.title} — ${t.statusLabel}`}
                >
                  <TaskGlyph />
                  <text y={40} textAnchor="middle" fontSize={12} fill="#eef6f4">
                    {t.id}
                  </text>
                </g>
              ))}
              {DV.claims.map((c, i) => {
                const p = { x: X_CLAIM, y: claimY(i) }
                return (
                  <g
                    key={c.id}
                    className="node"
                    transform={`translate(${p.x},${p.y})`}
                    onClick={() => pick({ kind: 'claim', node: c })}
                    onKeyDown={onKey({ kind: 'claim', node: c })}
                    tabIndex={0}
                    role="button"
                    aria-label={`Claim ${c.id}: ${c.title} — ${c.statusLabel}`}
                  >
                    <ClaimGlyph status={c.status} />
                    <text y={40} textAnchor="middle" fontSize={12} fill="#eef6f4">
                      {c.id}
                    </text>
                  </g>
                )
              })}
              {DV.tests.map(t => {
                const p = pos.get(t.id)
                if (!p) return null
                return (
                  <g
                    key={t.id}
                    className="node"
                    transform={`translate(${p.x},${p.y})`}
                    onClick={() => pick({ kind: 'test', node: t })}
                    onKeyDown={onKey({ kind: 'test', node: t })}
                    tabIndex={0}
                    role="button"
                    aria-label={`Test: ${t.name}`}
                  >
                    <TestGlyph proposed={t.state === 'PROPOSED'} />
                    <text y={40} textAnchor="middle" fontSize={10} fill="#93a8ad">
                      {t.id.replace('t-', '')}
                    </text>
                  </g>
                )
              })}
              {DV.receipts.map(r => {
                const p = pos.get(r.id)
                if (!p) return null
                const t = DV.tests.find(t => t.receiptId === r.id)
                const claimId = t && DV.claims.find(c => c.testId === t.id)?.id
                return (
                  <g
                    key={r.id}
                    className="node"
                    transform={`translate(${p.x},${p.y})`}
                    onClick={() => claimId && pick({ kind: 'receipt', node: r, claimId })}
                    onKeyDown={e => {
                      if (claimId && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault()
                        pick({ kind: 'receipt', node: r, claimId })
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Register receipt for claim ${claimId ?? r.id}`}
                  >
                    <ReceiptGlyph />
                    <text y={40} textAnchor="middle" fontSize={10} fill="#93a8ad">
                      {claimId ?? r.id}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
          <div className="legend" aria-label="Glyph legend">
            <span className="pill">◆ faceted glyph — claim</span>
            <span className="pill">◇ hollow glyph — untested / reword / removed</span>
            <span className="pill">◇ dashed teal — bound task, design verdict absent</span>
            <span className="pill">◆ diamond — test (dashed = proposed)</span>
            <span className="pill">◉ twin-orb — register receipt (Iris cluster)</span>
          </div>
          {selected ? (
            detailFor(selected)
          ) : (
            <div className="panel detail">
              <h3>No node selected</h3>
              <p className="sub" style={{ marginBottom: 0 }}>
                Tap any glyph above — a claim, a test, or a receipt — to read its full register
                record.
              </p>
            </div>
          )}
          <p className="foot" style={{ marginTop: 20 }}>
            The register defines C1–C5 (there are no C6/C7 entries — they are not invented
            here). O6 is untested and rendered hollow with an honest “no receipt” state; O7 is
            removed. R5’s encoding-parameter evidence is tracked in the close-out, not added
            silently. T1 is the ephemeral capability system’s first bound task (Unity
            Playground Infrastructure schematics → prototype → future); its manifest is
            minted locally and its design verdict is honestly absent — no kernel mounted.
          </p>
        </section>

        <section aria-label="Pyramid">
          <PyramidInstrument />
        </section>

        <p className="foot">
          {RECEIPT_NOTE} The seed blocks record this app&apos;s own transmission pathways —
          connector DROPPED/HOLE paths, the honest KERNEL_UNAVAILABLE verdict, the agency
          keyring&apos;s local lifecycle, and the TASK_BIND first job (Unity Playground
          Infrastructure schematics → prototype → future, PILOT · LOCAL · FIRST JOB,
          UNBOUND · HOLE · KERNEL_UNAVAILABLE) — {SEED_COUNT} blocks compiled from source on
          2026-10-04. No mainnet data, no invented blocks, no fake receipts.
        </p>
      </main>
    </div>
  )
}
