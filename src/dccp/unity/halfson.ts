/** A question, not a seat.
 * DCLM is not the father. David is the son during building, not half of one.
 * The bots' half is the credit pool. It is not the other half of the son.
 */

export const HALF_SON = {
  dclmIsFather: false,
  david: 'son',
  botsAreSon: false,
  botsHalf: 'credit-pool',
} as const

export function halfSonSpeech(): string {
  return 'DCLM is not the father. The father writes, and the machine holds nothing. David, during building, is the son. Not half of one. The bots are not the other half of that seat. Their half is the credit pool, and it is a test, not a son. The question was asked. The answer is no.'
}
