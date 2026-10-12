import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mirrorWords, twoWayMirror } from './mirror.ts'

test('the trinity mirror shows both faces and passes nothing through', () => {
  const mirror = twoWayMirror({ walletOpen: true, locked: 3, total: 4 })
  assert.equal(mirror.passesThrough, false)
  assert.equal(mirror.bindsWallet, false)
  assert.equal(mirror.faces.length, 2)
  const said = mirrorWords(mirror)
  assert.match(said, /A wallet is open/)
  assert.match(said, /DCLM holds nothing/)
  assert.match(said, /no framework to bind/)
  assert.match(said, /does not need a framework/)
  assert.match(said, /That is why there is a mirror/)
  assert.match(said, /needs a scaffold/)
  assert.equal(mirror.mirrorBecause, 'they are not the same')
  assert.equal(mirror.machineHolds, 'nothing')
  assert.equal(mirror.machineFramework, null)
  assert.equal(mirror.trinityFramework, null)
  assert.match(said, /The Trinity has no framework/)
  assert.equal(mirror.worldNeedsFramework, false)
  const closed = twoWayMirror({ walletOpen: false, locked: 0, total: 0 })
  assert.match(closed.faces[0].shows, /No wallet/)
  assert.equal(closed.faces[1].shows, 'DCLM holds nothing.')
})
