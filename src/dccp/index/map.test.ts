import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sha256Hex } from '../pipe/chain.ts'
import { MAP_HASH, mapHash, mapRows, mapText } from './map.ts'

test('the map indexes space and time and leaves unpaired rows unpaired', async () => {
  const rows = mapRows()
  const landing = rows.find(row => row.name === 'The Eagle has landed')
  const proxima = rows.find(row => row.name === 'Proxima Centauri')
  assert.equal(landing?.grade, 'conflict')
  assert.equal(landing?.space.startsWith('Tranquility Base'), true)
  assert.equal(proxima?.paired, false)
  assert.equal(proxima?.time, '4.24 years')
  assert.ok(rows.filter(row => !row.paired).length > rows.filter(row => row.paired).length)
  assert.equal(await mapHash(rows), await sha256Hex(mapText(rows)))
  assert.equal(await mapHash(rows), MAP_HASH)
})
