/** In-memory mirror of the DCLM kernel receipt chain.
 * Read-only frames for a future 3D client. No jacket binding, no publish, no key material.
 */

export const LAW_ID = 'LAW-CID-MAPPING-DUALIS-2026-10-03-V1'
export const HISTORICAL_LANDER_CID = 'bafybeian5fkku2cu47iusk3iyt3piwbqms7ri4grkneqjyxtqlzoxag2uy'
export const CURRENT_CID = 'NOT YET PUBLISHED' as const

/** Digests as printed in the draft. They are not 64 hex chars, so they are not treated as verified fingerprints. */
export const DRAFT_FINGERPRINTS = {
  builderHtml: '1ada87decdd91c910795d668edc248e6d679195d7e850c1adbfb',
  generatedAppHtml: '51251356467a5288eb5cabf7f9fa19fb3b13e6419d69bbc',
} as const

export const CID_LAW = {
  documentId: LAW_ID,
  status: 'DRAFT' as const,
  principle: 'New update, new release identity, new CID. Never reuse or relabel a different release’s CID.',
  publicUrl: 'https://dualiscapax.ai/builder.html',
  deployment: 'https://dccpworld-oeyvhz3h.manus.game/',
  cid: CURRENT_CID,
  builderHtmlSha256: DRAFT_FINGERPRINTS.builderHtml,
  generatedAppHtmlSha256: DRAFT_FINGERPRINTS.generatedAppHtml,
  fingerprintNote: 'A SHA-256 fingerprint is not an IPFS CID. The draft text does not give a full 64-hex digest.',
  historicalLanderCid: HISTORICAL_LANDER_CID,
  historicalScope: 'Historical evidence only. Not the current builder and not this DCCP World.',
  jacketBinding: 'closed' as const,
  authorizedPublish: false,
}

const GENESIS_LABEL = `dccp-pipe|genesis|${LAW_ID}|jacket-closed`

export type RejectReason = 'gap' | 'conflict' | 'duplicate-body' | 'not-member' | 'jacket-closed' | 'private-key'

export interface Frame {
  readonly sequence: number
  readonly eventId: string
  readonly inputDigest: string
  readonly stateDigest: string
  readonly prevStateDigest: string
  readonly protocolVersion: 2
  readonly kind: string
}

export interface PipeView {
  member: boolean
  jacketBinding: 'closed'
  lawStatus: 'DRAFT'
  currentCid: typeof CURRENT_CID
  historicalLanderCid: string
  principle: string
  publicUrl: string
  deployment: string
  frames: Frame[]
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Deterministic canonical JSON: sorted keys at every level, no whitespace.
 * Lives here next to sha256Hex so the pipe modules share one canonical-bytes
 * implementation; ephemeral.ts re-exports it for existing importers. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']'
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return '{' + entries.map(([k, v]) => JSON.stringify(k) + ':' + canonicalJson(v)).join(',') + '}'
}

export function canonicalEvent(kind: string, body: unknown): string {
  return `${kind}|${JSON.stringify(body)}`
}

export function looksLikePrivateKey(value: string): boolean {
  const s = value.toLowerCase()
  return s.includes('private key') || s.includes('begin ') || s.includes('.pem') || s.includes('father.pem')
}

export function isUnityHandle(value: string): boolean {
  return /^unity:[a-z0-9._-]{8,128}$/i.test(value)
}

export interface Offer {
  sequence: number
  kind: string
  body: unknown
  prevStateDigest: string
}

export type OfferResult =
  | { ok: true; duplicate: boolean; frame: Frame }
  | { ok: false; reason: RejectReason }

export class ReceiptPipe {
  private member: string | null = null
  private seq = 0
  private state = ''
  private ready: Promise<void>
  private readonly seen = new Map<string, string>()
  private readonly log: Frame[] = []

  constructor() {
    this.ready = sha256Hex(GENESIS_LABEL).then(hex => { this.state = hex })
  }

  get seated(): string | null { return this.member }

  async genesis(): Promise<string> {
    await this.ready
    return this.state
  }

