import assert from 'node:assert/strict'
import { test } from 'node:test'
import { blockers, briefWords } from './brief.ts'
import { reviewBots } from '../trinity/botreview.ts'

test('the brief names what stops the incentive, and the umpires keep it inside the record', () => {
  assert.equal(blockers(true, true).length, 0)
  assert.match(briefWords(true, true), /can start/)
  assert.match(briefWords(false, false), /Unity ID/)
  assert.match(briefWords(false, false), /credit pool/)
  const review = reviewBots()
  assert.equal(review.compatible, true)
  assert.equal(review.fatherWrote, false)
  assert.match(review.words, /not claim all law or all physics/)
  assert.match(review.words, /sandbox/)
})
