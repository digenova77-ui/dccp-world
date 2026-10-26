import assert from 'node:assert/strict'
import { test } from 'node:test'
import { nextChain } from './next.ts'

test('a million steps collapse after the chain stops adding facts', () => {
  const chain = nextChain(22, 1_000_000)
  assert.equal(chain.steps.length, 7)
  assert.equal(chain.repeated, 999_993)
  assert.match(chain.words, /does not make a new step/)
  assert.match(chain.words, /not 22 discoveries/)
  assert.equal(nextChain(22, 3).repeated, 0)
})
