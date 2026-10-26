/** Documents for Iris. White can be quoted. Dark is sealed on this device and is not read aloud.
 * This is not a claim of a perfect vault. The key is non-extractable and stays in this browser.
 * Nothing is sent. A private key is refused.
 */

export type Face = 'white' | 'dark'

export interface WhiteDoc { id: string; sha256: string; text: string; at: string; face: 'white' }
export interface DarkMeta { id: string; sha256: string; at: string; bytes: number; face: 'dark' }

const WHITE_KEY = 'dccpworld.ledger.white.v1'
const DARK_META = 'dccpworld.ledger.dark-meta.v1'
let memoryWhite: WhiteDoc[] = []
let memoryDark: DarkMeta[] = []

export function rejectDocument(text: string): string | null {
  const body = text.trim()
  if (body.length < 8) return 'That is too small to take in.'
  if (body.length > 8000) return 'That is too large for this device.'
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(body)) return 'A private key is refused. It does not belong in either ledger.'
  return null
}

export async function fingerprint(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text.trim()))
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

function readWhite(): WhiteDoc[] {
  try {
    const raw = localStorage.getItem(WHITE_KEY)
    if (raw) return JSON.parse(raw) as WhiteDoc[]
  } catch { /* private mode or node */ }
  return memoryWhite
}

function writeWhite(rows: WhiteDoc[]): void {
  memoryWhite = rows
  try { localStorage.setItem(WHITE_KEY, JSON.stringify(rows)) } catch { /* keep memory */ }
}

export function listWhite(): WhiteDoc[] {
  return readWhite()
}

export function listDark(): DarkMeta[] {
  try {
    const raw = localStorage.getItem(DARK_META)
    if (raw) return JSON.parse(raw) as DarkMeta[]
  } catch { /* fall through */ }
  return memoryDark
}

function writeDarkMeta(rows: DarkMeta[]): void {
  memoryDark = rows
  try { localStorage.setItem(DARK_META, JSON.stringify(rows)) } catch { /* keep memory */ }
}

export async function takeWhite(text: string): Promise<WhiteDoc | { error: string }> {
  const error = rejectDocument(text)
  if (error) return { error }
  const doc: WhiteDoc = { id: crypto.randomUUID(), sha256: await fingerprint(text), text: text.trim(), at: new Date().toISOString(), face: 'white' }
  writeWhite([doc, ...readWhite()].slice(0, 40))
  return doc
}

export function findWhite(query: string): WhiteDoc | null {
  const q = query.toLowerCase()
  return readWhite().find(doc => doc.text.toLowerCase().includes(q)) ?? null
}

function openDark(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('dccpworld-dark', 1)
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains('keys')) open.result.createObjectStore('keys')
      if (!open.result.objectStoreNames.contains('seals')) open.result.createObjectStore('seals')
    }
    open.onsuccess = () => resolve(open.result)
    open.onerror = () => reject(open.error ?? new Error('no-db'))
  })
}

async function sealKey(db: IDBDatabase): Promise<CryptoKey> {
  const existing = await new Promise<CryptoKey | undefined>((resolve, reject) => {
    const req = db.transaction('keys').objectStore('keys').get('seal')
    req.onsuccess = () => resolve(req.result as CryptoKey | undefined)
    req.onerror = () => reject(req.error)
  })
  if (existing) return existing
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
  await new Promise<void>((resolve, reject) => {
    const req = db.transaction('keys', 'readwrite').objectStore('keys').put(key, 'seal')
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
  return key
}

/** Dark text is encrypted and not returned. The caller only keeps the hash and the size. */
export async function takeDark(text: string): Promise<DarkMeta | { error: string }> {
  const error = rejectDocument(text)
  if (error) return { error }
  if (typeof indexedDB === 'undefined') return { error: 'This browser cannot seal a dark document. It was not stored.' }
  const body = text.trim()
  const db = await openDark()
  const key = await sealKey(db)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(body))
  const id = crypto.randomUUID()
  await new Promise<void>((resolve, reject) => {
    const req = db.transaction('seals', 'readwrite').objectStore('seals').put({ iv: [...iv], cipher: [...new Uint8Array(cipher)] }, id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
  const meta: DarkMeta = { id, sha256: await fingerprint(body), at: new Date().toISOString(), bytes: body.length, face: 'dark' }
  writeDarkMeta([meta, ...listDark()].slice(0, 40))
  return meta
}

/** True if a dark document's sealed text contains the query. The text itself is not returned. */
export async function darkHolds(query: string): Promise<boolean> {
  if (typeof indexedDB === 'undefined' || !query.trim()) return false
  const db = await openDark()
  const key = await new Promise<CryptoKey | undefined>((resolve, reject) => {
    const req = db.transaction('keys').objectStore('keys').get('seal')
    req.onsuccess = () => resolve(req.result as CryptoKey | undefined)
    req.onerror = () => reject(req.error)
  })
  if (!key) return false
  const rows = await new Promise<{ iv: number[]; cipher: number[] }[]>((resolve, reject) => {
    const req = db.transaction('seals').objectStore('seals').getAll()
    req.onsuccess = () => resolve((req.result ?? []) as { iv: number[]; cipher: number[] }[])
    req.onerror = () => reject(req.error)
  })
  const q = query.toLowerCase()
  for (const row of rows) {
    try {
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(row.iv) }, key, new Uint8Array(row.cipher))
      if (new TextDecoder().decode(plain).toLowerCase().includes(q)) return true
    } catch { /* a damaged seal is not a match */ }
  }
  return false
}
