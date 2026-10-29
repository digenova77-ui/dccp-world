import assert from 'node:assert/strict'
import test from 'node:test'
import { admits, frameLines, hudFace, pass } from './pass.ts'

const field = [
  { x: 0.9, y: 0.8, z: 0.2 },
  { x: 0.3, y: 0.4, z: 0.9 },
  { x: 0.7, y: 0.7, z: 0.7 },
  { x: 0.1, y: 0.1, z: 0.1 },
  { x: 0, y: 0, z: 0 },
  { x: 1, y: 0, z: 0 },
]

test('a pass keeps the books and names the seventy percent point without settling', () => {
  const row = pass(100, 40, 10, field)
  assert.equal(row.ok, true)
  if (!row.ok) return
  assert.equal(row.free + 40 + 10, 100)
  assert.equal(row.closes, 0.7)
  assert.deepEqual(row.chosen, { x: 0.7, y: 0.7, z: 0.7 })
  assert.equal(row.settles, false)
  assert.equal(row.grade, 'PROPOSED')
  assert.equal(row.scope, 'SANDBOX')
  assert.equal(admits(field, 0.71), null)
})

test('a hole in the books hides the point', () => {
  const overlap = pass(10, 8, 5, field)
  assert.equal(overlap.ok, false)
  if (!overlap.ok) assert.equal(overlap.reason, 'HOLE')
  assert.equal(pass(null, 0, 0, field).ok, false)
  assert.equal(pass(100, 40, 10, 'nope').ok, false)
  assert.equal(pass(100, 1.5, 0, field).ok, false)
})

test('the plate shows an unset book as unset and does not invent a free number', () => {
  const bare = hudFace(null, null, null, null)
  assert.deepEqual(bare, { books: 'unset', floor: 'unset', joined: false, settles: false, pay: 'not a coin' })

  assert.deepEqual(frameLines(null, null, null, null), [
    'Books · unset. Does not settle.',
    'Floor · unset. Not a payment.',
    'Joined · no.',
  ])
})


