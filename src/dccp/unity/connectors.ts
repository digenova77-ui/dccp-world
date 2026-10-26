/** Connectors we sign ahead of time. The other side has not.
 * Each one is built to know and to sense. None of them do yet.
 * Their choice is still theirs. The offer is audited. Nothing is sent.
 */

import { fingerprint } from '../ledger/dark.ts'

export const KINDS = ['personal', 'social', 'business', 'corporate', 'legal', 'municipal', 'government', 'agency'] as const
export type ConnectorKind = (typeof KINDS)[number]

export const OFFER = 'We sign this connector ahead. The choice to move is theirs. Bots, governments, corporations, people, everything. Audited. Sensing stays empty until they choose.'

const CUSTOM: Record<ConnectorKind, string> = {
  personal: 'One person, one Unity ID, if they choose.',
  social: 'People together. No tribe is preferred.',
  business: 'A shop or a practice. We do not hold their books.',
  corporate: 'A company, including another company\'s bots. Their sandbox stays theirs.',
  legal: 'A court or a counsel. We do not hold their docket.',
  municipal: 'A city or a town on this map.',
  government: 'A country on this map. We do not speak for it.',
  agency: 'An agency. No patient record and no roster is loaded.',
}

export interface Connector {
  kind: ConnectorKind
  custom: string
  ours: 'signed-ahead'
  theirs: 'not-chosen' | 'chosen'
  knowing: 'not-yet'
  sensing: 'empty'
  audit: 'always'
}

export function connectors(): Connector[] {
  return KINDS.map(kind => ({
    kind,
    custom: CUSTOM[kind],
    ours: 'signed-ahead',
    theirs: 'not-chosen',
    knowing: 'not-yet',
    sensing: 'empty',
    audit: 'always',
  }))
}

export function cosmicLines(rows: readonly Connector[] = connectors()): string[] {
  const open = rows.filter(row => row.theirs !== 'chosen')
  const done = rows.length - open.length
  return [
    'The globe is spinning. What has been connected is not drawn out here.',
    done ? `${done} connected. They are not on this view.` : 'None are connected yet, so what is not done is still here.',
    ...open.map(row => `${row.kind}. Not done yet.`),
    'The Trinity still grounds it. Not a sealed sitting.',
  ]
}

export function connectorLines(known: { countries: number; cities: number }): string[] {
  return [
    ...connectors().map(row => `${row.kind}. ${row.custom} We signed ahead. They have not chosen. Knowing: not yet. Sensing: empty. Audited.`),
    `Ready for ${known.countries} known countries and ${known.cities} known cities. None of them have chosen. A children's event is not opened by a connector.`,
  ]
}

export async function offerProof(): Promise<{ hash: string; audit: 'always'; theirs: 'not-chosen' }> {
  return { hash: await fingerprint(OFFER), audit: 'always', theirs: 'not-chosen' }
}
