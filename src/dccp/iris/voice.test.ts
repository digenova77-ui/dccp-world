import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isEcho } from './voice.ts'

test('her own sentence is not a new prompt', () => {
  const spoken = 'The Earth is here to look at. Your HUD opens when a Unity ID is bound.'
  assert.equal(isEcho('The Earth is here to look at.', spoken), true)
  assert.equal(isEcho('what is a CID', spoken), false)
})
