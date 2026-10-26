import assert from 'node:assert/strict'
import { test } from 'node:test'
import { blueprintPass } from './blueprint.ts'
import { rotationWords } from '../trinity/rotation.ts'

test('the blueprint goes through the three umpires and comes back as the instruments', () => {
  const pass = blueprintPass()
  assert.equal(pass.votes.length, 3)
  assert.equal(pass.fatherWrote, false)
  assert.equal(pass.sealedSitting, false)
  assert.match(pass.unified, /bound Unity ID/)
  assert.doesNotMatch(pass.unified, /general model/)
  assert.match(rotationWords(pass), /The father did not write/)
})
