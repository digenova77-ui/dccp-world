// Pilot Unity handle (Trinity P17, with conditions). Not an issuance by the Unity Network.
// handle = "unity:pilot." + first 32 hex of SHA-256(SPKI public key). Stored only on this device.
const KEY = 'dccpworld.unity-pilot.v1'

export interface PilotHandle { handle: string; credentialId: string; createdAt: string; rpId: string }

export function storedHandle(): PilotHandle | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as PilotHandle) : null
  } catch {
    return null
  }
}

export function forgetHandle(): void {
  try { localStorage.removeItem(KEY) } catch { /* storage unavailable */ }
}

export async function handleFromPublicKey(spki: ArrayBuffer): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', spki)
  const hex = [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('')
  return `unity:pilot.${hex.slice(0, 32)}`
}

const b64url = (buf: ArrayBuffer): string => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

export type CreateResult = { ok: true; handle: PilotHandle } | { ok: false; reason: 'unsupported' | 'insecure' | 'framed' | 'cancelled' | 'no-public-key' | 'failed' }

export async function createPilotHandle(): Promise<CreateResult> {
  if (!window.isSecureContext || !crypto?.subtle) return { ok: false, reason: 'insecure' }
  if (!('credentials' in navigator) || typeof PublicKeyCredential === 'undefined') return { ok: false, reason: 'unsupported' }
  const rpId = location.hostname
  try {
    const cred = (await navigator.credentials.create({
      publicKey: {
        rp: { name: 'DCCP World (pilot)', id: rpId },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'unity-pilot', displayName: 'Unity pilot handle' },
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
        attestation: 'none',
        timeout: 90_000,
      },
    })) as PublicKeyCredential | null
    if (!cred) return { ok: false, reason: 'cancelled' }
    const resp = cred.response as AuthenticatorAttestationResponse & { getPublicKey?: () => ArrayBuffer | null }
    const spki = resp.getPublicKey?.()
    if (!spki) return { ok: false, reason: 'no-public-key' }
    const handle: PilotHandle = { handle: await handleFromPublicKey(spki), credentialId: b64url(cred.rawId), createdAt: new Date().toISOString(), rpId }
    try { localStorage.setItem(KEY, JSON.stringify(handle)) } catch { /* still return it for this session */ }
    return { ok: true, handle }
  } catch (err) {
    const name = err instanceof DOMException ? err.name : ''
    if (name === 'NotAllowedError' || name === 'AbortError') return { ok: false, reason: window.top !== window.self ? 'framed' : 'cancelled' }
    if (name === 'SecurityError') return { ok: false, reason: window.top !== window.self ? 'framed' : 'insecure' }
    if (name === 'NotSupportedError') return { ok: false, reason: 'unsupported' }
    return { ok: false, reason: 'failed' }
  }
}

export const FAILURE_SPEECH: Record<Exclude<CreateResult, { ok: true }>['reason'], string> = {
  unsupported: 'This device or browser does not support passkeys. You can keep exploring as a guest; nothing is faked.',
  insecure: 'Passkeys need a secure page. You can keep exploring as a guest.',
  framed: 'The passkey prompt is blocked inside this embedded preview. Open the world in its own tab and ask me again.',
  cancelled: 'The passkey was not created. Nothing was saved.',
  'no-public-key': 'Your authenticator did not share a public key, so I cannot derive a handle. Nothing was saved.',
  failed: 'Something went wrong creating the passkey. Nothing was saved.',
}