  /** Seat a Dualis Unity handle already on the device. Refuses PEM and private keys. */
  seat(handle: string | null): 'member' | 'guest' | 'private-key' {
    if (!handle) { this.member = null; return 'guest' }
    if (looksLikePrivateKey(handle)) { this.member = null; return 'private-key' }
    if (!isUnityHandle(handle)) { this.member = null; return 'guest' }
    this.member = handle
    return 'member'
  }

  frames(): readonly Frame[] {
    if (!this.member) return []
    return this.log.map(frame => ({ ...frame }))
  }

  head(): Frame | null {
    const frames = this.frames()
    return frames.length ? frames[frames.length - 1] : null
  }

  /** Admit one link. Identical event identity is suppressed. Gaps and forks are rejected. */
  async offer(offer: Offer): Promise<OfferResult> {
    await this.ready
    if (!this.member) return { ok: false, reason: 'not-member' }
    if (offer.kind === 'jacket' || offer.kind === 'bind') return { ok: false, reason: 'jacket-closed' }
    const canonical = canonicalEvent(offer.kind, offer.body)
    const eventId = await sha256Hex(canonical)
    const prior = this.seen.get(eventId)
    if (prior !== undefined) {
      if (prior !== canonical) return { ok: false, reason: 'conflict' }
      const frame = this.log.find(item => item.eventId === eventId)
      if (!frame) return { ok: false, reason: 'conflict' }
      return { ok: true, duplicate: true, frame: { ...frame } }
    }
    if (offer.sequence !== this.seq + 1) return { ok: false, reason: offer.sequence > this.seq + 1 ? 'gap' : 'conflict' }
    if (offer.prevStateDigest !== this.state) return { ok: false, reason: 'conflict' }
    const inputDigest = eventId
    const stateDigest = await sha256Hex(`${this.state}|${inputDigest}|${offer.sequence}`)
    const frame: Frame = {
      sequence: offer.sequence,
      eventId,
      inputDigest,
      stateDigest,
      prevStateDigest: this.state,
      protocolVersion: 2,
      kind: offer.kind,
    }
    this.seq = offer.sequence
    this.state = stateDigest
    this.seen.set(eventId, canonical)
    this.log.push(frame)
    return { ok: true, duplicate: false, frame: { ...frame } }
  }

  /** Record the CID mapping law once. A second call is the same event, not a new release. */
  async ensureLaw(): Promise<OfferResult> {
    await this.ready
    const existing = this.log.find(frame => frame.kind === 'cid-law')
    if (existing) {
      if (!this.member) return { ok: false, reason: 'not-member' }
      return { ok: true, duplicate: true, frame: { ...existing } }
    }
    return this.offer({ sequence: this.seq + 1, kind: 'cid-law', body: CID_LAW, prevStateDigest: this.state })
  }

  view(): PipeView {
    return {
      member: !!this.member,
      jacketBinding: 'closed',
      lawStatus: 'DRAFT',
      currentCid: CURRENT_CID,
      historicalLanderCid: HISTORICAL_LANDER_CID,
      principle: CID_LAW.principle,
      publicUrl: CID_LAW.publicUrl,
      deployment: CID_LAW.deployment,
      frames: [...this.frames()],
    }
  }

  /** The only object a future 3D client may hold. No bind, no publish, no append. */
  readOnlyStream(): {
    readonly schema: 'dccp.pipe.frames/1'
    readonly jacketBinding: 'closed'
    readonly publish: 'not-authorized'
    readonly lawStatus: 'DRAFT'
    readonly currentCid: typeof CURRENT_CID
    readonly historicalLanderCid: string
    frames: () => readonly Frame[]
    head: () => Frame | null
  } {
    return Object.freeze({
      schema: 'dccp.pipe.frames/1' as const,
      jacketBinding: 'closed' as const,
      publish: 'not-authorized' as const,
      lawStatus: 'DRAFT' as const,
      currentCid: CURRENT_CID,
      historicalLanderCid: HISTORICAL_LANDER_CID,
      frames: () => this.frames(),
      head: () => this.head(),
    })
  }
}
