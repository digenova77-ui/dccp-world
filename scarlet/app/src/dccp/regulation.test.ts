import assert from 'node:assert/strict'
import test from 'node:test'
import { admitDisburse, freeAuthority, releaseRoom, winterThrottle } from './regulation.ts'

test('free authority subtracts the reserve and refuses an overlap', () => {
  assert.deepEqual(freeAuthority(100, 40, 10), {
    ok: true,
    value: 50,
    grade: 'PROPOSED',
    scope: 'SANDBOX',
    settles: false,
  })
  assert.equal(freeAuthority(null, 0, 0).ok, false)
  const overlap = freeAuthority(10, 8, 5)
  assert.equal(overlap.ok, false)
  if (!overlap.ok) assert.equal(overlap.reason, 'HOLE')
})

test('a disbursement cannot spend reserved units', () => {
  const fit = admitDisburse(100, 40, 10, 50)
  assert.equal(fit.ok && fit.value, 50)
  const over = admitDisburse(100, 40, 10, 51)
  assert.equal(over.ok, false)
  if (!over.ok) assert.equal(over.reason, 'HOLE')
  assert.equal(admitDisburse(100, 40, null, 1).ok, false)
})

test('a release returns held units and does not pass the gross cap', () => {
  const full = releaseRoom(0, 40, 0, 40)
  assert.equal(full.ok && full.value, 40)
  const partial = releaseRoom(50, 40, 50, 100)
  assert.equal(partial.ok && partial.value, 40)
  const blocked = releaseRoom(10, 5, 11, 1)
  assert.equal(blocked.ok, false)
})

test('winter at rest ignores an unset floor, and a moving winter does not invent one', () => {
  const summer = winterThrottle(0, null)
  assert.equal(summer.ok && summer.value, 1_000_000)
  assert.equal(winterThrottle(500_000, null).ok, false)
  const half = winterThrottle(500_000, 200_000)
  assert.equal(half.ok && half.value, 600_000)
  assert.equal(winterThrottle(1_000_000, 0).ok, false)
  const deep = winterThrottle(1_000_000, 200_000)
  assert.equal(deep.ok && deep.value, 200_000)
})
