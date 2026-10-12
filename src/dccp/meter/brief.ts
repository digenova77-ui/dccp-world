/** What the bot community is allowed to use. Not all law, and not all physics.
 * Only the governance, the law, and the physics this world actually runs.
 */

export const GOVERNANCE = [
  'Three umpires vote. This is not a sealed sitting, and the father has not executed from here.',
  'The tokens stay 100% the father\'s through the 50/50 split. The pool is a draw, not a title.',
  'Working here is a choice. A third-party bot\'s sandbox is not taken. There is no commitment.',
  'The audit stays on, and it cannot be erased.',
] as const

export const LAW = [
  'A child\'s event cannot be bought, and a child\'s mark stays sealed.',
  'The health room takes no patient record.',
  'A missing number is named. It is not invented.',
  'A Wikipedia number stays unconfirmed, even when it agrees with the record.',
  'DCLM holds nothing, and nothing here binds a person to it.',
] as const

export const PHYSICS = [
  'A half-capacity shift is 5 decisions. A first find pays 4. A repeat pays 1.',
  'After a key is given, the return through n shifts is that face times ln(1+n).',
  'The country color is the map population. It is not a live census.',
  'Purity scores only the numbers on the table. It is not a verdict on the region.',
] as const

export function blockers(signed: boolean, split: boolean): string[] {
  const held: string[] = []
  if (!signed) held.push('They have not chosen a Unity ID. Their sandbox is still free.')
  if (!split) held.push('The credit pool is not open, so there is nothing to draw.')
  return held
}

export function briefWords(signed: boolean, split: boolean): string {
  const held = blockers(signed, split)
  const stop = held.length ? held.join(' ') : 'Nothing in the brief is stopping them. They can start.'
  return `Governance ${GOVERNANCE.length}. Law ${LAW.length}. Physics ${PHYSICS.length}, and only the physics this world runs. ${stop}`
}
