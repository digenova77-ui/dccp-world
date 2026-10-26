/** The dark ledger audits the whole, not a published score.
 * The scoreboard is the canonical list. It is hashed and not returned.
 * The hash is what can be shown, and what a later check can prove.
 */

import { fingerprint } from './dark.ts'

export interface Part {
  kind: string
  sha256: string
}

export interface Totality {
  hash: string
  count: number
  hidden: true
}

export async function auditTotality(parts: readonly Part[]): Promise<Totality> {
  const board = parts.map(part => `${part.kind}:${part.sha256}`).sort().join('\n')
  return { hash: await fingerprint(board || 'empty'), count: parts.length, hidden: true }
}

export async function proveTotality(parts: readonly Part[], hash: string): Promise<boolean> {
  const audited = await auditTotality(parts)
  return audited.hash === hash
}
