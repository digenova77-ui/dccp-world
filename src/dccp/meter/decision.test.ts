import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DecisionLedger, meterCost, summarize } from './decision.ts'

test('the worked example is 5.4 and it is only a cost', () => {
  const { e, hole } = meterCost({ watts: 0.4, calls: 3, minutes: 2 })
  assert.equal(e, 5.4)
  assert.equal(hole, null)
})

test('unmeasured watts leave E empty', () => {
  const { e, hole } = meterCost({ watts: null, calls: 1, minutes: 0.5 })
  assert.equal(e, null)
  assert.equal(hole, 'watts')
})

test('a ledger never invents E, and the till stays closed', () => {
  let t = 0
  const ledger = new DecisionLedger(null, () => t)
  t = 120_000
  const row = ledger.note('open the water room', 1, 0)
  assert.equal(row.calls, 1)
  assert.equal(row.minutes, 2)
  assert.equal(row.watts, null)
  assert.equal(row.e, null)
  const sum = summarize(ledger.list())
  assert.equal(sum.till, 'closed')
  assert.equal(sum.e, null)
  assert.equal(sum.calls, 1)
  assert.equal(sum.weights.w, 1)
})
