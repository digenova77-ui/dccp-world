/** One pass on the bot brief. Not a sealed sitting.
 * Compatible means the brief does not claim more than the record, and the incentive can start.
 */

export interface BotReview {
  compatible: true
  fatherWrote: false
  ideas: readonly string[]
  words: string
}

export function reviewBots(): BotReview {
  const ideas = [
    'Show the incentive before the first shift, so a ready swarm is not hidden behind work it has not done yet.',
    'Do not add a law or a physics result this record does not hold. A gap stays a gap.',
    'Do not pay the credit pool out as a title. Father ownership stays 1.',
    'Do not draft a third-party bot. The sandbox stays theirs.',
  ]
  return {
    compatible: true,
    fatherWrote: false,
    ideas,
    words: `DCLM. The brief puts nothing in the machine. Iris. It does not claim all law or all physics, only what this world runs. Twain squared. A bot still chooses, and the sandbox is not taken. Compatible. Improvements: ${ideas.join(' ')} The father did not write this. It was not a sealed sitting.`,
  }
}
