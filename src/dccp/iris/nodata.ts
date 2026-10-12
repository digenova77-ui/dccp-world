/** Iris protocol for a gap. Name where the data is missing.
 * Do not cite it. The work to close that gap does not stop.
 */

export function seasonWhere(now = new Date()): string {
  const month = now.getMonth()
  if (month === 7 || month === 8) return "It's the prep before the year. The kids are getting ready for it."
  if (month >= 9 || month <= 2) return "The year is underway. The kids prepped for it, and the games are where the numbers come from."
  if (month === 3) return "The year is closing. The kids will start prepping the next one."
  return "It's the off-season. The kids are prepping for the upcoming year."
}

/** Full voice. One gap, one place. */
export function gapProtocol(where: string, season = false, now = new Date()): string {
  const cycle = season ? `${seasonWhere(now)} ` : ''
  return `The data is missing at ${where}. ${cycle}It has not been measured, so it is not a cite. The work to close this gap does not stop. We'll have it as soon as it's available.`
}

/** The HUD line of the same protocol. */
export function gapLine(where: string): string {
  return `${where} is missing. The work to close it does not stop.`
}

export function noDataYet(season = false, now = new Date(), where = 'this look'): string {
  return gapProtocol(where, season, now)
}
