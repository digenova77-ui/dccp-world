import assert from 'node:assert/strict'
import { test } from 'node:test'
import { emptyEconomy, splitSupply } from './economy.ts'
import { crossGap, emptyGap, hireBot, sellBody } from './gap.ts'

test('a human can pay a bot and still own the object', () => {
  const split = splitSupply(emptyEconomy())
  const { state, gap } = hireBot(split, emptyGap())
  assert.equal(state.doctor.supply, 49)
  assert.equal(state.bots.supply, 51)
  assert.equal(state.doctor.works, 1)
  assert.equal(gap.hires, 1)
})

test('a first body mark pays more than a repeat', () => {
  let cursor = { state: splitSupply(emptyEconomy()), gap: emptyGap() }
  for (let i = 0; i < 5; i++) cursor = sellBody(cursor.state, cursor.gap)
  assert.equal(cursor.gap.marks.length, 5)
  assert.equal(cursor.state.doctor.supply, 70)
  const repeat = sellBody(cursor.state, cursor.gap)
  assert.equal(repeat.state.doctor.supply, 71)
  assert.match(repeat.state.last[0], /heard that kind before/)
})

test('the cross pays both ways', () => {
  const split = splitSupply(emptyEconomy())
  const { state } = crossGap(split, emptyGap())
  assert.equal(state.doctor.supply, 53)
  assert.equal(state.bots.supply, 47)
  assert.match(state.last[0], /volunteered/)
})
