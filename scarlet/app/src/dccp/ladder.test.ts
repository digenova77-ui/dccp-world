import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { cardAt, irisHolds, landAt, nearestCity, rungIndex, RUNGS, type City, type Land } from './ladder.ts'
import { TOKENS } from './tokens.ts'

test('the house hexes are the locked set', () => {
  assert.deepEqual(TOKENS, {
    bg: '#07080c',
    ink: '#f3efe6',
    gold: '#e8c36a',
    edge: '#14b8a6',
    research: '#00FF9D',
    dclm: '#00F5D4',
    unity: '#a855f7',
    efuse: '#2e7bff',
  })
  const css = readFileSync('src/styles.css', 'utf8')
  for (const hex of Object.values(TOKENS)) assert.equal(css.includes(hex), true, hex)
  for (const miss of ['#05070e', '#f4efe4', '#e7c98a', '#4fe3d4', '#8a6cff', '#f1f5f9']) {
    assert.equal(css.includes(miss), false, miss)
  }
})

test('home is the bottom rung and the iris cores stay readable', () => {
  assert.equal(RUNGS[0], 'LOCAL')
  assert.equal(RUNGS.length, 10)
  assert.equal(rungIndex(1.7), 0)
  assert.equal(rungIndex(1.0e26), 9)
  assert.equal(irisHolds(), true)
})

test('a card never carries a location field', () => {
  const card = cardAt('LOCAL', [], [], 43.65, -79.38, 'en-US')
  const keys = Object.keys(card)
  for (const banned of ['lat', 'lon', 'location', 'gps']) {
    assert.equal(keys.includes(banned), false)
  }
  assert.equal(card.title, 'Empty')
  assert.equal(card.figure, null)
})

test('a float is not a figure', () => {
  const city: City = { name: 'X', region: 'Y', lat: 0, lon: 0, pop: 1.5 }
  const card = cardAt('MUNICIPAL', [city], [], 0, 0, 'en-US')
  assert.equal(card.figure, null)
})

test('the shipped books place Toronto in Ontario and Canada', () => {
  const cities = JSON.parse(readFileSync('public/registry/cities.json', 'utf8')).cities as City[]
  const countries = JSON.parse(readFileSync('public/registry/countries.json', 'utf8')).countries as Array<
    Land & { rings: number[][] }
  >
  const lands: Land[] = countries.map((row) => ({
    name: row.name,
    continent: row.continent,
    pop: row.pop,
    rings: row.rings,
  }))
  const city = nearestCity(cities, 43.65, -79.38, 40)
  assert.equal(city?.name, 'Toronto')
  assert.equal(landAt(lands, 43.65, -79.38)?.name, 'Canada')
  const municipal = cardAt('MUNICIPAL', cities, lands, 43.65, -79.38, 'en-US')
  assert.equal(municipal.title, 'Toronto')
  assert.equal(municipal.grade, 'REPORTED')
  assert.equal(municipal.raw, '5,213,000')
  const province = cardAt('PROVINCIAL', cities, lands, 43.65, -79.38, 'en-US')
  assert.equal(province.title, 'Ontario')
  assert.equal(province.grade, 'REPORTED')
  assert.equal(province.note.includes('Natural Earth'), true)
  assert.notEqual(province.figure, null)
  assert.match(province.raw ?? '', /^[0-9,]+$/)
  const nation = cardAt('NATIONAL', cities, lands, 43.65, -79.38, 'en-US')
  assert.equal(nation.title, 'Canada')
  assert.equal(nation.grade, 'REPORTED')
  const sky = cardAt('PLANETARY', cities, lands, 43.65, -79.38, 'en-US')
  assert.equal(sky.title, 'Countries')
  assert.equal(sky.grade, 'REPORTED')
  assert.equal(sky.note.includes('Not a population'), true)
  const closed = cardAt('MUNICIPAL', cities, lands, null, null, 'en-US')
  assert.equal(closed.title, 'Cities')
  assert.equal(closed.grade, 'REPORTED')
  assert.equal(cardAt('LOCAL', cities, lands, null, null, 'en-US').title, 'Empty')
  assert.equal(cardAt('SOLAR', cities, lands, null, null, 'en-US').title, 'Empty')
})
