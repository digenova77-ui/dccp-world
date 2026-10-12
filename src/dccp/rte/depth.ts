/** One stored sentence is one depth. A depth that is not stored is named, not invented. */

import { noDataYet } from '../iris/nodata.ts'

export interface Grain {
  depth: number
  label: string
  text: string
}

export function asGrains(rows: readonly { label: string; text: string }[]): Grain[] {
  return rows
    .map(row => ({ label: row.label.trim(), text: row.text.replace(/\s+/g, ' ').trim() }))
    .filter(row => row.text)
    .map((row, i) => ({ depth: i + 1, label: row.label, text: row.text }))
}

export function depthAsked(subject: string): { subject: string; index: number | null } {
  const match = subject.trim().match(/^(.*?)(?:\s+#|\s+depth\s+)(\d+)\s*$/i)
  if (!match) return { subject: subject.trim(), index: null }
  const n = Number(match[2])
  return { subject: match[1].trim(), index: n >= 1 ? n - 1 : null }
}

export function speakDepth(title: string, grains: Grain[], index: number | null, where: string): { lines: string[]; speech: string } {
  if (!grains.length) {
    const gap = noDataYet(false, new Date(), where)
    return { lines: [gap], speech: `${title}. ${gap}` }
  }
  const lines = grains.map(grain => `${grain.depth}. ${grain.label}: ${grain.text}`)
  if (index !== null && !grains[index]) {
    return { lines, speech: `${title} is ${grains.length} deep. Depth ${index + 1} is not in the record. ${noDataYet(false, new Date(), `${where} · depth ${index + 1}`)}` }
  }
  const grain = grains[index ?? 0]
  const rest = index === null && grains.length > 1 ? ` The other ${grains.length - 1} are in the room.` : ''
  return { lines, speech: `${title}, depth ${grain.depth} of ${grains.length}. ${grain.label}: ${grain.text}.${rest}` }
}
