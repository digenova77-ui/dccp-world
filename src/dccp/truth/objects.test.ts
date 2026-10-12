import assert from 'node:assert/strict'
import { test } from 'node:test'
import { gapMapWords, gapObjects } from './objects.ts'

test('every unknown is an unfilled blueprint', () => {
  const objects = gapObjects()
  assert.ok(objects.length > 20)
  assert.equal(objects.every(row => row.filled === false), true)
  assert.equal(objects.filter(row => row.missing === 'agreement').length, 1)
  assert.ok(objects.some(row => row.name === 'Station'))
  assert.match(gapMapWords(objects), /not the missing number/)
})
