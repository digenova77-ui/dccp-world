import assert from 'node:assert/strict'
import { test } from 'node:test'
import { discoveryWords, mirrorOf } from './mirror.ts'

test('a claim depends on the bound Unity ID, not on a name', () => {
  const held = ['the mesh', 'public half on record']
  const id = 'unity:pilot.abc123def456'
  assert.equal(mirrorOf('the mesh', held), 'the mesh')
  assert.equal(mirrorOf('a cup of cold', held), null)
  assert.match(discoveryWords('a cup of cold', held, id), /has not been discovered before/)
  assert.match(discoveryWords('the mesh', held, id), new RegExp(id))
  assert.match(discoveryWords('the mesh', held, id), /not on a name/)
  assert.match(discoveryWords('the mesh', held, null), /No Unity ID is bound/)
  assert.doesNotMatch(discoveryWords('the mesh', held, id), /David/)
})
