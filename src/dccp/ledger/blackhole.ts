/** What the system no longer needs can be erased. The proof cannot.
 * The proof is the fingerprint, the kind, and that the dataset had been audited.
 * The body is not kept. A proof is not a dataset, so it cannot be sent back in.
 */

import { fingerprint } from './dark.ts'

export interface Proof {
  id: string
  kind: string
  sha256: string
  erasedAt: string
  audited: true
}

const KEY = 'dccpworld.blackhole.v1'
let memory: Proof[] = []

function read(): Proof[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Proof[]
  } catch { /* node tests, or private mode */ }
  return memory
}

function write(rows: Proof[]): void {
  memory = rows
  try { localStorage.setItem(KEY, JSON.stringify(rows)) } catch { /* keep memory */ }
}

export function listProofs(): Proof[] {
  return read()
}

export async function collapse(input: { id: string; kind: string; body: string; needed: boolean }): Promise<{ erased: false; reason: string } | { erased: true; proof: Proof }> {
  if (input.kind === 'proof' || input.kind === 'audit') return { erased: false, reason: 'A proof is not a dataset. The black hole does not take it.' }
  if (input.needed) return { erased: false, reason: 'The system still needs this. Nothing was erased.' }
  const body = input.body.trim()
  if (!body) return { erased: false, reason: 'There is no dataset left to erase.' }
  const proof: Proof = { id: input.id, kind: input.kind, sha256: await fingerprint(body), erasedAt: new Date().toISOString(), audited: true }
  write([proof, ...read().filter(row => row.id !== proof.id)])
  return { erased: true, proof }
}
