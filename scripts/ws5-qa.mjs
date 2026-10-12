// WS5 QA: Father key binding path against the real Nitro SSR + the bind test harness.
// Desktop 1440x900: pin father key, full handshake -> SEALED · SEE with ledger
// entry; wrongkey/malformed/replay -> honest REJECTED; harness down ->
// HOLE · UNREACHABLE. Mobile 390x844 at 2x font: no bleed. Zero page errors.
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const OUT = path.resolve('screenshots')
fs.mkdirSync(OUT, { recursive: true })
const NITRO_PORT = 18098
const HARNESS_PORT = 18099
const URL = `http://127.0.0.1:${NITRO_PORT}/machine`
const CHROME = '/home/hatch/workspace/.qa/chrome-linux64/chrome'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const PUB_FILE = '/tmp/father-bind-harness.pub'

const results = { checks: [], errors: [] }
function check(name, ok, detail = '') {
  results.checks.push({ name, ok, detail })
  console.log((ok ? 'PASS' : 'FAIL') + ' | ' + name + (detail ? ' — ' + detail : ''))
}

async function waitPort(port, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/`)
      if (r.status) return true
    } catch { /* not up yet */ }
    await sleep(500)
  }
  return false
}

async function harnessMode(mode) {
  const r = await fetch(`http://127.0.0.1:${HARNESS_PORT}/harness/mode`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode }),
  })
  return (await r.json()).mode === mode
}

async function applyTextScale(page, s) {
  await page.evaluate(scale => {
    const els = [...document.querySelectorAll('body *')]
    const orig = els.map(el => parseFloat(getComputedStyle(el).fontSize))
    els.forEach((el, i) => { if (orig[i] > 0) el.style.setProperty('font-size', (orig[i] * scale).toFixed(2) + 'px', 'important') })
  }, s)
}

async function checkBleed(page) {
  return page.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth }))
}

async function bindResult(page) {
  await page.waitForSelector('#father-bind', { timeout: 15000 })
  return (await page.locator('#father-bind').textContent()) ?? ''
}

