/** Iris gates E2E — real Chromium against the served production build.
 * Demonstrates the gates catching real violation paths end-to-end:
 *  1. ?iris-audit=1 audit panel renders, page starts CLEAN.
 *  2. An injected <input type=password> is caught by GATE-NOPASSWORD (IMP-13).
 *  3. An injected fake SEALED receipt claim is caught by GATE-SEAL (IMP-02).
 *  4. Mobile 390x844 sanity + zero page errors throughout. */
import { chromium } from 'playwright-core'

const BASE = 'http://127.0.0.1:8081'
const EXE = '/home/hatch/.cache/ms-playwright/chromium-1243/chrome-linux/chrome'
const errors = []

const browser = await chromium.launch({
  executablePath: EXE,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`)
}

try {
  // ---- desktop: audit page ----
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  page.on('pageerror', e => errors.push('pageerror: ' + e.message))
  // The Grok platform's own branding injector (extensions.js) cannot be
  // reached from this sandbox — environmental, not an app fault. Everything
  // else must be silent.
  const IGNORED_URL = 'grok.com/grok-app-builder/extensions.js'
  page.on('requestfailed', r => {
    if (!r.url().includes(IGNORED_URL)) errors.push('requestfailed: ' + (r.failure()?.errorText ?? '') + ' ' + r.url().slice(0, 100))
  })

  await page.goto(BASE + '/?iris-audit=1', { waitUntil: 'networkidle', timeout: 45000 })
  await page.waitForSelector('#iris-audit', { timeout: 15000 })
  const panelText = await page.textContent('#iris-audit')
  check('audit panel renders with ?iris-audit=1', panelText.includes('IRIS AUDIT'), panelText.slice(0, 80))
  check('live page starts CLEAN (no impurities in our own code)', panelText.includes('CLEAN'), panelText.slice(0, 120))

  // ---- violation 1: password input (GATE-NOPASSWORD / IMP-13) ----
  await page.evaluate(() => {
    const input = document.createElement('input')
    input.type = 'password'
    input.name = 'user_password'
    input.id = 'evil-pw'
    document.body.appendChild(input)
  })
  await page.waitForFunction(
    () => document.querySelector('#iris-audit')?.textContent?.includes('IMP-13'),
    { timeout: 10000 },
  )
  const pwText = await page.textContent('#iris-audit')
  check('GATE-NOPASSWORD catches an injected password field (IMP-13)', pwText.includes('IMP-13'), 'fail-closed: invalid syntax')
  await page.screenshot({ path: '/workspace/screenshots/gates-e2e-password-caught.png' })

  // ---- violation 2: fake SEALED receipt (GATE-SEAL / IMP-02) ----
  await page.evaluate(() => {
    document.getElementById('evil-pw')?.remove()
    const div = document.createElement('div')
    div.setAttribute('data-receipt', 'fake')
    div.textContent = 'SEALED · trust me'
    document.body.appendChild(div)
  })
  await page.waitForFunction(
    () => document.querySelector('#iris-audit')?.textContent?.includes('IMP-02'),
    { timeout: 10000 },
  )
  const sealText = await page.textContent('#iris-audit')
  check('GATE-SEAL catches a fake SEALED receipt claim (IMP-02)', sealText.includes('IMP-02'), 'unevidenced SEALED rejected')
  await page.screenshot({ path: '/workspace/screenshots/gates-e2e-fake-sealed-caught.png' })

  // ---- remove violations: panel returns to CLEAN ----
  await page.evaluate(() => {
    document.querySelectorAll('[data-receipt]').forEach(el => el.remove())
  })
  await page.waitForFunction(
    () => document.querySelector('#iris-audit')?.textContent?.includes('CLEAN'),
    { timeout: 10000 },
  )
  check('audit returns to CLEAN after violations removed', true)

  // ---- mobile 390x844 ----
  const mob = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true })
  mob.on('pageerror', e => errors.push('mobile pageerror: ' + e.message))
  await mob.goto(BASE + '/?iris-audit=1', { waitUntil: 'networkidle', timeout: 45000 })
  await mob.waitForSelector('#iris-audit', { timeout: 15000 })
  const bleed = await mob.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  check('mobile 390x844: no horizontal bleed', bleed <= 1, `overflow ${bleed}px`)
  await mob.screenshot({ path: '/workspace/screenshots/gates-e2e-mobile.png' })

  check('zero page errors across desktop + mobile', errors.length === 0, errors.slice(0, 3).join(' | '))
} finally {
  await browser.close()
}

const failed = results.filter(r => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} E2E checks passed`)
process.exit(failed.length ? 1 : 0)
