import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pyramidLogic } from './pyramid.ts'

test('the finished mass does not select a construction method', () => {
  const said = pyramidLogic()
  assert.match(said, /The path is not in the mass/)
  assert.match(said, /Absence does not refute it/)
  assert.match(said, /does not name the machine/)
  assert.match(said, /stays open/)
})
