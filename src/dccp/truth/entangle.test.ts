import assert from 'node:assert/strict'
import { test } from 'node:test'
import { entanglementMetrics } from './entangle.ts'

test('entanglement metrics are named and not claimed as readings', () => {
  const said = entanglementMetrics()
  assert.match(said, /1 ebit/)
  assert.match(said, /Wootters/)
  assert.match(said, /2√2/)
  assert.match(said, /no counts/)
  assert.match(said, /not an entanglement/)
  assert.match(said, /does not solve the current blueprint|None of them solves/)
})
