import assert from 'node:assert/strict'
import { test } from 'node:test'
import { beforeHolds, decisionGap, omnipresentBelief, planetaryTheories, sameInstant, temporalWords, worldDoesNotFill } from './temporal.ts'

test('order holds, the landing is not one instant, and next stays open', () => {
  assert.equal(beforeHolds(['1969-07-16T13:32:00Z', '1969-07-20T20:17:39Z']), true)
  assert.equal(beforeHolds(['1969-07-20T20:17:40Z', '1969-07-16T13:32:00Z']), false)
  assert.equal(sameInstant('1969-07-20T20:17:39Z', '1969-07-20T20:17:40Z'), false)
  const said = temporalWords()
  assert.match(said, /Before/)
  assert.match(said, /Next exists/)
  assert.match(said, /until a minute mapped at the time/)
  assert.match(said, /not one instant/)
  assert.match(said, /Nothing says the gap will be filled/)
  assert.match(worldDoesNotFill(), /Atoms are not a source/)
  assert.match(worldDoesNotFill(), /stays empty/)
  assert.match(omnipresentBelief(), /Nothing in the record changes/)
  assert.match(omnipresentBelief(), /does not seat the empty interval/)
  assert.equal(decisionGap(false).gap, true)
  assert.equal(decisionGap(true).gap, false)
  assert.match(decisionGap(false).words, /space-time gap/)
  assert.match(decisionGap(true).words, /Chat is not that record/)
  assert.match(planetaryTheories(), /record of an unwatched minute/)
  assert.match(planetaryTheories(), /Neither names a place and a minute/)
})
