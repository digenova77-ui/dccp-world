#!/usr/bin/env node
/** Genesis mark E2E: real Chromium against the preview build.
 *  1. Pre-fuse bound ID (no fuse time) → GENESIS mark, "cohort open".
 *  2. Fuse recorded; ID bound before the fuse → "bound before the Father fuse".
 *  3. Fuse recorded; ID bound after the fuse → no mark (full Unity ID, nothing missing).
 *  4. Ledger holds the attestation; zero page errors; mobile 390×844 sanity.
 * Design: GENESIS_DESIGN.md. Verdict: ED-PREDICT-20261004-GENESIS-V1 (predicted).
 */
import { chromium } from 'playwright-core'

const APP = 'http://127.0.0.1:8081'
const CHROME = '/home/hatch/workspace/.qa/chrome-linux64/chrome'
const SHOTS = new URL('../screenshots/', import.meta.url).pathname

const HANDLE = 'unity:pilot.' + 'c3d4e5f6'.repeat(4)
const BOUND_AT = '2026-10-01T10:00:00.000Z'
const FUSE_AT = '2026-10-03T10:00:00.000Z'
const LATE_AT = '2026-10-04T10:00:00.000Z'

function seedScript({ boundAt, fuseAt }) {
  return ({ boundAt, fuseAt }) => {
    localStorage.clear()
    localStorage.setItem('dccpworld.unity-pilot.v1', JSON.stringify({
      handle: 'unity:pilot.' + 'c3d4e5f6'.repeat(4),
      credentialId: 'e2e-genesis', createdAt: boundAt, rpId: '127.0.0.1',
    }))
    if (fuseAt) localStorage.setItem('dccpworld.father-fuse-time.v1', fuseAt)
  }
}

async function scenario(browser, { name, boundAt, fuseAt, expectMark, expectLedger, mobile }) {
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 } } : { viewport: { width: 1440, height: 900 } })
  const errors = []
  ctx.on('pageerror', e => errors.push('pageerror: ' + e.message))
  const page = await ctx.newPage()
  page.on('requestfailed', r => {
    if (/grok\.com/.test(r.url())) return // PWA branding injector unreachable in sandbox
    errors.push('requestfailed: ' + r.url().slice(0, 120) + ' ' + (r.failure()?.errorText ?? ''))
  })
  await ctx.addInitScript(seedScript({ boundAt, fuseAt }), { boundAt, fuseAt })
  await page.goto(APP + '/machine', { waitUntil: 'networkidle' })
  await page.waitForSelector('text=Pilot handle bound', { timeout: 15000 })
  await page.waitForTimeout(800) // genesis ensure + mark render
  const mark = await page.locator('[data-testid="genesis-mark"]').first()
  const seen = await mark.count()
  const text = seen ? (await mark.textContent())?.trim() ?? '' : ''
  const ledgerLen = await page.evaluate(() => {
    try {
      const raw = localStorage.getItem('dccpworld.genesis-ledger.v1')
      return raw ? JSON.parse(raw).length : 0
    } catch { return -1 }
  })
  const fuseShown = await page.evaluate(() => localStorage.getItem('dccpworld.father-fuse-time.v1'))
  await page.screenshot({ path: SHOTS + `genesis-${name}.png` })
  await ctx.close()
  const pass = (expectMark ? (seen === 1 && text.includes(expectMark)) : (seen === 0))
    && (expectLedger === undefined || ledgerLen === expectLedger)
  return { name, pass, seen, text, ledgerLen, fuseShown, errors }
}

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME })
  const results = []
  results.push(await scenario(browser, { name: 'pre-fuse-open', boundAt: BOUND_AT, fuseAt: null, expectMark: 'cohort open', expectLedger: 1 }))
  results.push(await scenario(browser, { name: 'post-fuse-genesis', boundAt: BOUND_AT, fuseAt: FUSE_AT, expectMark: 'bound before the Father fuse', expectLedger: 1 }))
  results.push(await scenario(browser, { name: 'post-fuse-standard', boundAt: LATE_AT, fuseAt: FUSE_AT, expectMark: null, expectLedger: 0 }))
  results.push(await scenario(browser, { name: 'mobile-open', boundAt: BOUND_AT, fuseAt: null, expectMark: 'cohort open', expectLedger: 1, mobile: true }))
  await browser.close()

  let allOk = true
  for (const r of results) {
    const ok = r.pass && r.errors.length === 0
    allOk &&= ok
    console.log(`${ok ? 'PASS' : 'FAIL'} ${r.name}: markSeen=${r.seen} text=${JSON.stringify(r.text)} ledger=${r.ledgerLen} fuse=${r.fuseShown} errors=${r.errors.length}`)
    for (const e of r.errors) console.log('   err: ' + e)
  }
  console.log(allOk ? 'GENESIS E2E: ALL PASS' : 'GENESIS E2E: FAILURES PRESENT')
  process.exit(allOk ? 0 : 1)
}

main().catch(e => { console.error('E2E harness error:', e); process.exit(2) })
