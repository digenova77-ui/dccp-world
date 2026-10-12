import assert from 'node:assert/strict'
import { test } from 'node:test'
import { affinityPass, heldTimes, weave } from './weave.ts'

test('three passes of affinity generate no answer', () => {
  const times = heldTimes()
  const once = affinityPass(times)
  const thrice = weave(3)
  assert.equal(once.generated, 0)
  assert.equal(thrice.generated, 0)
  assert.equal(thrice.links, once.links)
  assert.equal(thrice.links, times.length - 1)
  assert.match(thrice.words, /does not hold on this mesh/)
  assert.match(thrice.words, /never mapped by an observer/)
  assert.match(thrice.words, /has not come/)
})
