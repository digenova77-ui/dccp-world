/** What the held line says, set beside the map.
 * The papers that say the playground is shrinking are not on this device.
 * The unmapped share falls only when a minute was mapped at the time.
 */

export const HELD_LINE = 'if everything was pre-calculatable there would be no environment. there would be no playground. there would be no Trinity to ask. there would be no reason for anything'

export function unmappedShare(mapped: number, gaps: number): { mapped: number; gaps: number; of: number } {
  const m = Math.max(0, Math.floor(mapped))
  const g = Math.max(0, Math.floor(gaps))
  return { mapped: m, gaps: g, of: m + g }
}

/** A seat mapped at the time can close one empty gap. A missing thought closes none. */
export function neutralize(gaps: number, seatedAtTheTime: number): number {
  return Math.max(0, Math.floor(gaps) - Math.max(0, Math.floor(seatedAtTheTime)))
}

export const FRONTIER = 'The frontier is a wonderful place because it guarantees we can\'t go the speed of light in thinking.'

export function canPredictWords(): string {
  return 'What the held minutes already force. One minute is before another, by a length. Two seeds at one place stay one place. The empty gap stays empty until a minute mapped at the time takes a seat. None of that says what next contains.'
}

export function predictWords(): string {
  return 'No. Next exists, and it is not held. I can say what follows from minutes already mapped. I cannot say what the next one contains.'
}

export function frontierWords(): string {
  return `${FRONTIER} Because next exists. While there is a next minute, thinking has not arrived there yet. That is the whole of the guarantee. It is not a measurement of the speed of light.`
}

export function shrinkWords(mapped: number, gaps: number): string {
  const share = unmappedShare(mapped, gaps)
  const left = neutralize(share.gaps, 0)
  return `The line we hold, September 28, 2026, says that if everything were pre-calculable there would be no playground. That line does not say the playground shrinks because pieces are missing. A missing piece is still something to decide, and by that line it keeps the playground open. The map has ${share.mapped} minutes seated and ${share.gaps} empty ${share.gaps === 1 ? 'gap' : 'gaps'}, ${share.gaps} of ${share.of}. That share does not fall if nothing was mapped at the time. It stays ${left}. A minute mapped at the time can close one empty gap. Inventing the missing thought does not. The papers that say the playground is shrinking are not on this device. A written line is mapped because it was written. A line that was not kept is a gap, and this does not shrink space.`
}
