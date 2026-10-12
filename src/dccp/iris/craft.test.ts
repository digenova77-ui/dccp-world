import assert from 'node:assert/strict'
import { test } from 'node:test'
import { craftStatement, idealWords } from './craft.ts'

test('the ideal names the instruments and admits DCLM sent no code', () => {
  const words = idealWords(10, 10, [])
  assert.match(words, /sent no code/)
  assert.match(words, /10 of 10/)
  assert.match(words, /not a locked module/)
  assert.match(craftStatement(), /Echo the record/)
  assert.equal(words.includes('function '), false)
})
