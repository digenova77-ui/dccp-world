import assert from 'node:assert/strict'
import { test } from 'node:test'
import { unifiedTelemetry } from './telemetry.ts'

test('live readings and missing ones share one HUD', () => {
  const hud = unifiedTelemetry(
    { title: 'Japan', lines: ['People 126,000,000. A record, not a live count.'] },
    [
      { scope: 'Planet', label: 'Station', value: '420 km' },
      { scope: 'Planet', label: 'Kp', value: null },
      { scope: 'Ice', label: 'All ages', value: null },
    ],
  )
  assert.equal(hud.title, 'Japan')
  assert.match(hud.lines.join(' '), /Station · 420 km/)
  assert.match(hud.lines.join(' '), /Planet · Kp is missing/)
  assert.match(hud.lines.join(' '), /Ice · All ages is missing/)
  assert.match(hud.lines.join(' '), /does not stop/)
  assert.match(hud.lines.join(' '), /Friction 0.67/)
  assert.match(hud.lines.join(' '), /Best path: A NOAA Kp/)
})
