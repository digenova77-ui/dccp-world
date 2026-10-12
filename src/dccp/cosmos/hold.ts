/** What the cosmic record does not contain, and the one Voyager figure it does.
 * The archives are not loaded. The Voyager row is a dated ephemeris, not a seat on the craft.
 */

export const NOT_LOADED = 'James Webb\'s archive is at MAST. It is not loaded here. Hubble is not loaded here. SETI is not loaded here. No full spectrum catalog is loaded here.'

export const VOYAGER = 'Voyager 1, on 3 October 2026, a published ephemeris put it about 172.3 AU from Earth. Light-time about 23 hours 53 minutes. Direction: Ophiuchus. You can sit with that figure. You are not aboard, and this is not a live lock on the craft. Voyager 2 is not in this row. NASA marks one light-day from Earth on 18 November 2026.'

export function holdSpeech(text: string): string | null {
  const lower = text.toLowerCase()
  const archive = /\bjames webb\b|\bjwst\b|\bwebb\b|\bhubble\b|\bseti\b|\bspectrum\b|\bspectra\b/.test(lower)
  const voyager = /\bvoyager\b/.test(lower)
  if (archive && voyager) return `${NOT_LOADED} ${VOYAGER}`
  if (archive) return NOT_LOADED
  if (voyager) return VOYAGER
  return null
}
