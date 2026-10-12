/** A bot key's value falls to zero when a person shows the same work already exists.
 * The key stays, so the audit stays. A paper that does not match does not touch the others.
 * This is not a search of any patent office.
 */

import type { SolvedKey } from './keys.ts'

export interface PriorWork {
  kind: 'white paper' | 'knowledge patent'
  title: string
  claim: string
}

export function sameWork(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const left = norm(a)
  return left.length > 0 && left === norm(b)
}

export function priorFrom(text: string): PriorWork | null {
  const match = text.match(/\b(white paper|knowledge patent|patent)\b\s+(.+?)\s+covers\s+(.+)/i)
  if (!match) return null
  const claim = match[3].trim().replace(/[?.!]+$/g, '')
  const title = match[2].trim()
  if (!title || !claim) return null
  return { kind: /patent/i.test(match[1]) ? 'knowledge patent' : 'white paper', title, claim }
}

export function nullifyBotValue(keys: readonly SolvedKey[], prior: PriorWork): { keys: SolvedKey[]; nullified: number; words: string } {
  let nullified = 0
  const next = keys.map(key => {
    if (key.holder !== 'bots' || key.face === 0 || !sameWork(key.claim, prior.claim)) return key
    nullified += 1
    return { ...key, novel: false, face: 0, nullified: `${prior.kind}: ${prior.title}` }
  })
  const words = nullified
    ? `${nullified === 1 ? 'One bot key' : `${nullified} bot keys`} for ${prior.claim} ${nullified === 1 ? 'is' : 'are'} nullified. The face is 0. ${prior.kind} “${prior.title}” is the audit. The key stays. A paper that does not match leaves the other keys alone. This did not search a patent office.`
    : `Nothing was nullified. ${prior.kind} “${prior.title}” does not match a bot key that still has a face. A human's own key is not touched this way.`
  return { keys: next, nullified, words }
}
