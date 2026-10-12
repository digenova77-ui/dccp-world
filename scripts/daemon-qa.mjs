#!/usr/bin/env node
/** Daemon + father-seed E2E: wallet bind → QUEUED (down) → SEE (up);
 * father bind → QUEUED (down) → SEALED (up) → no duplicate on reload;
 * wrong father key → REJECTED PIN_MISMATCH. Real Chromium, real preview build.
 * Design: DAEMON_DESIGN.md. Verdict: ED-PREDICT-20261004-DAEMON-V1 (predicted).
 */
import { createServer } from 'node:http'
import { webcrypto } from 'node:crypto'
import { chromium } from 'playwright-core'

const APP = 'http://127.0.0.1:8081'
const KPORT = 18099
const CHROME = '/home/hatch/workspace/.qa/chrome-linux64/chrome'
const SHOTS = new URL('../screenshots/', import.meta.url).pathname

const subtle = webcrypto.subtle
const b64 = bytes => Buffer.from(bytes).toString('base64')

function canonicalJson(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return '[' + v.map(canonicalJson).join(',') + ']'
  return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonicalJson(v[k])).join(',') + '}'
}

async function makeKey() {
  const kp = await subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])
  const raw = new Uint8Array(await subtle.exportKey('raw', kp.publicKey))
  return { priv: kp.privateKey, pubB64: b64(raw) }
}

/** Mock DCLM kernel. Starts DOWN; listen() brings it up. Signs /bind receipts
 * with signerPriv (wrong-key mode: a different key than the pinned one). */
function mockKernel(signerPriv, fatherFingerprint) {
  const hits = { bind: 0, compute: 0 }
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1')
    // David's real kernel will need the same: the app calls it cross-origin
    // (browser tab / IPFS gateway origin), so preflight must be answered.
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type, x-trinity-mode',
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors)
      res.end()
      return
    }
    let body = ''
    for await (const c of req) body += c
    if (req.method === 'POST' && url.pathname === '/bind') {
      hits.bind += 1
      const b = JSON.parse(body)
      const receipt = {
        protocol: 'dualis.bind.v1',
        manifest_hash: b.manifest.manifest_hash,
        wallet_pubkey: b.wallet_pubkey,
        wallet_alg: b.wallet_alg,
        bound_at: new Date().toISOString(),
        authority: 'NONE',
        father_fingerprint: fatherFingerprint,
      }
      const sig = await subtle.sign({ name: 'Ed25519' }, signerPriv, new TextEncoder().encode(canonicalJson(receipt)))
      res.writeHead(200, { 'content-type': 'application/json', ...cors })
      res.end(JSON.stringify({ accepted: true, receipt, father_signature: b64(new Uint8Array(sig)) }))
      return
    }
    if (req.method === 'POST' && url.pathname === '/compute') {
      hits.compute += 1
      res.writeHead(200, { 'content-type': 'application/json', ...cors })
      res.end(JSON.stringify({ accepted: true }))
      return
    }
    res.writeHead(404).end('nope')
  })
  server.on('error', e => {
    if (e.code !== 'EADDRINUSE') throw e
    console.error('mock kernel: port in use — is a previous QA run still alive?')
    process.exit(3)
  })
  return {
    hits,
    up: () => new Promise(r => server.listen(KPORT, '127.0.0.1', r)),
    down: () => new Promise(r => server.close(() => r())),
  }
}

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log((ok ? 'PASS' : 'FAIL') + ' · ' + name + (detail ? ' — ' + detail : ''))
}

async function seedAndGoto(browser, { fatherPubB64 }) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const errors = []
  ctx.on('pageerror', e => errors.push('pageerror: ' + e.message))
  const page = await ctx.newPage()
  page.on('requestfailed', r => {
    // The PWA branding injector is unreachable from this sandbox; everything
    // else failing to load is a real defect.
    if (/grok\.com/.test(r.url())) return
    // The deliberate outage: the daemon's first attempt against the downed
    // mock kernel fails by design and is reported as an honest HOLE.
    if (/127\.0\.0\.1:18099/.test(r.url()) && r.failure()?.errorText === 'net::ERR_CONNECTION_REFUSED') return
    errors.push('requestfailed: ' + r.url().slice(0, 120) + ' ' + (r.failure()?.errorText ?? ''))
  })
  await ctx.addInitScript(
    ({ fatherPubB64 }) => {
      localStorage.setItem('dccpworld.unity-pilot.v1', JSON.stringify({
        handle: 'unity:pilot.' + 'a1b2c3d4'.repeat(4), credentialId: 'e2e', createdAt: new Date().toISOString(), rpId: '127.0.0.1',
      }))
      localStorage.setItem('dclm-bind-endpoint.v1', JSON.stringify({ protocol: 'http', host: '127.0.0.1', port: '18099', path: '' }))
      window.__fatherPubB64 = fatherPubB64
    },
    { fatherPubB64 },
  )
  await page.goto(APP + '/machine', { waitUntil: 'networkidle' })
  return { ctx, page, errors }
}

async function makeEd25519Key(page) {
  await page.click('#create-ed25519-key')
  await page.waitForSelector('.keyrow input[name="selected-key"]', { timeout: 15000 })
  await page.click('.keyrow input[name="selected-key"]')
}

async function pinFather(page) {
  const pub = await page.evaluate(() => window.__fatherPubB64)
  await page.fill('#father-key-input', pub)
  await page.click('#pin-father-key')
  await page.waitForFunction(() => document.querySelector('#father-key-pin')?.textContent?.includes('Pinned ·'), null, { timeout: 10000 })
}

