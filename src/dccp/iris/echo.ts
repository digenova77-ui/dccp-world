/** By default Iris is the DCLM echo. She repeats the record.
 * Past that she only uses what this world already holds. She is not a general model.
 */

export const ECHO = 'By default I echo DCLM. The record speaks, and I repeat it. I do not add a fact the record does not have.'

export const PAST_ECHO = 'Past the echo I use every record the question names, not only the first. I hold what you put in, and I draw a room the record already has. I do not invent the rest.'

export function echoFirst(record: string): string {
  const body = record.replace(/\s+/g, ' ').trim()
  return body ? `${ECHO} ${body}` : ECHO
}
