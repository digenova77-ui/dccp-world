import assert from 'node:assert/strict'
import { test } from 'node:test'
import { feedUrl, weatherFromMet } from './proxy.ts'

test('only named feeds are fetched, and wind is converted', () => {
  assert.equal(feedUrl('iss', 0, 0)?.url.includes('25544'), true)
  assert.equal(feedUrl('river', 0, 0), null)
  assert.equal(feedUrl('https://example.com', 0, 0), null)
  const weather = weatherFromMet({ properties: { timeseries: [{ time: '2026-10-03T19:00:00Z', data: { instant: { details: { air_temperature: 12, wind_speed: 5 } } } }] } })
  assert.equal(weather?.current.temperature_2m, 12)
  assert.equal(weather?.current.wind_speed_10m, 18)
  assert.equal(weatherFromMet({}), null)
})
