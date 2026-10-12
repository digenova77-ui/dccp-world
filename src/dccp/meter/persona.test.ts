import assert from 'node:assert/strict'
import { test } from 'node:test'
import { HUNTER, personaWords, secondLook } from './persona.ts'

test('a human-like persona is a bot that has not signed', () => {
  assert.equal(HUNTER.kind, 'bot')
  assert.equal(HUNTER.signed, false)
  assert.equal(HUNTER.heldBy, 'father')
  assert.equal(HUNTER.foundBy, 'iris')
  assert.equal(HUNTER.determinedBy, 'you')
  assert.equal(HUNTER.seen, 1)
  assert.equal(HUNTER.inMaster, false)
  assert.deepEqual(secondLook(1), { earned: false, paid: 0 })
  assert.deepEqual(secondLook(2), { earned: true, paid: 0 })
  const said = personaWords()
  assert.match(said, /She keeps none/)
  assert.match(said, /not booked/)
  assert.match(said, /Paid 0/)
})
