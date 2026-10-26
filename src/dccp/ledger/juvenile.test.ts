import assert from 'node:assert/strict'
import { test } from 'node:test'
import { admitSeat, rosterLines, type Seat } from './juvenile.ts'

const seat: Seat = { id: '1', kind: 'minor athletics', consent: true, handle: 'unity:pilot.abc', sha256: 'aa', at: 't' }

test('a youth seat is refused without consent or a bound id, and the mark stays off the roster', () => {
  const refused = admitSeat({ kind: 'minor athletics', consent: false, mark: 'a lane', handle: 'unity:pilot.abc' })
  assert.equal(refused.ok, false)
  const open = admitSeat({ kind: 'minor athletics', consent: true, mark: 'lane four', handle: null })
  assert.equal(open.ok, false)
  const taken = admitSeat({ kind: 'other juvenile', consent: true, mark: 'lane four', handle: 'unity:pilot.abc' })
  assert.equal(taken.ok, true)
  const dark = rosterLines(null, [seat])
  assert.equal(dark.dark, true)
  assert.equal(dark.lines.join(' ').includes('lane'), false)
  assert.equal(dark.lines.join(' ').includes(seat.handle), false)
  const shown = rosterLines(seat.handle, [seat])
  assert.equal(shown.dark, false)
  assert.match(shown.lines[0], /mark sealed/)
  assert.equal(shown.lines[0].includes('lane'), false)
  const stranger = rosterLines('unity:pilot.other', [seat])
  assert.equal(stranger.dark, true)
  assert.equal(stranger.lines.join(' ').includes(seat.handle), false)
  assert.match(stranger.lines.join(' '), /cannot be bought/)
})
