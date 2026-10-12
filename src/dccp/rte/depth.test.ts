import assert from 'node:assert/strict'
import { test } from 'node:test'
import { asGrains, depthAsked, speakDepth } from './depth.ts'

test('every stored line is a depth, and a missing depth is not invented', () => {
  const grains = asGrains([{ label: 'A', text: 'one' }, { label: 'B', text: 'two' }, { label: 'C', text: '' }])
  assert.equal(grains.length, 2)
  assert.equal(depthAsked('water depth 2').index, 1)
  const spoken = speakDepth('Water', grains, 1, 'Water')
  assert.match(spoken.speech, /depth 2 of 2/)
  assert.match(spoken.speech, /two/)
  assert.doesNotMatch(spoken.speech, /one/)
  const missing = speakDepth('Water', grains, 9, 'Water')
  assert.match(missing.speech, /not in the record/)
  assert.equal(missing.lines.length, 2)
  const empty = speakDepth('Teach', [], null, 'Teach')
  assert.match(empty.speech, /missing at Teach/)
})
