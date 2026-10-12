import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FATHER_KEY, FATHER_PASS } from './fatherpass.ts'

test('a father key held offline is not a Trinity pass', () => {
  assert.equal(FATHER_PASS.asked, false)
  assert.equal(FATHER_PASS.passed, false)
  assert.equal(FATHER_KEY.claimedOffline, true)
  assert.equal(FATHER_KEY.publicOnRecord, true)
  assert.equal(FATHER_KEY.privateAcceptedHere, false)
  assert.equal(FATHER_KEY.provesTheSeat, false)
  assert.equal(FATHER_KEY.symbolicSource, 'father')
})
