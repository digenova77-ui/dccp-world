import assert from 'node:assert/strict'
import { test } from 'node:test'
import { tableTheorem, THEOREM } from './theorem.ts'

test('the theorem tables once and does not shrink space', async () => {
  const first = await tableTheorem()
  const second = await tableTheorem()
  assert.equal(first.hash, second.hash)
  assert.equal(second.again, true)
  assert.match(first.words, /boundary of the map/)
  assert.match(first.words, /does not entail that space itself shrinks/)
  assert.equal(THEOREM.includes('SpaceTime boundary'), true)
})
