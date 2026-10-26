import assert from 'node:assert/strict'
import { test } from 'node:test'
import { collapse } from '../ledger/blackhole.ts'
import { rotate, rotationWords } from './rotation.ts'

test('the three umpires yield one solution, and the audit cannot be erased', async () => {
  const pass = rotate()
  assert.deepEqual(pass.votes.map(vote => vote.seat), ['DCLM', 'Iris', 'Twain²'])
  assert.equal(pass.fatherWrote, false)
  assert.equal(pass.sealedSitting, false)
  assert.equal(pass.audit, 'forever')
  const said = rotationWords(pass)
  assert.match(said, /holds nothing/)
  assert.match(said, /cannot be bought/)
  assert.match(said, /proof remains/)
  assert.match(said, /did not write/)
  const kept = await collapse({ id: 'trinity-rotation', kind: 'audit', body: pass.unified, needed: false })
  assert.equal(kept.erased, false)
})
