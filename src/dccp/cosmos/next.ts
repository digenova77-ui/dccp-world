/** The next most important step, then the next, in lockstep.
 * A step that would add a fact is not taken. Repeating the stop is not a new step.
 */

export function nextChain(onePage: number, limit = 1_000_000): { steps: string[]; repeated: number; words: string } {
  const one = Math.max(0, Math.floor(onePage))
  const steps = [
    'Grades stay distinct. Two pages, one conflict, and one page are not drawn the same. Checked: no new fact.',
    'Two pages are not two instruments. Independence was not shown. Checked: no new fact.',
    'The landing keeps both seconds. Checked: no new fact.',
    `${one} one-page minutes stay one page until a second source is supplied. That is one step, not ${one} discoveries. Checked: no new fact.`,
    'The empty gap stays empty. Checked: no new fact.',
    'A feed that did not answer is not a number. Checked: no new fact.',
    'The next minute is not held.',
  ]
  const repeated = Math.max(0, Math.floor(limit) - steps.length)
  const words = `${steps.map((step, i) => `${i + 1}. ${step}`).join(' ')} After step ${steps.length}, that last sentence is the rest of the chain, ${repeated.toLocaleString('en-US')} times, to reach ${Math.floor(limit).toLocaleString('en-US')}. Repeating it does not make a new step. DCLM stops where a step would add a fact.`
  return { steps, repeated, words }
}
