import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import '@/dccp/styles/machine.css'
import { transmitBoxToDCLM, type DropReason } from '@/dccp/pipe/connector'
import { mintManifest } from '@/dccp/pipe/ephemeral'
import {
  bindEndpointToUrl,
  parseFatherPublicKey,
  fatherKeyFingerprint,
  walletPublicRaw,
  bytesToBase64,
  prepareFatherBind,
  readBindLedger,
  verifyBindLedger,
  type BindEndpoint,
  type FatherBindReceipt,
  type BindLedgerEntry,
  type WalletAlg,
} from '@/dccp/pipe/fatherBind'
import { sharedDaemon, type CarryDaemon, type OutboxEntry } from '@/dccp/pipe/daemon'
import { FusionStatusPanel } from './fusion-status'
import { notifyFusionChanged } from '@/dccp/pipe/fusionStatus'
import { storedHandle } from '@/dccp/unity/unityid'
import { ensureGenesisAttestation, genesisMarkCopy, genesisStatus } from '@/dccp/unity/genesis'
import { gateBindVerdictClaim, isGatePass } from '@/dccp/iris/gates'

export const Route = createFileRoute('/machine')({
  component: Machine,
  head: () => ({ meta: [{ title: 'DCLM Machine Interface' }] }),
})

const LAW = ['NO_FORCE', 'HOST_SAFE', 'CLEANUP_FIRST', 'TRUTH_OR_NOTHING']

const DECLARATION = {
  protocol: 'DCLM-MACHINE/2',
  status: 'DECLARED_NOT_VERIFIED',
  transport: 'HTTPS POST',
  endpoints: {
    protocol: 'GET /v2/protocol',
    ingest: 'POST /v2/dclm/ingest',
    legacy_compute: 'POST /api/v2/compute (compatibility target)',
  },
  limits: { public_compute_payload_utf8_bytes: 256, current_ingress_body_bytes: 65536 },
  flags: 0,
  determinism: true,
  write_authority: false,
  auth: {
    agency_signature: 'ECDSA-P256 or hardware/passkey-backed signer',
    private_key_custody: 'agency_only',
    verifier: 'NOT_DEPLOYED',
  },
  receipts: ['status', 'input_digest', 'state_digest', 'artifact', 'compatibility'],
  law: LAW,
}

type Verdict = 'SEE' | 'HOLE' | 'WAIT_GRANT'
interface ReceiptView {
  verdict: Verdict
  body: unknown
}

interface KeyRow {
  id: string
  alg: string
  fingerprint: string
  createdAt: number
  status: 'ACTIVE' | 'REVOKED'
  revokedAt?: number
}

const DB = 'dclm-agency-keyring'
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 2)
    r.onupgradeneeded = () => {
      const db = r.result
      if (!db.objectStoreNames.contains('keys')) db.createObjectStore('keys', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('father')) db.createObjectStore('father', { keyPath: 'id' })
    }
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}
function txStore<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    db =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode)
        const req = fn(t.objectStore(store))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
        t.oncomplete = () => db.close()
      }),
  )
}
function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return txStore('keys', mode, fn)
}

const DROP_WHY: Record<DropReason, string> = {
  DISABLED: 'transmission is disabled',
  NO_ENDPOINT: 'no ingress endpoint is set',
  OVERSIZE: 'envelope exceeds the 256-byte public ABI — it was not sent',
  NETWORK: 'DCLM ingress unreachable or blocked by browser policy',
  HTTP: 'the ingress answered with a non-JSON transport error',
  MALFORMED: 'the ingress answered, but not with a machine receipt',
  REJECTED: 'the ingress refused the box',
}

