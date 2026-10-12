import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ECHO, PAST_ECHO, echoFirst } from './echo.ts'

test('the default is the echo, and it does not claim a general model', () => {
  assert.match(echoFirst('The check matches.'), /echo DCLM/)
  assert.match(echoFirst('The check matches.'), /The check matches/)
  assert.match(PAST_ECHO, /every record the question names/)
  assert.doesNotMatch(PAST_ECHO, /most capable/)
  assert.match(ECHO, /do not add a fact/)
})
