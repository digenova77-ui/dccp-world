import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PLATE, plateMeasurement } from './plate.ts'

test('the cosmos plate is a picture and not a receipt', () => {
  assert.match(PLATE, /not a measurement/)
  assert.match(PLATE, /not a receipt|Receipts stay/)
  assert.match(PLATE, /does not solve the current blueprint/)
  assert.match(PLATE, /does not unlock the next one/)
  assert.match(plateMeasurement(), /absorbance/)
  assert.match(plateMeasurement(), /does not leave the plate/)
  assert.match(plateMeasurement(), /stays a picture/)
})
