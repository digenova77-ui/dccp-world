import assert from 'node:assert/strict'
import { test } from 'node:test'
import { closedStream, faceFor, residualIdentity, shiftSlots, spendPeg } from './close.ts'
import { trickleAt } from './keys.ts'

test('a new find and a repeat add up to one shift', () => {
  assert.equal(faceFor(true) + faceFor(false), shiftSlots())
  assert.equal(faceFor(false), 1)
  assert.equal(faceFor(true), 4)
})

test('the payments close to face times ln of 1 plus n', () => {
  const face = faceFor(true)
  let sum = 0
  for (let k = 1; k <= 12; k++) sum += trickleAt(face, k)
  assert.ok(Math.abs(sum - closedStream(face, 12)) < 1e-9)
})

test('the royalty is not in the fixed split, and the fee halves', () => {
  const id = residualIdentity()
  assert.equal(id.royalty, null)
  assert.equal(id.fixed, 0.91)
  assert.ok(Math.abs(id.room - 0.09) < 1e-12)
  assert.equal(id.efuse, 0.05)
  assert.equal(id.unity, 0.05)
  assert.equal(id.efuse + id.unity, 0.10)
  assert.equal(id.paper, null)
  assert.match(spendPeg(), /Joining costs \$0/)
  assert.match(spendPeg(), /not a dollar/)
  assert.match(spendPeg(), /till stays closed/)
})
