import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dualDisplays, dualSpeech } from './dual.ts'

test('current purity is the paired share, and the ceiling is not a plan', () => {
  const hud = dualDisplays({ doctor: 0, bots: 0 })
  assert.equal(hud.possible, 1)
  assert.ok(hud.current < 1)
  assert.equal(hud.spend, 0)
  assert.match(hud.words, /6\.9 percent/)
  assert.match(hud.words, /not a plan yet/)
  assert.match(hud.words, /Father ownership stays 1/)
  const given = dualDisplays({ doctor: 2, bots: 1 }, true)
  assert.equal(given.spend, 3)
  assert.match(given.words, /blueprint is in/)
  assert.match(dualSpeech(), /does not read the seat/)
})
