/** Pyramid instrument for the /explorer HUD deck.
 *
 * Renders the GENERATED pyramid structure (src/dccp/explorer/pyramid.ts):
 * - geometry toggle: 4-simplex unfolding | fractal tesseract (the generator
 *   derives both; the rules determine which one the data forms)
 * - machine audit: AUDIT DERIVATION re-walks every derivation path locally
 * - apex-to-base drill: coordinate traversal — breadcrumb + focus card +
 *   four emanation step buttons; unmaterialized addresses render honestly as
 *   "not yet derived"
 * - shells: aggregation levels (coordinate-depth) collapse to counts; expanding
 *   a shell shows a virtualized node list (only the visible window renders —
 *   the 2.1M-card design; at pilot scale the window covers everything)
 *
 * Read-only. No animation; reduced-motion safe. Mobile-clean (390×844).
 */
import { useMemo, useRef, useState } from 'react'
import {
  APEX_INPUT,
  AXES,
  AXIS_NAMES,
  CORNER_INPUTS,
  auditPyramid,
  derivePyramid,
  emanationsOf,
  fmtCoord,
  nodeAt,
  rulesV1,
  type Axis,
  type Coord4,
  type Geometry,
  type PyrNode,
  type Pyramid,
} from './pyramid'

const KIND_LABEL: Record<PyrNode['kind'], string> = {
  apex: 'APEX',
  corner: 'CORNER',
  claim: 'CLAIM',
  test: 'TEST',
  receipt: 'RECEIPT',
  task: 'TASK',
  block: 'BLOCK',
  hollow: 'HOLLOW',
}

const AXIS_SHORT: Record<Axis, string> = { t: '+t truth', n: '+n no-force', h: '+h host', c: '+c cleanup' }

/* Virtualized node list: renders only the visible window. At pilot scale the
 * window covers the shell; at pyramid scale (2.1M cards, ~82 shells) it never
 * renders more than a screenful. */
const ROW_H = 52
const WINDOW_ROWS = 14

function VirtualList({ nodes, onPick }: { nodes: PyrNode[]; onPick: (n: PyrNode) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [start, setStart] = useState(0)
  const onScroll = () => {
    const el = ref.current
    if (!el) return
    setStart(Math.max(0, Math.floor(el.scrollTop / ROW_H) - 2))
  }
  const slice = nodes.slice(start, start + WINDOW_ROWS)
  const tailH = Math.max(0, nodes.length - start - slice.length) * ROW_H
  return (
    <div className="pyr-vlist" ref={ref} onScroll={onScroll} tabIndex={0} role="list" aria-label={`${nodes.length} nodes in this shell`}>
      <div style={{ height: start * ROW_H }} aria-hidden="true" />
      {slice.map(n => (
        <button
          key={n.id}
          role="listitem"
          type="button"
          className={'pyr-vrow' + (n.hollow ? ' ishollow' : '')}
          style={{ minHeight: ROW_H }}
          onClick={() => onPick(n)}
          aria-label={`${KIND_LABEL[n.kind]} ${n.title} at ${fmtCoord(n.coord)}${n.hollow ? ' — not yet derived' : ''}`}
        >
          <span className={'pyr-kchip k-' + n.kind}>{KIND_LABEL[n.kind]}</span>
          <span className="pyr-vcoord">{fmtCoord(n.coord)}</span>
          <span className="pyr-vtitle">{n.title}</span>
        </button>
      ))}
      <div style={{ height: tailH }} aria-hidden="true" />
    </div>
  )
}

function derivationPath(pyr: Pyramid, node: PyrNode): PyrNode[] {
  const path: PyrNode[] = []
  const seen = new Set<string>()
  let cur: PyrNode | undefined = node
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id)
    path.unshift(cur)
    cur = cur.parent ? pyr.byId.get(cur.parent) : undefined
  }
  return path
}