async function run() {
  // build-content check: the bind protocol ships in the machine chunk
  const assets = 'find .vercel/output/static/assets -name "*.js" | head -50'
  let shipsBind = false
  try {
    const files = execSync(assets, { encoding: 'utf8' }).trim().split('\n').filter(Boolean)
    for (const f of files) {
      if (fs.readFileSync(f, 'utf8').includes('dualis.bind.v1')) { shipsBind = true; break }
    }
  } catch { /* checked below */ }
  check('built bundle ships dualis.bind.v1', shipsBind)

  // ---------- harness ----------
  if (fs.existsSync(PUB_FILE)) fs.unlinkSync(PUB_FILE)
  const harness = spawn('node', ['scripts/father-bind-harness.mjs'], {
    env: { ...process.env, HARNESS_PORT: String(HARNESS_PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  harness.stdout.on('data', d => process.stdout.write('[harness] ' + d))
  for (let i = 0; i < 40 && !fs.existsSync(PUB_FILE); i++) await sleep(250)
  const fatherB64 = fs.existsSync(PUB_FILE) ? fs.readFileSync(PUB_FILE, 'utf8').trim() : ''
  check('harness up, father public key generated', fatherB64.length > 30, fatherB64.slice(0, 12) + '…')
  check('harness mode ok', await harnessMode('ok'))

  // ---------- nitro SSR ----------
  execSync('node scripts/serve-nitro-qa.mjs serve', { stdio: 'ignore' })
  check('nitro SSR up', await waitPort(NITRO_PORT), `:${NITRO_PORT}`)

  const browser = await chromium.launch({ executablePath: CHROME })
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    page.on('pageerror', e => results.errors.push('pageerror: ' + e.message))
    page.on('console', m => {
      let where = ''
      try { where = m.location().url || '' } catch { /* noop */ }
      const text = m.text()
      const full = where + ' ' + text
      // Expected noise, not app errors:
      // - ERR_EMPTY_RESPONSE: sandbox-blocked external feeds (standing residual)
      // - ERR_CONNECTION_REFUSED on :18099: the harness-down fixture itself —
      //   the test kills the fake kernel, the app must (and does) report HOLE · UNREACHABLE
      // - 503 on /api/v2/compute: the router honestly answering KERNEL_UNAVAILABLE —
      //   the fusion-bind test exercises exactly this path
      if (m.type() === 'error'
        && !full.includes('ERR_EMPTY_RESPONSE')
        && !(full.includes('ERR_CONNECTION_REFUSED') && full.includes('18099'))
        && !(full.includes('503') && full.includes('/api/v2/compute'))) {
        results.errors.push('console: ' + where + ' | ' + text.slice(0, 200))
      }
    })

    await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForSelector('.m2d h1.brand', { timeout: 30000 })
    check('machine renders', (await page.locator('.m2d h1.brand').textContent())?.includes('Communicate with the machine'))

    // endpoint fields -> point at the harness
    await page.selectOption('#ep-protocol', 'http')
    await page.fill('#ep-host', '127.0.0.1')
    await page.fill('#ep-port', String(HARNESS_PORT))
    await page.fill('#ep-path', '')
    await sleep(400)
    const epUrl = (await page.locator('#endpoint-url').textContent()) ?? ''
    check('endpoint derives bind base', epUrl.includes(`http://127.0.0.1:${HARNESS_PORT}`), epUrl.trim())
    const epSub = await page.locator('.m2d aside .sub code').nth(1).textContent()
    check('bind path advertised', (epSub ?? '').endsWith('/bind'), epSub ?? '')

    // endpoint persists across reload
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForSelector('#ep-host', { timeout: 30000 })
    await sleep(600)
    check('endpoint persisted', (await page.locator('#ep-host').inputValue()) === '127.0.0.1' && (await page.locator('#ep-port').inputValue()) === String(HARNESS_PORT))

    // create + select an Ed25519 agency key
    await page.click('#create-ed25519-key')
    await page.waitForSelector('.m2d .keyrow', { timeout: 15000 })
    const keyText = (await page.locator('.m2d .keyrow small').first().textContent()) ?? ''
    check('Ed25519 agency key created', keyText.includes('Ed25519'), keyText.slice(0, 60))
    // Select by row content, not index: key ids are random, so row order is unstable.
    await page.locator('.m2d .keyrow', { hasText: 'Ed25519' }).locator('input[type=radio]').check()

    // bind with no pinned key -> honest REJECTED before mint
    await page.click('#father-bind-btn')
    await page.waitForFunction(() => /NO_PINNED_KEY/.test(document.querySelector('#father-bind')?.textContent ?? ''), null, { timeout: 15000 })
    let fb = await bindResult(page)
    check('no pinned key -> REJECTED · NO_PINNED_KEY', fb.includes('REJECTED') && fb.includes('NO_PINNED_KEY'), fb.slice(0, 90))

    // pin the harness father public key
    await page.fill('#father-key-input', fatherB64)
    await page.click('#pin-father-key')
    await page.waitForFunction(() => document.querySelector('#father-key-pin')?.textContent?.includes('Pinned'), null, { timeout: 15000 })
    const pinText = (await page.locator('#father-key-pin').textContent()) ?? ''
    check('father key pinned, fingerprint shown', /Pinned.*sha256:[0-9a-f]{24}/.test(pinText), pinText.slice(0, 70))

    // P-256 keys are refused for the father bind
    await page.click('#create-key')
    await sleep(800)
    await page.locator('.m2d .keyrow', { hasText: 'P-256' }).locator('input[type=radio]').check()
    await page.click('#father-bind-btn')
    fb = await bindResult(page)
    check('P-256 key -> REJECTED · NOT_ED25519_KEY', fb.includes('REJECTED') && fb.includes('NOT_ED25519_KEY'), fb.slice(0, 90))
    await page.locator('.m2d .keyrow', { hasText: 'Ed25519' }).locator('input[type=radio]').check()

    // full handshake -> SEALED · SEE
    await page.click('#father-bind-btn')
    await page.waitForFunction(() => document.querySelector('#father-bind')?.textContent?.includes('SEALED · SEE'), null, { timeout: 20000 })
    fb = await bindResult(page)
    check('full handshake -> SEALED · SEE', fb.includes('SEALED · SEE'))
    check('manifest hash shown, single-use noted', /sha256:[0-9a-f]{64}/.test(fb) && fb.includes('CONSUMED'), fb.slice(0, 80))
    const ledgerText = (await page.locator('#bind-ledger').textContent()) ?? ''
    check('receipt in hash-chained ledger, chain VERIFIED', ledgerText.includes('seq 1') && ledgerText.includes('VERIFIED'), ledgerText.slice(0, 80))
    await page.screenshot({ path: path.join(OUT, 'ws5-desktop-sealed.png') })

    // wrongkey -> REJECTED · PIN_MISMATCH (fail-closed)
    check('harness mode wrongkey', await harnessMode('wrongkey'))
    await page.click('#father-bind-btn')
    await page.waitForFunction(() => /PIN_MISMATCH/.test(document.querySelector('#father-bind')?.textContent ?? ''), null, { timeout: 20000 })
    fb = await bindResult(page)
    check('wrong father key -> REJECTED · PIN_MISMATCH', fb.includes('REJECTED') && fb.includes('PIN_MISMATCH'))

    // malformed -> REJECTED · BAD_RESPONSE
    check('harness mode malformed', await harnessMode('malformed'))
    await page.click('#father-bind-btn')
    await page.waitForFunction(() => /BAD_RESPONSE/.test(document.querySelector('#father-bind')?.textContent ?? ''), null, { timeout: 20000 })
    fb = await bindResult(page)
    check('malformed answer -> REJECTED · BAD_RESPONSE', fb.includes('REJECTED') && fb.includes('BAD_RESPONSE'))

    // replay -> REJECTED · RECEIPT_MISMATCH
    check('harness mode replay', await harnessMode('replay'))
    await page.click('#father-bind-btn')
    await page.waitForFunction(() => /RECEIPT_MISMATCH/.test(document.querySelector('#father-bind')?.textContent ?? ''), null, { timeout: 20000 })
    fb = await bindResult(page)
    check('replayed receipt -> REJECTED · RECEIPT_MISMATCH', fb.includes('REJECTED') && fb.includes('RECEIPT_MISMATCH'))

    // ledger still holds only the one sealed entry; nothing faked
    const ledgerAfter = (await page.locator('#bind-ledger').textContent()) ?? ''
    check('ledger still 1 sealed entry, chain VERIFIED', ledgerAfter.includes('seq 1') && !ledgerAfter.includes('seq 2') && ledgerAfter.includes('VERIFIED'))

    // harness down -> honest HOLE · UNREACHABLE
    harness.kill('SIGTERM')
    await sleep(800)
    await page.click('#father-bind-btn')
    await page.waitForFunction(() => /HOLE · UNREACHABLE/.test(document.querySelector('#father-bind')?.textContent ?? ''), null, { timeout: 20000 })
    fb = await bindResult(page)
    check('kernel down -> HOLE · UNREACHABLE', fb.includes('HOLE · UNREACHABLE') && fb.includes('did not answer'))
    await page.screenshot({ path: path.join(OUT, 'ws5-desktop-hole.png') })

    // ledger persists across reload (same browser profile). Storage reads are
    // async on mount, so wait for the content instead of a fixed sleep.
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForSelector('#bind-ledger', { timeout: 30000 })
    try {
      await page.waitForFunction(() => /seq 1/.test(document.querySelector('#bind-ledger')?.textContent ?? ''), null, { timeout: 20000 })
    } catch { /* falls through to the honest check below */ }
    const ledgerReload = (await page.locator('#bind-ledger').textContent()) ?? ''
    check('ledger persists across reload', ledgerReload.includes('seq 1') && ledgerReload.includes('VERIFIED'))
    try {
      await page.waitForFunction(() => /Pinned/.test(document.querySelector('#father-key-pin')?.textContent ?? ''), null, { timeout: 20000 })
    } catch { /* falls through to the honest check below */ }
    const pinReload = (await page.locator('#father-key-pin').textContent()) ?? ''
    check('pin persists across reload', pinReload.includes('Pinned'))

    // existing fusion bind still honest against this origin's router
    // (re-select the Ed25519 key first: selection is a session ref, not persisted)
    await page.waitForSelector('.m2d .keyrow', { timeout: 20000 })
    await page.locator('.m2d .keyrow', { hasText: 'Ed25519' }).locator('input[type=radio]').check()
    await page.selectOption('#ep-protocol', 'http')
    await page.fill('#ep-host', '127.0.0.1')
    await page.fill('#ep-port', String(NITRO_PORT))
    await page.fill('#ep-path', '/api/v2')
    await sleep(400)
    await page.click('#bind-wallet')
    await page.waitForFunction(() => /UNBOUND · HOLE/.test(document.querySelector('#fusion-bind')?.textContent ?? ''), null, { timeout: 20000 })
    const fusion = (await page.locator('#fusion-bind').textContent()) ?? ''
    check('fusion bind still honest HOLE', fusion.includes('UNBOUND · HOLE') && fusion.includes('KERNEL_UNAVAILABLE'))

    const bleed = await checkBleed(page)
    check('desktop no bleed', bleed.scrollW === bleed.innerW, `${bleed.scrollW}/${bleed.innerW}`)
    await ctx.close()

    // ---------- mobile 390x844, 2x font ----------
    const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
    const mp = await mctx.newPage()
    mp.on('pageerror', e => results.errors.push('mobile pageerror: ' + e.message))
    mp.on('console', m => {
      if (m.type() === 'error' && !m.text().includes('ERR_EMPTY_RESPONSE')) {
        let where = ''
        try { where = m.location().url || '' } catch { /* noop */ }
        results.errors.push('mobile console: ' + where + ' | ' + m.text().slice(0, 200))
      }
    })
    await mp.goto(URL, { waitUntil: 'networkidle', timeout: 60000 })
    await mp.waitForSelector('#father-bind-btn', { timeout: 30000 })
    await sleep(1200)
    await applyTextScale(mp, 2.0)
    await sleep(1200)
    const mb = await checkBleed(mp)
    check('mobile 390x844 2x font no bleed', mb.scrollW === mb.innerW, `${mb.scrollW}/${mb.innerW}`)
    await mp.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await sleep(800)
    const mb2 = await checkBleed(mp)
    check('mobile 2x font no bleed after full scroll', mb2.scrollW === mb2.innerW, `${mb2.scrollW}/${mb2.innerW}`)
    await mp.evaluate(() => window.scrollTo(0, 0))
    await sleep(400)
    await mp.screenshot({ path: path.join(OUT, 'ws5-mobile-390x844-2xfont.png') })
    await mctx.close()
  } finally {
    await browser.close()
  }

  const failed = results.checks.filter(c => !c.ok)
  console.log('\n==== SUMMARY ====')
  console.log(`${results.checks.length - failed.length}/${results.checks.length} checks passed`)
  console.log(`page errors: ${results.errors.length}`)
  for (const e of results.errors) console.log('  ' + e)
  if (failed.length || results.errors.length) process.exitCode = 1
}

process.on('exit', () => {
  try { execSync('node scripts/serve-nitro-qa.mjs stop', { stdio: 'ignore' }) } catch { /* best effort */ }
})

run().catch(e => { console.error('QA CRASH:', e); process.exitCode = 2 })
