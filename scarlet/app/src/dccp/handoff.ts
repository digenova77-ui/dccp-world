/** Dialect dccp2-line-v1. Canonical bytes. Integers only at this border. */
export const DIALECT = 'dccp2-line-v1'

export const GRADES = ['REPORTED', 'INFERRED', 'MODELED'] as const
export type Grade = (typeof GRADES)[number]

const HOST = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/
const UNITY = /^unity:[a-z0-9][a-z0-9._:-]{7,78}$/
const ALLOWED = new Set(['from', 'rp', 'verify', 'unity', 'flags', 'grade'])
const BANNED = ['location', 'motive', 'biometric', 'fingerprint', 'face', 'credential', 'lat', 'lon', 'gps', 'password', 'finger']

export type OpenHandoff = {
  ok: true
  dialect: typeof DIALECT
  from: string
  rp: string
  unity: string
  flags: 0
  grade: Grade
}

export type Handoff =
  | OpenHandoff
  | { ok: false; reason: 'SHUT' | 'HOLE' }

export function canonical(row: OpenHandoff): string {
  return `DCCP/2|from=${row.from}|rp=${row.rp}|verify=assertion|unity=${row.unity}|flags=0|grade=${row.grade}`
}

function parse(text: string): Handoff {
  const lower = text.toLowerCase()
  if (BANNED.some((word) => lower.includes(word))) return { ok: false, reason: 'HOLE' }
  const parts = text.split('|')
  if (parts[0] !== 'DCCP/2') return { ok: false, reason: 'HOLE' }
  const fields = new Map<string, string>()
  for (const part of parts.slice(1)) {
    const cut = part.indexOf('=')
    if (cut <= 0) return { ok: false, reason: 'HOLE' }
    const key = part.slice(0, cut)
    const value = part.slice(cut + 1)
    if (!ALLOWED.has(key) || fields.has(key) || value.length === 0) return { ok: false, reason: 'HOLE' }
    fields.set(key, value)
  }
  const from = fields.get('from') ?? ''
  const rp = fields.get('rp') ?? ''
  const unity = fields.get('unity') ?? ''
  const grade = fields.get('grade') ?? 'REPORTED'
  if (fields.get('verify') !== 'assertion') return { ok: false, reason: 'HOLE' }
  if (fields.get('flags') !== '0') return { ok: false, reason: 'HOLE' }
  if (!HOST.test(from) || !HOST.test(rp)) return { ok: false, reason: 'HOLE' }
  if (!UNITY.test(unity)) return { ok: false, reason: 'HOLE' }
  if (!GRADES.includes(grade as Grade)) return { ok: false, reason: 'HOLE' }
  return { ok: true, dialect: DIALECT, from, rp, unity, flags: 0, grade: grade as Grade }
}

export function readHandoff(raw: string | null | undefined): Handoff {
  if (raw == null || raw.trim() === '') return { ok: false, reason: 'SHUT' }
  const row = parse(raw.trim())
  if (!row.ok) return row
  const again = parse(canonical(row))
  if (!again.ok || canonical(again) !== canonical(row)) return { ok: false, reason: 'HOLE' }
  return row
}
