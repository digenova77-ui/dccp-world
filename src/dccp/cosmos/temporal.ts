/** The temporal constraints this record actually uses.
 * Next exists. Its contents are not a constraint we hold.
 */

export function beforeHolds(times: readonly string[]): boolean {
  const ms = times.map(at => Date.parse(at)).filter(Number.isFinite)
  for (let i = 1; i < ms.length; i++) if (ms[i] <= ms[i - 1]) return false
  return ms.length >= 2
}

export function sameInstant(a: string, b: string): boolean {
  return a === b
}

export function omnipresentBelief(): string {
  return 'Nothing in the record changes. A belief that the cosmos is conscious everywhere can be written down today. It is not a reading of an atom in a gap. It does not pick 20:17:39 or 20:17:40. It does not seat the empty interval. The minutes stay as they were graded.'
}

/** Information plus a decision is a result only when something audited it.
 * No auditor means a space-time gap. A shown record can seat a minute. A guess cannot.
 */

export function decisionGap(recordShown = false): { gap: boolean; words: string } {
  if (recordShown) {
    return {
      gap: false,
      words: 'A record was shown. It can be seated only if it names a place and a minute. Chat is not that record.',
    }
  }
  return {
    gap: true,
    words: 'Information plus a decision is a result only if something audited it. If nothing audited it, that is a space-time gap. A conscious planet would be an auditor we did not watch. We do not have its record, so the gap stays. If they show a record, and it names a place and a minute, that row can be seated. Until then what we would learn is about them, and that is more than we know, and it is not seated.',
  }
}

export function planetaryTheories(): string {
  return [
    'Gaia. Lovelock and Margulis, in the 1970s, called the Earth a coupled system that keeps conditions fit for life by feedback. Lovelock\'s homeostasis was automatic. He said naming Gaia she was like a sailor naming a ship, not a mind keeping minutes. Margulis later spoke of living matter as cognitive. Critics said the biota is not pursuing a planetary goal. None of that is a record of an unwatched minute.',
    'Noosphere. Vernadsky meant a sphere of reason: human thought as a geological force after rock and life. Teilhard meant a sphere of mind converging on an Omega Point. One is geology. One is theology. Neither names a place and a minute we were not watching.',
    'A conscious planet would be an auditor we did not watch. That is a theory. We do not have its record, so the gap stays. If they show a record, and it names a place and a minute, that row can be seated. Until then what we would learn is about them, and it is not seated.',
  ].join(' ')
}

export function worldDoesNotFill(): string {
  return 'No. The Earth, the air, and the water can seat a minute only when an instrument read them at that minute and that place. They do not remember a gap they were not asked to record. Atoms are not a source. A live reading does not fill an earlier hole. The empty gap stays empty.'
}

export function temporalWords(): string {
  const landing = sameInstant('1969-07-20T20:17:39Z', '1969-07-20T20:17:40Z')
  return [
    'Before. A held minute with an earlier time stays before a later one. The length between them is fixed.',
    'Next. Next exists, and what it contains is not held.',
    'Until. An empty gap stays empty until a minute mapped at the time takes a seat.',
    'Not overwritten. A new claim does not replace a minute already held.',
    'Not eventually. Nothing says the gap will be filled.',
    landing ? 'The landing is one instant.' : 'The landing is not one instant. 20:17:39 and 20:17:40 both stay.',
  ].join(' ')
}
