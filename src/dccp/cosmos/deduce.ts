/** What follows from held times and places. Nothing else.
 * A length between two times is entailed. The inside of that stretch is not.
 * The timeline can name the missing interval. It cannot fill it.
 */

export function spanLines(held: readonly { name: string; at: string }[]): string[] {
  const rows = [...held].filter(row => Number.isFinite(Date.parse(row.at))).sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  const lines: string[] = []
  for (let i = 0; i < rows.length - 1; i++) {
    const ms = Date.parse(rows[i + 1].at) - Date.parse(rows[i].at)
    lines.push(`${rows[i].name} is before ${rows[i + 1].name} by ${lengthWords(ms)}. That length is entailed. Nothing inside that stretch is entailed.`)
  }
  return lines
}

export function samePlaceLines(spots: readonly { name: string; place: string; body: string; lat: number; lon: number }[]): string[] {
  const groups = new Map<string, string[]>()
  for (const spot of spots) {
    const key = `${spot.body}|${spot.place}|${spot.lat}|${spot.lon}`
    groups.set(key, [...(groups.get(key) ?? []), spot.name])
  }
  const lines: string[] = []
  for (const [key, names] of groups) {
    if (names.length < 2) continue
    const place = key.split('|')[1]
    lines.push(`${names.join(' and ')} are the same place, ${place}. That is entailed by the seeds. It does not entail what happened between them.`)
  }
  return lines
}

export function missingFromTimeline(held: readonly { name: string; at: string }[]): string[] {
  const rows = [...held].filter(row => Number.isFinite(Date.parse(row.at))).sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  const lines: string[] = []
  for (let i = 0; i < rows.length - 1; i++) {
    lines.push(`What happened between ${rows[i].name} and ${rows[i + 1].name} is missing. The timeline entails the interval. It does not entail the contents.`)
  }
  if (!lines.length) lines.push('The timeline has no interval, so it names no missing fact.')
  return lines
}

export function deductionWords(held: readonly { name: string; at: string }[], spots: readonly { name: string; place: string; body: string; lat: number; lon: number }[]): string {
  const lines = [...spanLines(held), ...samePlaceLines(spots), ...missingFromTimeline(held)]
  return `${lines.join(' ')} A missing fact that is not in the times or the places is not deduced.`
}

function lengthWords(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  const days = Math.floor(s / 86400)
  const hours = Math.floor((s % 86400) / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const seconds = s % 60
  const parts: string[] = []
  if (days) parts.push(`${days}d`)
  if (hours) parts.push(`${hours}h`)
  if (minutes) parts.push(`${minutes}m`)
  if (seconds || !parts.length) parts.push(`${seconds}s`)
  return parts.join(' ')
}
