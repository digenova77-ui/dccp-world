// WS2 QA: /explorer against the real Nitro SSR on 127.0.0.1:8083.
// Desktop 1440x900 + mobile 390x844 at 2x font scale; bleed, verify-chain, DAG counts, zero page errors.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const OUT = path.resolve('screenshots')
fs.mkdirSync(OUT, { recursive: true })
const URL = 'http://127.0.0.1:8083/explorer'
const CHROME = '/home/hatch/workspace/.qa/chrome-linux64/chrome'
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function applyTextScale(page, s) {
  await page.evaluate(scale => {
    const els = [...document.querySelectorAll('body *')]
    const orig = els.map(el => parseFloat(getComputedStyle(el).fontSize))
    els.forEach((el, i) => { if (orig[i] > 0) el.style.setProperty('font-size', (orig[i] * scale).toFixed(2) + 'px', 'important') })
  }, s)
}

async function checkBleed(page) {
  return await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
  }))
}

const results = { checks: [], errors: [] }

function check(name, ok, detail = '') {
  results.checks.push({ name, ok, detail })
  console.log((ok ? 'PASS' : 'FAIL') + ' | ' + name + (detail ? ' — ' + detail : ''))
}

async function run() {
  const browser = await chromium.launch({ executablePath: CHROME })
  try {
    // ---------- desktop ----------
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    page.on('pageerror', e => results.errors.push('pageerror: ' + e.message))
    page.on('console', m => {
      if (m.type() === 'error' && !m.text().includes('ERR_EMPTY_RESPONSE'))
        results.errors.push('console: ' + m.text().slice(0, 200))
    })

    await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForSelector('.ex2d .blocks .block', { timeout: 30000 })
    check('explorer renders', await page.locator('.ex2d h1.brand').isVisible())

    const blockCount = await page.locator('.ex2d .blocks .block').count()
    check('seeded chain shows 9 blocks', blockCount === 9, `found ${blockCount}`)

    const firstHash = await page.locator('.ex2d .blocks .block .hashline').first().textContent()
    check('hash links present', /hash\s+[0-9a-f]{20}…[0-9a-f]{10}/.test(firstHash ?? ''), (firstHash ?? '').slice(0, 40))

    // TASK_BIND first-job block present
    const taskBind = await page.locator('.ex2d .block', { hasText: 'TASK_BIND · FIRST JOB' }).count()
    check('TASK_BIND first-job block seeded', taskBind === 1)
    const firstJobLabel = await page.locator('.ex2d .block', { hasText: 'TASK_BIND · FIRST JOB' }).locator('.pill.label').textContent()
    check('first-job label is PILOT · LOCAL · FIRST JOB', (firstJobLabel ?? '').includes('PILOT · LOCAL · FIRST JOB'), firstJobLabel ?? '')

    // verify chain
    await page.locator('.ex2d .actions button.primary').click()
    await page.waitForSelector('.ex2d .valid.ok', { timeout: 30000 })
    await sleep(500)
    const validBadges = await page.locator('.ex2d .valid.ok').count()
    const brokenBadges = await page.locator('.ex2d .valid.bad').count()
    check('verify-chain reports 9/9 VALID', validBadges === 9 && brokenBadges === 0, `ok=${validBadges} bad=${brokenBadges}`)

    // DAG counts
    const claimNodes = await page.locator('.ex2d svg.dag g.node[aria-label^="Claim"]').count()
    const testNodes = await page.locator('.ex2d svg.dag g.node[aria-label^="Test:"]').count()
    const receiptNodes = await page.locator('.ex2d svg.dag g.node[aria-label^="Register receipt"]').count()
    const taskNodes = await page.locator('.ex2d svg.dag g.node[aria-label^="Task"]').count()
    check('DAG claim nodes = 16', claimNodes === 16, `found ${claimNodes}`)
    check('DAG test nodes = 10', testNodes === 10, `found ${testNodes}`)
    check('DAG receipt nodes = 9', receiptNodes === 9, `found ${receiptNodes}`)
    check('DAG task node = 1', taskNodes === 1, `found ${taskNodes}`)

    // node select -> detail card
    await page.locator('.ex2d svg.dag g.node[aria-label^="Claim C3"]').click()
    await sleep(300)
    const detailVisible = await page.locator('.ex2d .detail h3', { hasText: 'C3' }).isVisible()
    check('claim node tap opens detail', detailVisible)

    // empty slots honest
    const slots = await page.locator('.ex2d .slots .slot').count()
    const slotText = await page.locator('.ex2d .slots .slot').first().textContent()
    check('3 honest empty future slots', slots === 3 && /no sealed blocks yet/i.test(slotText ?? ''), (slotText ?? '').slice(0, 60))

    // device keyring honest empty state (fresh browser profile)
    const keyringEmpty = await page.locator('.ex2d .device .empty').textContent()
    check('keyring honest empty state', (keyringEmpty ?? '').includes('keyring is empty'))

    const bleed = await checkBleed(page)
    check('desktop no bleed', bleed.scrollW === bleed.innerW, `${bleed.scrollW}/${bleed.innerW}`)

    await page.screenshot({ path: path.join(OUT, 'ws2-desktop-1440x900-explorer.png') })
    await page.locator('.ex2d section[aria-label="DAG mapper"]').scrollIntoViewIfNeeded()
    await sleep(400)
    await page.screenshot({ path: path.join(OUT, 'ws2-desktop-1440x900-dag.png') })
    await ctx.close()

    // ---------- mobile 390x844, 2x font ----------
    const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
    const mp = await mctx.newPage()
    mp.on('pageerror', e => results.errors.push('mobile pageerror: ' + e.message))
    mp.on('console', m => {
      if (m.type() === 'error' && !m.text().includes('ERR_EMPTY_RESPONSE'))
        results.errors.push('mobile console: ' + m.text().slice(0, 200))
    })
    await mp.goto(URL, { waitUntil: 'networkidle', timeout: 60000 })
    await mp.waitForSelector('.ex2d .blocks .block', { timeout: 30000 })
    await sleep(1500)
    await applyTextScale(mp, 2.0)
    await sleep(1500)
    const mb = await checkBleed(mp)
    check('mobile 390x844 2x font no bleed', mb.scrollW === mb.innerW, `${mb.scrollW}/${mb.innerW}`)
    // scroll through the whole page at 2x and re-check bleed at the bottom (DAG svg + slots)
    await mp.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await sleep(800)
    const mb2 = await checkBleed(mp)
    check('mobile 2x font no bleed after full scroll', mb2.scrollW === mb2.innerW, `${mb2.scrollW}/${mb2.innerW}`)
    await mp.evaluate(() => window.scrollTo(0, 0))
    await sleep(400)
    await mp.screenshot({ path: path.join(OUT, 'ws2-mobile-390x844-explorer-2xfont.png') })
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

run().catch(e => { console.error('QA CRASH:', e); process.exitCode = 2 })
