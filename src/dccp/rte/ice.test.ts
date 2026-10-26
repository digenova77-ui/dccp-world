import assert from 'node:assert/strict'
import { test } from 'node:test'
import { iceAudit, iceRoom, resetIce } from './ice.ts'

test('any cut is a look at the one ice room, and every look stays on the audit', () => {
  resetIce()
  const before = iceAudit().length
  const all = iceRoom('land as a coach on the hockey rink, all ages, all levels')
  assert.equal(all?.title, 'Ice')
  assert.match(all!.lines.join(' '), /All ages, all levels/)
  assert.match(all!.lines.join(' '), /U16 AAA/)
  assert.match(all!.lines.join(' '), /Ice time/)
  const pp = iceRoom('check out the power play stats')
  assert.equal(pp!.title, 'Ice')
  assert.match(pp!.lines.join(' '), /Chances on the power play/)
  assert.doesNotMatch(pp!.lines.join(' '), /Ice time/)
  assert.match(pp!.speech, /as soon as it's available/)
  const youth = iceRoom('u6 aaa power play')
  assert.match(youth!.speech, /U6 AAA/)
  assert.match(youth!.speech, /U16 AAA/)
  assert.doesNotMatch(youth!.speech, /will not draw/)
  assert.equal(iceAudit().length, before + 3)
  assert.equal(iceAudit().at(-1)?.cut, 'U6 AAA')
})