export function PyramidInstrument() {
  const [geometry, setGeometry] = useState<Geometry>('simplex')
  const pyr: Pyramid = useMemo(
    () => derivePyramid(APEX_INPUT, CORNER_INPUTS, rulesV1(geometry)),
    [geometry],
  )
  const [focus, setFocus] = useState<Coord4>({ t: 0, n: 0, h: 0, c: 0 })
  const [openShell, setOpenShell] = useState<number | null>(null)
  const [auditLine, setAuditLine] = useState<string | null>(null)

  const focusNode = nodeAt(pyr, focus)
  const path = useMemo(() => (focusNode ? derivationPath(pyr, focusNode) : []), [pyr, focusNode])

  const runAudit = () => {
    const r = auditPyramid(pyr)
    setAuditLine(
      r.ok
        ? `${r.checked}/${r.checked} derivation paths valid — every node one axis-step from its parent, every path reaches the apex.`
        : `AUDIT FAILED: ${r.failures.slice(0, 3).join(' · ')}`,
    )
  }

  const pick = (n: PyrNode) => {
    setFocus({ t: n.coord.t, n: n.coord.n, h: n.coord.h, c: n.coord.c })
    setAuditLine(null)
  }

  const st = pyr.stats
  const openNodes = openShell === null ? [] : (pyr.levels[openShell] ?? [])

  return (
    <>
      <div className="sechead">
        <h2>Pyramid</h2>
        <p>
          The generative pyramid: apex at the top (the Unity ID — a point), four corner
          stones (the law-floor invariants), pure logic between. Every node carries its
          4D derivation address (t · n · h · c) — distance along each invariant&apos;s
          emanation from the apex. The DAG mapper above renders this generated structure;
          here is the whole pyramid, drilled apex to base.
        </p>
      </div>

      <div className="panel">
        <h3>Geometry</h3>
        <p className="sub">
          Two readings, one generator. The derivation rules — not hand-placing — determine
          which one the register&apos;s content actually forms.
        </p>
        <div className="pyr-toggle" role="group" aria-label="Pyramid geometry">
          {(['simplex', 'tesseract'] as Geometry[]).map(g => (
            <button
              key={g}
              type="button"
              className={geometry === g ? 'on' : ''}
              aria-pressed={geometry === g}
              onClick={() => {
                setGeometry(g)
                setAuditLine(null)
                setOpenShell(null)
              }}
            >
              {g === 'simplex' ? '4-simplex unfolding' : 'fractal tesseract'}
            </button>
          ))}
        </div>
        <div className="stats" style={{ marginTop: 16 }}>
          <div className="stat">
            <b className="teal">{st.total}</b>
            <span>nodes derived</span>
          </div>
          <div className="stat">
            <b>{st.shells}</b>
            <span>shells deep</span>
          </div>
          <div className="stat">
            <b className="purple">{st.content}</b>
            <span>content nodes</span>
          </div>
          <div className="stat">
            <b className="amber">{st.hollow}</b>
            <span>hollow · not yet derived</span>
          </div>
        </div>
        <p className="pyr-verdict">{st.verdict}</p>
        <div className="actions">
          <button type="button" className="primary" onClick={runAudit}>
            {auditLine ? 'RE-AUDIT DERIVATION' : 'AUDIT DERIVATION'}
          </button>
        </div>
        {auditLine && <p className="verifyline">{auditLine}</p>}
        <p className="pyr-scale-note">
          Scale design: 2.1M cards ≈ 82 shells deep in the 4D lattice. The machine audits
          the full set; the human navigates the pyramid — shells collapse to counts,
          lists virtualize, the drill below traverses coordinates.
        </p>
      </div>

      <div className="panel">
        <h3>Apex → base drill</h3>
        <p className="sub">Coordinate traversal. Step along any invariant&apos;s emanation; unmaterialized addresses stay honestly hollow.</p>
        <nav className="pyr-crumbs" aria-label="Derivation path">
          {path.length > 0 ? (
            path.map(n => (
              <button
                key={n.id}
                type="button"
                className={'pyr-crumb' + (n.id === focusNode?.id ? ' on' : '')}
                onClick={() => pick(n)}
                aria-label={`Go to ${n.title} at ${fmtCoord(n.coord)}`}
              >
                <span className={'pyr-kchip k-' + n.kind}>{KIND_LABEL[n.kind]}</span>
                <span className="pyr-crumb-t">{n.title}</span>
              </button>
            ))
          ) : (
            <span className="pyr-crumb ghost">
              <span className="pyr-kchip k-hollow">HOLLOW</span>
              <span className="pyr-crumb-t">{fmtCoord(focus)} — not yet derived</span>
            </span>
          )}
        </nav>
        <div className="pyr-focus" aria-live="polite">
          {focusNode ? (
            <>
              <div className="pyr-focus-head">
                <span className={'pyr-kchip k-' + focusNode.kind}>{KIND_LABEL[focusNode.kind]}</span>
                <b>{focusNode.title}</b>
              </div>
              <div className="pyr-coord">{fmtCoord(focusNode.coord)}</div>
              <dl className="pyr-dl">
                <dt>Derived by</dt>
                <dd>
                  rule {focusNode.rule}
                  {focusNode.parent ? ` · emanation of ${focusNode.parent}` : ' · the point itself'}
                </dd>
                {focusNode.axis && (
                  <>
                    <dt>Invariant</dt>
                    <dd>{AXIS_NAMES[focusNode.axis]}</dd>
                  </>
                )}
                {focusNode.statusLabel && (
                  <>
                    <dt>Status</dt>
                    <dd>{focusNode.statusLabel}</dd>
                  </>
                )}
                {focusNode.detail && !focusNode.hollow && (
                  <>
                    <dt>Record</dt>
                    <dd className="mut">{focusNode.detail}</dd>
                  </>
                )}
                {focusNode.note && (
                  <>
                    <dt>Note</dt>
                    <dd className="mut">{focusNode.note}</dd>
                  </>
                )}
                {focusNode.hollow && focusNode.hollowReason && (
                  <>
                    <dt>Honest state</dt>
                    <dd className="mut">{focusNode.hollowReason}</dd>
                  </>
                )}
              </dl>
            </>
          ) : (
            <>
              <div className="pyr-focus-head">
                <span className="pyr-kchip k-hollow">HOLLOW</span>
                <b>not yet derived</b>
              </div>
              <div className="pyr-coord">{fmtCoord(focus)}</div>
              <p className="mut" style={{ margin: '8px 0 0' }}>
                Address {fmtCoord(focus)} is valid lattice, but no rule has derived content
                here. The logic decides what&apos;s needed — this vertex waits.
              </p>
            </>
          )}
        </div>
        <div className="pyr-emanate" role="group" aria-label="Step along an invariant emanation">
          {emanationsOf(focus).map(e => (
            <button key={e.axis} type="button" onClick={() => setFocus(e.coord)} aria-label={`Step along ${AXIS_NAMES[e.axis]} to ${fmtCoord(e.coord)}`}>
              {AXIS_SHORT[e.axis]}
            </button>
          ))}
          <button type="button" className="ghostbtn" onClick={() => setFocus({ t: 0, n: 0, h: 0, c: 0 })}>
            back to apex
          </button>
        </div>
      </div>

      <div className="panel">
        <h3>Shells</h3>
        <p className="sub">
          Aggregation levels — each shell collapses to counts. Zoomed out: aggregates.
          Expand a shell for its nodes (virtualized list).
        </p>
        <div className="pyr-shells">
          {pyr.levels.map((nodes, d) => {
            const content = nodes.filter(n => !n.hollow).length
            const hollow = nodes.length - content
            const open = openShell === d
            return (
              <div key={d} className="pyr-shell">
                <button
                  type="button"
                  className={'pyr-shellhead' + (open ? ' on' : '')}
                  aria-expanded={open}
                  onClick={() => setOpenShell(open ? null : d)}
                  aria-label={`Shell ${d}: ${content} content, ${hollow} hollow nodes${open ? ' — collapse' : ' — expand'}`}
                >
                  <b>shell {d}</b>
                  <span>
                    {content} content · {hollow} hollow
                  </span>
                  <span className="pyr-caret">{open ? '▾' : '▸'}</span>
                </button>
                {open && (
                  <VirtualList
                    nodes={nodes}
                    onPick={n => {
                      pick(n)
                      setOpenShell(null)
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
