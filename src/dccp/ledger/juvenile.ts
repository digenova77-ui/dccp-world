/** A youth seat. Parental consent is required, and the mark is dark-ledger data.
 * Unbound viewers see a sealed count. A bound Unity ID sees the other bound seats on this device.
 * The mark is never returned here, never spoken, and never sent. No Earth roster is loaded.
 */

export const JUVENILE = ['minor athletics', 'other juvenile'] as const
export type JuvenileKind = (typeof JUVENILE)[number]

export interface Seat {
  id: string
  kind: JuvenileKind
  consent: true
  handle: string
  sha256: string
  at: string
}

const KEY = 'dccpworld.juvenile.v1'
let memory: Seat[] = []

export function loadSeats(): Seat[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Seat[]
  } catch { /* private mode or node */ }
  return memory
}

export function saveSeats(seats: Seat[]): void {
  memory = seats
  try { localStorage.setItem(KEY, JSON.stringify(seats)) } catch { /* keep memory */ }
}

export function admitSeat(input: { kind: string; consent: boolean; mark: string; handle: string | null }): { ok: false; reason: string } | { ok: true; kind: JuvenileKind; mark: string; handle: string } {
  if (!input.consent) return { ok: false, reason: 'No seat without parental consent. Nothing was stored.' }
  if (!input.handle) return { ok: false, reason: 'The roster is dark until a Unity ID is bound.' }
  if (!JUVENILE.includes(input.kind as JuvenileKind)) return { ok: false, reason: 'That is not a juvenile seat.' }
  const mark = input.mark.trim()
  if (mark.length < 2) return { ok: false, reason: 'The mark is too small to seal.' }
  if (mark.length > 500) return { ok: false, reason: 'The mark is too large to seal.' }
  if (/PRIVATE KEY/.test(mark)) return { ok: false, reason: 'A private key is refused.' }
  return { ok: true, kind: input.kind as JuvenileKind, mark, handle: input.handle }
}

/** The owner sees their own seat, with the mark left out. Anyone else sees a sealed count.
 * Binding a Unity ID does not make you belong to someone else's children's event.
 * Access cannot be bought.
 */
export function rosterLines(viewer: string | null, seats: Seat[]): { dark: boolean; lines: string[] } {
  if (!viewer) return { dark: true, lines: [`${seats.length} children's ${seats.length === 1 ? 'event is' : 'events are'} sealed. You do not own them. Access cannot be bought.`] }
  const mine = seats.filter(seat => seat.handle === viewer)
  const others = seats.length - mine.length
  const lines = mine.map(seat => `${seat.kind} · consent asserted · yours · mark sealed`)
  if (others) lines.push(`${others} other children's ${others === 1 ? 'event is' : 'events are'} sealed. You do not own them and you do not belong to them. They cannot be bought.`)
  if (!lines.length) lines.push('No children\'s event of yours is on this device. Access cannot be bought. No database is loaded.')
  return { dark: others > 0 || mine.length === 0, lines }
}
