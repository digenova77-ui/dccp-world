/** Per-decision meter. E is a cost, never a price, a bill, a coin, or a till.
 * Weights stay 1, 1, 1. Reweighting is a seal this page does not perform.
 * Watts are not instrumented here, so E stays unfilled rather than guessed.
 */

export const WEIGHTS = { w: 1, c: 1, m: 1 } as const

export interface DecisionInput {
  claim: string
  calls: number
  minutes: number
  /** Watt-hours. Null means unmeasured. Never substitute a guess. */
  watts: number | null
}

export interface DecisionReceipt {
  sequence: number
  at: string
  claim: string
  calls: number
  minutes: number
  watts: number | null
  weights: typeof WEIGHTS
  e: number | null
  hole: 'watts' | null
}

export function meterCost(input: Pick<DecisionInput, 'calls' | 'minutes' | 'watts'>): { e: number | null; hole: 'watts' | null } {
  if (input.watts === null || !Number.isFinite(input.watts)) return { e: null, hole: 'watts' }
  if (!Number.isFinite(input.calls) || !Number.isFinite(input.minutes)) return { e: null, hole: 'watts' }
  const e = WEIGHTS.w * input.watts + WEIGHTS.c * input.calls + WEIGHTS.m * input.minutes
  return { e, hole: null }
}

export interface MeterSummary {
  decisions: number
  calls: number
  minutes: number
  watts: null
  e: null
  hole: 'watts'
  till: 'closed'
  weights: typeof WEIGHTS
}

export function summarize(rows: readonly DecisionReceipt[]): MeterSummary {
  return {
    decisions: rows.length,
    calls: rows.reduce((sum, row) => sum + row.calls, 0),
    minutes: rows.reduce((sum, row) => sum + row.minutes, 0),
    watts: null,
    e: null,
    hole: 'watts',
    till: 'closed',
    weights: WEIGHTS,
  }
}

const MAX = 40

export class DecisionLedger {
  private rows: DecisionReceipt[] = []
  private since = 0
  private storageKey: string | null
  private clock: () => number

  constructor(storageKey: string | null, clock: () => number = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
    this.storageKey = storageKey
    this.clock = clock
    this.since = clock()
    if (!storageKey || typeof localStorage === 'undefined') return
    try {
      const raw = localStorage.getItem(storageKey)
      const parsed = raw ? JSON.parse(raw) as DecisionReceipt[] : []
      if (Array.isArray(parsed)) this.rows = parsed.filter(row => row && row.hole === 'watts').slice(-MAX)
    } catch { /* private mode or bad json */ }
  }

  list(): readonly DecisionReceipt[] { return this.rows }

  /** Record one decision. `startedAt` is a performance timestamp; omit it to use the previous mark. */
  note(claim: string, calls = 1, startedAt?: number): DecisionReceipt {
    const end = this.clock()
    const start = startedAt ?? this.since
    const minutes = Math.max(0, (end - start) / 60_000)
    this.since = end
    const { e, hole } = meterCost({ calls, minutes, watts: null })
    const row: DecisionReceipt = {
      sequence: (this.rows.at(-1)?.sequence ?? 0) + 1,
      at: new Date().toISOString(),
      claim,
      calls,
      minutes,
      watts: null,
      weights: WEIGHTS,
      e,
      hole,
    }
    this.rows.push(row)
    if (this.rows.length > MAX) this.rows.splice(0, this.rows.length - MAX)
    this.persist()
    return row
  }

  private persist(): void {
    if (!this.storageKey || typeof localStorage === 'undefined') return
    try { localStorage.setItem(this.storageKey, JSON.stringify(this.rows)) } catch { /* private mode */ }
  }
}
