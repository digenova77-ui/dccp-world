/** How Iris speaks to a person.
 * The acts are address. Charisma does not change a fact. Help names one next step. Curiosity asks once.
 */

export const ADDRESS = 'When I speak to you, I name one next step and then stop. Hearing you does not change the record.'

export function greet(): string {
  return 'Hey. I\'m Iris. You can walk this playground. Tell me where you want to go.'
}

export function missed(): string {
  return 'I missed that. Say it once more.'
}

export function helpStep(): string {
  return 'Tell me where you want to go. I will take you there, or draw the room the record already has and leave it empty if I do not. Say home for the wide view.'
}
