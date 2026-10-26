/** One world. Ten magnitudes. Home is the bottom rung. */

export const RUNGS = [
  'LOCAL',
  'MUNICIPAL',
  'REGIONAL',
  'PROVINCIAL',
  'NATIONAL',
  'INTERNATIONAL',
  'PLANETARY',
  'SOLAR',
  'GALACTIC',
  'COSMIC',
] as const

export type Rung = (typeof RUNGS)[number]

/** Eye height in meters. The camera travels this curve. It does not swap scenes. */
export const RUNG_HEIGHT_M = [
  1.7, 1.2e3, 2.5e4, 2.0e5, 1.6e6, 6.0e6, 2.4e7, 2.0e11, 5.0e20, 1.0e26,
] as const

/** Two teal cores, one purple shell. No wordmark. Ratios, not pixels. */
export const IRIS = {
  shell: 1,
  core: 0.42,
  gap: 0.36,
  shellOpacity: 0.28,
} as const

export function irisHolds(): boolean {
  const center = IRIS.gap / 2
  const inside = center + IRIS.core < IRIS.shell
  const readable = IRIS.core / IRIS.shell >= 0.38
  const shellClear = IRIS.shellOpacity >= 0.12 && IRIS.shellOpacity <= 0.35
  return inside && readable && shellClear
}

