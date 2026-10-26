/** Cited notes for any identified place this world does not measure.
 * Iris reads the article. The caveat sits on the citation, not in every sentence.
 */

import { crossPurity } from '../truth/purity.ts'

export interface WikiNote {
  title: string
  url: string
  extract: string
  lat?: number
  lon?: number
}

const STOP = new Set(['what', 'where', 'who', 'when', 'why', 'how', 'is', 'are', 'was', 'were', 'the', 'and', 'for', 'about', 'tell', 'please', 'there', 'this', 'that', 'with', 'from', 'have', 'does', 'did', 'can', 'you', 'your', 'into', 'over', 'some', 'any'])
const OURS = /\b(unity|dccp|dclm|trinity|twain|jacket|genesis|efuse|pinata|ipns|ipfs|iris)\b/i

const cache = new Map<string, WikiNote | null>()

export function wikiQuery(utterance: string): string | null {
  if (OURS.test(utterance)) return null
  const cleaned = utterance
    .replace(/[?!.]+/g, ' ')
    .replace(/^(please |can you |could you |would you |tell me about |tell me |what is a |what is an |what is the |what is |whats |what's |where is |where are |who is |who was |how about |take me to |go to |show me |i want )+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (cleaned.length < 3 || cleaned.length > 80) return null
  const words = cleaned.toLowerCase().split(' ').filter(w => w.length > 2 && !STOP.has(w))
  if (!words.length) return null
  return cleaned
}

export function titleFits(query: string, title: string, description = ''): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !STOP.has(w))
  if (!words.length) return false
  const hay = `${title} ${description}`.toLowerCase()
  return words.some(w => hay.includes(w))
}

export function firstSentences(text: string, n = 2, max = 420): string {
  const plain = text
    .replace(/\([^)]*\/[^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const parts = plain.split(/(?<=[.!?])\s+/).filter(Boolean)
  const chosen = (parts.length ? parts : [plain]).slice(0, n).join(' ')
  return chosen.length > max ? `${chosen.slice(0, max - 1).replace(/\s+\S*$/, '')}…` : chosen
}

const PLACE = /\b(hamlet|village|town|city|community|municipality|settlement|parish|township|locality|census-designated|unincorporated)\b/i

export function placeRank(description = ''): number {
  if (PLACE.test(description)) return 2
  if (/\b(county|district|region|province|country|island)\b/i.test(description)) return 1
  return 0
}

export interface PlaceGrain {
  id: string
  statement: string
  sources: readonly string[]
  disproofs: readonly string[]
}

/** Every sentence that carries a number, plus the coordinates when the article has them. */
export function placeGrains(note: WikiNote): PlaceGrain[] {
  const source = `Wikipedia · ${note.title}`
  const sentences = note.extract.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => /\d/.test(s))
  const grains: PlaceGrain[] = sentences.map((statement, i) => ({ id: `place:${note.title}:${i}`, statement, sources: [source], disproofs: [] }))
  if (typeof note.lat === 'number' && typeof note.lon === 'number') {
    grains.unshift({ id: `place:${note.title}:where`, statement: `Wikipedia places ${note.title} near ${note.lat.toFixed(2)}, ${note.lon.toFixed(2)}.`, sources: [source], disproofs: [] })
  }
  return grains
}

export function placeLines(note: WikiNote, confirmedPop: number | null = null): string[] {
  const held = placeGrains(note).map(grain => grain.statement)
  const score = crossPurity(confirmedPop, held).score
  return [...held, `Purity ${score.toFixed(2)}.`]
}

export function citeSpeech(note: WikiNote, confirmedPop: number | null = null): string {
  const held = placeGrains(note)
  const body = held.length ? held.map(grain => grain.statement).join(' ') : note.extract
  const score = crossPurity(confirmedPop, held.map(grain => grain.statement)).score
  return `${note.title}. ${body} Purity ${score.toFixed(2)}.`
}

export async function wikiNote(utterance: string): Promise<WikiNote | null> {
  const query = wikiQuery(utterance)
  if (!query) return null
  const key = query.toLowerCase()
  if (cache.has(key)) return cache.get(key) ?? null
  try {
    const note = await lookup(query)
    cache.set(key, note)
    return note
  } catch {
    cache.set(key, null)
    return null
  }
}

async function lookup(query: string): Promise<WikiNote | null> {
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=5&srnamespace=0&format=json&origin=*`
  const found = await fetch(searchUrl)
  if (!found.ok) return null
  const body = await found.json() as { query?: { search?: { title: string }[] } }
  const hits = body.query?.search ?? []
  const foundNotes: { note: WikiNote; rank: number }[] = []
  for (const hit of hits) {
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hit.title)}`
    const res = await fetch(summaryUrl, { headers: { Accept: 'application/json', 'Api-User-Agent': 'DCCPWorld/Iris (educational; local)' } })
    if (!res.ok) continue
    const page = await res.json() as {
      type?: string
      title?: string
      extract?: string
      description?: string
      coordinates?: { lat?: number; lon?: number }
      content_urls?: { desktop?: { page?: string } }
    }
    if (page.type === 'disambiguation' || !page.title || !page.extract) continue
    if (!titleFits(query, page.title, page.description)) continue
    const url = page.content_urls?.desktop?.page
    if (!url?.startsWith('https://en.wikipedia.org/wiki/')) continue
    const lat = page.coordinates?.lat
    const lon = page.coordinates?.lon
    foundNotes.push({
      rank: placeRank(page.description),
      note: {
        title: page.title,
        url,
        extract: firstSentences(page.extract, 4, 700),
        ...(typeof lat === 'number' && typeof lon === 'number' ? { lat, lon } : {}),
      },
    })
  }
  foundNotes.sort((a, b) => b.rank - a.rank)
  return foundNotes[0]?.note ?? null
}
