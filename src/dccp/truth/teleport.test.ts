import assert from 'node:assert/strict'
import { test } from 'node:test'
import { teleportProtocol } from './teleport.ts'

test('teleportation is the Bennett protocol and was not run here', () => {
  const said = teleportProtocol()
  assert.match(said, /Bennett/)
  assert.match(said, /two bits/)
  assert.match(said, /does not outrun light/)
  assert.match(said, /2\/3/)
  assert.match(said, /no fidelity/)
  assert.match(said, /does not solve the current blueprint/)
})
