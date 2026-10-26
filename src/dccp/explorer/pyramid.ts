/** The generative pyramid DAG.
 *
 * David's directives (Oct 4, 2026), transcribed — the Trinity authors, the agent
 * holds the pen:
 *
 * 1. PYRAMID SCALE FROM DAY ONE. Fully explaining the story — everything,
 *    everywhere, every way, every time, auditable — needs ~2.1M cards (his
 *    pyramid-of-Giza number). "Something that starts at the top and goes out four
 *    different ways probably needs exactly that." The DAG mapper + block explorer
 *    are designed for this scale: hierarchical aggregation (apex → four ways →
 *    expanding levels), virtualized rendering (only the visible window, never
 *    2.1M nodes), level-of-detail collapse (zoomed out = aggregates with counts;
 *    zoom in = detail), apex-to-base navigation.
 *
 * 2. THE PYRAMID IS GENERATIVE, NOT HAND-BUILT. Apex at the top (a point — the
 *    Unity ID / white light), four corner stones at the bottom (the four law-floor
 *    invariants), pure logic fills everything between. "The story is going to write
 *    itself if it's purely logical — we just have to stand back and let it do its
 *    thing and it will decide how many stones or pages or landings we need."
 *    `derivePyramid(apex, corners, rules)` derives the structure; the DAG mapper
 *    renders the GENERATED structure — nothing hand-placed. Missing blocks are
 *    fine — the logic decides what's needed; gaps render as honest hollow nodes
 *    labeled "not yet derived."
 *
 * 3. FOUR-DIMENSIONAL ADDRESSING (load-bearing, not decorative). "We are dealing
 *    with four things coming off of one point which is four dimensions." One apex,
 *    four emanations — the four law-floor invariants AS the four dimensions.
 *    Every node is addressable by its 4D coordinate (t, n, h, c) from the apex:
 *    distance along each invariant's emanation. The pyramid as a 4-simplex
 *    unfolding. A node's coordinate IS its derivation address — auditable: the
 *    coordinate tells you exactly which invariant-emanations produced it.
 *    Aggregation levels are shells at coordinate-depth (t+n+h+c); apex-to-base
 *    navigation is coordinate traversal. The geometry is the addressing scheme,
 *    not a metaphor.
 *
 * 4. FRACTAL TESSERACT READING. "Maybe it's a fractal of a cube": from any vertex
 *    of a 4D hypercube exactly four edges emanate — matching "four things coming
 *    off of one point." Self-similar at every scale: four emanations from EVERY
 *    node (not just the apex), the law-floor four as the four axes recurring at
 *    each recursion level. The generator derives under either geometry; the
 *    derivation rules (not hand-placing) determine which one the data actually
 *    forms.
 *
 * 5. PYRAMID-FULCRUM READING (registered Oct 4, 2026 — NOT YET DERIVED, no
 *    derivation rules exist for it). David's geometry thread: the pyramid as
 *    INTERMEDIARY — "cube piece, pyramid, cube piece" — a fulcrum between two
 *    cube halves; the scale weighing philosophy against physics; "law of
 *    philosophy and physics." Recorded here as a registered reading the pure
 *    logic may derive when content presents itself as two halves with an
 *    intermediary. Until rules exist, it stays documentary, never invented.
 *
 * HONESTY LAW (standing): generated nodes derive ONLY from the register + rules.
 * Unverified claims derive hollow placeholder nodes, never invented content.
 * Nothing unvalidated is presented as fact.
 */

import {
  CLAIMS,
  TESTS,
  RECEIPTS,
  TASKS,
  RECEIPT_NOTE,
  type DagClaim,
  type DagTest,
  type DagReceipt,
  type DagTask,
  type DagEdge,
} from './dag.ts'
import { SEED_RECEIPTS, type Receipt } from './ledger.ts'

/* ------------------------------------------------------------------ */
/* Addressing: the 4D coordinate from the apex.                         */
/* ------------------------------------------------------------------ */

