import assert from 'node:assert/strict'
import { test } from 'node:test'
import { standing, STRIPPED } from './standing.ts'

test('after the framework is stripped, the mesh adds nothing', () => {
  const left = standing()
  assert.equal(left.more, 0)
  assert.ok(STRIPPED.includes('a framework'))
  assert.ok(STRIPPED.includes('a conscious cosmos as a fact'))
  assert.match(left.words, /next pass adds 0/)
  assert.match(left.words, /holds nothing/)
  assert.match(left.words, /That is what is deployed/)
})
