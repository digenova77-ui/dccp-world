import assert from 'node:assert/strict'
import { test } from 'node:test'
import { creditPool, emptyEconomy, fatherHolds, runShift, splitSupply } from './economy.ts'

test('half the tokens open one swarm credit pool, and the seed keeps the other half', () => {
  const closed = creditPool(emptyEconomy())
  assert.equal(closed.open, false)
  const opened = splitSupply(emptyEconomy())
  const pool = creditPool(opened)
  assert.equal(pool.granted, 50)
  assert.equal(pool.remaining, 50)
  assert.equal(opened.doctor.supply, 50)
  const again = splitSupply(opened)
  assert.equal(again.doctor.supply, 50)
  assert.equal(creditPool(again).granted, 50)
  assert.equal(fatherHolds(opened).share, 1)
  const worked = runShift(opened).state
  assert.equal(worked.fatherOwnership, 1)
  assert.ok(worked.ownershipAudit.some(line => /remains 1/.test(line)))
  assert.ok(worked.doctor.supply + worked.bots.supply < 100)
})
