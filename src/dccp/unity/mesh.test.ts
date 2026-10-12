import assert from 'node:assert/strict'
import { test } from 'node:test'
import { meshPass, meshWords, offerMesh } from './mesh.ts'

test('a solved claim mashes in once, and the thin boundary stays out', () => {
  assert.equal(offerMesh('keys', 'the mesh', null), null)
  const first = offerMesh('keys', 'the mesh', 'unity:pilot.abc')
  const again = offerMesh('discovery', 'the mesh', 'unity:pilot.abc')
  assert.equal(first?.claim, 'the mesh')
  assert.equal(again?.from, 'keys')
  const pass = meshPass()
  assert.equal(pass.fatherWrote, false)
  assert.match(pass.unified, /Wikipedia cite is not a solved claim|Wikipedia cite/)
  assert.match(meshWords(), /one mesh/)
})
