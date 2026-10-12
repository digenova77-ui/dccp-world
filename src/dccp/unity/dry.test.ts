import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runUntilDry } from './dry.ts'

test('derivation stops when the next pass is the same result', () => {
  const empty = runUntilDry([])
  assert.equal(empty.added, 0)
  assert.match(empty.words, /Nothing further/)
  const once = runUntilDry(['the mesh', 'the mesh'])
  assert.equal(once.added, 1)
  assert.match(once.words, /next pass added nothing/)
  const two = runUntilDry(['a key', 'a room'])
  assert.equal(two.added, 2)
  assert.ok(two.passes >= 2)
})
