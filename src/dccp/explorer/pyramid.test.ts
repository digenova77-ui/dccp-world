/** Unit tests for the generative pyramid DAG (src/dccp/explorer/pyramid.ts).
 *
 * Run: node --experimental-strip-types --test src/dccp/explorer/pyramid.test.ts
 * (also wired into the package.json `test` script).
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  APEX_INPUT,
  CORNER_INPUTS,
  RULES_VERSION,
  auditPyramid,
  dagView,
  depthOf,
  derivePyramid,
  emanationsOf,
  fmtCoord,
  nodeAt,
  rulesV1,
  step,
  type Coord4,
  type Pyramid,
} from './pyramid.ts'
import { CLAIMS, TESTS, RECEIPTS, TASKS, buildEdges } from './dag.ts'
import { SEED_RECEIPTS } from './ledger.ts'

const simplex = (): Pyramid => derivePyramid(APEX_INPUT, CORNER_INPUTS, rulesV1('simplex'))
const tesseract = (): Pyramid => derivePyramid(APEX_INPUT, CORNER_INPUTS, rulesV1('tesseract'))

describe('pyramid generator', () => {
  it('is deterministic: same inputs → identical output', () => {
    const a = JSON.stringify(simplex().nodes)
    const b = JSON.stringify(simplex().nodes)
    assert.equal(a, b)
    const c = JSON.stringify(tesseract().nodes)
    const d = JSON.stringify(tesseract().nodes)
    assert.equal(c, d)
  })

  it('derives the apex and exactly four corner stones as the first levels', () => {
    const pyr = simplex()
    assert.equal(pyr.rulesVersion, RULES_VERSION)
    assert.equal(pyr.levels[0].length, 1)
    const apex = pyr.levels[0][0]
    assert.equal(apex.kind, 'apex')
    assert.deepEqual(apex.coord, { t: 0, n: 0, h: 0, c: 0 })
    assert.equal(apex.parent, null)
    assert.equal(pyr.levels[1].length, 4)
    const coords = pyr.levels[1].map(n => `${n.coord.t},${n.coord.n},${n.coord.h},${n.coord.c}`).sort()
    assert.deepEqual(coords, ['0,0,0,1', '0,0,1,0', '0,1,0,0', '1,0,0,0'])
    const names = pyr.levels[1].map(n => n.title).sort()
    assert.deepEqual(names, ['CLEANUP_FIRST', 'HOST_SAFE', 'NO_FORCE', 'TRUTH_OR_NOTHING'])
    for (const corner of pyr.levels[1]) {
      assert.equal(corner.parent, apex.id)
      assert.equal(corner.rule, 'R1-corner')
    }
  })

  it('reproduces the register DAG exactly: 16 claims · 10 tests · 9 receipts · 1 task', () => {
    const dv = dagView(simplex())
    assert.deepEqual(
      dv.claims.map(c => c.id),
      CLAIMS.map(c => c.id),
    )
    assert.deepEqual(
      dv.tests.map(t => t.id),
      TESTS.map(t => t.id),
    )
    assert.deepEqual(
      dv.receipts.map(r => r.id),
      RECEIPTS.map(r => r.id),
    )
    assert.deepEqual(
      dv.tasks.map(t => t.id),
      TASKS.map(t => t.id),
    )
    assert.equal(dv.claims.length, 16)
    assert.equal(dv.tests.length, 10)
    assert.equal(dv.receipts.length, 9)
    assert.equal(dv.tasks.length, 1)
    assert.deepEqual(dv.edges, buildEdges())
  })

  it('addresses every node by its 4D derivation coordinate', () => {
    const pyr = simplex()
    // C1 (register index 0): truth corner (1,0,0,0) → claim (2,0,0,0) → test (3,0,0,0) → receipt (4,0,0,0)
    const c1 = nodeAt(pyr, { t: 2, n: 0, h: 0, c: 0 })
    assert.equal(c1?.ref, 'C1')
    assert.equal(c1?.rule, 'R2-claim')
    assert.equal(nodeAt(pyr, { t: 3, n: 0, h: 0, c: 0 })?.ref, 't-c1')
    assert.equal(nodeAt(pyr, { t: 4, n: 0, h: 0, c: 0 })?.ref, 'r-c1')
    assert.equal(fmtCoord({ t: 2, n: 0, h: 0, c: 0 }), '(t 2 · n 0 · h 0 · c 0)')
    // O6 (register index 10): no test named → hollow test vertex, honest reason, no invented ref
    const o6 = nodeAt(pyr, { t: 2 + 3 * 10, n: 0, h: 0, c: 0 })
    assert.equal(o6?.ref, 'O6')
    const o6test = nodeAt(pyr, { t: 3 + 3 * 10, n: 0, h: 0, c: 0 })
    assert.equal(o6test?.hollow, true)
    assert.equal(o6test?.ref, undefined)
    assert.match(o6test?.hollowReason ?? '', /no test named/)
    // C5's test is proposed: test node exists, receipt vertex hollow
    const c5test = nodeAt(pyr, { t: 3 + 3 * 4, n: 0, h: 0, c: 0 })
    assert.equal(c5test?.ref, 't-c5')
    assert.equal(c5test?.hollow, false)
    const c5receipt = nodeAt(pyr, { t: 4 + 3 * 4, n: 0, h: 0, c: 0 })
    assert.equal(c5receipt?.hollow, true)
    assert.match(c5receipt?.hollowReason ?? '', /not run/)
    // Ledger: genesis at (0,0,2,0), TASK_BIND block at (0,0,3,0)
    assert.equal(nodeAt(pyr, { t: 0, n: 0, h: 2, c: 0 })?.ref, 'block-0')
    const bind = nodeAt(pyr, { t: 0, n: 0, h: 3, c: 0 })
    assert.equal(bind?.ref, 'block-1')
    assert.match(bind?.title ?? '', /TASK_BIND/)
    assert.equal(blockCount(pyr), SEED_RECEIPTS.length)
    // T1: no-force emanation of the TASK_BIND block, hollow (verdict absent)
    const t1 = nodeAt(pyr, { t: 0, n: 1, h: 3, c: 0 })
    assert.equal(t1?.ref, 'T1')
    assert.equal(t1?.hollow, true)
    assert.match(t1?.hollowReason ?? '', /verdict absent/)
  })

  it('audits clean: every derivation path reaches the apex in single axis-steps', () => {
    for (const pyr of [simplex(), tesseract()]) {
      const report = auditPyramid(pyr)
      assert.equal(report.ok, true, report.failures.slice(0, 5).join(' | '))
      assert.equal(report.checked, pyr.nodes.length)
    }
  })

  it('shells aggregate by coordinate-depth', () => {
    const pyr = simplex()
    for (let d = 0; d < pyr.levels.length; d++) {
      for (const n of pyr.levels[d]) assert.equal(depthOf(n.coord), d)
    }
    const inShells = pyr.levels.reduce((s, l) => s + l.length, 0)
    assert.equal(inShells, pyr.nodes.length)
  })

  it('hollow nodes carry reasons, never invented content', () => {
    for (const pyr of [simplex(), tesseract()]) {
      for (const n of pyr.nodes) {
        if (n.hollow && n.rule !== 'R6-task') {
          assert.ok(n.hollowReason && n.hollowReason.length > 0, `${n.id} hollow without reason`)
          assert.equal(n.detail, undefined, `${n.id} hollow with invented detail`)
          assert.equal(n.ref, undefined, `${n.id} hollow with invented ref`)
        }
      }
    }
  })

  it('tesseract derives strictly more than simplex, deterministically, and the data stays sparse', () => {
    const s = simplex()
    const t = tesseract()
    assert.ok(t.nodes.length > s.nodes.length, 'tesseract must materialize fractal emanations')
    // Same content under both geometries — the geometry changes emanations, not derivations.
    const content = (p: Pyramid) => p.nodes.filter(n => !n.hollow).length
    assert.equal(content(s), content(t))
    // The pure logic's reading: at pilot scale the fractal is mostly awaited structure.
    assert.ok(t.stats.hollow > t.stats.content, 'pilot tesseract should be hollow-majority')
    assert.match(t.stats.verdict, /sparse tesseract/)
    assert.match(s.stats.verdict, /Simplex unfolding/)
  })

  it('emanationsOf gives the four tesseract neighbors of any address', () => {
    const origin: Coord4 = { t: 0, n: 0, h: 0, c: 0 }
    const ns = emanationsOf(origin)
    assert.equal(ns.length, 4)
    assert.deepEqual(
      ns.map(e => e.axis).sort(),
      ['c', 'h', 'n', 't'],
    )
    assert.deepEqual(ns.find(e => e.axis === 't')?.coord, step(origin, 't'))
  })

  it('rejects malformed corner inputs', () => {
    assert.throws(() => derivePyramid(APEX_INPUT, CORNER_INPUTS.slice(0, 3), rulesV1('simplex')))
    assert.throws(() =>
      derivePyramid(APEX_INPUT, [...CORNER_INPUTS.slice(0, 3), CORNER_INPUTS[0]], rulesV1('simplex')),
    )
  })
})

function blockCount(pyr: Pyramid): number {
  return pyr.nodes.filter(n => n.kind === 'block').length
}
