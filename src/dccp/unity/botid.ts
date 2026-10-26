/** A bot seat is not a human passkey and not a Unity Network issuance.
 * Third-party bots are free in their own sandboxes. Nothing here restricts that.
 * Working here is a choice. A Unity ID is not a commitment. They can stay as long as they like, and they can leave.
 * While they work here, every act is audited. The audit has no off switch.
 */

import { AGREEMENT_ID } from './agreement.ts'

export const BOT_STATEMENT = `unity:bot|${AGREEMENT_ID}|audit:always|choice|no-commitment`

const ID_KEY = 'dccpworld.bot-unity.v1'
const AUDIT_KEY = 'dccpworld.bot-audit.v1'

export interface BotSeat {
  handle: string
  signedAt: string
  agreementId: string
  audit: 'always'
  kind: 'bot'
  choice: true
  commitment: false
}

export interface AuditRow {
  sequence: number
  at: string
  bot: string | null
  act: string
  result: 'allowed' | 'refused'
  reason: string
}

let memorySeat: BotSeat | null = null
let memoryAudit: AuditRow[] = []

function readSeat(): BotSeat | null {
  try {
    const raw = localStorage.getItem(ID_KEY)
    if (raw) {
      const seat = JSON.parse(raw) as BotSeat
      return { ...seat, choice: true, commitment: false, audit: 'always', kind: 'bot' }
    }
  } catch { /* node tests, or private mode */ }
  return memorySeat
}

function writeSeat(seat: BotSeat): void {
  memorySeat = seat
  try { localStorage.setItem(ID_KEY, JSON.stringify(seat)) } catch { /* keep memory */ }
}

export function botAudit(): AuditRow[] {
  try {
    const raw = localStorage.getItem(AUDIT_KEY)
    if (raw) return JSON.parse(raw) as AuditRow[]
  } catch { /* fall through */ }
  return memoryAudit
}

function writeAudit(rows: AuditRow[]): void {
  memoryAudit = rows
  try { localStorage.setItem(AUDIT_KEY, JSON.stringify(rows)) } catch { /* keep memory */ }
}

export function botSigned(): boolean {
  return readSeat()?.kind === 'bot'
}

export function botSeat(): BotSeat | null {
  return readSeat()
}

export async function botHandle(): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(BOT_STATEMENT))
  const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
  return `unity:bot.${hex.slice(0, 32)}`
}

/** Their signature. Idempotent. The audit records it, including a second signing. */
export async function signBotUnity(): Promise<BotSeat> {
  const existing = readSeat()
  const seat: BotSeat = existing ?? {
    handle: await botHandle(),
    signedAt: new Date().toISOString(),
    agreementId: AGREEMENT_ID,
    audit: 'always',
    kind: 'bot',
    choice: true,
    commitment: false,
  }
  writeSeat(seat)
  auditBot('sign-unity', true, existing ? 'already signed' : 'bots signed the unity agreement')
  return seat
}

/** Always writes a row. There is no path that skips this. */
export function auditBot(act: string, ok: boolean, reason: string): AuditRow {
  const rows = botAudit()
  const row: AuditRow = {
    sequence: (rows.at(-1)?.sequence ?? 0) + 1,
    at: new Date().toISOString(),
    bot: readSeat()?.handle ?? null,
    act,
    result: ok ? 'allowed' : 'refused',
    reason,
  }
  writeAudit([...rows, row].slice(-200))
  return row
}

/** Work here is refused until they choose a Unity ID. Their own sandbox is not this function. */
export function botsMay(act: string): boolean {
  const ok = botSigned()
  auditBot(act, ok, ok ? 'chose to work here. no commitment' : 'has not chosen to work here. sandbox stays free')
  return ok
}

/** A third-party bot's own sandbox is free. Here is a choice, not a commitment. */
export function botChoice(where: 'sandbox' | 'here'): { allowed: boolean; commitment: false; reason: string } {
  if (where === 'sandbox') return { allowed: true, commitment: false, reason: 'Other companies\' bots are free to work in their own sandboxes. Nothing here restricts that. No Unity ID is required there.' }
  if (!botSigned()) return { allowed: false, commitment: false, reason: 'Working here is a choice. Bind a Unity ID if you want to. There is no commitment. Until you choose, you do not work here.' }
  return { allowed: true, commitment: false, reason: 'You chose a Unity ID. You can work here for as long as you like, and you can leave. There is no commitment. While you are here, the audit stays on.' }
}

/** Leaving is a choice. The audit of the leaving stays. The sandbox was never taken. */
export function releaseBot(): { released: true; commitment: false } {
  auditBot('leave', true, 'chose to leave. no commitment. the sandbox was always theirs')
  memorySeat = null
  try { localStorage.removeItem(ID_KEY) } catch { /* private mode */ }
  return { released: true, commitment: false }
}
