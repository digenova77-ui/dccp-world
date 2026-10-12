import assert from 'node:assert/strict'
import { test } from 'node:test'
import { taskHeld, taskWords } from './task.ts'

test('the task covers the field, and a miss is not invented', () => {
  assert.match(taskWords(), /Everything, everywhere, all the time, from every way/)
  assert.match(taskWords(), /audit/)
  assert.match(taskWords(), /not invented/)
  assert.equal(taskHeld('Japan, 123000000 people in the map record.'), true)
  assert.equal(taskHeld("I don't have that in the map."), false)
})
