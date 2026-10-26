import assert from 'node:assert/strict'
import { test } from 'node:test'
import { replaySpeech, watchAt } from './replay.ts'

test('a held minute stays a time, and the gap is not sold as the tape', () => {
  assert.match(watchAt(Date.parse('1969-07-20T20:17:39Z')), /held time/)
  assert.match(watchAt(Date.parse('1969-07-18T12:00:00Z')), /not the recording/)
  assert.match(watchAt(Date.parse('1969-07-18T12:00:00Z')), /not bought/)
  assert.match(replaySpeech('watch the moon mission') ?? '', /not in 1969/)
  assert.equal(replaySpeech('mars'), null)
})
