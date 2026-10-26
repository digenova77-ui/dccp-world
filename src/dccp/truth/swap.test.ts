import assert from 'node:assert/strict'
import { test } from 'node:test'
import { swappingProtocol } from './swap.ts'

test('swapping entangles the outer pair and was not run here', () => {
  const said = swappingProtocol()
  assert.match(said, /two separate Bell pairs/)
  assert.match(said, /never had to meet/)
  assert.match(said, /faster than the two bits/)
  assert.match(said, /no Bell counts/)
  assert.match(said, /does not solve the current blueprint/)
})
