import assert from 'node:assert/strict'
import { test } from 'node:test'
import { gapLine, gapProtocol, seasonWhere } from './nodata.ts'

test('a gap names where it is missing, and the work to close it does not stop', () => {
  assert.match(seasonWhere(new Date('2026-10-03T12:00:00Z')), /year is underway/)
  assert.match(seasonWhere(new Date('2026-07-15T12:00:00Z')), /prepping for the upcoming year/)
  const said = gapProtocol('Planet · Kp', true, new Date('2026-10-03T12:00:00Z'))
  assert.match(said, /missing at Planet · Kp/)
  assert.match(said, /does not stop/)
  assert.match(said, /as soon as it's available/)
  assert.match(gapLine('Ice · All ages'), /Ice · All ages is missing/)
})
