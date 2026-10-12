import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sha256Hex } from '../pipe/chain.ts'
import { INDEX_HASH, INDEX_STATEMENT } from './statement.ts'

test('the published hash is the statement and nothing else', async () => {
  assert.equal(await sha256Hex(INDEX_STATEMENT), INDEX_HASH)
  assert.match(INDEX_STATEMENT, /night Earth/)
  assert.match(INDEX_STATEMENT, /does not invent/)
  assert.match(INDEX_STATEMENT, /map of space and time/)
  assert.match(INDEX_STATEMENT, /unpaired minute stays unpaired/)
  assert.match(INDEX_STATEMENT, /holds nothing/)
})
