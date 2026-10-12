import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SON_VOTE } from './sonvote.ts'

test('the standing yes is not a Trinity vote and does not open the machine', () => {
  assert.equal(SON_VOTE.value, 'yes')
  assert.equal(SON_VOTE.countsAsTrinity, false)
  assert.equal(SON_VOTE.opensMachine, false)
})
