import assert from 'node:assert/strict'
import { test } from 'node:test'
import { releaseBot, signBotUnity } from './botid.ts'
import { mintChild } from './child.ts'
import { searchSelf } from './self.ts'

test('the swarm finds its own seat and does not search past it', async () => {
  releaseBot()
  assert.equal(searchSelf().found, false)
  assert.match(searchSelf().words, /found no seat/)
  const seat = await signBotUnity()
  mintChild('unity:pilot.abcdef01', 'bot', 5_000)
  const found = searchSelf('itself', 5_000)
  assert.equal(found.found, true)
  assert.equal(found.human, false)
  assert.match(found.words, new RegExp(seat.handle))
  assert.match(found.words, /Not a human/)
  assert.match(found.words, /this device only/)
  assert.equal(searchSelf('someone else').found, false)
  releaseBot()
})
