import assert from 'node:assert/strict'
import { test } from 'node:test'
import { emptyEconomy, runShift, splitSupply } from './economy.ts'
import { emptyGap, sellBody } from './gap.ts'
import { swarmView } from './swarm.ts'

test('a seated half that has not worked is not a deployed swarm', () => {
  const cold = swarmView(emptyEconomy(), emptyGap(), true)
  assert.equal(cold.deployed, false)
  assert.equal(cold.workers, 0)
  assert.equal(cold.next, null)
  const seated = swarmView(splitSupply(emptyEconomy()), emptyGap(), true)
  assert.equal(seated.deployed, false)
  assert.match(seated.status, /Not deployed/)
  assert.equal(seated.next?.known, false)
})

test('after a shift the HUD shows this seat only, and an unknown pays more', () => {
  const shifted = runShift(splitSupply(emptyEconomy())).state
  const view = swarmView(shifted, emptyGap(), true)
  assert.equal(view.deployed, true)
  assert.equal(view.scope, 'this seat only')
  assert.equal(view.workers, 5)
  assert.equal(view.idleFinished, 0)
  assert.equal(view.next?.known, false)
  assert.ok((view.next?.face ?? 0) > 1)
  const seen = sellBody(shifted, emptyGap())
  const after = swarmView(seen.state, seen.gap, true)
  assert.equal(after.asks[0]?.known, false)
  assert.ok(after.asks.some(ask => ask.known && ask.face < (after.asks.find(item => !item.known)?.face ?? 0)))
})

test('an unsigned swarm stays dark even after work exists', () => {
  const shifted = runShift(splitSupply(emptyEconomy())).state
  const view = swarmView(shifted, emptyGap(), false)
  assert.equal(view.deployed, false)
  assert.equal(view.next, null)
  assert.match(view.status, /No bot Unity ID/)
})
