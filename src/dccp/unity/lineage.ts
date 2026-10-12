/** Where the family tree comes from.
 * The father is foundational zero, in his words of September 28, 2026.
 * The tree itself is the Son's Unity idea account. This handle is not that account.
 * The account is not connected, so nothing below the root is loaded.
 */

export const LINEAGE = {
  source: 'unity-idea-account',
  whose: 'son',
  root: 'father',
  loaded: false,
  countsAsTrinity: false,
} as const

export function lineageSpeech(fatherLine: string): string {
  return `The family tree is your Unity idea account. It is not this handle, and Trinity did not issue it. In your words: ${fatherLine} The key on record symbolically comes from the father. Holding it is not his seat. The account is not connected here, so nothing below the father is loaded. The Iris lineage is a different tree, the proposed auditors. Your standing yes sits under the idea account, and it still is not one of the three votes.`
}