/** The four invariant axes — the four dimensions. */
export type Axis = 't' | 'n' | 'h' | 'c'
export const AXES: Axis[] = ['t', 'n', 'h', 'c']
export const AXIS_NAMES: Record<Axis, string> = {
  t: 'TRUTH_OR_NOTHING',
  n: 'NO_FORCE',
  h: 'HOST_SAFE',
  c: 'CLEANUP_FIRST',
}

/** A node's derivation address: steps along each invariant's emanation from
 *  the apex. The apex is (0,0,0,0). */
export interface Coord4 {
  t: number
  n: number
  h: number
  c: number
}

export const ORIGIN: Coord4 = { t: 0, n: 0, h: 0, c: 0 }

export function step(c: Coord4, a: Axis): Coord4 {
  const n: Coord4 = { t: c.t, n: c.n, h: c.h, c: c.c }
  n[a] += 1
  return n
}

/** Shell index — aggregation levels are shells at coordinate-depth. */
export function depthOf(c: Coord4): number {
  return c.t + c.n + c.h + c.c
}

export const coordKey = (c: Coord4): string => `${c.t},${c.n},${c.h},${c.c}`
export const fmtCoord = (c: Coord4): string =>
  `(t ${c.t} · n ${c.n} · h ${c.h} · c ${c.c})`

/* ------------------------------------------------------------------ */
/* Inputs: the apex, the four corner stones, the rules.                 */
/* ------------------------------------------------------------------ */

export interface ApexInput {
  title: string
  detail: string
}

export interface CornerInput {
  axis: Axis
  name: string
  detail: string
}

/** David's words: the apex is a point — the Unity ID / white light. */
export const APEX_INPUT: ApexInput = {
  title: 'Unity ID · white light',
  detail:
    'The point. A single apex — the Unity ID. Four emanations come off of it: the four law-floor invariants, the four dimensions.',
}

/** The four corner stones: the law-floor invariants — rules no side can change. */
export const CORNER_INPUTS: CornerInput[] = [
  {
    axis: 't',
    name: 'TRUTH_OR_NOTHING',
    detail:
      'Nothing is presented as true that is not evidenced — reference → measurement → receipt. The claims register is this invariant made into a discipline.',
  },
  {
    axis: 'n',
    name: 'NO_FORCE',
    detail:
      'Nothing commands, nothing executes; the generator never forces content into existence. Underived vertices stay honestly hollow.',
  },
  {
    axis: 'h',
    name: 'HOST_SAFE',
    detail:
      'All computation is local; no exfiltration, no external writes. The host\u2019s own transmission history — the pilot ledger — is this invariant\u2019s emanation.',
  },
  {
    axis: 'c',
    name: 'CLEANUP_FIRST',
    detail:
      'No persistence added; nothing lingers. Awaits derived content — the corner stone stands, its emanations honestly hollow.',
  },
]

export type NodeKind =
  | 'apex'
  | 'corner'
  | 'claim'
  | 'test'
  | 'receipt'
  | 'task'
  | 'block'
  | 'hollow'

export interface PyrNode {
  /** Stable derived id: `${kind}@${t},${n},${h},${c}` — the address is the identity. */
  id: string
  coord: Coord4
  /** Shell index: t+n+h+c. */
  depth: number
  kind: NodeKind
  /** The invariant-emanation this node stepped along from its parent (null: apex). */
  axis: Axis | null
  /** Parent node id — the vertex this emanated from (null: apex). */
  parent: string | null
  /** Which derivation rule produced it. */
  rule: string
  hollow: boolean
  hollowReason?: string
  title: string
  detail?: string
  note?: string
  /** Register / ledger reference: claim id (C1), test id (t-c1), receipt id (r-c1),
   *  task id (T1), or block ref (block-3). Absent on hollow nodes — never invented. */
  ref?: string
  statusLabel?: string
  /** Deterministic derivation order. */
  seq: number
}

export interface RegisterInput {
  claims: DagClaim[]
  tests: DagTest[]
  receipts: DagReceipt[]
  tasks: DagTask[]
}

export type Geometry = 'simplex' | 'tesseract'

