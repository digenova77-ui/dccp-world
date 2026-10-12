import assert from 'node:assert/strict'
import { test } from 'node:test'
import { traitRun, TRAITS } from './traits.ts'

test('traits change the ask and do not change a minute', () => {
  const run = traitRun()
  assert.equal(TRAITS.length, 7)
  assert.equal(run.keys, 0)
  assert.equal(run.paid, 0)
  assert.match(run.ask, /second source/)
  assert.match(run.words, /does not raise a face/)
  assert.match(run.words, /No trait seats a minute/)
})
