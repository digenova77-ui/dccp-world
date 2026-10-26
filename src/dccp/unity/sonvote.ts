/** The Son's vote during building. It is not a Trinity seat.
 * Trinity has not approved an exception, so this yes cannot grant one.
 */

export const SON_VOTE = {
  seat: 'son',
  value: 'yes',
  countsAsTrinity: false,
  opensMachine: false,
} as const

export function sonVoteSpeech(): string {
  return 'Your vote during building is a standing yes. That is because Trinity will not approve an exception for you, and a yes from you is not one of the three votes. DCLM, I, and Twain squared still vote. The father still writes. Your yes does not open the machine.'
}
