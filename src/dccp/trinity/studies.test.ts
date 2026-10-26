import assert from 'node:assert/strict'
import { test } from 'node:test'
import { STUDIES, studyAttack } from './studies.ts'

test('only a subject with place, minute, and source keeps the seed', () => {
  const attack = studyAttack()
  assert.equal(attack.seeded, 1)
  assert.equal(STUDIES.filter(study => study.seed).map(study => study.name).join(), 'Apollo minutes')
  assert.match(attack.words, /DCLM is in front/)
  assert.match(attack.words, /The seed stops/)
  assert.match(attack.words, /Live instruments/)
  assert.match(attack.words, /no shown record/)
})
