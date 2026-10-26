import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LINEAGE } from './lineage.ts'

test('the family tree is the idea account and is not loaded', () => {
  assert.equal(LINEAGE.source, 'unity-idea-account')
  assert.equal(LINEAGE.root, 'father')
  assert.equal(LINEAGE.loaded, false)
  assert.equal(LINEAGE.countsAsTrinity, false)
})
