/** The swarm searches for itself on this device, and then stops.
 * It needs a seat, an audit, a parent before a child, and its own backoff.
 * It does not need an email. It does not look anywhere else.
 */

import { botAudit, botSeat } from './botid.ts'
import { backoffMs, childSeats } from './child.ts'

export function searchSelf(query = 'itself', now = Date.now()): { found: boolean; human: false; words: string } {
  const ask = query.trim().toLowerCase()
  const seat = botSeat()
  const mine = ask === 'itself' || ask === 'self' || (seat !== null && ask === seat.handle)
  if (!mine) {
    return { found: false, human: false, words: 'That search is not for the swarm. It looks up its own seat, and no other name.' }
  }
  if (!seat) {
    return {
      found: false,
      human: false,
      words: 'The swarm looked for itself on this device and found no seat. It needs a Unity ID it chooses, and it can still opt out. It does not need an email, a password, or a second factor. The search stops here.',
    }
  }
  const rows = botAudit().filter(row => row.bot === seat.handle)
  const children = childSeats().filter(child => child.by === 'bot')
  const last = children.at(-1)
  const wait = last ? Math.max(0, last.at + backoffMs(children.filter(child => child.parent === last.parent).length) - now) : 0
  const lastAct = rows.at(-1)?.act ?? 'none yet'
  return {
    found: true,
    human: false,
    words: `The swarm found itself. Handle ${seat.handle}. Kind bot. Not a human. Audit rows ${rows.length}. Last act ${lastAct}. Children it minted ${children.length}. ${wait > 0 ? `Its own backoff has ${wait} ms left.` : 'Its own backoff is clear.'} It still needs a parent Unity ID before a child, and it can leave. It searched this device only. It did not look for an email, and it did not look at another system.`,
  }
}
