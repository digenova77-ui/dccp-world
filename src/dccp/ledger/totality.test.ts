import assert from 'node:assert/strict'
import { test } from 'node:test'
import { auditTotality, proveTotality } from './totality.ts'

test('the totality is provable by hash, and the scoreboard is not in the result', async () => {
  const parts = [
    { kind: 'dark', sha256: 'aa' },
    { kind: 'seat', sha256: 'bb' },
  ]
  const audited = await auditTotality(parts)
  assert.equal(audited.hidden, true)
  assert.equal('scoreboard' in audited, false)
  assert.deepEqual(Object.keys(audited).sort(), ['count', 'hash', 'hidden'])
  assert.equal(await proveTotality([...parts].reverse(), audited.hash), true)
  assert.equal(await proveTotality([{ kind: 'dark', sha256: 'cc' }, parts[1]], audited.hash), false)
})
