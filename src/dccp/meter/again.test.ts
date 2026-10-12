import assert from 'node:assert/strict'
import { test } from 'node:test'
import { foundAgain, headStart, type Seen } from './again.ts'

test('a find is earned only when it is found again, and a bot does not wait', () => {
  const bot: Seen = { seen: 1, earned: false, holder: 'bots' }
  const person: Seen = { seen: 1, earned: false, holder: 'doctor' }
  assert.equal(foundAgain(bot, 0).earned, true)
  assert.equal(foundAgain(person, 0).earned, false)
  assert.equal(foundAgain(person, 2).earned, true)
  assert.equal(person.holder, 'doctor')
  const start = headStart()
  assert.equal(start.shifts, 2)
  assert.equal(start.risk, 0)
  assert.equal(start.taken, false)
})
