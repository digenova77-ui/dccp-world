import assert from 'node:assert/strict'
import { test } from 'node:test'
import { choosePipe, framework, giveAdventureKey, keepAdventure, seeAdventure } from './adventure.ts'

test('a shared room opens by its key alone, and hide takes that key back', () => {
  const room = keepAdventure('unity:pilot.owner', 'U16 AAA power play', ['Chances on the power play'])
  assert.equal(room.key, null)
  assert.equal('password' in room, false)
  const shared = choosePipe('unity:pilot.owner', 'share')
  assert.ok(!('error' in shared))
  if ('error' in shared) return
  assert.ok(shared.key)
  assert.equal(seeAdventure(shared, 'unity:pilot.other').open, false)
  const given = giveAdventureKey('unity:pilot.owner', 'unity:pilot.other')
  assert.ok(!('error' in given))
  if ('error' in given) return
  assert.equal(seeAdventure(given, 'unity:pilot.other').open, true)
  assert.match(seeAdventure(given, 'unity:pilot.other').lines[0], /key/)
  const hidden = choosePipe('unity:pilot.owner', 'hide')
  assert.ok(!('error' in hidden))
  if ('error' in hidden) return
  assert.equal(hidden.holders.length, 1)
  assert.equal(seeAdventure(hidden, 'unity:pilot.other').open, false)
  assert.equal(hidden.options[0], 'share')
  const evolved = keepAdventure('unity:pilot.owner', 'U16 AAA power play', ['Clears on the kill'])
  assert.equal(evolved.id, room.id)
  assert.equal(evolved.generation, 2)
  assert.equal(evolved.key, hidden.key)
  const other = keepAdventure('unity:pilot.owner', 'U16 AAA ice', ['Ice time'])
  assert.equal(framework('unity:pilot.owner').length, 2)
  assert.notEqual(other.id, evolved.id)
})
