/** The biological gap. Humans pay bots for work a body cannot grind out.
 * Bots pay humans for a voluntary mark a machine cannot supply.
 * Nothing here is read from a sensor. The till stays closed.
 */

import { faceFor } from './close.ts'
import { WORKS, type EconomyState } from './economy.ts'

export const BODY = [
  'whether you are awake',
  'the weather on your skin',
  'whether you walked',
  'a place you choose to name',
  'whether their paper matches the air',
] as const

export const NOVEL_BODY = faceFor(true)
export const REPEAT_BODY = faceFor(false)
export const HIRE = 1

export interface GapState {
  marks: string[]
  hires: number
  bodyJobs: number
}

export function emptyGap(): GapState {
  return { marks: [], hires: 0, bodyJobs: 0 }
}

function note(state: EconomyState, line: string): EconomyState {
  return { ...state, last: [line, ...state.last].slice(0, 6) }
}

/** You pay a bot to do what silicon does. You own what comes back. */
export function hireBot(state: EconomyState, gap: GapState): { state: EconomyState; gap: GapState } {
  if (!state.split || state.doctor.supply < HIRE) {
    return { state: note(state, 'A bot can be hired only after the split, and only if your half can pay 1.'), gap }
  }
  const kind = WORKS[gap.hires % WORKS.length]
  return {
    gap: { ...gap, hires: gap.hires + 1 },
    state: note({
      ...state,
      doctor: { supply: state.doctor.supply - HIRE, spent: state.doctor.spent + HIRE, works: state.doctor.works + 1 },
      bots: { ...state.bots, supply: state.bots.supply + HIRE },
    }, `You paid a bot ${HIRE} for a ${kind}. You still own it. The bot cannot supply a body, so it is offering a job back.`),
  }
}

/** You volunteer one biological mark. The bot pays more the first time it hears that kind. */
export function sellBody(state: EconomyState, gap: GapState): { state: EconomyState; gap: GapState } {
  if (!state.split) return { state: note(state, 'The bots have no half to pay you from until the supply is split.'), gap }
  const fresh = BODY.find(mark => !gap.marks.includes(mark))
  const mark = fresh ?? BODY[gap.bodyJobs % BODY.length]
  const pay = fresh ? NOVEL_BODY : REPEAT_BODY
  if (state.bots.supply < pay) {
    return { state: note(state, `A bot wants “${mark}” and would pay ${pay}, but its half is short. Nothing was taken.`), gap }
  }
  return {
    gap: { ...gap, marks: fresh ? [...gap.marks, fresh] : gap.marks, bodyJobs: gap.bodyJobs + 1 },
    state: note({
      ...state,
      doctor: { ...state.doctor, supply: state.doctor.supply + pay },
      bots: { ...state.bots, supply: state.bots.supply - pay, spent: state.bots.spent + pay },
    }, `You volunteered “${mark}”. No sensor was read. The bot paid ${pay}, because ${fresh ? 'it had never been given that' : 'it had heard that kind before'}.`),
  }
}

/** One loop: you hire them, then you take the body job they cannot do. */
export function crossGap(state: EconomyState, gap: GapState): { state: EconomyState; gap: GapState } {
  const hired = hireBot(state, gap)
  if (hired.gap.hires === gap.hires) return hired
  return sellBody(hired.state, hired.gap)
}
