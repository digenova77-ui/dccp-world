import assert from 'node:assert/strict'
import { test } from 'node:test'
import { connectorLines, connectors, cosmicLines, offerProof } from './connectors.ts'

test('every connector is signed ahead, and none of them know or sense yet', async () => {
  const rows = connectors()
  assert.equal(rows.length, 8)
  assert.equal(new Set(rows.map(row => row.kind)).size, 8)
  for (const row of rows) {
    assert.equal(row.ours, 'signed-ahead')
    assert.equal(row.theirs, 'not-chosen')
    assert.equal(row.knowing, 'not-yet')
    assert.equal(row.sensing, 'empty')
    assert.equal(row.audit, 'always')
  }
  const lines = connectorLines({ countries: 3, cities: 2 })
  assert.match(lines.join(' '), /3 known countries/)
  assert.doesNotMatch(lines.join(' '), /they signed/)
  const proof = await offerProof()
  assert.equal(proof.hash.length, 64)
  assert.equal(proof.theirs, 'not-chosen')
  const cosmic = cosmicLines([{ ...rows[0], theirs: 'chosen' }, rows[1]])
  assert.equal(cosmic.some(line => line.startsWith('personal')), false)
  assert.ok(cosmic.some(line => line.startsWith('social')))
  assert.match(cosmic.join(' '), /Trinity still grounds it/)
})
