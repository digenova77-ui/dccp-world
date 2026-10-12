/** From the held minutes up to the hypothesis, then back down onto each stretch.
 * The next pass adds nothing. No contents are invented on the way.
 */

import { spanLines } from './deduce.ts'
import { HYPOTHESIS } from './hypothesis.ts'
import { sha256Hex } from '../pipe/chain.ts'

export interface TruthNode {
  id: string
  level: 'floor' | 'up' | 'ceiling' | 'down'
  claim: string
  from: readonly string[]
}

export function truthMesh(held: readonly { name: string; at: string }[]): TruthNode[] {
  const rows = [...held].filter(row => row.name.trim() && Number.isFinite(Date.parse(row.at))).sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  const floor: TruthNode[] = rows.map(row => ({
    id: `floor:${row.at}`,
    level: 'floor',
    claim: `${row.name} is held at ${row.at}.`,
    from: [],
  }))
  const up: TruthNode[] = spanLines(rows).map((claim, i) => ({
    id: `up:${i}`,
    level: 'up',
    claim,
    from: [`floor:${rows[i].at}`, `floor:${rows[i + 1].at}`],
  }))
  const ceiling: TruthNode = { id: 'ceiling', level: 'ceiling', claim: HYPOTHESIS, from: up.map(node => node.id) }
  const down: TruthNode[] = up.map(node => ({
    id: `down:${node.id}`,
    level: 'down',
    claim: `${node.claim} The hypothesis covers this stretch and adds no contents.`,
    from: [node.id, ceiling.id],
  }))
  return [...floor, ...up, ceiling, ...down]
}

/** A derivative of a down-step is the same claim. The mesh is closed. */
export function nextDerivative(nodes: readonly TruthNode[]): TruthNode[] {
  void nodes
  return []
}

export function meshSpeech(nodes: readonly TruthNode[], ties = 0, shell = 0): string {
  const floor = nodes.filter(node => node.level === 'floor').length
  const up = nodes.filter(node => node.level === 'up').length
  const down = nodes.filter(node => node.level === 'down').length
  const web = ties ? ` ${ties} ties pull the minutes inside an interval back to that interval's two ends. Those minutes sit deeper.` : ''
  const shellLine = shell ? ` ${shell} ties join every end to every other end at once, and each end meets the ceiling. A minute is not tied to an end it does not sit between.` : ''
  return `Floor ${floor} held minutes. Up ${up} lengths. One ceiling, the same hypothesis. Down ${down} times, each stretch covered and no contents added.${web}${shellLine} In the room, time runs along the length and height is the level. Time is the fourth axis, drawn so it can be seen. The next pass adds nothing. The hash locks the mesh. It does not fill a hole.`
}

export interface MeshJoint {
  at: string
  name: string
  end: boolean
}

export interface MeshTie {
  from: number
  to: number
}

/** A minute inside two ends is tied to both. The tie does not say what happened there. */
export function deepen(ends: readonly { name: string; at: string }[], named: readonly { name: string; at: string }[]): { joints: MeshJoint[]; ties: MeshTie[] } {
  const endsSorted = [...ends].filter(row => Number.isFinite(Date.parse(row.at))).sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  const seen = new Set(endsSorted.map(row => row.at))
  const extra = named.filter(row => Number.isFinite(Date.parse(row.at)) && !seen.has(row.at))
  const joints: MeshJoint[] = [
    ...endsSorted.map(row => ({ at: row.at, name: row.name, end: true })),
    ...extra.map(row => ({ at: row.at, name: row.name, end: false })),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  const ties: MeshTie[] = []
  joints.forEach((joint, index) => {
    if (joint.end) return
    const ms = Date.parse(joint.at)
    let left = -1
    let right = -1
    joints.forEach((other, at) => {
      if (!other.end) return
      const t = Date.parse(other.at)
      if (t < ms) left = at
      if (t > ms && right < 0) right = at
    })
    if (left >= 0) ties.push({ from: index, to: left })
    if (right >= 0) ties.push({ from: index, to: right })
  })
  return { joints, ties }
}

/** Every end meets every other end. An interior minute is not in this close. */
export function closeEnds(joints: readonly { end: boolean }[]): MeshTie[] {
  const ids = joints.flatMap((joint, index) => (joint.end ? [index] : []))
  const ties: MeshTie[] = []
  for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) ties.push({ from: ids[a], to: ids[b] })
  return ties
}

export async function auditMesh(nodes: readonly TruthNode[]): Promise<string> {
  return sha256Hex(nodes.map(node => `${node.id}|${node.claim}`).join('\n'))
}
