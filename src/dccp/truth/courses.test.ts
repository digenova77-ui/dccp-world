import assert from 'node:assert/strict'
import { test } from 'node:test'
import { correlation, courseCard, pyramidCards } from './courses.ts'

test('the card count is not the stone estimate', () => {
  const row = correlation()
  assert.equal(row.cards, pyramidCards())
  assert.equal(row.cards, 216)
  assert.notEqual(row.cardsPerSeed, row.stonesPerCapstone)
  assert.match(row.words, /The correlation misses/)
  assert.match(courseCard(3), /Course 3 of 205/)
  assert.match(courseCard(999), /Course 205 of 205/)
})
