/** An unknown can sit on a gap only if some minute was mapped at the time.
 * The seat is a mirror. It does not say what happened, and it is not space itself.
 */

export interface GapSeat {
  from: number
  to: number
}

/** Ends with nothing mapped between them. That gap is the unknown part of the boundary. */
export function unknownGaps(joints: readonly { end: boolean }[]): GapSeat[] {
  const seats: GapSeat[] = []
  for (let i = 0; i < joints.length - 1; i++) {
    if (joints[i].end && joints[i + 1].end) seats.push({ from: i, to: i + 1 })
  }
  return seats
}

export function seatUnknown(name: string, at: string | null): { seated: boolean; words: string } {
  const label = name.trim() || 'An unknown'
  if (!at || !Number.isFinite(Date.parse(at))) {
    return { seated: false, words: `${label} was not mapped at the time. It has no seat. The boundary of the map does not grow.` }
  }
  return { seated: true, words: `${label} was mapped at ${at}. It can sit in the gap between the playground and the observable boundary. The mark says unknown. It does not say what happened.` }
}

export function unknownWords(seats: number): string {
  const gap = seats === 1 ? 'One gap has no interior mark.' : seats ? `${seats} gaps have no interior mark.` : 'No gap is empty between the ends.'
  return `The playground is the minutes already mapped. The observable boundary is the places we hold. ${gap} An unknown is mirrored onto that gap, between the playground and the boundary. The two landing seconds stay, and the unknown there is which second. A minute mapped at the time can take a seat like that. A minute not mapped at the time cannot, and the boundary of the map does not grow. This is the boundary of the map, not space itself.`
}
