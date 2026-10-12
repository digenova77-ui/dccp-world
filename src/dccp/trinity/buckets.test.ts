import assert from 'node:assert/strict'
import { test } from 'node:test'
import { spinBuckets } from './buckets.ts'

test('the common seed is place, minute, and source, and DCLM adds nothing', () => {
  const spin = spinBuckets()
  assert.equal(spin.seed, 4)
  assert.match(spin.words, /DCLM is in front/)
  assert.match(spin.words, /holds nothing/)
  assert.match(spin.words, /Liftoff and Splashdown/)
  assert.match(spin.words, /not two instruments/)
  assert.match(spin.words, /Past that the seed stops/)
})