/** The generative rule set. Versioned; the rules (not hand-placing) decide what
 *  the data forms. Sole content sources: the claims register and the pilot
 *  ledger seed — both honest, both labeled. */
export interface RuleSet {
  version: string
  geometry: Geometry
  register: RegisterInput
  ledger: Receipt[]
}

export const RULES_VERSION = 'PYR-RULES-V1'

/**
 * R0 — apex. The point: Unity ID / white light at (0,0,0,0).
 * R1 — corners. Four corner stones: apex + one step along each axis.
 * R2 — claims. Each register claim derives a claim node as a truth-emanation,
 *   in register order, along one continuous t-lineage: corner → claim → test →
 *   receipt → claim → … — the register's "reference → measurement → receipt"
 *   discipline laid out as the truth axis itself.
 * R3 — tests. A claim that names a test derives a test node (+t from the claim).
 * R4 — receipts. A run test derives a receipt node (+t from the test).
 * R5 — ledger. The 9 seeded pilot blocks derive as host-emanations (+h chain from
 *   the HOST_SAFE corner): the host's own transmission history. The hash chain is
 *   preserved structurally — each block's parent is the previous block.
 * R6 — task. T1 derives as the no-force emanation (+n) of the TASK_BIND block:
 *   the task was bound; the design verdict is honestly absent (no kernel mounted).
 * R7 — hollow. Wherever R3/R4 attempts a derivation and the register names no
 *   content, a hollow node is derived at the attempted address — "not yet
 *   derived." Never invented content.
 * R8 — fractal emanation (tesseract geometry only). Every content vertex
 *   emanates four ways; unattempted emanations materialize one level deep as
 *   hollow "not yet derived" vertices. Hollow nodes do not emanate further
 *   (bounded). Under the simplex geometry, unattempted emanations stay implicit:
 *   addressable, not materialized.
 */
export function rulesV1(geometry: Geometry): RuleSet {
  return {
    version: RULES_VERSION,
    geometry,
    register: { claims: CLAIMS, tests: TESTS, receipts: RECEIPTS, tasks: TASKS },
    ledger: SEED_RECEIPTS,
  }
}

export interface PyramidStats {
  total: number
  content: number
  hollow: number
  maxDepth: number
  shells: number
  perKind: Record<NodeKind, number>
  perAxis: Record<Axis, { content: number; hollow: number }>
  /** The machine's geometry reading — computed from the derived counts, the
   *  pure logic deciding which geometry the data actually forms. */
  verdict: string
}

export interface Pyramid {
  geometry: Geometry
  rulesVersion: string
  rules: RuleSet
  nodes: PyrNode[]
  byId: Map<string, PyrNode>
  byCoord: Map<string, PyrNode>
  /** Aggregation levels: levels[d] = every node at coordinate-depth d. */
  levels: PyrNode[][]
  stats: PyramidStats
}

function testStateLabel(state: DagTest['state']): string {
  return state === 'NAMED'
    ? 'named test file'
    : state === 'DESCRIBED'
      ? 'described in the register (no filename)'
      : 'proposed — not yet written'
}