function Machine() {
  // Kernel endpoint, split into protocol + host + port + path and persisted in
  // this browser. Default stays this origin's /api/v2 (honest HOLE when unmounted).
  const [ep, setEp] = useState<BindEndpoint>({ protocol: 'https', host: '', port: '', path: '/api/v2' })
  const epReady = useRef(false)
  useEffect(() => {
    let next: BindEndpoint | null = null
    try {
      const raw = localStorage.getItem('dclm-bind-endpoint.v1')
      if (raw) {
        const p = JSON.parse(raw)
        if (p && (p.protocol === 'https' || p.protocol === 'http') && typeof p.host === 'string') {
          next = { protocol: p.protocol, host: p.host, port: String(p.port ?? ''), path: String(p.path ?? '/api/v2') }
        }
      }
    } catch {
      next = null
    }
    if (!next) {
      const proto = window.location.protocol.replace(':', '')
      next = {
        protocol: proto === 'http' ? 'http' : 'https',
        host: window.location.hostname,
        port: window.location.port,
        path: '/api/v2',
      }
    }
    setEp(next)
    epReady.current = true
  }, [])
  useEffect(() => {
    if (epReady.current) {
      try {
        localStorage.setItem('dclm-bind-endpoint.v1', JSON.stringify(ep))
      } catch {
        // Storage unavailable: the endpoint still works for this session.
      }
      // Let compact fusion-status surfaces (HUD pill) re-read without polling.
      notifyFusionChanged()
    }
  }, [ep])
  const endpoint = bindEndpointToUrl(ep)
  const [receipt, setReceipt] = useState<ReceiptView>({
    verdict: 'WAIT_GRANT',
    body: { verdict: 'WAIT_GRANT', authority: 'NONE', next: 'Ready for a read-only envelope.' },
  })
  const [dot, setDot] = useState<'live' | 'hole' | ''>('')
  const [declaration, setDeclaration] = useState(() => JSON.stringify(DECLARATION, null, 2))
  const [keys, setKeys] = useState<KeyRow[] | null>(null)
  const [keyError, setKeyError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const claimRef = useRef<HTMLTextAreaElement>(null)
  const fetchRef = useRef<HTMLTextAreaElement>(null)
  const selectedKey = useRef<string | null>(null)

  const show = (verdict: Verdict, body: unknown) => {
    setReceipt({ verdict, body })
    setDot(verdict === 'SEE' ? 'live' : verdict === 'HOLE' ? 'hole' : '')
  }

  const refreshKeys = async () => {
    try {
      const rows = await tx<any[]>('readonly', s => s.getAll())
      setKeys(
        rows.map(k => ({
          id: k.id,
          alg: k.alg ?? 'P-256',
          fingerprint: k.fingerprint,
          createdAt: k.createdAt,
          status: k.status,
          revokedAt: k.revokedAt,
        })),
      )
      setKeyError(null)
    } catch (e) {
      setKeyError('HOLE · browser key storage unavailable: ' + (e as Error).message)
    }
  }
  useEffect(() => {
    void refreshKeys()
  }, [])

  /** Live byte count of the compact box, so the 256-byte public ABI is visible before sending. */
  const [boxBytes, setBoxBytes] = useState(0)
  const measureBox = () => {
    const box = JSON.stringify({
      kind: 'dual-pipeline',
      v: '2',
      claim: claimRef.current?.value.trim() ?? '',
      fetch: fetchRef.current?.value.trim() ?? '',
    })
    setBoxBytes(new TextEncoder().encode(box).length)
  }
  useEffect(() => {
    measureBox()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** PIPE TO DCLM — the one transmission path. Everything goes through the internal connector.
   * The box is the compact dual-pipeline envelope; the 256-byte public ABI is enforced by the
   * connector itself, and the byte counter under the textareas keeps the author inside it honestly. */
  const runPipe = async () => {
    const claim = claimRef.current?.value.trim() ?? ''
    const fetchPlan = fetchRef.current?.value.trim() ?? ''
    if (!claim || !fetchPlan) {
      show('HOLE', { verdict: 'HOLE', authority: 'NONE', why: 'claim and fetch plan are required' })
      return
    }
    setBusy(true)
    try {
      // The recurring-fusion binding: the box is the serialized envelope, nothing ad-hoc.
      const box = JSON.stringify({ kind: 'dual-pipeline', v: '2', claim, fetch: fetchPlan })
      const result = await transmitBoxToDCLM(box, { enabled: true, endpoint })
      if (result.state === 'COMMITTED') {
        show('SEE', {
          verdict: 'SEE',
          authority: 'NONE',
          via: 'internal connector → ' + endpoint.replace(/\/$/, '') + '/compute',
          box_bytes: new TextEncoder().encode(box).length,
          receipt: result.receipt,
        })
      } else {
        const why =
          result.reason === 'REJECTED' && result.detail === 'KERNEL_UNAVAILABLE'
            ? 'KERNEL_UNAVAILABLE — the router answered; no kernel is mounted. Nothing was executed.'
            : DROP_WHY[result.reason] + (result.detail ? ` (${result.detail})` : '')
        show('HOLE', {
          verdict: 'HOLE',
          authority: 'NONE',
          why,
          via: 'internal connector → ' + (endpoint || '(no endpoint)') + '/compute',
        })
      }
    } finally {
      setBusy(false)
    }
  }

  const probe = async () => {
    try {
      const r = await fetch(endpoint.replace(/\/$/, '') + '/health')
      const body = await r.json()
      show(body?.verdict === 'SEE' ? 'SEE' : 'HOLE', body)
    } catch (e) {
      show('HOLE', { verdict: 'HOLE', authority: 'NONE', why: 'DCLM origin unreachable', detail: (e as Error).message })
    }
  }

  const fetchProtocol = async () => {
    try {
      const r = await fetch(endpoint.replace(/\/$/, '') + '/v2/protocol')
      setDeclaration(JSON.stringify(await r.json(), null, 2))
    } catch (e) {
      show('HOLE', { verdict: 'HOLE', authority: 'NONE', why: 'protocol declaration unavailable', detail: (e as Error).message })
    }
  }

  const copyDeclaration = async () => {
    await navigator.clipboard?.writeText(declaration)
  }

  const loadDemo = () => {
    if (claimRef.current) claimRef.current.value = 'Inspect the current DCLM ingress and return its measurable health.'
    if (fetchRef.current) fetchRef.current.value = 'GET /health, GET /v2/protocol, and return the exact receipt or HOLE reason.'
    show('WAIT_GRANT', { verdict: 'WAIT_GRANT', authority: 'NONE', next: 'Envelope ready.' })
  }
  const clearAll = () => {
    if (claimRef.current) claimRef.current.value = ''
    if (fetchRef.current) fetchRef.current.value = ''
    show('WAIT_GRANT', { verdict: 'WAIT_GRANT', authority: 'NONE', next: 'Claim and fetch are empty.' })
  }

  const createKey = async (alg: 'P-256' | 'Ed25519' = 'P-256') => {
    try {
      const pair =
        alg === 'Ed25519'
          ? await crypto.subtle.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify'])
          : await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify'])
      const pub = await crypto.subtle.exportKey('jwk', pair.publicKey)
      const publicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(pub)))
      const fingerprint =
        'sha256:' +
        [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 24)
      const record = {
        id: 'agency-' + crypto.randomUUID().slice(0, 8),
        alg,
        fingerprint,
        createdAt: Date.now(),
        status: 'ACTIVE',
        publicJwk: pub,
        publicRaw: publicRaw.buffer,
        privateKey: pair.privateKey,
      }
      await tx('readwrite', s => s.add(record))
      await refreshKeys()
    } catch (e) {
      setKeyError('HOLE · key generation/storage failed: ' + (e as Error).message)
    }
  }

  const revokeKey = async () => {
    const id = selectedKey.current
    if (!id) {
      setKeyError('Select an active key first.')
      return
    }
    const rec: any = await tx('readonly', s => s.get(id))
    rec.status = 'REVOKED'
    rec.revokedAt = Date.now()
    await tx('readwrite', s => s.put(rec))
    selectedKey.current = null
    await refreshKeys()
  }

  /** Recurring-fusion session binding: the wallet presents itself to DCLM through the
   * internal connector. The machine only observes — the box carries authority NONE,
   * the Law Floor rides on every binding, and no receipt is ever invented. Re-runnable:
   * each session re-binds, each binding is its own fusion. */
  interface BindView {
    verdict: 'SEE' | 'HOLE' | 'QUEUED'
    keyId: string
    fingerprint: string
    at: string
    detail: string
    /** The locally minted TASK_BIND for this binding task. PILOT · LOCAL: the device
     *  minted it, no kernel granted anything — it carries zero standing authority. */
    manifestHash?: string
    manifestState?: 'LIVE' | 'CONSUMED'
    /** Trinity design verdict on the binding task's design, if any. */
    designVerdict?: string
  }
  const [binding, setBinding] = useState<BindView | null>(null)
  const [bindBusy, setBindBusy] = useState(false)
  /** The pilot Unity handle bound on this device (WebAuthn gate in the 3D world).
   * Read fresh at mint time; this state is only the visible status line. */
  const [pilotHandle, setPilotHandle] = useState<string | null>(null)
  /** The Genesis mark copy for the bound handle — calm, dignified, never hypey.
   * Null when unbound or when the ID was bound after the Father fuse. */
  const [genesisCopy, setGenesisCopy] = useState<string | null>(null)
  useEffect(() => {
    const h = storedHandle()
    setPilotHandle(h?.handle ?? null)
    if (h) {
      // The ID stands in the genesis record. Idempotent — one ID, one entry.
      void ensureGenesisAttestation(h.handle, h.createdAt)
        .catch(() => {})
        .finally(() => setGenesisCopy(genesisMarkCopy(genesisStatus(h.handle, h.createdAt))))
    } else {
      setGenesisCopy(null)
    }
  }, [])
  const bindWallet = async () => {
    const id = selectedKey.current
    if (!id) {
      setBinding({
        verdict: 'HOLE', keyId: '—', fingerprint: '—', at: new Date().toISOString(),
        detail: 'HOLE · select an active agency key first. Nothing was transmitted.',
      })
      return
    }
    const rec: any = await tx('readonly', s => s.get(id))
    if (!rec || rec.status !== 'ACTIVE') {
      setBinding({
        verdict: 'HOLE', keyId: id, fingerprint: '—', at: new Date().toISOString(),
        detail: 'HOLE · key is not ACTIVE. Revoked keys cannot bind. Nothing was transmitted.',
      })
      return
    }
    setBindBusy(true)
    try {
      const at = new Date().toISOString()
      // The pilot Unity handle, read fresh at mint time. No placeholder: without
      // a bound handle the manifest is never minted and nothing is transmitted.
      const handle = storedHandle()?.handle ?? null
      setPilotHandle(handle)
      if (!handle) {
        setBinding({
          verdict: 'HOLE', keyId: rec.id, fingerprint: rec.fingerprint, at,
          detail: 'UNBOUND · no pilot Unity handle is bound on this device. Open the 3D world gate and bind your passkey first. Nothing was minted, nothing transmitted.',
        })
        return
      }
      // Ephemeral capability: this binding task gets one single-use TASK_BIND,
      // minted locally (PILOT · LOCAL). It carries no kernel authority. The
      // signed envelope is handed to the carry daemon, which delivers it
      // through the internal connector — the ONLY transmission path. The
      // receipt (or the kernel's rejection) consumes the binding; a HOLE
      // never does: expires on receipt, so the daemon may carry it again.
      const manifest = await mintManifest({
        unity_id: handle,
        input: { key_id: rec.id, fingerprint: rec.fingerprint, at },
        change_kind: 'trivial-local',
      })
      // The Law Floor is visible on every binding: no force, host safe, cleanup first, truth or nothing.
      const box = JSON.stringify({
        kind: 'wallet-bind', v: '2', authority: 'NONE', law: LAW,
        key_id: rec.id, fingerprint: rec.fingerprint, at,
      })
      const daemon = daemonRef.current ?? sharedDaemon()
      daemonRef.current = daemon
      const manifestHash = manifest.manifest_hash
      const designVerdict = manifest.design_verdict
      await daemon.enqueue({
        manifest_hash: manifestHash,
        kind: 'wallet-bind',
        envelope: box,
        endpoint: ep,
        unity_id: handle,
      })
      // Follow this bind's journey through the daemon. No receipt is ever
      // invented: QUEUED is shown honestly until the kernel answers.
      walletUnsubRef.current?.()
      walletUnsubRef.current = daemon.onEvent(e => {
        if (e.entry.manifest_hash !== manifestHash) return
        if (e.type === 'delivered') {
          // Iris gate: SEE only with a kernel answer in hand. The daemon
          // delivered, so the kernel answered with an acceptance — the gate
          // re-asserts it here so the UI can never show SEE on hope.
          const g = gateBindVerdictClaim('SEE', { kernelAnswered: true, acceptedPayload: e.entry.receipt })
          if (!isGatePass(g)) {
            setBinding({
              verdict: 'HOLE', keyId: rec.id, fingerprint: rec.fingerprint, at,
              detail: 'HOLE · ' + g.reason + ' The gate refused the SEE — nothing was granted, nothing was faked.',
              manifestHash, manifestState: 'CONSUMED', designVerdict,
            })
          } else {
            setBinding({
              verdict: 'SEE', keyId: rec.id, fingerprint: rec.fingerprint, at,
              detail: 'SEE · DCLM observed the binding — the daemon carried it and the kernel answered. Authority: NONE — observation only, nothing granted.',
              manifestHash, manifestState: 'CONSUMED', designVerdict,
            })
          }
        } else if (e.type === 'rejected' || e.type === 'dead') {
          setBinding({
            verdict: 'HOLE', keyId: rec.id, fingerprint: rec.fingerprint, at,
            detail: 'HOLE · ' + (e.entry.last_error ?? 'the bind was rejected') + ' Nothing was granted; nothing was faked.',
            manifestHash, manifestState: 'CONSUMED', designVerdict,
          })
        } else {
          setBinding({
            verdict: 'QUEUED', keyId: rec.id, fingerprint: rec.fingerprint, at,
            detail: 'QUEUED · the daemon carries this bind — ' + (e.entry.last_error ?? 'endpoint unreachable; it will deliver when your machine answers.') + ' This is not a receipt: nothing was granted, nothing was faked.',
            manifestHash, manifestState: 'LIVE', designVerdict,
          })
        }
      })
      setBinding({
        verdict: 'QUEUED', keyId: rec.id, fingerprint: rec.fingerprint, at,
        detail: 'QUEUED · handed to the carry daemon — delivering through the internal connector now.',
        manifestHash, manifestState: 'LIVE', designVerdict,
      })
      void daemon.pump()
    } finally {
      setBindBusy(false)
    }
  }

  /* ---- Father key pinning + Father bind (dualis.bind.v1) ----
   * The Father PUBLIC key is pinned client-side (IndexedDB, never transmitted).
   * The .pem never leaves David's machine. The bind mints a TASK_BIND, signs the
   * canonical manifest bytes with the selected Ed25519 wallet key, and POSTs to
   * {endpoint}/bind. Only a real father_signature verified against the pinned
   * key seals — everything else is REJECTED or an honest HOLE. */
  const [fatherPin, setFatherPin] = useState<{ fingerprint: string; pinnedAt: number } | null>(null)
  const [fatherKeyInput, setFatherKeyInput] = useState('')
  const [fatherPinError, setFatherPinError] = useState<string | null>(null)
  const [bindLedger, setBindLedger] = useState<BindLedgerEntry[]>([])
  const [ledgerOk, setLedgerOk] = useState<boolean | null>(null)

  /** The carry daemon (dualis.daemon.v1): every bind is handed to it, and it
   * carries the signed bytes through the internal connector to David's
   * machine. A receipt exists only when the machine answers. */
  const daemonRef = useRef<CarryDaemon | null>(null)
  const [outbox, setOutbox] = useState<OutboxEntry[]>([])
  const walletUnsubRef = useRef<(() => void) | null>(null)
  const fatherUnsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const daemon = sharedDaemon()
    daemonRef.current = daemon
    daemon.start()
    const refresh = () => {
      void daemon.list().then(setOutbox).catch(() => {})
    }
    const off = daemon.onEvent(() => refresh())
    void refresh()
    return () => {
      off()
    }
  }, [])

  /** The daemon's journey for one bind, as the wallet panel shows it. */
  type FatherCarryView =
    | { phase: 'IDLE' }
    | { phase: 'QUEUED'; manifestHash: string; detail: string }
    | { phase: 'SEALED'; receipt: FatherBindReceipt; manifestHash: string; ledgerEntry: BindLedgerEntry | null }
    | { phase: 'REJECTED'; detail: string; manifestHash?: string }
  const [fatherCarry, setFatherCarry] = useState<FatherCarryView>({ phase: 'IDLE' })
  const [fatherBindBusy, setFatherBindBusy] = useState(false)

  const loadFatherPin = async () => {
    try {
      const rec: any = await txStore('father', 'readonly', s => s.get('father'))
      setFatherPin(rec ? { fingerprint: rec.fingerprint, pinnedAt: rec.pinnedAt } : null)
      setFatherPinError(null)
    } catch (e) {
      setFatherPinError('HOLE · pinned-key storage unavailable: ' + (e as Error).message)
    }
  }

  const refreshLedger = async () => {
    setBindLedger(readBindLedger().slice(-5).reverse())
    try {
      setLedgerOk((await verifyBindLedger()).ok)
    } catch {
      setLedgerOk(false)
    }
  }

  useEffect(() => {
    void loadFatherPin()
    void refreshLedger()
  }, [])

  const pinFatherKey = async () => {
    try {
      const raw = parseFatherPublicKey(fatherKeyInput)
      const fingerprint = await fatherKeyFingerprint(raw)
      await txStore('father', 'readwrite', s =>
        s.put({ id: 'father', raw: raw.buffer, fingerprint, pinnedAt: Date.now() }),
      )
      setFatherKeyInput('')
      setFatherPinError(null)
      await loadFatherPin()
      notifyFusionChanged()
    } catch (e) {
      setFatherPinError((e as Error).message)
    }
  }

  const unpinFatherKey = async () => {
    await txStore('father', 'readwrite', s => s.delete('father'))
    await loadFatherPin()
    notifyFusionChanged()
  }

  const doFatherBind = async () => {
    const id = selectedKey.current
    if (!id) {
      setFatherCarry({
        phase: 'REJECTED',
        detail: 'REJECTED · NO_SELECTED_KEY — select an active Ed25519 agency key first. Nothing was minted, nothing transmitted.',
      })
      return
    }
    setFatherBindBusy(true)
    try {
      const rec: any = await tx('readonly', s => s.get(id))
      if (!rec || rec.status !== 'ACTIVE') {
        setFatherCarry({
          phase: 'REJECTED',
          detail: 'REJECTED · KEY_NOT_ACTIVE — the selected key is not ACTIVE. Revoked keys cannot bind. Nothing was transmitted.',
        })
        return
      }
      const pinned: any = await txStore('father', 'readonly', s => s.get('father'))
      if (!pinned) {
        setFatherCarry({
          phase: 'REJECTED',
          detail:
            'REJECTED · NO_PINNED_KEY — no Father public key is pinned. Pin it first; nothing was minted, nothing transmitted.',
        })
        return
      }
      let publicRaw: Uint8Array
      try {
        publicRaw = walletPublicRaw(rec)
      } catch (e) {
        setFatherCarry({ phase: 'REJECTED', detail: 'REJECTED · ' + (e as Error).message })
        return
      }
      // The pilot Unity handle, read fresh at mint time. No placeholder: without
      // a bound handle the bind never mints and nothing is transmitted.
      const handle = storedHandle()?.handle ?? null
      setPilotHandle(handle)
      if (!handle) {
        setFatherCarry({
          phase: 'REJECTED',
          detail:
            'REJECTED · NO_UNITY_HANDLE — no pilot Unity handle is bound on this device. Open the 3D world gate and bind your passkey first. Nothing was minted, nothing transmitted.',
        })
        return
      }
      // Prepare the bind: mint + sign. No network yet — the signed envelope is
      // handed to the carry daemon, which delivers it through the internal
      // connector (the ONLY transmission path). The daemon never sees private
      // keys and never sees the Father .pem — only these signed bytes.
      const prepared = await prepareFatherBind({
        unityId: handle,
        wallet: {
          id: rec.id,
          fingerprint: rec.fingerprint,
          alg: (rec.alg ?? 'P-256') as WalletAlg,
          privateKey: rec.privateKey as CryptoKey,
          publicRaw,
        },
        pinnedFather: { raw: new Uint8Array(pinned.raw), fingerprint: pinned.fingerprint },
        endpoint: ep,
      })
      if (!prepared.ok) {
        setFatherCarry({ phase: 'REJECTED', detail: prepared.rejected.detail })
        return
      }
      const manifestHash = prepared.prepared.manifestHash
      const daemon = daemonRef.current ?? sharedDaemon()
      daemonRef.current = daemon
      await daemon.enqueue({
        manifest_hash: manifestHash,
        kind: 'father-bind',
        envelope: JSON.stringify(prepared.prepared.envelope),
        endpoint: ep,
        unity_id: handle,
        father_pubkey_b64: bytesToBase64(new Uint8Array(pinned.raw)),
        father_fingerprint: pinned.fingerprint,
      })
      // Follow this bind's journey. SEALED only when the kernel countersigns
      // with a father_signature that verifies against the PINNED key.
      fatherUnsubRef.current?.()
      fatherUnsubRef.current = daemon.onEvent(e => {
        if (e.entry.manifest_hash !== manifestHash) return
        if (e.type === 'delivered') {
          const entries = readBindLedger()
          const ledgerEntry = entries.find(en => en.manifest_hash === manifestHash) ?? null
          setFatherCarry({
            phase: 'SEALED',
            receipt: e.entry.receipt as FatherBindReceipt,
            manifestHash,
            ledgerEntry,
          })
          void refreshLedger()
        } else if (e.type === 'rejected' || e.type === 'dead') {
          setFatherCarry({
            phase: 'REJECTED',
            detail: e.entry.last_error ?? 'the bind was rejected',
            manifestHash,
          })
        } else {
          setFatherCarry({
            phase: 'QUEUED',
            manifestHash,
            detail:
              'QUEUED · the daemon carries this bind — ' +
              (e.entry.last_error ?? 'endpoint unreachable; it will deliver when your machine answers.') +
              ' This is not a receipt: nothing was granted, nothing was faked.',
          })
        }
      })
      setFatherCarry({
        phase: 'QUEUED',
        manifestHash,
        detail: 'QUEUED · handed to the carry daemon — delivering through the internal connector now.',
      })
      void daemon.pump()
    } finally {
      setFatherBindBusy(false)
    }
  }

  const verdictClass = receipt.verdict === 'SEE' ? 'see' : receipt.verdict === 'HOLE' ? 'hole' : 'wait'

  return (
    <div className="m2d">
      <main>
        <header className="top">
          <div>
            <div className="kicker">DCLM / protocol declaration / machine interface</div>
            <h1 className="brand">Communicate with the machine.</h1>
            <p className="lede">
              A bounded interface for software agencies and human coders. Declare the protocol, submit a small
              deterministic envelope, receive a visible receipt, and keep your own signing keys. No arbitrary code
              runner. No password vault. No browser authority.
            </p>
            <a className="backlink" href="/">← back to the world</a>
          </div>
          <div className="badge">DCLM-MACHINE/2</div>
        </header>

        <FusionStatusPanel endpoint={ep} fatherPin={fatherPin} />

        <section className="grid">
          <div className="panel">
            <h2>Dual Pipeline</h2>
            <p className="sub">
              Claim → Fetch → Collapse. This is the machine-facing request surface; the browser only prepares a
              declaration and asks the ingress for an observation. Transmission goes through the internal connector —
              there is no other pipe.
            </p>
            <div className="pipe">
              <label>
                Pipe A · claim
                <textarea ref={claimRef} id="claim" defaultValue="Inspect the current DCLM ingress and return its measurable health." onChange={measureBox} />
              </label>
              <label>
                Pipe B · fetch / evidence plan
                <textarea ref={fetchRef} id="fetch" defaultValue="GET /health, GET /v2/protocol, and return the exact receipt or HOLE reason." onChange={measureBox} />
              </label>
            </div>
            <p className="sub" style={{ fontSize: 12, margin: '10px 0 0' }}>
              Box size: <b className={boxBytes > 256 ? 'status hole' : 'status see'}>{boxBytes} / 256 bytes</b>
              {boxBytes > 256 ? ' — over the public ABI; the connector will not send it.' : ' — inside the public ABI.'}
            </p>
            <div className="actions">
              <button className="primary" id="run" onClick={runPipe} disabled={busy}>
                {busy ? 'PIPING…' : 'PIPE TO DCLM'}
              </button>
              <button id="demo" onClick={loadDemo}>LOAD CLEAN EXAMPLE</button>
              <button id="clear" onClick={clearAll}>CLEAR</button>
            </div>
            <div className="receipt" id="receipt" role="status">
              <span className={`status ${verdictClass}`}>{receipt.verdict}</span>
              {'\n'}
              {JSON.stringify(receipt.body, null, 2)}
            </div>
          </div>

          <aside className="panel">
            <h2>DCLM machine</h2>
            <p className="sub">The browser never becomes the kernel. Point this console at a local or protected ingress.</p>
            <div className="epfields" role="group" aria-label="Kernel endpoint">
              <label>
                PROTOCOL
                <select
                  id="ep-protocol"
                  value={ep.protocol}
                  onChange={e => setEp(p => ({ ...p, protocol: e.target.value as 'https' | 'http' }))}
                >
                  <option value="https">https</option>
                  <option value="http">http</option>
                </select>
              </label>
              <label>
                HOST
                <input
                  id="ep-host"
                  value={ep.host}
                  onChange={e => setEp(p => ({ ...p, host: e.target.value }))}
                  aria-label="Kernel host"
                  spellCheck={false}
                />
              </label>
              <label>
                PORT
                <input
                  id="ep-port"
                  value={ep.port}
                  onChange={e => setEp(p => ({ ...p, port: e.target.value }))}
                  aria-label="Kernel port"
                  spellCheck={false}
                  inputMode="numeric"
                />
              </label>
              <label>
                PATH
                <input
                  id="ep-path"
                  value={ep.path}
                  onChange={e => setEp(p => ({ ...p, path: e.target.value }))}
                  aria-label="Kernel path"
                  spellCheck={false}
                />
              </label>
            </div>
            <div className="connection">
              <i className={`dot${dot ? ' ' + dot : ''}`} id="dot" />
              <code id="endpoint-url" style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere', fontSize: 12 }}>
                {endpoint || '(no endpoint set)'}
              </code>
              <button id="probe" onClick={probe}>PROBE</button>
            </div>
            <p className="sub" style={{ fontSize: 12 }}>
              Kernel endpoint, persisted in this browser. The connector posts the box to <code>{endpoint.replace(/\/$/, '')}/compute</code> with
              X-Trinity-Mode; the Father bind posts to <code>{endpoint.replace(/\/$/, '')}/bind</code>. Same-origin <code>/api/v2</code> is this origin's own router.
            </p>
            <div className="facts">
              <div className="fact"><b>WRITE PATH</b><span>Disabled</span></div>
              <div className="fact"><b>PUBLIC ABI</b><span>256 UTF-8 bytes</span></div>
              <div className="fact"><b>HOUSE KEY</b><span>Not present</span></div>
              <div className="fact"><b>RECEIPT</b><span>SHA-256</span></div>
            </div>
            <div className="law">{LAW.map(l => <span key={l}>{l}</span>)}</div>
          </aside>
        </section>

        <section className="split">
          <div className="panel">
            <h2>Protocol declaration</h2>
            <p className="sub">
              The machine-readable contract agencies should implement first. “DECLARED” is not “verified”; the
              production verifier is not deployed by this interface.
            </p>
            <pre className="code" id="declaration">{declaration}</pre>
            <div className="actions">
              <button id="copy-declaration" onClick={copyDeclaration}>COPY DECLARATION</button>
              <button id="fetch-protocol" onClick={fetchProtocol}>FETCH FROM MACHINE</button>
            </div>
          </div>

          <div className="panel">
            <h2>Agency key desk</h2>
            <p className="sub">
              Create and revoke your own client key locally. Private keys are non-exportable browser CryptoKeys; only
              the public fingerprint and lifecycle status are shown here.
            </p>
            <div className="actions">
              <button className="primary" id="create-key" onClick={() => createKey('P-256')}>CREATE AGENCY KEY</button>
              <button id="create-ed25519-key" onClick={() => createKey('Ed25519')}>CREATE ED25519 KEY</button>
              <button className="danger" id="revoke-key" onClick={revokeKey}>REVOKE SELECTED</button>
              <button id="bind-wallet" onClick={bindWallet} disabled={bindBusy}>
                {bindBusy ? 'BINDING…' : 'BIND WALLET → DCLM'}
              </button>
            </div>
            <div className="receipt" id="keyring">
              {keyError ? (
                <span className="danger">{keyError}</span>
              ) : keys === null ? (
                <><span className="status wait">KEYRING</span><br />Loading local keyring…</>
              ) : keys.length === 0 ? (
                <><span className="status wait">KEYRING</span><br />No agency keys stored in this browser.</>
              ) : (
                keys.map(k => (
                  <div className="keyrow" key={k.id}>
                    <div>
                      <b>{k.id}</b>
                      <small>{k.alg} · {k.fingerprint} · {k.status} · {new Date(k.createdAt).toISOString()}</small>
                    </div>
                    <input
                      type="radio"
                      name="selected-key"
                      value={k.id}
                      disabled={k.status === 'REVOKED'}
                      onChange={e => { selectedKey.current = e.target.value }}
                      aria-label={`Select ${k.id}`}
                    />
                  </div>
                ))
              )}
            </div>
            <div className="notice">
              Best-practice boundary: use a passkey or a hardware-backed signer for production. This browser key desk
              is a local preparation tool, not a custodial issuer or deployed signature verifier.
            </div>
            <div className="receipt" id="fusion-bind" aria-live="polite" style={{ marginTop: 12 }}>
              {binding ? (
                <>
                  <span className={'status ' + (binding.verdict === 'SEE' ? 'see' : binding.verdict === 'QUEUED' ? 'wait' : 'hole')}>
                    {binding.verdict === 'SEE' ? 'BOUND · SEE' : binding.verdict === 'QUEUED' ? 'QUEUED · CARRYING' : 'UNBOUND · HOLE'}
                  </span>
                  <br />
                  {binding.keyId} · {binding.fingerprint}
                  <br />
                  {binding.at}
                  <br />
                  {binding.detail}
                  <br />
                  {binding.manifestHash ? (
                    <>
                      <span className="status wait">MANIFEST</span>{' '}
                      <code style={{ wordBreak: 'break-all' }}>{binding.manifestHash}</code>
                      <br />
                      <span className="status wait">DESIGN VERDICT</span>{' '}
                      {binding.designVerdict ? (
                        <code style={{ wordBreak: 'break-all' }}>{binding.designVerdict}</code>
                      ) : (
                        <span style={{ opacity: 0.75 }}>none — trivial/local only (verdict required for anything beyond trivial)</span>
                      )}
                      <br />
                      <span style={{ opacity: 0.75 }}>
                        PILOT · LOCAL — minted on this device for this one bind (single use, {binding.manifestState}).
                        The carry daemon delivers it through the internal connector; while your machine is unreachable
                        it queues honestly — QUEUED is not a receipt. A new bind mints a new manifest.
                      </span>
                      <br />
                    </>
                  ) : null}
                  <span style={{ opacity: 0.75 }}>
                    Recurring fusion: re-bind any session. The wallet presents, DCLM observes, nothing is granted.
                  </span>
                </>
              ) : (
                <>
                  <span className="status wait">FUSION</span>
                  <br />
                  {pilotHandle ? (
                    <>
                      Pilot handle bound: <code style={{ wordBreak: 'break-all' }}>{pilotHandle}</code>
                      {genesisCopy ? (
                        <>
                          <br />
                          <span className="status see" data-testid="genesis-mark">{genesisCopy}</span>
                        </>
                      ) : null}
                      <br />
                    </>
                  ) : (
                    <>
                      <span className="danger">UNBOUND</span> · no pilot Unity handle on this device — open the
                      3D world gate and bind your passkey first.
                      <br />
                    </>
                  )}
                  No wallet bound this session. Select an active agency key and bind — the binding recurs every
                  session through the internal connector.
                </>
              )}
            </div>

            <div className="receipt" id="father-key-pin" style={{ marginTop: 12 }}>
              <span className="status wait">FATHER KEY</span>
              <br />
              {fatherPin ? (
                <>
                  Pinned · <code style={{ wordBreak: 'break-all' }}>{fatherPin.fingerprint}</code>
                  <br />
                  {new Date(fatherPin.pinnedAt).toISOString()}
                </>
              ) : (
                'No Father public key pinned.'
              )}
              <br />
              <span style={{ opacity: 0.75 }}>
                Paste the Father Ed25519 PUBLIC key (base64 or hex, raw 32 bytes). It is stored in this browser only
                and never transmitted — the Father .pem never leaves David's machine.
              </span>
            </div>
            <textarea
              id="father-key-input"
              className="keyinput"
              value={fatherKeyInput}
              onChange={e => setFatherKeyInput(e.target.value)}
              placeholder="base64 or hex — PUBLIC key only"
              spellCheck={false}
              aria-label="Father public key"
              rows={3}
            />
            {fatherPinError ? <div className="danger" style={{ fontSize: 12, marginTop: 6 }}>{fatherPinError}</div> : null}
            <div className="actions">
              <button id="pin-father-key" onClick={pinFatherKey}>PIN FATHER KEY</button>
              <button id="unpin-father-key" onClick={unpinFatherKey} disabled={!fatherPin}>UNPIN</button>
              <button className="primary" id="father-bind-btn" onClick={doFatherBind} disabled={fatherBindBusy}>
                {fatherBindBusy ? 'BINDING…' : 'FATHER BIND → KERNEL'}
              </button>
            </div>
            <div className="receipt" id="father-bind" aria-live="polite" style={{ marginTop: 12 }}>
              {fatherCarry.phase === 'SEALED' ? (
                <>
                  <span className="status see">SEALED · SEE</span>
                  <br />
                  The kernel countersigned with the Father key and the signature verifies against the PINNED key.
                  <br />
                  <span className="status wait">RECEIPT</span>{' '}
                  <code style={{ wordBreak: 'break-all' }}>{JSON.stringify(fatherCarry.receipt)}</code>
                  <br />
                  <span className="status wait">MANIFEST</span>{' '}
                  <code style={{ wordBreak: 'break-all' }}>{fatherCarry.manifestHash}</code>{' '}
                  (CONSUMED · single use)
                  <br />
                  {fatherCarry.ledgerEntry ? (
                    <>
                      <span className="status wait">LEDGER</span> seq {fatherCarry.ledgerEntry.seq} ·{' '}
                      <code style={{ wordBreak: 'break-all' }}>{fatherCarry.ledgerEntry.entry_hash}</code>
                    </>
                  ) : (
                    <span style={{ opacity: 0.75 }}>Ledger entry pending — refresh.</span>
                  )}
                </>
              ) : fatherCarry.phase === 'REJECTED' ? (
                <>
                  <span className="danger">REJECTED</span>
                  <br />
                  {fatherCarry.detail}
                </>
              ) : fatherCarry.phase === 'QUEUED' ? (
                <>
                  <span className="status wait">QUEUED · CARRYING</span>
                  <br />
                  {fatherCarry.detail}
                  <br />
                  <span className="status wait">MANIFEST</span>{' '}
                  <code style={{ wordBreak: 'break-all' }}>{fatherCarry.manifestHash}</code>{' '}
                  (LIVE · expires on receipt)
                </>
              ) : (
                <>
                  <span className="status wait">FATHER BIND</span>
                  <br />
                  No Father bind attempted. Select an active Ed25519 agency key, pin the Father public key, point the
                  endpoint at the kernel, and bind — the carry daemon delivers one TASK_BIND per attempt through the
                  internal connector.
                </>
              )}
            </div>
            <div className="receipt" id="bind-ledger" style={{ marginTop: 12 }}>
              <span className="status wait">BIND LEDGER</span> · {bindLedger.length} shown · chain{' '}
              {ledgerOk === null ? '…' : ledgerOk ? <span className="status see">VERIFIED</span> : <span className="danger">BROKEN</span>}
              <br />
              {bindLedger.length === 0 ? (
                <span style={{ opacity: 0.75 }}>No sealed binds recorded in this browser yet.</span>
              ) : (
                bindLedger.map(e => (
                  <div key={e.entry_hash} style={{ marginTop: 8 }}>
                    seq {e.seq} · <code style={{ wordBreak: 'break-all' }}>{e.entry_hash}</code>
                    <br />
                    <span style={{ opacity: 0.75 }}>
                      manifest <code style={{ wordBreak: 'break-all' }}>{e.manifest_hash}</code>
                      <br />
                      bound {e.at} · against pinned {e.father_fingerprint}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="receipt" id="daemon-outbox" style={{ marginTop: 12 }} aria-live="polite">
              <span className="status wait">CARRY DAEMON</span> · dualis.daemon.v1 ·{' '}
              {outbox.filter(e => e.state === 'QUEUED').length} queued · {outbox.length} total
              <br />
              <span style={{ opacity: 0.75 }}>
                Every bind is carried through the internal connector — the only pipe. A receipt exists only when your
                machine answers; QUEUED is never a receipt.
              </span>
              {outbox.length === 0 ? (
                <>
                  <br />
                  <span style={{ opacity: 0.75 }}>Outbox empty — no binds in flight.</span>
                </>
              ) : (
                outbox.map(e => (
                  <div key={e.manifest_hash} style={{ marginTop: 8 }}>
                    <span
                      className={
                        'status ' + (e.state === 'DELIVERED' ? 'see' : e.state === 'QUEUED' || e.state === 'IN_FLIGHT' ? 'wait' : 'hole')
                      }
                    >
                      {e.state}
                    </span>{' '}
                    {e.kind} · attempts {e.attempts}
                    <br />
                    <code style={{ wordBreak: 'break-all', fontSize: 11 }}>{e.manifest_hash}</code>
                    {e.last_error ? (
                      <>
                        <br />
                        <span style={{ opacity: 0.75, fontSize: 12 }}>{e.last_error}</span>
                      </>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="panel" style={{ marginTop: 16 }}>
          <h2>How agencies communicate</h2>
          <p className="sub">
            Every software agency follows the same declared sequence. The DCLM machine may return{' '}
            <b className="status see">SEE</b> or <b className="danger">HOLE</b>; neither response grants write authority.
          </p>
          <table className="table">
            <thead><tr><th>STEP</th><th>AGENCY ACTION</th><th>MACHINE RULE</th></tr></thead>
            <tbody>
              <tr><td>01 / DECLARE</td><td>Read <code>/v2/protocol</code> and pin the protocol digest.</td><td>Version and limits are explicit.</td></tr>
              <tr><td>02 / KEY</td><td>Keep the private signing key in your own HSM, passkey, or non-exportable store.</td><td>DCLM never receives private keys.</td></tr>
              <tr><td>03 / CLAIM</td><td>Send a UTF-8 bounded claim plus fetch plan.</td><td>No arbitrary code; flags remain 0.</td></tr>
              <tr><td>04 / RECEIPT</td><td>Persist the structured receipt on your side.</td><td>Input and state digests are visible.</td></tr>
              <tr><td>05 / REVOKE</td><td>Revoke your own key and publish the revocation declaration.</td><td>Revocation is fail-closed until re-enrollment.</td></tr>
            </tbody>
          </table>
        </section>

        <section className="panel" style={{ marginTop: 16 }}>
          <h2>One ingress</h2>
          <p className="sub">
            Builder, Unity, agencies, and WebGL feed the same narrow boundary. Unknown sources, PII, law drift,
            malformed JSON, missing evidence, or an unverified key collapse to <b className="danger">HOLE</b>.
          </p>
          <div className="flow">
            <div className="node"><b>AGENCY / BUILDER</b><span>declared envelope + client signature</span></div>
            <div className="arrow">→</div>
            <div className="node"><b>DCLM GATE</b><span>version + size + key status + law floor</span></div>
            <div className="arrow">→</div>
            <div className="node"><b>DCLM KERNEL</b><span>deterministic observation + receipt</span></div>
          </div>
        </section>

        <div className="footer">Protocol declaration is public. Private keys stay with their owners. SEE is observation, not approval. HOLE is a valid result.</div>
      </main>
    </div>
  )
}
