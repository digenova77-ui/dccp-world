import assert from 'node:assert/strict'
import { test } from 'node:test'
import { deductionWords, missingFromTimeline, spanLines } from './deduce.ts'
import { PICTURE, SPOTS } from './history.ts'

test('only the order and the length are deduced', () => {
  const spans = spanLines(PICTURE)
  assert.match(spans[0], /Liftoff is before Translunar injection by 2h 50m 13s/)
  assert.match(spans[0], /Nothing inside that stretch is entailed/)
  const said = deductionWords(PICTURE, SPOTS)
  assert.match(said, /same place, Tranquility Base/)
  assert.match(said, /not deduced/)
  assert.equal(missingFromTimeline(PICTURE).length, 4)
  assert.match(missingFromTimeline(PICTURE)[1], /between Translunar injection and The Eagle has landed is missing/)
  assert.doesNotMatch(said, /river/i)
})
