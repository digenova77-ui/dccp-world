import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fingerprint, rejectDocument, takeWhite } from './dark.ts'

test('a private key is refused by both ledgers', () => {
  const refused = rejectDocument('-----BEGIN PRIVATE KEY-----\nabc')
  assert.match(refused ?? '', /private key/i)
  assert.equal(rejectDocument('short'), 'That is too small to take in.')
})

test('a white document can be quoted and keeps its hash', async () => {
  const doc = await takeWhite('The residual floor is eighty-one percent, driven back.')
  assert.ok(!('error' in doc))
  if ('error' in doc) return
  assert.equal(doc.face, 'white')
  assert.equal(doc.sha256, await fingerprint(doc.text))
  assert.equal(doc.sha256.length, 64)
})
