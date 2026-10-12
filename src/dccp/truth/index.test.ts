import assert from 'node:assert/strict'
import { test } from 'node:test'
import { purityIndex } from './index.ts'

test('the purity index scores only regions with a number, and the mean is not the Earth', () => {
  const index = purityIndex([
    { name: 'Held', pop: 50000 },
    { name: 'Empty', pop: null },
    { name: 'Conflict', pop: 50000, statements: ['The population was 12,000.'] },
  ])
  assert.equal(index.counted, 2)
  assert.equal(index.skipped, 1)
  assert.equal(index.rows[0].name, 'Conflict')
  assert.ok((index.mean ?? 1) < 1)
  assert.match(index.words, /not a verdict on the Earth/)
  assert.equal(purityIndex([]).mean, null)
})
