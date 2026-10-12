import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildMaster, masterWords } from './master.ts'

test('the master mirrors only supplied finds, the father public record, and no DCLM keys', () => {
  const master = buildMaster([
    { id: 'bots:1', claim: 'schematic' },
    { id: 'secret', claim: '-----BEGIN PRIVATE KEY-----' },
  ])
  assert.equal(master.dclm, 0)
  assert.equal(master.father, 'public-only')
  assert.equal(master.matchesDavid, true)
  assert.equal(master.overclaim, false)
  assert.equal(master.keys.filter(key => key.from === 'bots').length, 1)
  assert.equal(master.keys.some(key => key.from === 'father-record'), true)
  assert.equal(master.keys.some(key => /PRIVATE KEY/.test(key.claim)), false)
  assert.match(masterWords(master), /holds no keys/)
})
