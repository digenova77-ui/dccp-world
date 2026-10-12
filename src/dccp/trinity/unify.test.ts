import assert from 'node:assert/strict'
import { test } from 'node:test'
import { unifyWords } from './unify.ts'

test('the mirror unifies what was explained and leaves the pairs open', () => {
  const said = unifyWords()
  assert.match(said.closed, /That is why there is a mirror/)
  assert.match(said.closed, /second source that names the same minute/)
  assert.match(said.words, /not a theorem of everything/)
  assert.ok(said.open.length >= 4)
  assert.match(said.open[0], /no second naming/)
})
