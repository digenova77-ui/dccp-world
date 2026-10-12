import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mintKey } from './keys.ts'
import { liquidate, seedReturn, takeDerivative } from './seed.ts'

test('a derivative of someone else\'s find pays the seed, and nothing is seized', () => {
  const mine = mintKey('mine', 'my paper', true, 'doctor')
  assert.ok('error' in takeDerivative(10, mine, 1, []))
  const theirs = mintKey('bots:1', 'their schematic', true, 'bots')
  const short = takeDerivative(1, theirs, 1, [])
  assert.ok('error' in short)
  if (!('error' in short)) return
  assert.match(short.error, /not liquidated|does not have/)
  const taken = takeDerivative(10, theirs, 1, [])
  assert.ok(!('error' in taken))
  if ('error' in taken) return
  assert.equal(taken.supply, 6)
  assert.equal(theirs.holder, 'bots')
  assert.equal(seedReturn([taken.derivative], 1), 0)
  assert.ok(seedReturn([taken.derivative], 2) > 0)
  assert.equal(liquidate().seized, false)
})
