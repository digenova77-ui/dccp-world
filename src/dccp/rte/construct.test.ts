import assert from 'node:assert/strict'
import { test } from 'node:test'
import { drawRequest, emptyScene, sceneFrom } from './construct.ts'

test('a look request is the subject, and an empty scene stays empty', () => {
  assert.equal(drawRequest('show me the hockey rink'), 'hockey rink')
  assert.equal(drawRequest('I want to look at Tokyo.'), 'tokyo')
  assert.equal(drawRequest('how is Japan in water'), null)
  const scene = sceneFrom('RTE-Ice', ['A sovereign hockey runtime.', ''])
  assert.equal(scene.empty, false)
  assert.equal(scene.lines.length, 1)
  assert.equal(emptyScene().empty, true)
  assert.equal(emptyScene().lines.length, 0)
})
