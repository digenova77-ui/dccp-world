export type Grade = 'AT BENCHMARK' | 'NEAR' | 'GAPPED' | 'THIN' | 'UNGRADED'
export interface SectorRow { jurisdiction: string; grade: Grade; fact: string }
export interface Sector { key: string; name: string; benchmark: string; scope: string; headline: string; researched: string; state: string; source: string; rows: SectorRow[]; counts: Record<string, number> }
export interface Jurisdiction { name: string; iso: string; lat: number; lon: number; grades: Record<string, { grade: Grade; fact: string }> }
export interface CanadaScope { key: string; name: string; lat: number; lon: number; systems: string; guard: string }
export interface Rte { key: string; name: string; job: string; status: string; kind: 'suite' | 'unity' | 'spec'; about: string; facts: string[] }
export interface Chamber { key: string; title: string; headline: string; status: string; summary: string[]; quotes: { text: string; who: string }[]; source: string; cards: number }
export interface Pharmacology { key: string; name: string; state: string; arc: string; estates: { name: string; note: string }[]; source: string }
export type Doctrine = Record<string, string>

/** DualisCapax Corporate Helpers research: sealed Trinity-reviewed improvement maps. All figures REPORTED research, never live telemetry. */
export interface CorporateHelperEntry {
  rank: number
  company: string
  verdict: string
  verdictStatus: string | null
  vectors: number | null
  total: number | null
  mean: number | null
  revenue: number | null
}
export interface CorporateHelpersDoc {
  schema: string
  generated: string
  note: string
  sealed: number
  entries: CorporateHelperEntry[]
  aggregate: { companiesWithScores: number; meanOfMeans: number; totalVectors: number }
}

export interface VerdictDecision { id: string; disposition: string; conditions: string[]; votes: Record<string, { vote: string; reason: string }> }
export interface Verdict { packet: string; decidedAt: string; decisions: VerdictDecision[]; reviews: { role: string; model: string }[] }

export interface Country { a3: string; name: string; continent: string; subregion: string; pop: number; popYear: number; gdpMd: number; gdpYear: number; label: [number, number]; bbox: [number, number, number, number]; rings: number[][] }
export interface CountriesDoc { countries: Country[]; simplified: string; source: string }
export interface City { name: string; a3: string; region: string; lat: number; lon: number; pop: number; capital: 0 | 1; kind: string }
export interface CitiesDoc { cities: City[]; source: string; note: string }
export interface Registry {
  doctrine: Doctrine
  sectors: Sector[]
  pharmacology: Pharmacology
  jurisdictions: Jurisdiction[]
  canada: CanadaScope[]
  rtes: Rte[]
  chambers: Chamber[]
  verdict: Verdict
  countries: CountriesDoc
  cities: CitiesDoc
  corporateHelpers: CorporateHelpersDoc
}

export interface ReceiptField { accepted?: boolean; sequence?: number; inputDigest?: string; stateDigest?: string; protocolVersion?: string }
export interface ModuleReceipt { module: string; file: string; bytes: number; clientSha256: string; payload: string; receipts: ReceiptField[]; lockstep: boolean }
export interface ReceiptsDoc { schema: string; createdAt: string; kernelEndpoint: string; kernelProvenance: { artifactSha256?: string }; modules: ModuleReceipt[] }

/** Client-side integrity status for one module: never a seal or approval. */
export type IntegrityState = 'MATCH' | 'MISMATCH' | 'UNCHECKED' | 'NOT-LOCKED'
export interface ModuleIntegrity { module: string; state: IntegrityState; clientSha256?: string; receipt?: ModuleReceipt }
