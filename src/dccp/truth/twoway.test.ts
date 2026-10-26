import assert from 'node:assert/strict'
import { test } from 'node:test'
import { twoWay } from './twoway.ts'

test('both directions leave the same holes, and the pyramid method stays unchosen', () => {
  const way = twoWay()
  assert.ok(way.held > 20)
  assert.equal(way.open, way.held + 1)
  assert.ok(Math.abs(way.affinity + way.friction - 1) < 1e-12)
  assert.ok(way.unified < 1)
  assert.match(way.words, /does not choose among them/)
  assert.match(way.words, /audited as unfilled/)
  assert.match(way.words, /adds nothing/)
})
