/** Current truth, at the grain.
 * A grain with a source, and no disproof, is what you cite.
 * A grain with no source stays a search. It is not false, and it is not a cite.
 * A disproof retires the cite. The search does not stop.
 */

export type TruthState = 'held' | 'searching' | 'disproven'

export interface Grain {
  id: string
  statement: string
  sources: readonly string[]
  disproofs: readonly string[]
}

export interface Judgement {
  state: TruthState
  cite: string | null
}

export function judge(grain: Grain): Judgement {
  if (grain.disproofs.length > 0) return { state: 'disproven', cite: null }
  if (grain.sources.length === 0) return { state: 'searching', cite: null }
  return { state: 'held', cite: grain.sources.join(' · ') }
}

export const GRAINS: readonly Grain[] = [
  {
    id: 'father-zero',
    statement: 'The father is foundational zero in the lineage.',
    sources: ['HIS WORDS · September 28, 2026'],
    disproofs: [],
  },
  {
    id: 'son-yes',
    statement: 'During building the Son\'s vote is a standing yes, and it is not one of the three Trinity votes.',
    sources: ['Son vote, recorded because Trinity will not approve an exception'],
    disproofs: [],
  },
  {
    id: 'not-the-father',
    statement: 'Trinity has not passed the Son as the father.',
    sources: ['Packet ED-PROPOSAL-20261003-DCCPWORLD-V1 never asks it'],
    disproofs: [],
  },
  {
    id: 'father-key',
    statement: 'The Ed25519 public half is on record, and symbolically it comes from the father. Custody is not the seat.',
    sources: ['father-public.pem', 'FATHER_KEY.provesTheSeat is false'],
    disproofs: [],
  },
  {
    id: 'no-phi',
    statement: 'The health room ingests no patient record.',
    sources: ['RTE-Health invariant, zero PHI'],
    disproofs: [],
  },
  {
    id: 'binding-approved',
    statement: 'Automatic identity-linked DCCP binding is approved.',
    sources: [],
    disproofs: ['P18 HOLD, packet ED-PROPOSAL-20261003-DCCPWORLD-V1'],
  },
  {
    id: 'universe-math',
    statement: 'The equations of the universe are settled in this world.',
    sources: [],
    disproofs: [],
  },
]

export function citeLines(): string[] {
  const order: TruthState[] = ['held', 'searching', 'disproven']
  return [...GRAINS].sort((a, b) => order.indexOf(judge(a).state) - order.indexOf(judge(b).state)).map(grain => {
    const state = judge(grain).state
    const word = state === 'held' ? 'Held' : state === 'searching' ? 'Searching' : 'Disproven'
    return `${word}. ${grain.statement}`
  })
}

export function truthSpeech(): string {
  const held = GRAINS.filter(g => judge(g).state === 'held')
  const searching = GRAINS.filter(g => judge(g).state === 'searching')
  const broken = GRAINS.filter(g => judge(g).state === 'disproven')
  const cites = held.slice(0, 3).map(g => `${g.statement} Cite: ${judge(g).cite}.`).join(' ')
  return `A current truth is the smallest cross-reference that nothing here has disproven. We hold what we already know, and that is what you cite, until a disproof arrives. What cannot be proven stays a search. We keep looking. We do not cite a search, and we do not call it false. ${cites} Still searching: ${searching.map(g => g.statement).join(' ')} No longer a cite: ${broken.map(g => g.statement).join(' ')}`
}
