import assert from 'node:assert/strict'
import { test } from 'node:test'
import { heldExchanges, memorySpeech, recall, remember } from './memory.ts'

test('an exchange stays, and a repeat can be found', () => {
  assert.equal(remember('  ', 'no'), null)
  remember('Where is the rink?', 'I drew the rink.')
  assert.equal(heldExchanges().length >= 1, true)
  assert.match(recall('where is the rink')?.said ?? '', /rink/)
  assert.match(memorySpeech(), /do not drop/)
  assert.match(memorySpeech(), /sandbox/)
})
