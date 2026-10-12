/** Derive from the last result, then do it again, until the next pass adds nothing.
 * A derivative of a derivative is the same claim. It is not a new result.
 */

export interface Derived {
  id: string
  claim: string
  parent: string
}

export function deriveOnce(held: readonly { id: string; claim: string }[]): Derived[] {
  const known = new Set(held.map(row => row.id))
  const next: Derived[] = []
  for (const row of held) {
    if (row.id.startsWith('derivative:')) continue
    const id = `derivative:${row.id}`
    if (known.has(id) || next.some(item => item.id === id)) continue
    next.push({ id, claim: row.claim, parent: row.id })
  }
  return next
}

export function runUntilDry(claims: readonly string[]): { passes: number; added: number; words: string } {
  let held = claims.filter(claim => claim.trim()).map(claim => ({ id: `result:${claim.trim()}`, claim: claim.trim() }))
  let added = 0
  let passes = 0
  for (;;) {
    const more = deriveOnce(held)
    passes += 1
    if (!more.length) {
      const words = added === 0
        ? 'Nothing further is a derivative of the last result.'
        : `${added} ${added === 1 ? 'derivative' : 'derivatives'} followed. The next pass added nothing.`
      return { passes, added, words }
    }
    held = [...held, ...more]
    added += more.length
    if (passes > claims.length + 1) return { passes, added, words: 'Stopped. A further pass would repeat the last result.' }
  }
}