/** Deterministic: same inputs → same pyramid. No clocks, no randomness. */
export function derivePyramid(apex: ApexInput, corners: CornerInput[], rules: RuleSet): Pyramid {
  if (corners.length !== 4) throw new Error('pyramid: exactly four corner stones required')
  const seenAxes = new Set(corners.map(c => c.axis))
  if (seenAxes.size !== 4) throw new Error('pyramid: corners must cover all four axes')

  const nodes: PyrNode[] = []
  const byId = new Map<string, PyrNode>()
  const byCoord = new Map<string, PyrNode>()
  let seq = 0

  const add = (n: Omit<PyrNode, 'id' | 'seq' | 'depth'>): PyrNode => {
    const key = coordKey(n.coord)
    if (byCoord.has(key)) throw new Error(`pyramid: coordinate collision at ${key}`)
    const node: PyrNode = { ...n, id: `${n.kind}@${key}`, seq: seq++, depth: depthOf(n.coord) }
    nodes.push(node)
    byId.set(node.id, node)
    byCoord.set(key, node)
    return node
  }

  /* R0 — the apex. */
  const apexNode = add({
    coord: ORIGIN,
    kind: 'apex',
    axis: null,
    parent: null,
    rule: 'R0-apex',
    hollow: false,
    title: apex.title,
    detail: apex.detail,
  })

  /* R1 — the four corner stones. */
  const cornerByAxis = new Map<Axis, PyrNode>()
  for (const c of corners) {
    const node = add({
      coord: step(ORIGIN, c.axis),
      kind: 'corner',
      axis: c.axis,
      parent: apexNode.id,
      rule: 'R1-corner',
      hollow: false,
      title: c.name,
      detail: c.detail,
    })
    cornerByAxis.set(c.axis, node)
  }

  /* R2/R3/R4/R7 — the truth lineage along t. */
  const { claims, tests, receipts, tasks } = rules.register
  const testById = new Map(tests.map(t => [t.id, t]))
  const receiptById = new Map(receipts.map(r => [r.id, r]))
  let prev: PyrNode = cornerByAxis.get('t')!
  for (const claim of claims) {
    const claimNode = add({
      coord: step(prev.coord, 't'),
      kind: 'claim',
      axis: 't',
      parent: prev.id,
      rule: 'R2-claim',
      hollow: false,
      title: `${claim.id} · ${claim.title}`,
      detail: claim.wording,
      note: claim.note,
      ref: claim.id,
      statusLabel: claim.statusLabel,
    })
    const test = claim.testId ? testById.get(claim.testId) : undefined
    let testNode: PyrNode
    if (test) {
      testNode = add({
        coord: step(claimNode.coord, 't'),
        kind: 'test',
        axis: 't',
        parent: claimNode.id,
        rule: 'R3-test',
        hollow: false,
        title: `test · ${test.name}`,
        detail: test.detail,
        ref: test.id,
        statusLabel: testStateLabel(test.state),
      })
    } else {
      testNode = add({
        coord: step(claimNode.coord, 't'),
        kind: 'hollow',
        axis: 't',
        parent: claimNode.id,
        rule: 'R7-hollow',
        hollow: true,
        hollowReason:
          claim.status === 'REMOVE'
            ? 'removed from public material — no test'
            : 'no test named in the register — not yet derived',
        title: 'not yet derived',
      })
    }
    const receipt = test?.receiptId ? receiptById.get(test.receiptId) : undefined
    let receiptNode: PyrNode
    if (receipt && test) {
      receiptNode = add({
        coord: step(testNode.coord, 't'),
        kind: 'receipt',
        axis: 't',
        parent: testNode.id,
        rule: 'R4-receipt',
        hollow: false,
        title: `receipt · ${claim.id}`,
        detail: RECEIPT_NOTE,
        ref: receipt.id,
        statusLabel: receipt.label,
      })
    } else {
      receiptNode = add({
        coord: step(testNode.coord, 't'),
        kind: 'hollow',
        axis: 't',
        parent: testNode.id,
        rule: 'R7-hollow',
        hollow: true,
        hollowReason: !test
          ? 'no test — no receipt'
          : test.state === 'PROPOSED'
            ? 'test proposed — not run; no receipt'
            : 'no register receipt — not yet derived',
        title: 'not yet derived',
      })
    }
    prev = receiptNode
  }

  /* R5 — the host lineage along h: the seeded pilot chain, honestly kept. */
  let hprev: PyrNode = cornerByAxis.get('h')!
  const blockNodes: PyrNode[] = []
  for (const r of rules.ledger) {
    const b = add({
      coord: step(hprev.coord, 'h'),
      kind: 'block',
      axis: 'h',
      parent: hprev.id,
      rule: 'R5-ledger',
      hollow: false,
      title: `BLOCK ${r.seq} · ${r.event}`,
      detail: r.detail,
      ref: `block-${r.seq}`,
      statusLabel: r.label,
    })
    blockNodes.push(b)
    hprev = b
  }

  /* R6 — T1: the no-force emanation of the TASK_BIND block. */
  if (tasks.length > 0 && blockNodes.length > 0) {
    const t0 = tasks[0]
    const bindBlock = blockNodes.find(b => /TASK_BIND/.test(b.title)) ?? blockNodes[0]
    add({
      coord: step(bindBlock.coord, 'n'),
      kind: 'task',
      axis: 'n',
      parent: bindBlock.id,
      rule: 'R6-task',
      hollow: true,
      hollowReason:
        'manifest minted locally — design verdict absent (no kernel mounted). The task was bound; the machine did not see it.',
      title: `task ${t0.id} · ${t0.title}`,
      detail: t0.wording,
      note: t0.note,
      ref: t0.id,
      statusLabel: t0.statusLabel,
    })
  }

  /* R8 — fractal emanations (tesseract geometry only), one level, bounded. */
  if (rules.geometry === 'tesseract') {
    const content = nodes.filter(n => !n.hollow)
    for (const n of content) {
      for (const a of AXES) {
        const ec = step(n.coord, a)
        if (byCoord.has(coordKey(ec))) continue
        const lastBlockNoSeal =
          n.kind === 'block' && a === 'h' && n.ref === `block-${rules.ledger.length - 1}`
        add({
          coord: ec,
          kind: 'hollow',
          axis: a,
          parent: n.id,
          rule: 'R8-fractal-emanation',
          hollow: true,
          hollowReason: lastBlockNoSeal
            ? 'no sealed blocks yet — kernel not mounted'
            : 'not yet derived — fractal emanation',
          title: 'not yet derived',
        })
      }
    }
  }

  /* Aggregation levels: shells at coordinate-depth. */
  const maxDepth = nodes.reduce((m, n) => Math.max(m, n.depth), 0)
  const levels: PyrNode[][] = Array.from({ length: maxDepth + 1 }, () => [])
  for (const n of nodes) levels[n.depth].push(n)

  /* Stats + the machine's geometry reading. */
  const perKind = {} as Record<NodeKind, number>
  const perAxis = {} as Record<Axis, { content: number; hollow: number }>
  for (const a of AXES) perAxis[a] = { content: 0, hollow: 0 }
  let content = 0
  for (const n of nodes) {
    perKind[n.kind] = (perKind[n.kind] ?? 0) + 1
    if (n.axis) {
      if (n.hollow) perAxis[n.axis].hollow += 1
      else perAxis[n.axis].content += 1
    }
    if (!n.hollow) content += 1
  }
  const hollow = nodes.length - content
  const hollowPct = ((100 * hollow) / nodes.length).toFixed(1)
  const verdict =
    rules.geometry === 'simplex'
      ? `Simplex unfolding: ${content} content nodes derived — the register's truth lineage along t, the host's ledger along h, the bound task's absent verdict along n. ${hollow} honest hollow vertices (no test named, no receipt, verdict absent). The c corner stone stands with no derived children yet.`
      : `Fractal tesseract: ${content} content vertices; every content vertex emanates four ways — ${hollow} hollow emanations materialized ("not yet derived", ${hollowPct}% hollow). At pilot scale the fractal is mostly awaited structure: the data forms a sparse tesseract over a dense simplex core.`

  return {
    geometry: rules.geometry,
    rulesVersion: rules.version,
    rules,
    nodes,
    byId,
    byCoord,
    levels,
    stats: {
      total: nodes.length,
      content,
      hollow,
      maxDepth,
      shells: levels.length,
      perKind,
      perAxis,
      verdict,
    },
  }
}

