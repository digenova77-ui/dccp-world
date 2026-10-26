import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cosmosSpeech, scaleLine } from './scale.ts'

test('the cosmic scale answers a held body and does not invent the rest', () => {
  assert.match(cosmosSpeech('how far is mars') ?? '', /1\.52 AU/)
  assert.match(cosmosSpeech('how far is mars') ?? '', /rock/)
  assert.match(cosmosSpeech('proxima centauri') ?? '', /4\.24 light years/)
  assert.match(scaleLine(), /not loaded/)
  assert.equal(cosmosSpeech('betelgeuse'), null)
})
