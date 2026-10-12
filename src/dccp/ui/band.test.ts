import assert from 'node:assert/strict'
import { test } from 'node:test'
import { scaleBand } from './band.ts'

test('country height shows the country, not the station', () => {
  const band = scaleBand({ tier: 'cloud', country: { name: 'Japan', a3: 'JPN', pop: 126000000, popYear: '2019' }, city: 'Tokyo', province: null, quakesHere: 2, issAltKm: 420, kp: 3, carbon: 400 })
  assert.equal(band.title, 'Japan')
  assert.ok(band.lines.every(line => !line.includes('Station')))
})

test('a Canadian province replaces the city line, and the cosmic scale drops local readings', () => {
  const province = scaleBand({ tier: 'civil', country: { name: 'Canada', a3: 'CAN', pop: 1 }, city: 'Toronto', province: { name: 'Ontario', guard: 'PHIPA' }, quakesHere: 0, issAltKm: null, kp: null, carbon: null })
  assert.equal(province.title, 'Ontario')
  assert.match(province.lines[1], /No patient record/)
  const cosmic = scaleBand({ tier: 'cosmic', country: null, city: null, province: null, quakesHere: 0, issAltKm: 400, kp: 2, carbon: 10 })
  assert.match(cosmic.lines[0], /wrong instrument/)
})