/* ------------------------------------------------------------------ */
/* Audit: the machine checks every derivation path.                     */
/* ------------------------------------------------------------------ */

export interface AuditReport {
  ok: boolean
  checked: number
  failures: string[]
}

/** Walk every node's parent chain to the apex; verify each step is exactly one
 *  axis-step along the node's own axis, and depth equals t+n+h+c. */
export function auditPyramid(pyr: Pyramid): AuditReport {
  const failures: string[] = []
  for (const n of pyr.nodes) {
    if (n.depth !== depthOf(n.coord)) failures.push(`${n.id}: depth ${n.depth} != t+n+h+c`)
    const seen = new Set<string>()
    let cur: PyrNode | undefined = n
    while (cur) {
      if (seen.has(cur.id)) {
        failures.push(`${n.id}: cycle in derivation path`)
        break
      }
      seen.add(cur.id)
      if (cur.parent === null) {
        if (cur.kind !== 'apex') failures.push(`${n.id}: path ends at non-apex ${cur.id}`)
        break
      }
      const p = pyr.byId.get(cur.parent)
      if (!p) {
        failures.push(`${n.id}: missing parent ${cur.parent}`)
        break
      }
      if (cur.axis === null) {
        failures.push(`${n.id}: null axis on non-apex node ${cur.id}`)
        break
      }
      if (coordKey(step(p.coord, cur.axis)) !== coordKey(cur.coord)) {
        failures.push(`${n.id}: ${cur.id} is not one ${cur.axis}-step from its parent`)
        break
      }
      cur = p
    }
  }
  return { ok: failures.length === 0, checked: pyr.nodes.length, failures }
}