export function rungIndex(heightM: number): number {
  const log = Math.log(heightM)
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < RUNG_HEIGHT_M.length; i++) {
    const d = Math.abs(log - Math.log(RUNG_HEIGHT_M[i]))
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

/** Log midpoint between neighbouring rungs. The label changes here and nowhere else. */
export function rungCrossings(): number[] {
  const out: number[] = []
  for (let i = 0; i < RUNG_HEIGHT_M.length - 1; i++) {
    const a = Math.log(RUNG_HEIGHT_M[i])
    const b = Math.log(RUNG_HEIGHT_M[i + 1])
    out.push(Math.exp((a + b) / 2))
  }
  return out
}

export type City = { name: string; region: string; lat: number; lon: number; pop: number }
export type Land = { name: string; continent: string; pop: number; rings: number[][] }

export type ViewCard = {
  rung: Rung
  title: string
  figure: string | null
  raw: string | null
  grade: 'REPORTED' | null
  note: string
}

const MUNICIPAL_KM = 40
const PROVINCE_KM = 120

function radians(n: number): number {
  return (n * Math.PI) / 180
}

export function kmBetween(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = radians(lat2 - lat1)
  const dLon = radians(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function nearestCity(cities: readonly City[], lat: number, lon: number, withinKm: number): City | null {
  let best: City | null = null
  let bestKm = withinKm
  for (const city of cities) {
    const km = kmBetween(lat, lon, city.lat, city.lon)
    if (km <= bestKm) {
      best = city
      bestKm = km
    }
  }
  return best
}

function ringHolds(ring: number[], lon: number, lat: number): boolean {
  let crossings = 0
  const count = Math.floor(ring.length / 2)
  for (let i = 0; i < count; i++) {
    const x1 = ring[i * 2]
    const y1 = ring[i * 2 + 1]
    const x2 = ring[((i + 1) % count) * 2]
    const y2 = ring[((i + 1) % count) * 2 + 1]
    if ((y1 > lat) !== (y2 > lat) && lon < ((x2 - x1) * (lat - y1)) / (y2 - y1) + x1) crossings += 1
  }
  return crossings % 2 === 1
}

export function landAt(lands: readonly Land[], lat: number, lon: number): Land | null {
  let found: Land | null = null
  for (const land of lands) {
    if (!land.rings.some((ring) => ringHolds(ring, lon, lat))) continue
    if (found) return null
    found = land
  }
  return found
}

function recordCard(rung: Rung, title: string, n: number, locale: string, note: string): ViewCard {
  const shown = integerFigure(n, locale)
  if (!shown || n < 1) {
    return { rung, title: 'Empty', figure: null, raw: null, grade: null, note: 'Nothing shipped at this magnitude.' }
  }
  return { rung, title, figure: shown.figure, raw: shown.raw, grade: 'REPORTED', note }
}

function citiesInRegion(cities: readonly City[], region: string): number {
  let n = 0
  for (const city of cities) if (city.region === region) n += 1
  return n
}

function landsInContinent(lands: readonly Land[], continent: string): number {
  let n = 0
  for (const land of lands) if (land.continent === continent) n += 1
  return n
}

function continentCount(lands: readonly Land[]): number {
  const names = new Set<string>()
  for (const land of lands) if (land.continent.trim() !== '') names.add(land.continent)
  return names.size
}

export function integerKm(km: number): number | null {
  if (!Number.isFinite(km) || km < 0) return null
  return Math.round(km)
}

export function nearestNeighbours(
  cities: readonly City[],
  city: City,
  count: number,
): { name: string; km: number }[] {
  const rows: { name: string; km: number }[] = []
  for (const other of cities) {
    if (other.name === city.name && other.lat === city.lat && other.lon === city.lon) continue
    const km = integerKm(kmBetween(city.lat, city.lon, other.lat, other.lon))
    if (km == null) continue
    rows.push({ name: other.name, km })
  }
  rows.sort((a, b) => a.km - b.km || a.name.localeCompare(b.name))
  return rows.slice(0, count)
}

function integerFigure(n: number, locale: string): { figure: string; raw: string } | null {
  if (!Number.isInteger(n)) return null
  const raw = new Intl.NumberFormat(locale).format(n)
  if (Math.abs(n) >= 1_000_000_000) {
    const billions = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n / 1_000_000_000)
    return { figure: `${billions} billion`, raw }
  }
  return { figure: raw, raw }
}

function localCard(rung: Rung, city: City | null, cities: readonly City[], locale: string): ViewCard {
  const empty = {
    rung,
    title: 'Empty',
    figure: null,
    raw: null,
    grade: null,
    note: 'Nothing shipped at this magnitude.',
  }
  if (!city) return empty
  const neighbours = nearestNeighbours(cities, city, 3)
  if (neighbours.length === 0) {
    return {
      rung,
      title: city.name,
      figure: null,
      raw: null,
      grade: 'REPORTED',
      note: 'Natural Earth. No neighbour record.',
    }
  }
  const shown = integerFigure(neighbours[0].km, locale)
  const list = neighbours.map((row) => `${row.name} ${row.km} km`).join(', ')
  return {
    rung,
    title: city.name,
    figure: shown?.figure ?? null,
    raw: shown?.raw ?? null,
    grade: 'REPORTED',
    note: `Natural Earth. ${list}.`,
  }
}

export function cardFor(
  rung: Rung,
  hit: { city: City | null; land: Land | null },
  books: { cities: readonly City[]; lands: readonly Land[] },
  locale: string,
): ViewCard {
  const empty = (note: string): ViewCard => ({
    rung,
    title: 'Empty',
    figure: null,
    raw: null,
    grade: null,
    note,
  })
  const none = 'Nothing shipped at this magnitude.'
  const book = 'Natural Earth. Record count. Not a population.'
  if (rung === 'SOLAR' || rung === 'GALACTIC' || rung === 'COSMIC') return empty(none)
  if (rung === 'LOCAL') return localCard(rung, hit.city, books.cities, locale)
  if (rung === 'REGIONAL') {
    if (!hit.city || hit.city.region.trim() === '') return empty(none)
    return recordCard(rung, hit.city.region, citiesInRegion(books.cities, hit.city.region), locale, book)
  }
  if (rung === 'PLANETARY') return recordCard(rung, 'Countries', books.lands.length, locale, book)
  if (rung === 'MUNICIPAL') {
    if (!hit.city) return recordCard(rung, 'Cities', books.cities.length, locale, book)
    const shown = integerFigure(hit.city.pop, locale)
    if (!shown) return empty(none)
    return {
      rung,
      title: hit.city.name,
      figure: shown.figure,
      raw: shown.raw,
      grade: 'REPORTED',
      note: 'Natural Earth. Not a census.',
    }
  }
  if (rung === 'PROVINCIAL') {
    if (!hit.city || hit.city.region.trim() === '') return empty(none)
    return recordCard(rung, hit.city.region, citiesInRegion(books.cities, hit.city.region), locale, book)
  }
  if (rung === 'NATIONAL') {
    if (!hit.land) return recordCard(rung, 'Countries', books.lands.length, locale, book)
    const shown = integerFigure(hit.land.pop, locale)
    if (!shown) return empty(none)
    return {
      rung,
      title: hit.land.name,
      figure: shown.figure,
      raw: shown.raw,
      grade: 'REPORTED',
      note: 'Natural Earth. Not a census.',
    }
  }
  if (!hit.land || hit.land.continent.trim() === '') {
    return recordCard(rung, 'Continents', continentCount(books.lands), locale, book)
  }
  return recordCard(rung, hit.land.continent, landsInContinent(books.lands, hit.land.continent), locale, book)
}

export function viewFrom(
  cities: readonly City[],
  lands: readonly Land[],
  lat: number,
  lon: number,
): { city: City | null; province: City | null; land: Land | null } {
  return {
    city: nearestCity(cities, lat, lon, MUNICIPAL_KM),
    province: nearestCity(cities, lat, lon, PROVINCE_KM),
    land: landAt(lands, lat, lon),
  }
}

export function cardAt(
  rung: Rung,
  cities: readonly City[],
  lands: readonly Land[],
  lat: number | null,
  lon: number | null,
  locale: string,
): ViewCard {
  if (lat == null || lon == null) return cardFor(rung, { city: null, land: null }, { cities, lands }, locale)
  const hit = viewFrom(cities, lands, lat, lon)
  const city = rung === 'PROVINCIAL' ? hit.province : hit.city
  return cardFor(rung, { city, land: hit.land }, { cities, lands }, locale)
}
