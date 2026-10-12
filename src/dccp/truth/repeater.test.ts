import assert from 'node:assert/strict'
import { test } from 'node:test'
import { repeaterProtocol } from './repeater.ts'

test('a repeater is nested swapping and was not run here', () => {
  const said = repeaterProtocol()
  assert.match(said, /Briegel/)
  assert.match(said, /does not outrun light/)
  assert.match(said, /no measured rate/)
  assert.match(said, /does not solve the current blueprint/)
})
