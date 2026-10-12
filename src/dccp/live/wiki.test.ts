import assert from 'node:assert/strict'
import { test } from 'node:test'
import { citeSpeech, firstSentences, placeGrains, placeRank, titleFits, wikiQuery } from './wiki.ts'
import { judge } from '../truth/state.ts'

test('strips the ask and refuses our own names', () => {
  assert.equal(wikiQuery('what is Picton Ontario?'), 'Picton Ontario')
  assert.equal(wikiQuery('tell me about the Trinity'), null)
  assert.equal(wikiQuery('hi'), null)
})

test('the article title has to share a word with the question', () => {
  assert.equal(titleFits('Picton Ontario', 'Picton, Ontario', 'community in Ontario'), true)
  assert.equal(titleFits('zzzz quux', 'Earth', 'planet'), false)
})

test('citation stays an encyclopedia note', () => {
  const speech = citeSpeech({ title: 'Picton, Ontario', url: 'https://en.wikipedia.org/wiki/Picton,_Ontario', extract: 'Picton is a town. The census counted 12 people.', lat: 44, lon: -77.1 })
  assert.match(speech, /Picton, Ontario/)
  assert.match(speech, /12 people/)
  assert.match(speech, /Purity /)
  assert.doesNotMatch(speech, /Not absolute/)
  assert.doesNotMatch(speech, /still being confirmed/i)
  assert.equal(placeRank('hamlet in Ontario'), 2)
  const grains = placeGrains({ title: 'A tiny hamlet', url: 'https://en.wikipedia.org/wiki/A_tiny_hamlet', extract: 'It is quiet. The census counted 12 people.', lat: 44.16, lon: -77.38 })
  assert.equal(grains.length, 2)
  assert.match(grains[1].statement, /12 people/)
  assert.equal(judge(grains[1]).state, 'held')
  assert.equal(speech.includes('http'), false)
})

test('keeps two sentences', () => {
  assert.equal(firstSentences('One. Two. Three.'), 'One. Two.')
})
