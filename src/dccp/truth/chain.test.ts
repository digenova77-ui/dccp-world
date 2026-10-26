import assert from 'node:assert/strict'
import { test } from 'node:test'
import { chain, spendUnlocks } from './chain.ts'

test('the next blueprint stays locked until the current one is solved', () => {
  const closed = chain(new Set(), true)
  assert.equal(closed.current?.name, 'Station')
  assert.equal(closed.nextLocked, true)
  assert.equal(closed.unlocked, 0)
  assert.ok(closed.sealed > 30)
  assert.match(closed.words, /locked until this one is solved/)
  assert.doesNotMatch(closed.words, /Kp/)
  assert.equal(spendUnlocks(10), false)
  const moved = chain(new Set(['Station']))
  assert.equal(moved.current?.name, 'Kp')
  assert.equal(moved.nextLocked, true)
  assert.match(moved.words, /locked until this one is solved/)
})
