import assert from 'node:assert/strict'
import { test } from 'node:test'
import { collapse, listProofs } from './blackhole.ts'

test('a dataset the system no longer needs is erased, and the proof remains', async () => {
  const kept = await collapse({ id: 'live', kind: 'dataset', body: 'still in use', needed: true })
  assert.equal(kept.erased, false)
  const gone = await collapse({ id: 'old-roster', kind: 'children', body: 'lane four, not for keeping', needed: false })
  assert.equal(gone.erased, true)
  if (!gone.erased) return
  assert.equal('body' in gone.proof, false)
  assert.equal(gone.proof.audited, true)
  assert.equal(gone.proof.sha256.length, 64)
  assert.equal(listProofs().some(proof => proof.sha256 === gone.proof.sha256), true)
  assert.equal(JSON.stringify(listProofs()).includes('lane four'), false)
  const proof = await collapse({ id: gone.proof.id, kind: 'proof', body: gone.proof.sha256, needed: false })
  assert.equal(proof.erased, false)
  const audit = await collapse({ id: 'audit-1', kind: 'audit', body: 'the audit row', needed: false })
  assert.equal(audit.erased, false)
})
