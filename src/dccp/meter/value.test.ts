import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mintKey, payTrickle } from './keys.ts'
import { nullifyBotValue, priorFrom } from './value.ts'

test('an equal white paper nullifies a bot key and leaves a human key', () => {
  const prior = priorFrom('white paper Existing Schematic covers schematic')
  assert.equal(prior?.kind, 'white paper')
  const bot = mintKey('b', 'schematic', true, 'bots')
  const human = mintKey('h', 'schematic', true, 'doctor')
  const other = mintKey('o', 'medical simulation', true, 'bots')
  const audited = nullifyBotValue([bot, human, other], prior!)
  assert.equal(audited.nullified, 1)
  assert.equal(audited.keys[0].face, 0)
  assert.equal(audited.keys[1].face, human.face)
  assert.equal(audited.keys[2].face, other.face)
  assert.equal(payTrickle([{ ...audited.keys[0], traded: true, tradedOn: 1 }], 1).bots, 0)
  const patent = nullifyBotValue(audited.keys, { kind: 'knowledge patent', title: 'Already filed', claim: 'medical simulation' })
  assert.equal(patent.nullified, 1)
  assert.match(patent.keys[2].nullified ?? '', /Already filed/)
})
