/** One mesh on this device. A solved claim is shared so another pursuit can see it.
 * We have no patent. What is not a solved claim stays out.
 * The three umpires name where it is still thin.
 */

import type { Rotation } from '../trinity/rotation.ts'
import { runUntilDry } from './dry.ts'

export interface MeshRow {
  from: string
  claim: string
  unityId: string
}

const KEY = 'dccpworld.mesh.v1'

function norm(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function load(): MeshRow[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]') as MeshRow[]
    return Array.isArray(raw) ? raw.filter(row => row && row.claim && row.unityId) : []
  } catch {
    return []
  }
}

let rows = load()

function save(): void {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(KEY, JSON.stringify(rows)) } catch { /* the device could not hold it */ }
}

export function meshRows(): readonly MeshRow[] {
  return rows
}

/** Share a solved claim. No Unity ID, no share. The same claim is not added twice. */
export function offerMesh(from: string, claim: string, unityId: string | null): MeshRow | null {
  const body = claim.trim()
  if (!body || !unityId) return null
  const prior = rows.find(row => norm(row.claim) === norm(body))
  if (prior) return prior
  const row = { from, claim: body, unityId }
  rows = [...rows, row]
  save()
  return row
}

export function meshPass(): Rotation {
  return {
    question: 'Where is the whole application thin, and what mashes into the mesh?',
    votes: [
      { seat: 'DCLM', says: 'The machine still holds nothing. A receipt is not a solved claim, so it does not enter the mesh.' },
      { seat: 'Iris', says: 'A Wikipedia cite is not a solved claim. A missing number stays out. A child\'s mark stays sealed and out.' },
      { seat: 'Twain²', says: 'A claim with no Unity ID is not shared. There is no patent on what is shared. Another pursuit on this device can read it.' },
    ],
    unified: 'Solved keys and first discoveries mash into one mesh. The same claim is shared once. DCLM, a Wikipedia cite, a missing number, and a child\'s mark stay out. That thinness is the boundary, not a hole to fill with an invention.',
    fatherWrote: false,
    audit: 'forever',
    sealedSitting: false,
  }
}

export function meshWords(): string {
  const shared = rows.length
  const list = shared ? ` Shared now: ${rows.slice(-4).map(row => row.claim).join(', ')}.` : ' Nothing is in the mesh yet.'
  const closed = runUntilDry(rows.map(row => row.claim))
  return `${meshPass().unified}${list} ${shared} ${shared === 1 ? 'claim' : 'claims'} shared. ${closed.words} The father did not write an execution. This was not a sealed sitting.`
}
