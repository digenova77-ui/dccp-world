#!/usr/bin/env node
/**
 * FATHER BIND TEST HARNESS — speaks `dualis.bind.v1` with a THROWAWAY Ed25519 keypair.
 *
 * *** TEST FIXTURE ONLY. NOT A KERNEL. NOT SHIPPED IN THE APP BUNDLE. ***
 * `scripts/` never enters the Vite build; production code never fakes a kernel.
 * The only production SEE is a real father_signature verified against the
 * pinned Father key in the browser (src/dccp/pipe/fatherBind.ts).
 *
 * Duties (mirroring the real kernel's contract, see EPHEMERAL_PROTOCOL.md):
 *  1. POST /bind — parse the client's bind request, verify the wallet signature
 *     over the canonical manifest bytes, build the receipt, countersign it
 *     with the generated "Father" private key, return {accepted:true, receipt,
 *     father_signature}.
 *  2. POST /harness/mode {"mode":"ok|wrongkey|malformed|replay"} — switch the
 *     response mode (drives the client's fail-closed paths in QA).
 *  3. GET /harness/pubkey — the generated Father PUBLIC key (base64) for pinning.
 *
 * Modes:
 *  - ok        countersign with the Father key (client should SEAL · SEE)
 *  - wrongkey  countersign with a DIFFERENT key (client must REJECT · PIN_MISMATCH)
 *  - malformed accept without receipt/signature (client must REJECT · BAD_RESPONSE)
 *  - replay    receipt bound to a different manifest_hash (client must REJECT · RECEIPT_MISMATCH)
 *
 * Env: HARNESS_PORT (default 18099), HARNESS_PUB_OUT (default /tmp/father-bind-harness.pub)
 */
import { createServer } from 'node:http'
import { createHash, generateKeyPairSync, sign as nodeSign } from 'node:crypto'
import { webcrypto } from 'node:crypto'
import { writeFileSync } from 'node:fs'

const PORT = Number(process.env.HARNESS_PORT || 18099)
const PUB_OUT = process.env.HARNESS_PUB_OUT || '/tmp/father-bind-harness.pub'

const PROTOCOL = 'dualis.bind.v1'

/** Deterministic canonical JSON: sorted keys at every level, no whitespace.
 * MUST match ephemeral.ts canonicalJson byte-for-byte. */
function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']'
  const entries = Object.entries(value)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return '{' + entries.map(([k, v]) => JSON.stringify(k) + ':' + canonicalJson(v)).join(',') + '}'
}

function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function b64ToBytes(s) {
  return Buffer.from(s, 'base64')
}

// --- throwaway keys (generated fresh every run; never persisted) ---
const fatherKp = generateKeyPairSync('ed25519')
const wrongKp = generateKeyPairSync('ed25519')
const fatherDer = fatherKp.publicKey.export({ format: 'der', type: 'spki' })
const fatherRaw = fatherDer.subarray(fatherDer.length - 32)
const fatherB64 = fatherRaw.toString('base64')
const fatherFingerprint = 'sha256:' + sha256Hex(fatherRaw).slice(0, 24)

writeFileSync(PUB_OUT, fatherB64 + '\n')
console.log(`[harness] TEST FIXTURE — not a kernel. Father public key (base64): ${fatherB64}`)
console.log(`[harness] fingerprint: ${fatherFingerprint} (also written to ${PUB_OUT})`)

let mode = 'ok'

async function verifyWalletSignature(body) {
  const alg = body.wallet_alg
  let params
  if (alg === 'Ed25519') params = { name: 'Ed25519' }
  else if (alg === 'ECDSA-P-256') params = { name: 'ECDSA', namedCurve: 'P-256' }
  else return false
  const pub = await webcrypto.subtle.importKey('raw', b64ToBytes(body.wallet_pubkey), params, false, ['verify'])
  const verifyAlg = alg === 'Ed25519' ? { name: 'Ed25519' } : { name: 'ECDSA', hash: 'SHA-256' }
  const data = Buffer.from(canonicalJson(body.manifest), 'utf8')
  return webcrypto.subtle.verify(verifyAlg, pub, b64ToBytes(body.signature), data)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1')
  // The browser page under test fetches cross-origin (different port), so the
  // fixture must answer CORS — a real kernel would carry its own policy.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Trinity-Mode')
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }
  res.setHeader('content-type', 'application/json')
  try {
    if (req.method === 'GET' && url.pathname === '/harness/pubkey') {
      res.end(JSON.stringify({ base64: fatherB64, fingerprint: fatherFingerprint }))
      return
    }
    if (req.method === 'GET' && url.pathname === '/harness/mode') {
      res.end(JSON.stringify({ mode }))
      return
    }
    if (req.method === 'POST' && url.pathname === '/harness/mode') {
      const next = JSON.parse(await readBody(req)).mode
      if (!['ok', 'wrongkey', 'malformed', 'replay'].includes(next)) {
        res.statusCode = 400
        res.end(JSON.stringify({ accepted: false, reason: 'BAD_MODE' }))
        return
      }
      mode = next
      console.log(`[harness] mode -> ${mode}`)
      res.end(JSON.stringify({ mode }))
      return
    }
    if (req.method === 'POST' && url.pathname === '/bind') {
      const body = JSON.parse(await readBody(req))
      if (body.protocol !== PROTOCOL || !body.manifest || typeof body.signature !== 'string' || typeof body.wallet_pubkey !== 'string') {
        res.statusCode = 400
        res.end(JSON.stringify({ accepted: false, reason: 'BAD_BIND_REQUEST' }))
        console.log('[harness] bind rejected: BAD_BIND_REQUEST')
        return
      }
      const clientOk = await verifyWalletSignature(body).catch(() => false)
      const mhash = String(body.manifest.manifest_hash || '').slice(0, 24)
      if (!clientOk) {
        res.statusCode = 400
        res.end(JSON.stringify({ accepted: false, reason: 'BAD_WALLET_SIGNATURE' }))
        console.log(`[harness] bind rejected: BAD_WALLET_SIGNATURE manifest=${mhash}…`)
        return
      }
      if (mode === 'malformed') {
        res.end(JSON.stringify({ accepted: true }))
        console.log(`[harness] bind answered (malformed): manifest=${mhash}…`)
        return
      }
      const receipt = {
        protocol: PROTOCOL,
        manifest_hash: mode === 'replay' ? 'sha256:' + '0'.repeat(64) : body.manifest.manifest_hash,
        wallet_pubkey: body.wallet_pubkey,
        wallet_alg: body.wallet_alg,
        bound_at: new Date().toISOString(),
        authority: 'NONE',
        father_fingerprint: fatherFingerprint,
      }
      const signer = mode === 'wrongkey' ? wrongKp.privateKey : fatherKp.privateKey
      const sig = nodeSign(null, Buffer.from(canonicalJson(receipt), 'utf8'), signer)
      res.end(JSON.stringify({ accepted: true, receipt, father_signature: sig.toString('base64') }))
      console.log(`[harness] bind answered (mode=${mode}): manifest=${mhash}… client_sig=OK`)
      return
    }
    res.statusCode = 404
    res.end(JSON.stringify({ accepted: false, reason: 'NOT_FOUND' }))
  } catch (e) {
    res.statusCode = 500
    res.end(JSON.stringify({ accepted: false, reason: 'HARNESS_ERROR', detail: String(e && e.message || e) }))
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[harness] listening on http://127.0.0.1:${PORT} (POST /bind)`)
})
