import assert from 'node:assert/strict'
import { test } from 'node:test'
import { GRAINS, judge } from './state.ts'

test('a sourced grain is the cite until a disproof, and a search is not a cite', () => {
  const held = judge(GRAINS.find(g => g.id === 'father-zero')!)
  assert.equal(held.state, 'held')
  assert.match(held.cite ?? '', /September 28, 2026/)
  const search = judge(GRAINS.find(g => g.id === 'universe-math')!)
  assert.equal(search.state, 'searching')
  assert.equal(search.cite, null)
  const broken = judge(GRAINS.find(g => g.id === 'binding-approved')!)
  assert.equal(broken.state, 'disproven')
  assert.equal(broken.cite, null)
  assert.equal(judge({ id: 'x', statement: 'A sourced claim.', sources: ['a record'], disproofs: ['a contradiction'] }).state, 'disproven')
})