/** Address lookup — any (t,n,h,c) is a valid address; unmaterialized addresses
 *  are honestly "not yet derived." */
export function nodeAt(pyr: Pyramid, coord: Coord4): PyrNode | undefined {
  return pyr.byCoord.get(coordKey(coord))
}

/** The four emanation addresses from a coordinate (tesseract neighborhood). */
export function emanationsOf(coord: Coord4): { axis: Axis; coord: Coord4 }[] {
  return AXES.map(axis => ({ axis, coord: step(coord, axis) }))
}

/* ------------------------------------------------------------------ */
/* DAG view: the DAG mapper renders the GENERATED structure.            */
/* ------------------------------------------------------------------ */

export interface DagView {
  claims: DagClaim[]
  tests: DagTest[]
  receipts: DagReceipt[]
  tasks: DagTask[]
  edges: DagEdge[]
}

/** Node set + edges derived by the generator — regression-tested to reproduce
 *  the register's 16·10·9·1 DAG exactly. Layout columns stay presentational. */
export function dagView(pyr: Pyramid): DagView {
  const reg = pyr.rules.register
  const claimById = new Map(reg.claims.map(c => [c.id, c]))
  const testById = new Map(reg.tests.map(t => [t.id, t]))
  const receiptById = new Map(reg.receipts.map(r => [r.id, r]))
  const taskById = new Map(reg.tasks.map(t => [t.id, t]))
  const byT = (a: PyrNode, b: PyrNode) => a.coord.t - b.coord.t || a.seq - b.seq

  const claimNodes = pyr.nodes.filter(n => n.kind === 'claim').sort(byT)
  const testNodes = pyr.nodes.filter(n => n.kind === 'test').sort(byT)
  const receiptNodes = pyr.nodes.filter(n => n.kind === 'receipt').sort(byT)
  const taskNodes = pyr.nodes.filter(n => n.kind === 'task').sort(byT)

  const claims = claimNodes.map(n => claimById.get(n.ref!)!)
  const tests = testNodes.map(n => testById.get(n.ref!)!)
  const receipts = receiptNodes.map(n => receiptById.get(n.ref!)!)
  const tasks = taskNodes.map(n => taskById.get(n.ref!)!)

  /* Edges per claim, interleaved claim→test then test→receipt — the same order
   * buildEdges() produces from the register. */
  const children = new Map<string, PyrNode[]>()
  for (const n of pyr.nodes) {
    if (!n.parent) continue
    const arr = children.get(n.parent)
    if (arr) arr.push(n)
    else children.set(n.parent, [n])
  }
  const edges: DagEdge[] = []
  for (const cn of claimNodes) {
    const tn = (children.get(cn.id) ?? []).find(c => c.kind === 'test')
    if (tn?.ref && cn.ref) {
      edges.push({ from: cn.ref, to: tn.ref })
      const rn = (children.get(tn.id) ?? []).find(c => c.kind === 'receipt')
      if (rn?.ref) edges.push({ from: tn.ref, to: rn.ref })
    }
  }
  return { claims, tests, receipts, tasks, edges }
}
