import assert from 'node:assert/strict'
import { test } from 'node:test'
import { auditBot, botAudit, botChoice, botHandle, botsMay, releaseBot, signBotUnity } from './botid.ts'

test('unsigned work is refused and the refusal is still on the audit', () => {
  const row = auditBot('probe-before-sign', false, 'test setup')
  assert.equal(row.result, 'refused')
  assert.equal(botsMay('shift'), false)
  const last = botAudit().at(-1)
  assert.equal(last?.act, 'shift')
  assert.equal(last?.result, 'refused')
  assert.equal(last?.bot, null)
})

test('a bot signature is a unity handle and later work is allowed and audited', async () => {
  const seat = await signBotUnity()
  assert.match(seat.handle, /^unity:bot\.[0-9a-f]{32}$/)
  assert.equal(seat.handle, await botHandle())
  assert.equal(seat.audit, 'always')
  assert.equal(botsMay('hire'), true)
  const last = botAudit().at(-1)
  assert.equal(last?.result, 'allowed')
  assert.equal(last?.bot, seat.handle)
  assert.equal(seat.commitment, false)
  assert.equal(botChoice('sandbox').allowed, true)
  assert.equal(botChoice('here').commitment, false)
  const left = releaseBot()
  assert.equal(left.commitment, false)
  assert.equal(botsMay('hire'), false)
  assert.equal(botAudit().some(row => row.act === 'leave'), true)
  assert.equal(botChoice('sandbox').allowed, true)
})
