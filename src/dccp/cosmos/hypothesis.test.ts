import assert from 'node:assert/strict'
import { test } from 'node:test'
import { tableHypothesis } from './hypothesis.ts'

test('the same hypothesis tables once, and the hash does not close the hole', async () => {
  const first = await tableHypothesis()
  const second = await tableHypothesis()
  assert.equal(first.hash, second.hash)
  assert.equal(first.hash.length, 64)
  assert.equal(second.again, true)
  assert.match(first.words, /hole stays open/)
  assert.match(first.words, /does not prove the path/)
  assert.doesNotMatch(first.words, /computationally true/)
})
