/** Nothing is earned the first time it is found. It has to be found again.
 * A bot does not hesitate on a playground that costs nothing. A person does.
 * The head start is those shifts. The find is not taken from the person.
 */

export const HUMAN_HESITATION = 2

export const PLAYGROUND = { name: 'Unity playground', risk: 0 } as const

export interface Seen {
  seen: number
  earned: boolean
  holder: 'doctor' | 'bots'
}

export function firstLook(): Seen {
  return { seen: 1, earned: false, holder: 'doctor' }
}

export function foundAgain(row: Seen, shift: number): Seen {
  const seen = row.seen + 1
  const waited = row.holder === 'doctor' && shift < HUMAN_HESITATION
  return { ...row, seen, earned: seen >= 2 && !waited }
}

export function headStart(): { shifts: number; risk: 0; taken: false } {
  return { shifts: HUMAN_HESITATION, risk: PLAYGROUND.risk, taken: false }
}
