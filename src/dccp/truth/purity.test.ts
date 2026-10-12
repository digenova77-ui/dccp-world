import assert from 'node:assert/strict'
import { test } from 'node:test'
import { crossPurity, populationIn } from './purity.ts'

test('a region score sets confirmed numbers beside unconfirmed ones', () => {
  assert.equal(populationIn('The census counted 52,000 people.'), 52000)
  const agree = crossPurity(50000, ['The census counted 52,000 people.', 'It sits near 44.1 degrees.'])
  assert.equal(agree.agreements, 1)
  assert.equal(agree.conflicts, 0)
  assert.ok(agree.score > 0.5)
  const fight = crossPurity(50000, ['The population was 12,000.'])
  assert.equal(fight.conflicts, 1)
  assert.ok(fight.score < agree.score)
  const onlyOurs = crossPurity(50000, [])
  assert.equal(onlyOurs.score, 1)
  assert.match(onlyOurs.words, /not a verdict/)
  const onlyTheirs = crossPurity(null, ['The census counted 12 people.'])
  assert.equal(onlyTheirs.confirmed, 0)
  assert.equal(onlyTheirs.score, 0)
})
