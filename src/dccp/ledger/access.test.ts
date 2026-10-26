import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buyRecord, canView, viewShelf } from './access.ts'

test('a children\'s event opens for the owner or someone who belongs, and never for a buyer', () => {
  assert.equal(canView({ viewer: 'unity:pilot.owner', owner: 'unity:pilot.owner', belongs: false, paid: false }).open, true)
  assert.equal(canView({ viewer: 'unity:pilot.guest', owner: 'unity:pilot.owner', belongs: true, paid: false }).open, true)
  const stranger = canView({ viewer: 'unity:pilot.stranger', owner: 'unity:pilot.owner', belongs: false, paid: false })
  assert.equal(stranger.open, false)
  const bought = canView({ viewer: 'unity:pilot.owner', owner: 'unity:pilot.owner', belongs: true, paid: true })
  assert.equal(bought.open, false)
  assert.match(bought.reason, /cannot be bought/)
  const dump = buyRecord()
  assert.equal(dump.open, false)
  assert.equal(dump.rows.length, 0)
  assert.equal(viewShelf(false, 'free').open, true)
  assert.equal(viewShelf(false, 'data').open, false)
  assert.match(viewShelf(false, 'data').reason, /need a wallet/)
  assert.equal(viewShelf(true, 'data').open, true)
})
