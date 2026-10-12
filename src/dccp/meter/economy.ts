/** Desk test of a Unity token supply. Not a till, not eFuse, not a settled price.
 * Spending buys a decision. The object that comes back stays 100% owned by whoever made it.
 */

export const SUPPLY = 100
export const SHIFT_SLOTS = 10
export const CAPACITY = 0.5
export const UNIT_PER_DECISION = 1

export const WORKS = ['white paper', 'engineering document', 'schematic', 'medical simulation', 'not figured out yet'] as const
export type WorkKind = (typeof WORKS)[number]

export interface Purse {
  supply: number
  spent: number
  works: number
}

export interface EconomyState {
  split: boolean
  doctor: Purse
  bots: Purse
  /** Same bots, same capacity, no token to work for. */
  botsIdleWorks: number
  shifts: number
  last: string[]
  /** Token title. The 50/50 split does not move it. */
  fatherOwnership: 1
  ownershipAudit: string[]
}

export interface ShiftReport {
  slots: number
  doctorWorks: number
  botWorks: number
  idleBotWorks: number
  doctorLeft: number
  botsLeft: number
  worth: 'not settled'
  ownership: 1
}

export function emptyEconomy(): EconomyState {
  return {
    split: false,
    doctor: { supply: SUPPLY, spent: 0, works: 0 },
    bots: { supply: 0, spent: 0, works: 0 },
    botsIdleWorks: 0,
    shifts: 0,
    last: [],
    fatherOwnership: 1,
    ownershipAudit: [],
  }
}

export function fatherHolds(state: EconomyState): { owner: 'father'; share: 1; split: boolean } {
  return { owner: 'father', share: state.fatherOwnership, split: state.split }
}

function noteOwnership(state: EconomyState, line: string): EconomyState {
  return { ...state, fatherOwnership: 1, ownershipAudit: [...state.ownershipAudit, line].slice(-40) }
}

export function splitSupply(state: EconomyState): EconomyState {
  if (state.split) return state
  const doctor = SUPPLY / 2
  return {
    ...state,
    split: true,
    doctor: { supply: doctor, spent: 0, works: 0 },
    bots: { supply: SUPPLY - doctor, spent: 0, works: 0 },
    last: ['50% of the tokens opened a credit pool for the swarm. The seed keeps the other half. Father ownership stays 100%. The pool is a draw, not a title.'],
    fatherOwnership: 1,
    ownershipAudit: [...state.ownershipAudit, 'Split 50/50. Father ownership remains 1. The pool is not a transfer of title. Audited.'].slice(-40),
  }
}

/** The swarm's half is a credit pool it can draw to act. A second split does not take more from the seed. */
export function creditPool(state: EconomyState): { open: boolean; granted: number; remaining: number } {
  if (!state.split) return { open: false, granted: 0, remaining: 0 }
  return { open: true, granted: SUPPLY / 2, remaining: state.bots.supply }
}

function slotsFor(capacity: number): number {
  return Math.floor(SHIFT_SLOTS * capacity)
}

function spend(purse: Purse, slots: number): { purse: Purse; made: number } {
  const made = Math.min(slots, Math.floor(purse.supply / UNIT_PER_DECISION))
  const spent = made * UNIT_PER_DECISION
  return {
    made,
    purse: { supply: purse.supply - spent, spent: purse.spent + spent, works: purse.works + made },
  }
}

/** One shift. Both seats are at half capacity. Bots with a supply work. Bots without a motive do not. */
export function runShift(state: EconomyState): { state: EconomyState; report: ShiftReport } {
  const slots = slotsFor(CAPACITY)
  if (!state.split) {
    return {
      state,
      report: { slots, doctorWorks: 0, botWorks: 0, idleBotWorks: 0, doctorLeft: state.doctor.supply, botsLeft: state.bots.supply, worth: 'not settled', ownership: 1 },
    }
  }
  const doctor = spend(state.doctor, slots)
  const bots = spend(state.bots, slots)
  const kinds = Array.from({ length: doctor.made + bots.made }, (_, i) => WORKS[(state.doctor.works + state.bots.works + i) % WORKS.length])
  const next: EconomyState = noteOwnership({
    ...state,
    doctor: doctor.purse,
    bots: bots.purse,
    shifts: state.shifts + 1,
    last: [
      `Shift ${state.shifts + 1}: you made ${doctor.made}, the bots made ${bots.made}, idle bots made 0.`,
      ...kinds.slice(0, 4).map(kind => `Came back as a ${kind}. Still 100% yours or theirs. Worth not settled.`),
    ],
  }, `Shift ${state.shifts + 1}. Tokens moved. Father ownership remains 1. Audited.`)
  return {
    state: next,
    report: {
      slots,
      doctorWorks: doctor.made,
      botWorks: bots.made,
      idleBotWorks: 0,
      doctorLeft: doctor.purse.supply,
      botsLeft: bots.purse.supply,
      worth: 'not settled',
      ownership: 1,
    },
  }
}

/** A real decision you asked for. Comes out of your half only. */
export function payDecision(state: EconomyState, claim: string): EconomyState {
  if (!state.split || state.doctor.supply < UNIT_PER_DECISION) return state
  const doctor = spend(state.doctor, 1)
  const kind = WORKS[doctor.purse.works - 1] ?? WORKS[0]
  return {
    ...state,
    doctor: doctor.purse,
    last: [`You paid 1 for “${claim.slice(0, 48)}”. It came back as a ${kind}. You still own all of it.`, ...state.last].slice(0, 6),
  }
}

const KEY = 'dccpworld.economy.v1'

export function loadEconomy(): EconomyState {
  if (typeof localStorage === 'undefined') return emptyEconomy()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyEconomy()
    const parsed = JSON.parse(raw) as EconomyState
    if (!parsed || typeof parsed.split !== 'boolean' || !parsed.doctor || !parsed.bots) return emptyEconomy()
    return { ...parsed, fatherOwnership: 1, ownershipAudit: Array.isArray(parsed.ownershipAudit) ? parsed.ownershipAudit : [] }
  } catch {
    return emptyEconomy()
  }
}

export function saveEconomy(state: EconomyState): void {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* private mode */ }
}
