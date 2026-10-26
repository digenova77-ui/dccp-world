// WS2b QA: /explorer Pyramid instrument against the real Nitro SSR on 127.0.0.1:8083.
// Desktop 1440x900 + mobile 390x844 at 2x font scale: pyramid renders, geometry
// toggle, drill navigation, shell expand + virtualized list, audit derivation,
// DAG regression (16/10/9/1), verify-chain still 9/9, bleed, zero page errors.
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
    await page.waitForSelector('.ex2d section[aria-label="Pyramid"]', { timeout: 30000 })
    check('pyramid section renders', await page.locator('.ex2d section[aria-label="Pyramid"] h2').isVisible())

    // geometry toggle: simplex default stats
    const simplexTotal = await page.locator('.ex2d section[aria-label="Pyramid"] .stat b').first().textContent()
    check('simplex derives 63 nodes', (simplexTotal ?? '').trim() === '63', simplexTotal ?? '')
    const simplexVerdict = await page.locator('.ex2d .pyr-verdict').textContent()
    check('simplex verdict names the unfolding', /Simplex unfolding/.test(simplexVerdict ?? ''), (simplexVerdict ?? '').slice(0, 60))

    // switch to fractal tesseract
    await page.locator('.ex2d .pyr-toggle button', { hasText: 'fractal tesseract' }).click()
    await sleep(600)
    const tessTotal = await page.locator('.ex2d section[aria-label="Pyramid"] .stat b').first().textContent()
    check('tesseract derives 203 nodes', (tessTotal ?? '').trim() === '203', tessTotal ?? '')
    const tessVerdict = await page.locator('.ex2d .pyr-verdict').textContent()
    check('tesseract verdict names the sparse fractal', /sparse tesseract/.test(tessVerdict ?? ''), (tessVerdict ?? '').slice(0, 60))
    await page.locator('.ex2d section[aria-label="Pyramid"]').scrollIntoViewIfNeeded()
    await sleep(300)
    await page.screenshot({ path: path.join(OUT, 'ws2b-desktop-pyramid-tesseract.png') })

    // back to simplex for the drill
    await page.locator('.ex2d .pyr-toggle button', { hasText: '4-simplex unfolding' }).click()
    await sleep(600)

    // drill: breadcrumb starts at apex
    const crumb0 = await page.locator('.ex2d .pyr-crumbs .pyr-crumb').first().textContent()
    check('drill breadcrumb starts at apex', /APEX/.test(crumb0 ?? '') && /white light/.test(crumb0 ?? ''), (crumb0 ?? '').slice(0, 50))
    const focusTitle = await page.locator('.ex2d .pyr-focus-head b').textContent()
    check('focus card shows apex', /white light/.test(focusTitle ?? ''), focusTitle ?? '')
    const focusCoord = await page.locator('.ex2d .pyr-focus .pyr-coord').textContent()
    check('apex coordinate is the origin', /t 0 · n 0 · h 0 · c 0/.test(focusCoord ?? ''), focusCoord ?? '')

    // step +t along the truth emanation → TRUTH_OR_NOTHING corner
    await page.locator('.ex2d .pyr-emanate button', { hasText: '+t truth' }).click()
    await sleep(400)
    const cornerTitle = await page.locator('.ex2d .pyr-focus-head b').textContent()
    check('drill +t reaches the truth corner', /TRUTH_OR_NOTHING/.test(cornerTitle ?? ''), cornerTitle ?? '')
    const cornerCoord = await page.locator('.ex2d .pyr-focus .pyr-coord').textContent()
    check('corner coordinate is (t 1 · n 0 · h 0 · c 0)', /t 1 · n 0 · h 0 · c 0/.test(cornerCoord ?? ''), cornerCoord ?? '')
    const crumbs = await page.locator('.ex2d .pyr-crumbs .pyr-crumb').count()
    check('breadcrumb shows apex → corner path', crumbs === 2, `crumbs=${crumbs}`)

    // step +t again → claim C1
    await page.locator('.ex2d .pyr-emanate button', { hasText: '+t truth' }).click()
    await sleep(400)
    const claimTitle = await page.locator('.ex2d .pyr-focus-head b').textContent()
    check('drill reaches claim C1', /^C1 ·/.test(claimTitle ?? ''), claimTitle ?? '')

    // step +c from C1 → unmaterialized address renders honest hollow
    await page.locator('.ex2d .pyr-emanate button', { hasText: '+c cleanup' }).click()
    await sleep(400)
    const hollowTitle = await page.locator('.ex2d .pyr-focus-head b').textContent()
    const hollowCoord = await page.locator('.ex2d .pyr-focus .pyr-coord').textContent()
    check('unmaterialized address renders honest hollow', /not yet derived/.test(hollowTitle ?? ''), `${hollowTitle} @ ${hollowCoord}`)
    await page.locator('.ex2d section[aria-label="Pyramid"]').scrollIntoViewIfNeeded()
    await sleep(300)
    await page.screenshot({ path: path.join(OUT, 'ws2b-desktop-pyramid-drill.png') })

    // audit derivation
    await page.locator('.ex2d section[aria-label="Pyramid"] .actions button.primary').click()
    await sleep(800)
    const auditText = await page.locator('.ex2d section[aria-label="Pyramid"] .verifyline').last().textContent()
    check('audit derivation walks all paths valid', /derivation paths valid/.test(auditText ?? ''), (auditText ?? '').slice(0, 80))

    // shells: expand shell 2 → virtualized list with the first claim + genesis block
    await page.getByRole('button', { name: 'Shell 2: 2 content, 0 hollow nodes — expand' }).click()
    await sleep(500)
    const vlistVisible = await page.locator('.ex2d .pyr-vlist').isVisible()
    check('shell expand shows virtualized list', vlistVisible)
    const rowCount = await page.locator('.ex2d .pyr-vrow').count()
    check('shell 2 lists its nodes', rowCount >= 1, `rows=${rowCount}`)
    // tap the row → focus jumps to C1
    await page.locator('.ex2d .pyr-vrow').first().click()
    await sleep(400)
    const afterPick = await page.locator('.ex2d .pyr-focus-head b').textContent()
    check('node tap drills to the node', /^C1 ·/.test(afterPick ?? ''), afterPick ?? '')

    // DAG regression in the browser: still 16/10/9/1 from the generator
    const claimNodes = await page.locator('.ex2d svg.dag g.node[aria-label^="Claim"]').count()
    const testNodes = await page.locator('.ex2d svg.dag g.node[aria-label^="Test:"]').count()
    const receiptNodes = await page.locator('.ex2d svg.dag g.node[aria-label^="Register receipt"]').count()
    const taskNodes = await page.locator('.ex2d svg.dag g.node[aria-label^="Task"]').count()
    check('DAG regression 16/10/9/1 from generator', claimNodes === 16 && testNodes === 10 && receiptNodes === 9 && taskNodes === 1,
      `${claimNodes}/${testNodes}/${receiptNodes}/${taskNodes}`)

    // verify chain still honest
    await page.locator('.ex2d section[aria-label="Block explorer"] .actions button.primary').click()
    await page.waitForSelector('.ex2d .valid.ok', { timeout: 30000 })
    await sleep(400)
    const validBadges = await page.locator('.ex2d .valid.ok').count()
    check('verify-chain still 9/9 VALID', validBadges === 9, `ok=${validBadges}`)

    // ---- telemetrics absorption: the design's data model accounts for all six
    // existing feeds by name (src/dccp/live/feeds.ts is the source of truth).
    // Verified against the real served world bundle, discovered dynamically. ----
    const FEEDS = [
      ['quakes', 'Earthquakes · M2.5+ past day'],
      ['iss', 'International Space Station'],
      ['weather', 'Air at the point under the camera'],
      ['kp', 'Geomagnetic Kp index'],
      ['carbon', 'Grid carbon intensity · Britain'],
      ['river', 'Moira River at Belleville (02HM003)'],
    ]
    const feedTitles = await page.evaluate(async () => {
      const res = performance.getEntriesByType('resource').filter(r => r.name.endsWith('.js'))
      const urls = res.length
        ? res.map(r => r.name)
        : [...document.querySelectorAll('script[src]')].map(s => s.src)
      const texts = []
      for (const u of [...new Set(urls)]) {
        try {
          texts.push(await (await fetch(u)).text())
        } catch {}
      }
      return texts.join('\n')
    })
    // the world bundle loads on / — visit it so its chunks are in the resource list
    await page.goto('http://127.0.0.1:8083/', { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForTimeout(4000)
    const worldText = await page.evaluate(async () => {
      const urls = performance
        .getEntriesByType('resource')
        .filter(r => r.name.endsWith('.js'))
        .map(r => r.name)
      const texts = []
      for (const u of [...new Set(urls)]) {
        try {
          texts.push(await (await fetch(u)).text())
        } catch {}
      }
      return texts.join('\n')
    })
    const haystack = feedTitles + '\n' + worldText
    const missingFeeds = FEEDS.filter(([, title]) => !haystack.includes(title))
    check(
      'all six telemetrics feeds in the app data model by name',
      missingFeeds.length === 0,
      missingFeeds.length ? 'missing: ' + missingFeeds.map(f => f[0]).join(',') : 'quakes·iss·weather·kp·carbon·river',
    )
    // back to the explorer for the remaining checks
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForSelector('.ex2d section[aria-label="Pyramid"]', { timeout: 30000 })

    const bleed = await checkBleed(page)
    check('desktop no bleed', bleed.scrollW === bleed.innerW, `${bleed.scrollW}/${bleed.innerW}`)
    await page.locator('.ex2d section[aria-label="Pyramid"] .sechead').scrollIntoViewIfNeeded()
    await sleep(300)
    await page.screenshot({ path: path.join(OUT, 'ws2b-desktop-pyramid-simplex.png') })
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
    await mp.waitForSelector('.ex2d section[aria-label="Pyramid"]', { timeout: 30000 })
    await sleep(1200)
    await applyTextScale(mp, 2.0)
    await sleep(1200)
    // drill on mobile: step +t to the corner
    await mp.locator('.ex2d .pyr-emanate button', { hasText: '+t truth' }).click()
    await sleep(500)
    const mTitle = await mp.locator('.ex2d .pyr-focus-head b').textContent()
    check('mobile drill reaches truth corner', /TRUTH_OR_NOTHING/.test(mTitle ?? ''), mTitle ?? '')
    const mb = await checkBleed(mp)
    check('mobile 390x844 2x font no bleed (top)', mb.scrollW === mb.innerW, `${mb.scrollW}/${mb.innerW}`)
    await mp.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await sleep(800)
    const mb2 = await checkBleed(mp)
    check('mobile 2x font no bleed after full scroll', mb2.scrollW === mb2.innerW, `${mb2.scrollW}/${mb2.innerW}`)
    await mp.evaluate(() => { window.scrollTo(0, 0); document.querySelector('.ex2d section[aria-label="Pyramid"]').scrollIntoView() })
    await sleep(500)
    await mp.screenshot({ path: path.join(OUT, 'ws2b-mobile-390x844-pyramid-2xfont.png') })
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
