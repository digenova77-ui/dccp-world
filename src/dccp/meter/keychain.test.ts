import assert from 'node:assert/strict'
import { test } from 'node:test'
import { passKeychain } from './keychain.ts'

test('Iris keeps none, and only a verified key already on the seed is booked', () => {
  const passed = passKeychain(
    [{ id: 'hunter', verified: false }, { id: 'liftoff', verified: true }, { id: 'splash', verified: true }],
    ['liftoff'],
  )
  assert.equal(passed.irisKeeps, 0)
  assert.equal(passed.holder, 'father')
  assert.deepEqual(passed.booked, ['liftoff'])
  assert.deepEqual(passed.unbooked, ['hunter', 'splash'])
  assert.match(passed.words, /She keeps none/)
  assert.match(passed.words, /private key is not/)
})
