// WS6 QA: exercise the self-arbitrage loop end-to-end in real Chromium
// against the Nitro SSR production build on :8081.
// Checks: route renders, happy path, veto receipt, abstain, unpriced reject,
// score readout, zero page errors, mobile 390x844 no bleed.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const OUT = path.resolve('screenshots')
fs.mkdirSync(OUT, { recursive: true })
const URL = 'http://127.0.0.1:8081/arbitrage'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} · ${name}${detail ? ' — ' + detail : ''}`)
}

async function main() {
  const browser = await chromium.launch({ executablePath: '/home/hatch/workspace/.qa/chrome-linux64/chrome' })

  // Desktop pass
  {
    const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
    const errors = []
    page.on('pageerror', e => errors.push('pageerror: ' + e.message))
    page.on('console', m => { if (m.type() === 'error' && !/ERR_EMPTY_RESPONSE/.test(m.text())) errors.push('console: ' + m.text().slice(0, 200)) })
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 })
    await sleep(1500)

    check('route renders the arbitrage HUD', await page.locator('main.arb h1').isVisible())
    const h1 = await page.locator('main.arb h1').textContent()
    check('headline is the house line', (h1 || '').includes('house always wins on truth'), h1 || '')
    check('stub is honestly labeled', (await page.locator('main.arb').textContent() || '').includes('never an LLM'))

    // Happy path
    await page.getByRole('button', { name: /Happy path/ }).click()
    await sleep(800)
    const run0 = await page.locator('.arb-run').nth(0).textContent()
    check('happy path ALLOWED · binding consumed', (run0 || '').includes('ALLOWED · binding consumed'), (run0 || '').slice(0, 120))
    check('happy path executed the verified spread', (run0 || '').includes('Outcome EXECUTE') && (run0 || '').includes('claim-1, claim-2'))

    // Veto
    await page.getByRole('button', { name: /Deterministic veto/ }).click()
    await sleep(800)
    const vetoReceipt = page.locator('.arb-receipt.veto')
    check('veto receipt appears in the ledger', await vetoReceipt.isVisible())
    const vetoText = (await vetoReceipt.textContent()) || ''
    check('veto receipt names claim, pricing, reason', vetoText.includes('claim-2') && vetoText.includes('REJECTED') && vetoText.includes('HOST_SAFE'), vetoText.slice(0, 140))
    const run1 = await page.locator('.arb-run').nth(1).textContent()
    check('vetoed run still binds (executed claim-1 only)', (run1 || '').includes('ALLOWED') && (run1 || '').includes('vetoed claim-2'))

    // Abstain
    await page.getByRole('button', { name: /Abstain evidence/ }).click()
    await sleep(800)
    const pageText = await page.locator('main.arb').textContent()
    check('abstain path works (Outcome ABSTAIN shown)', (pageText || '').includes('Outcome ABSTAIN'))
    check('abstain receipt names the unproven claim', (pageText || '').includes('claim-1 · UNPROVEN'))

    // Unpriced attempt
    await page.getByRole('button', { name: /Unpriced attempt/ }).click()
    await sleep(800)
    const run3 = await page.locator('.arb-run').nth(3).textContent()
    check('unpriced decision REJECTED fail-closed', (run3 || '').includes('REJECTED · UNPRICED_DECISION'), (run3 || '').slice(0, 140))

    // Score readout: happy(2 proven) + veto(1 proven,1 rejected) + abstain(1 unproven)
    // proposed=5, proven=3, unproven=1, rejected=1, abstained=1 → precision 0.60, strictness 2.00, score 1.20
    const scoreText = await page.locator('.arb-score').textContent()
    const mainText = await page.locator('main.arb').textContent()
    check('score readout labeled PILOT · LOCAL', (mainText || '').includes('PILOT · LOCAL'))
    check('precision 0.60 from the ledger', (scoreText || '').includes('0.60'), (scoreText || '').replace(/\s+/g, ' ').slice(0, 200))
    check('strictness 2.00 from the ledger', (scoreText || '').includes('2.00'))
    check('arbitrage score 1.20 from the ledger', (scoreText || '').includes('1.20'))

    // Chain tamper-evidence: every receipt carries an entry hash
    const hashes = await page.locator('.arb-receipt .rh').count()
    check('every receipt carries an entry hash', hashes >= 10, `${hashes} receipt hashes`)

    check('zero page errors (desktop)', errors.length === 0, errors.join(' | ').slice(0, 300))
    await page.screenshot({ path: path.join(OUT, 'ws6-desktop-arbitrage.png') })
    await page.close()
  }

  // Mobile pass: 390x844, bleed check
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', e => errors.push('pageerror: ' + e.message))
    page.on('console', m => { if (m.type() === 'error' && !/ERR_EMPTY_RESPONSE/.test(m.text())) errors.push('console: ' + m.text().slice(0, 200)) })
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 })
    await sleep(1200)
    await page.getByRole('button', { name: /Happy path/ }).click()
    await sleep(800)
    const bleed = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth,
      pastEdge: [...document.querySelectorAll('*')].filter(el => {
        const r = el.getBoundingClientRect()
        return r.right > window.innerWidth + 1 || r.left < -1
      }).length,
    }))
    check('mobile 390x844 no bleed', bleed.scrollW === bleed.innerW && bleed.pastEdge === 0, JSON.stringify(bleed))
    check('zero page errors (mobile)', errors.length === 0, errors.join(' | ').slice(0, 300))
    await page.screenshot({ path: path.join(OUT, 'ws6-mobile-arbitrage-390x844.png') })
    await page.close()
  }

  await browser.close()
  const failed = results.filter(r => !r.ok)
  console.log(`\nWS6 QA: ${results.length - failed.length}/${results.length} checks passed`)
  if (failed.length) process.exit(1)
}

main().catch(e => { console.error('WS6 QA crashed:', e); process.exit(2) })
