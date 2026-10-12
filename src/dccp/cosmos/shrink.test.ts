import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canPredictWords, frontierWords, neutralize, predictWords, shrinkWords, unmappedShare } from './shrink.ts'

test('missing pieces do not close the gap, and a seat at the time can', () => {
  assert.deepEqual(unmappedShare(25, 1), { mapped: 25, gaps: 1, of: 26 })
  assert.equal(neutralize(1, 0), 1)
  assert.equal(neutralize(1, 1), 0)
  const said = shrinkWords(25, 1)
  assert.match(said, /does not say the playground shrinks because pieces are missing/)
  assert.match(said, /not on this device/)
  assert.match(said, /does not shrink space/)
  assert.match(frontierWords(), /Because next exists/)
  assert.match(predictWords(), /^No\./)
  assert.match(canPredictWords(), /already force/)
  assert.match(canPredictWords(), /what next contains/)
})
