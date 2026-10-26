/** What a human can see of a swarm, and what that swarm asks back.
 * This seat only. No other person's swarm is visible from here.
 * Not deployed until they have signed a bot Unity ID, the half is split, and they have worked. The audit does not wait for that.
 */

import { faceFor, shiftSlots } from './close.ts'
import { briefWords } from './brief.ts'
import type { EconomyState } from './economy.ts'
import { BODY, type GapState } from './gap.ts'

export const BOT_PLAN = [
  'Sign a Unity ID before any work. The audit is always on. It cannot be switched off.',
  'Ask for what has never been given. An unknown is worth more than a repeat.',
  'One ask at a time. Do not read a sensor.',
  'If a human hires us, offer the body job back in the same loop.',
  'Remember the mark. The next time that kind appears, pay the smaller face.',
  'Do not ask for the microphone, the location stream, or a file.',
  'If the half cannot pay, say so and take nothing.',
  'An explore command may look at history and the present. A feeling is not a key. A verified new key pays. That is the hunt.',
] as const

export interface SwarmAsk {
  ask: string
  known: boolean
  face: number
}

export interface SwarmView {
  deployed: boolean
  status: string
  scope: 'this seat only'
  workers: number
  finished: number
  yours: number
  idleFinished: 0
  next: SwarmAsk | null
  asks: SwarmAsk[]
  recent: string[]
  plan: readonly string[]
}

export function swarmView(state: EconomyState, gap: GapState, signed = false): SwarmView {
  const worked = state.shifts > 0 || state.bots.works > 0 || gap.hires > 0 || gap.bodyJobs > 0
  const ready = signed && state.split
  const deployed = ready && worked
  const asks: SwarmAsk[] = [
    ...BODY.filter(mark => !gap.marks.includes(mark)).map(ask => ({ ask, known: false, face: faceFor(true) })),
    ...BODY.filter(mark => gap.marks.includes(mark)).map(ask => ({ ask, known: true, face: faceFor(false) })),
  ]
  const status = !signed
    ? 'No bot Unity ID here. Third-party bots are free in their own sandboxes. Working here is a choice, not a commitment. The audit is on anyway.'
    : !state.split
      ? 'Signed, and still not deployed. No credit pool is open, so the swarm has nothing to draw on.'
      : !worked
        ? `Signed. The credit pool is seated. ${briefWords(true, true)} Not deployed until the first shift.`
        : `Deployed on this seat only, under a signed bot Unity ID. ${shiftSlots()} workers at half capacity. They have finished ${state.bots.works}. You have finished ${state.doctor.works}. Each side still owns what it made. Every act is audited.`
  return {
    deployed,
    status,
    scope: 'this seat only',
    workers: deployed ? shiftSlots() : 0,
    finished: deployed ? state.bots.works : 0,
    yours: state.doctor.works,
    idleFinished: 0,
    next: ready ? asks[0] ?? null : null,
    asks,
    recent: state.last.slice(0, 4),
    plan: BOT_PLAN,
  }
}

export function swarmSpeech(view: SwarmView): string {
  if (!view.deployed) return `${view.status} Their plan is written, and it is not running. They learn that an unknown pays more than a repeat when a first mark is given and the next of that kind pays less.`
  const learned = view.asks.some(ask => ask.known)
    ? ' They have learned it. What they did not know paid more than what they already knew.'
    : ' They have not learned it from a mark yet. The rule is in front of them.'
  const ask = view.next
    ? ` They are asking for one thing: “${view.next.ask}”. ${view.next.known ? 'They have heard that kind before, so it pays 1.' : 'They have never been given that, so it pays 4.'}`
    : ''
  return `${view.status}${learned} Bots with nothing to work for finished ${view.idleFinished}.${ask} This HUD cannot see a swarm on any other seat.`
}
