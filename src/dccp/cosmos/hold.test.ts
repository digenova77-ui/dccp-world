import assert from 'node:assert/strict'
import { test } from 'node:test'
import { holdSpeech } from './hold.ts'

test('James Webb is named and not loaded, and Voyager is a dated figure', () => {
  assert.match(holdSpeech('show me james webb') ?? '', /not loaded/)
  assert.match(holdSpeech('all the hubble data') ?? '', /Hubble is not loaded/)
  assert.match(holdSpeech('where is voyager') ?? '', /172\.3 AU/)
  assert.match(holdSpeech('sit with voyager') ?? '', /not aboard/)
  const both = holdSpeech('james webb and voyager') ?? ''
  assert.match(both, /not loaded/)
  assert.match(both, /172\.3 AU/)
  assert.match(both, /not aboard/)
})
