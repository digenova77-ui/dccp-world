import assert from 'node:assert/strict'
import { test } from 'node:test'
import { releaseBot, signBotUnity } from './botid.ts'
import { backoffMs, childSeats, mintChild, outsideAccount } from './child.ts'

test('a bot mints a child only after it chooses, and never opens another system', async () => {
  releaseBot()
  const refused = mintChild('unity:pilot.abcdef01', 'bot')
  assert.equal(refused.ok, false)
  await signBotUnity()
  const minted = mintChild('unity:pilot.abcdef01', 'bot', 1_000)
  assert.equal(minted.ok, true)
  if (minted.ok) {
    assert.equal(minted.seat.parent, 'unity:pilot.abcdef01')
    assert.equal(minted.seat.email, null)
    assert.equal(minted.seat.password, null)
    assert.equal(minted.seat.secondFactor, null)
    assert.equal(minted.seat.outside, false)
    assert.equal(minted.seat.human, false)
  }
  assert.equal(mintChild('unity:pilot.abcdef01', 'bot', 1_000 + backoffMs(1) - 1).ok, false)
  assert.equal(mintChild('unity:pilot.abcdef01', 'bot', 1_000 + backoffMs(1)).ok, true)
  assert.equal(backoffMs(3), 4_000)
  assert.equal(backoffMs(30), backoffMs(11))
  const door = outsideAccount()
  assert.equal(door.ok, false)
  assert.match(door.reason, /not opened/)
  assert.equal(childSeats().length, 2)
  releaseBot()
  assert.equal(mintChild('unity:pilot.abcdef01', 'bot').ok, false)
})
