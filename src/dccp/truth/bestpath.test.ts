import assert from 'node:assert/strict'
import { test } from 'node:test'
import { binaryEntropy, closeFor, landingGauge } from './bestpath.ts'

test('friction and affinity add to 1, and the blank is not filled', () => {
  const half = landingGauge([
    { label: 'Station', value: '420 km' },
    { label: 'Kp', value: null },
    { label: 'Grid', value: null },
    { label: 'Air', value: null },
  ])
  assert.equal(half.friction, 0.75)
  assert.equal(half.affinity, 0.25)
  assert.equal(half.friction + half.affinity, 1)
  assert.equal(half.pulse, true)
  assert.equal(half.plus, 'Kp')
  assert.match(half.words, /not the number/)
  assert.match(closeFor('Kp'), /not a stream/)
  const empty = landingGauge([{ label: 'Kp', value: null }])
  assert.equal(empty.friction, 1)
  assert.equal(empty.affinity, 0)
  assert.equal(empty.pulse, false)
  assert.equal(binaryEntropy(0), 0)
  assert.equal(binaryEntropy(1), 0)
  assert.ok(binaryEntropy(0.5) > 0.99)
  const full = landingGauge([{ label: 'Station', value: '420 km' }])
  assert.equal(full.affinity, 1)
  assert.match(full.words, /on the peg/)
})
