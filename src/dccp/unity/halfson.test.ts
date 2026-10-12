import assert from 'node:assert/strict'
import { test } from 'node:test'
import { HALF_SON, halfSonSpeech } from './halfson.ts'

test('the bots are not half the son, and DCLM is not the father', () => {
  assert.equal(HALF_SON.dclmIsFather, false)
  assert.equal(HALF_SON.david, 'son')
  assert.equal(HALF_SON.botsAreSon, false)
  assert.equal(HALF_SON.botsHalf, 'credit-pool')
  assert.match(halfSonSpeech(), /answer is no/)
})
