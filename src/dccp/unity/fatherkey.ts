/** Prove the private half was used, without it ever arriving.
 * The public half on record is Ed25519. The visitor signs a challenge offline.
 * A match is custody of that key. It is not a Trinity pass and not the father's seat.
 */

export const FATHER_PUBLIC_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA6rXkUEaqE6WqMU+Is87+XhQbMRlAFD7vza0unCWD4YY=
-----END PUBLIC KEY-----
`

export interface KeyCheck {
  ok: boolean
  passedAsFather: false
  reason: string
}

export function newChallenge(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')
  return `dccpworld.father-key.v1\n${hex}`
}

function canonicalPublic(pem: string): string {
  return pem.replace(/-----BEGIN PUBLIC KEY-----/g, '').replace(/-----END PUBLIC KEY-----/g, '').replace(/\s/g, '')
}

export function samePublic(pem: string): boolean {
  return canonicalPublic(pem) === canonicalPublic(FATHER_PUBLIC_PEM)
}

function decodePem(pem: string): Uint8Array | { error: string } {
  if (/PRIVATE KEY/.test(pem)) return { error: 'A private key is refused. Paste only the public half.' }
  const body = canonicalPublic(pem)
  if (!body) return { error: 'Paste the public half, or leave it blank to use the one on record.' }
  try {
    const bin = atob(body)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes
  } catch {
    return { error: 'That public key could not be read.' }
  }
}

function bytesOf(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function decodeSig(signatureB64: string): Uint8Array | null {
  try {
    const bin = atob(signatureB64.replace(/\s/g, ''))
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

/** Ed25519. OpenSSL: `pkeyutl -sign -rawin`. The signature is 64 bytes. */
export async function verifyPublicSignature(publicPem: string, challenge: string, signatureB64: string): Promise<KeyCheck> {
  const pasted = publicPem.trim()
  if (/PRIVATE KEY/.test(pasted)) return { ok: false, passedAsFather: false, reason: 'A private key is refused. Paste only the public half.' }
  if (pasted && !samePublic(pasted)) return { ok: false, passedAsFather: false, reason: 'That is not the public half on record.' }
  const spki = decodePem(FATHER_PUBLIC_PEM)
  if ('error' in spki) return { ok: false, passedAsFather: false, reason: spki.error }
  const sig = decodeSig(signatureB64)
  if (!sig || sig.length !== 64) return { ok: false, passedAsFather: false, reason: 'That signature is not a 64-byte Ed25519 signature.' }
  try {
    const key = await crypto.subtle.importKey('spki', bytesOf(spki), { name: 'Ed25519' }, false, ['verify'])
    const ok = await crypto.subtle.verify({ name: 'Ed25519' }, key, bytesOf(sig), new TextEncoder().encode(challenge))
    return ok
      ? { ok: true, passedAsFather: false, reason: 'The public half on record signed this challenge. Symbolically that key comes from the father. The private key stayed offline. This does not make you him.' }
      : { ok: false, passedAsFather: false, reason: 'The signature does not match this challenge and the public half on record.' }
  } catch {
    return { ok: false, passedAsFather: false, reason: 'The public half on record could not be checked.' }
  }
}