async function main() {
  const father = await makeKey()   // the "real" father key
  const wrong = await makeKey()    // the attacker's key
  const kernel = mockKernel(father.priv, 'sha256:e2efather000000000000')
  const browser = await chromium.launch({ executablePath: CHROME })

  // ---- Phase A: wallet bind, kernel DOWN → QUEUED; UP → SEE ----
  {
    const { ctx, page, errors } = await seedAndGoto(browser, { fatherPubB64: father.pubB64 })
    await makeEd25519Key(page)
    await page.click('#bind-wallet')
    await page.waitForFunction(() => document.querySelector('#fusion-bind')?.textContent?.includes('QUEUED'), null, { timeout: 15000 })
    const qtext = await page.textContent('#fusion-bind')
    check('wallet bind queues honestly while endpoint is down', /UNREACHABLE|unreachable/.test(qtext) && !/BOUND · SEE/.test(qtext), qtext.slice(0, 120))
    const outbox1 = await page.textContent('#daemon-outbox')
    check('daemon outbox shows the queued wallet bind', /QUEUED/.test(outbox1) && /wallet-bind/.test(outbox1))
    await page.screenshot({ path: SHOTS + 'daemon-queued-wallet.png' })
    await kernel.up()
    await page.waitForFunction(() => document.querySelector('#fusion-bind')?.textContent?.includes('BOUND · SEE'), null, { timeout: 20000 })
    check('wallet bind delivered → SEE when the machine answers', kernel.hits.compute === 1, `compute hits=${kernel.hits.compute}`)
    await kernel.down()
    const errs = errors
    check('no page errors during wallet carry', errs.length === 0, errs.join(' | ').slice(0, 200))
    await ctx.close()
  }

  // ---- Phase B: father bind, kernel DOWN → QUEUED; UP → SEALED; reload → no duplicate ----
  {
    const { ctx, page, errors } = await seedAndGoto(browser, { fatherPubB64: father.pubB64 })
    await makeEd25519Key(page)
    await pinFather(page)
    await page.click('#father-bind-btn')
    await page.waitForFunction(() => document.querySelector('#father-bind')?.textContent?.includes('QUEUED · CARRYING'), null, { timeout: 15000 })
    const qtext = await page.textContent('#father-bind')
    check('father bind queues honestly while the machine is unreachable', /UNREACHABLE|unreachable/.test(qtext) && !/SEALED/.test(qtext))
    check('no fake receipt while queued', !/SEALED · SEE/.test(qtext))
    await page.screenshot({ path: SHOTS + 'daemon-queued-father.png' })
    await kernel.up()
    await page.waitForFunction(() => document.querySelector('#father-bind')?.textContent?.includes('SEALED · SEE'), null, { timeout: 25000 })
    check('father bind SEALED on valid father signature', kernel.hits.bind === 1, `bind hits=${kernel.hits.bind}`)
    const ledger = await page.textContent('#bind-ledger')
    check('sealed bind recorded in the hash-chained ledger', /VERIFIED/.test(ledger))
    await page.screenshot({ path: SHOTS + 'daemon-sealed-father.png' })
    // reload: the daemon restarts, the outbox entry is DELIVERED → no re-transmit
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(4000)
    check('no duplicate delivery after reload', kernel.hits.bind === 1, `bind hits=${kernel.hits.bind}`)
    const errs = errors
    check('no page errors during father carry', errs.length === 0, errs.join(' | ').slice(0, 200))
    await kernel.down()
    await ctx.close()
  }

  // ---- Phase C: wrong father key → REJECTED PIN_MISMATCH ----
  {
    const badKernel = mockKernel(wrong.priv, 'sha256:e2efather000000000000')
    await badKernel.up()
    const { ctx, page, errors } = await seedAndGoto(browser, { fatherPubB64: father.pubB64 }) // pin the RIGHT key…
    await makeEd25519Key(page)
    await pinFather(page)
    await page.click('#father-bind-btn')
    // …but this kernel countersigns with the WRONG key
    await page.waitForFunction(() => document.querySelector('#father-bind')?.textContent?.includes('REJECTED'), null, { timeout: 25000 })
    const rtext = await page.textContent('#father-bind')
    check('key mismatch rejected fail-closed (PIN_MISMATCH)', /PIN_MISMATCH/.test(rtext) && !/SEALED/.test(rtext))
    const errs = errors
    check('no page errors during rejection', errs.length === 0, errs.join(' | ').slice(0, 200))
    await badKernel.down()
    await ctx.close()
  }

  // ---- Phase D: mobile 390×844 sanity ----
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', e => errs.push(e.message))
    page.on('requestfailed', r => {
      if (/grok\.com/.test(r.url())) return
      if (/127\.0\.0\.1:18099/.test(r.url()) && r.failure()?.errorText === 'net::ERR_CONNECTION_REFUSED') return
      errs.push('requestfailed: ' + r.url().slice(0, 120))
    })
    await page.goto(APP + '/machine', { waitUntil: 'networkidle' })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    check('mobile 390×844: no horizontal bleed', overflow <= 1, `overflow=${overflow}px`)
    await page.screenshot({ path: SHOTS + 'daemon-mobile-machine.png' })
    check('no page errors on mobile', errs.length === 0, errs.join(' | ').slice(0, 200))
    await ctx.close()
  }

  await browser.close()
  const failed = results.filter(r => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
  process.exit(failed.length ? 1 : 0)
}

main().catch(e => {
  console.error('QA FATAL', e)
  process.exit(2)
})
