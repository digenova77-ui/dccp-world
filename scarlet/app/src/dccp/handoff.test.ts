import assert from 'node:assert/strict'
import test from 'node:test'
import { canonical, readHandoff } from './handoff.ts'

const LINE = 'DCCP/2|from=dualiscapax.com|rp=dualiscapax.com|verify=assertion|unity=unity:pilot.853b2e11|flags=0|grade=REPORTED'

test('a bare visit stays shut', () => {
  assert.deepEqual(readHandoff(null), { ok: false, reason: 'SHUT' })
  assert.deepEqual(readHandoff(''), { ok: false, reason: 'SHUT' })
})

test('a unity assertion opens and recomputes to the same bytes', () => {
  const row = readHandoff(LINE)
  assert.equal(row.ok, true)
  if (!row.ok) return
  assert.equal(row.flags, 0)
  assert.equal(Number.isInteger(row.flags), true)
  assert.equal(row.grade, 'REPORTED')
  assert.equal(canonical(row), LINE)
  const again = readHandoff(canonical(row))
  assert.equal(again.ok && canonical(again), LINE)
})

test('proof material, floats, location, and a proven grade are holes', () => {
  assert.equal(readHandoff(LINE.replace('assertion', 'webauthn')).ok, false)
  for (const raw of [
    LINE.replace('flags=0', 'flags=0.0'),
    `${LINE}|location=here`,
    `${LINE}|motive=want`,
    LINE.replace('REPORTED', 'PROVEN'),
    LINE.replace('unity:pilot.853b2e11', 'finger:abc'),
  ]) {
    const row = readHandoff(raw)
    assert.equal(row.ok, false)
    if (!row.ok) assert.equal(row.reason, 'HOLE')
  }
})
