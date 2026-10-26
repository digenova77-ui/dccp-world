import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ADDRESS, greet, helpStep, missed } from './manner.ts'

test('address names one step and does not change the record', () => {
  assert.match(ADDRESS, /one next step/)
  assert.match(ADDRESS, /does not change the record/)
  assert.match(greet(), /Tell me where you want to go/)
  assert.doesNotMatch(greet(), /Say help if you want/)
  assert.match(missed(), /once more/)
  assert.match(helpStep(), /leave it empty/)
})
