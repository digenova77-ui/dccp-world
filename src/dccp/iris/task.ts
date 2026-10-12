/** The standing task. The audit is on every answer.
 * A miss is written as not held. It is not filled in.
 */

export const IRIS_TASK = 'Everything, everywhere, all the time, from every way.'

export function taskHeld(speech: string): boolean {
  return !/I don't have|holds nothing on that|not in what I hold|I will not guess/i.test(speech)
}

export function taskWords(): string {
  return `${IRIS_TASK} That is the task, and the audit is on every answer. What the record holds is written as held. What it does not hold is written as not held. It is not invented to finish the task.`
}
