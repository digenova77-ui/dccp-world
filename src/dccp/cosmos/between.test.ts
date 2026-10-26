import assert from 'node:assert/strict'
import { test } from 'node:test'
import { auditList, betweenWords, groupNamed, NAMED } from './between.ts'
import { HYPOTHESIS } from './hypothesis.ts'

test('a finer list stays one source, and any timeline uses the same rule', async () => {
  assert.ok(NAMED.length > 12)
  assert.equal(NAMED.filter(row => row.name === 'Contingency sample')[0].after, 'A step on the surface')
  const said = betweenWords()
  assert.match(said, /Only this capture is loaded/)
  assert.match(said, /not that hypothesis becoming fact/)
  assert.match(said, new RegExp(HYPOTHESIS.slice(0, 24)))
  assert.match(said, /does not agree to the second/)
  const other = groupNamed([{ at: '2000-01-01T00:00:00Z', name: 'A bell', after: 'Dawn', before: 'Noon' }])
  assert.match(other, /Dawn and Noon/)
  const hash = await auditList()
  assert.equal(hash, await auditList())
  assert.equal(hash.length, 64)
})
