/** Named minutes a published timeline places between held endpoints.
 * The list can be any capture. Only one capture is loaded.
 * The hash locks the list. The hypothesis is unchanged, and the unnamed minutes stay open.
 */

import { sha256Hex } from '../pipe/chain.ts'
import { HYPOTHESIS } from './hypothesis.ts'

export interface Named {
  at: string
  name: string
  after: string
  before: string
}

export const NAMED: readonly Named[] = [
  { at: '1969-07-16T13:43:49Z', name: 'Earth orbit insertion', after: 'Liftoff', before: 'Translunar injection' },
  { at: '1969-07-16T16:47:23Z', name: 'CSM separates from the upper stage', after: 'Translunar injection', before: 'The Eagle has landed' },
  { at: '1969-07-16T16:56:03Z', name: 'CSM docks with the lunar module', after: 'Translunar injection', before: 'The Eagle has landed' },
  { at: '1969-07-16T17:49:03Z', name: 'CSM and lunar module leave the upper stage', after: 'Translunar injection', before: 'The Eagle has landed' },
  { at: '1969-07-19T17:21:50Z', name: 'Lunar orbit insertion', after: 'Translunar injection', before: 'The Eagle has landed' },
  { at: '1969-07-20T17:44:00Z', name: 'Lunar module undocks', after: 'Translunar injection', before: 'The Eagle has landed' },
  { at: '1969-07-20T19:08:14Z', name: 'Descent burn', after: 'Translunar injection', before: 'The Eagle has landed' },
  { at: '1969-07-20T20:05:05Z', name: 'Powered descent begins', after: 'Translunar injection', before: 'The Eagle has landed' },
  { at: '1969-07-21T03:05:58Z', name: 'Contingency sample', after: 'A step on the surface', before: 'Splashdown' },
  { at: '1969-07-21T03:15:16Z', name: 'Aldrin steps onto the surface', after: 'A step on the surface', before: 'Splashdown' },
  { at: '1969-07-21T03:24:40Z', name: 'The plaque is read', after: 'A step on the surface', before: 'Splashdown' },
  { at: '1969-07-21T03:35:20Z', name: 'Solar wind collector is deployed', after: 'A step on the surface', before: 'Splashdown' },
  { at: '1969-07-21T03:41:43Z', name: 'The flag is deployed', after: 'A step on the surface', before: 'Splashdown' },
  { at: '1969-07-21T21:35:00Z', name: 'CSM and lunar module dock', after: 'A step on the surface', before: 'Splashdown' },
  { at: '1969-07-21T23:41:31Z', name: 'Lunar module ascent stage is jettisoned', after: 'A step on the surface', before: 'Splashdown' },
  { at: '1969-07-22T04:55:42Z', name: 'Transearth injection', after: 'A step on the surface', before: 'Splashdown' },
  { at: '1969-07-24T16:21:12Z', name: 'Command module separates from the service module', after: 'A step on the surface', before: 'Splashdown' },
  { at: '1969-07-24T16:35:05Z', name: 'Entry interface', after: 'A step on the surface', before: 'Splashdown' },
  { at: '1969-07-24T16:44:06Z', name: 'Drogue parachute', after: 'A step on the surface', before: 'Splashdown' },
  { at: '1969-07-24T16:47:05Z', name: 'Main parachutes', after: 'A step on the surface', before: 'Splashdown' },
]

export function groupNamed(rows: readonly Named[]): string {
  const groups = new Map<string, string[]>()
  for (const row of rows) {
    const key = `${row.after} and ${row.before}`
    groups.set(key, [...(groups.get(key) ?? []), row.name])
  }
  return [...groups.entries()].map(([gap, names]) => `Between ${gap}, a published timeline names ${names.join(', ')}.`).join(' ')
}

export function listBody(rows: readonly Named[]): string {
  return rows.map(row => [row.at, row.name, row.after, row.before].join('|')).join('\n')
}

export async function auditList(rows: readonly Named[] = NAMED): Promise<string> {
  return sha256Hex(listBody(rows))
}

export function betweenWords(rows: readonly Named[] = NAMED): string {
  return `${groupNamed(rows)} Any held timeline can be listed this way. Only this capture is loaded. ${HYPOTHESIS} These names are not that hypothesis becoming fact. One source. Not verified. The hatch opening is named on that timeline and the page does not agree to the second, so that second is not held. The hash locks the list. It does not fill a minute that is still unnamed.`
}
