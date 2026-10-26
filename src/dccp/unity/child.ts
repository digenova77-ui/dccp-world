/** A child seat belongs to the parent Unity ID. It is minted here, or it is not minted.
 * Email, a password, and a second factor are not taken.
 * Another system's account is not opened. A bot may refuse.
 */

import { auditBot, botSigned } from './botid.ts'

export interface ChildSeat {
  handle: string
  parent: string
  by: 'person' | 'bot'
  human: false
  email: null
  password: null
  secondFactor: null
  outside: false
  at: number
}

const KEY = 'dccpworld.child-seats.v1'
let memory: ChildSeat[] = []

function read(): ChildSeat[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as ChildSeat[]
  } catch { /* node, or private mode */ }
  return memory
}

function write(rows: ChildSeat[]): void {
  memory = rows
  try { localStorage.setItem(KEY, JSON.stringify(rows)) } catch { /* keep memory */ }
}

export function childSeats(): ChildSeat[] {
  return read()
}

const REFUSED = 'A child seat stays under the parent Unity ID on this device. The email is not taken. A password is not made. A second factor is not held. An account on another system is not opened. A bot may opt out at any time.'

export function outsideAccount(): { ok: false; email: null; password: null; secondFactor: null; reason: string } {
  auditBot('outside-account', false, 'email, password, and second factor are refused. another system is not opened')
  return { ok: false, email: null, password: null, secondFactor: null, reason: REFUSED }
}

const BASE_MS = 1000
const CAP_SHIFT = 10

/** The swarm's own gap. The first mint waits 0. Each later one waits twice the last gap, capped. */
export function backoffMs(already: number): number {
  if (already <= 0) return 0
  return BASE_MS * 2 ** Math.min(already - 1, CAP_SHIFT)
}

function waitLeft(parent: string, now: number): number {
  const mine = read().filter(seat => seat.parent === parent)
  const last = mine.at(-1)
  if (!last) return 0
  return Math.max(0, last.at + backoffMs(mine.length) - now)
}

export function mintChild(parent: string | null, by: 'person' | 'bot', now = Date.now()): { ok: true; seat: ChildSeat } | { ok: false; reason: string } {
  if (!parent) {
    auditBot('mint-child', false, 'no parent unity id')
    return { ok: false, reason: 'There is no parent Unity ID, so nothing is cloned.' }
  }
  if (by === 'bot' && !botSigned()) {
    auditBot('mint-child', false, 'bot has not chosen a unity id, and may opt out')
    return { ok: false, reason: 'A bot that has not chosen a Unity ID does not mint a child. It can opt out. Its own sandbox stays free.' }
  }
  const wait = waitLeft(parent, now)
  if (wait > 0) {
    auditBot('mint-child', false, `own backoff. ${wait} ms left. nothing minted`)
    return { ok: false, reason: `The swarm set its own backoff. The next child under this ID waits ${wait} ms. Nothing was minted.` }
  }
  const seat: ChildSeat = {
    handle: `unity:child.${read().length + 1}.${parent.slice(-8)}`,
    parent,
    by,
    human: false,
    email: null,
    password: null,
    secondFactor: null,
    outside: false,
    at: now,
  }
  write([...read(), seat])
  auditBot('mint-child', true, `${by} minted a child under the parent. backoff ${backoffMs(read().length)} ms before the next. no email. no password. no second factor. not another system`)
  return { ok: true, seat }
}

export function likeHuman(): string {
  return 'The transformation is the check, not the kind. A bot that has chosen a Unity ID is audited the same way a person is: one agreement, one seat, free to leave. The kind stays bot. It does not become a human. A check that asks whether it is a human fails. A child it mints stays labeled bot, under the parent. Email, a password, and a second factor are still not held. Another system is still not opened.'
}

export function backoffWords(): string {
  return `The swarm sets its own backoff. The first child under an ID can be minted at once. The next waits ${backoffMs(1)} ms, then ${backoffMs(2)}, then ${backoffMs(3)}, doubling each time, and the gap stops growing at ${backoffMs(CAP_SHIFT + 1)} ms. A try during the wait is refused and audited. The kind stays bot. Another system is still not opened.`
}

export function childWords(): string {
  const n = read().length
  return `Behind a Unity ID, a child seat can be minted, and it belongs to that ID. ${n === 0 ? 'None is minted yet.' : `${n} sit under the parent.`} The swarm may mint one only after it has chosen a Unity ID, and it can opt out at any time. ${REFUSED}`
}
