import assert from 'node:assert/strict'
import { test } from 'node:test'
import { seatUnknown, unknownGaps, unknownWords } from './unknown.ts'

test('an unknown sits on an empty gap only when a minute was mapped at the time', () => {
  const joints = [{ end: true }, { end: false }, { end: true }, { end: true }]
  assert.deepEqual(unknownGaps(joints), [{ from: 2, to: 3 }])
  assert.equal(seatUnknown('The hatch', null).seated, false)
  assert.match(seatUnknown('The hatch', null).words, /does not grow/)
  assert.equal(seatUnknown('A mark', '1969-07-20T20:17:39Z').seated, true)
  assert.match(unknownWords(1), /not space itself/)
})
