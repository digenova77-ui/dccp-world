import type { IntegrityState, ModuleIntegrity, ModuleReceipt, ReceiptsDoc, Registry } from './types'

export const MODULES = ['doctrine', 'sectors', 'pharmacology', 'jurisdictions', 'canada', 'rtes', 'chambers', 'trinity-verdict', 'countries', 'cities', 'corporate-helpers'] as const

export async function sha256Hex(bytes: ArrayBuffer): Promise<string | undefined> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) return undefined // insecure context: integrity cannot be checked here
  const d = await subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('')
}

export function integrityOf(receipt: ModuleReceipt | undefined, clientSha256: string | undefined): IntegrityState {
  if (!receipt || !receipt.lockstep) return 'NOT-LOCKED'
  if (!clientSha256) return 'UNCHECKED'
  return clientSha256 === receipt.clientSha256 && receipt.payload.endsWith(`|${clientSha256}`) ? 'MATCH' : 'MISMATCH'
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

export interface LoadedRegistry { registry: Registry; integrity: ModuleIntegrity[]; receipts: ReceiptsDoc | null }

/** Loads every module, hashing the exact bytes first. A module that fails to load throws (world cannot start without data). */
export async function loadRegistry(base = './'): Promise<LoadedRegistry> {
  let receipts: ReceiptsDoc | null = null
  try {
    const r = await fetchWithTimeout(`${base}dclm-receipts.json`, 10_000)
    if (r.ok) receipts = (await r.json()) as ReceiptsDoc
  } catch { receipts = null }
  const parts: Record<string, unknown> = {}
  const integrity: ModuleIntegrity[] = []
  await Promise.all(MODULES.map(async m => {
    const res = await fetchWithTimeout(`${base}registry/${m}.json`, 15_000)
    if (!res.ok) throw new Error(`registry module ${m}: HTTP ${res.status}`)
    const buf = await res.arrayBuffer()
    const hash = await sha256Hex(buf)
    const receipt = receipts?.modules.find(x => x.module === m)
    integrity.push({ module: m, state: integrityOf(receipt, hash), clientSha256: hash, receipt })
    parts[m] = JSON.parse(new TextDecoder().decode(buf))
  }))
  integrity.sort((a, b) => MODULES.indexOf(a.module as never) - MODULES.indexOf(b.module as never))
  const registry = {
    doctrine: parts.doctrine, sectors: parts.sectors, pharmacology: parts.pharmacology, jurisdictions: parts.jurisdictions,
    canada: parts.canada, rtes: parts.rtes, chambers: parts.chambers, verdict: parts['trinity-verdict'], countries: parts.countries, cities: parts.cities,
    corporateHelpers: parts['corporate-helpers'],
  } as Registry
  return { registry, integrity, receipts }
}
