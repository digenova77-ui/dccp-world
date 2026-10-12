// Final verification: mobile bleed fix + Belleville boot.
// - 390x844, faithful text-scale emulation (1.5x per task, plus 2x for David's larger system font)
// - assert scrollWidth === innerWidth: home view, place card open, scale rail visible, atlas panel open
// - assert no element's rect extends past the viewport horizontally, no ladder/card overlap
// - desktop 1440x900 boot screenshot for the Belleville view; collect console errors
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const OUT = path.resolve('screenshots')
fs.mkdirSync(OUT, { recursive: true })
const URL = 'http://127.0.0.1:8081/'
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function applyTextScale(page, scale) {
  await page.evaluate(s => {
    const els = [...document.querySelectorAll('*')]
    const orig = els.map(el => parseFloat(getComputedStyle(el).fontSize))
    els.forEach((el, i) => { if (orig[i] > 0) el.style.setProperty('font-size', (orig[i] * s).toFixed(2) + 'px', 'important') })
  }, scale)
  await sleep(700)
}

async function checkBleed(page, label) {
  return await page.evaluate(l => {
    const vw = window.innerWidth
    const d = document.documentElement
    const past = []
    const seen = new Set()
    for (const el of document.querySelectorAll('*')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) continue
      if (r.left < -1 || r.right > vw + 1) {
        const tag = el.tagName.toLowerCase()
        const cls = (el.className && el.className.baseVal !== undefined ? '' : String(el.className || '')).split(' ').filter(Boolean).slice(0, 2).join('.')
        const key = tag + '.' + cls
        if (!seen.has(key)) { seen.add(key); past.push({ key, l: Math.round(r.left), r: Math.round(r.right) }) }
      }
    }
    const ladder = document.querySelector('.ladder')
    const card = document.querySelector('.card:not([hidden])')
    const lr = ladder && !ladder.hidden ? ladder.getBoundingClientRect() : null
    const cr = card ? card.getBoundingClientRect() : null
    const overlap = lr && cr ? !(lr.right <= cr.left || lr.left >= cr.right || lr.bottom <= cr.top || lr.top >= cr.bottom) : false
    return { label: l, vw, scrollW: d.scrollWidth, equal: d.scrollWidth === vw, pastEdge: past, ladderCardOverlap: overlap }
  }, label)
}

async function enterGate(page) {
  // Click via DOM dispatch: avoids Playwright actionability handshakes stalling
  // on the software-GL render loop in this sandbox.
  await page.evaluate(() => document.querySelector('button[data-enter="read"]')?.click())
  await page.waitForFunction(() => window.__world && window.__world.ready, null, { timeout: 90000 })
}

const results = []
const browser = await chromium.launch({ executablePath: '/home/hatch/workspace/.qa/chrome-linux64/chrome' })

// ---------- desktop: Belleville boot ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', e => errors.push('pageerror: ' + e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)) })
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 })
  await enterGate(page)
  await sleep(3000)
  await page.screenshot({ path: path.join(OUT, 'desktop-1440x900-belleville-boot.png'), timeout: 120000 })
  results.push({ view: 'desktop-boot', errors: [...new Set(errors)] })
  await ctx.close()
}

// ---------- mobile: bleed checks ----------
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', e => errors.push('pageerror: ' + e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)) })
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 })
  await enterGate(page)
  await sleep(2500)

  for (const scale of [1.5, 2.0]) {
    // reset then apply this scale
    await page.reload({ waitUntil: 'networkidle' })
    await enterGate(page)
    await sleep(2000)
    await applyTextScale(page, scale)

    // (a) home view, rail visible
    results.push(await checkBleed(page, `mobile-${scale}x-home-rail`))
    // (b) place card open
    await page.evaluate(() => window.__world.goTo({ kind: 'city', key: 'CAN:Toronto' }))
    await sleep(4000)
    results.push(await checkBleed(page, `mobile-${scale}x-card`))
    if (scale === 2.0) await page.screenshot({ path: path.join(OUT, 'mobile-390x844-bleedfix.png'), timeout: 120000 })
    // (c) atlas panel open
    await page.evaluate(() => window.__world.goTo({ kind: 'telemetrics', key: 'telemetrics' }))
    await sleep(3000)
    await page.keyboard.press('a') // atlas toggle (if bound)
    await sleep(1200)
    const atlasOpen = await page.evaluate(() => !document.querySelector('.panel.atlas')?.hidden)
    if (!atlasOpen) await page.evaluate(() => { document.querySelector('.panel.atlas')?.removeAttribute('hidden') })
    await sleep(600)
    results.push(await checkBleed(page, `mobile-${scale}x-atlas`))
  }
  results.push({ view: 'mobile', errors: [...new Set(errors)] })
  await ctx.close()
}

await browser.close()
const failures = results.filter(r => r.equal === false || (r.pastEdge && r.pastEdge.length) || r.ladderCardOverlap)
console.log(JSON.stringify({ failures, results }, null, 2))
console.log(failures.length === 0 ? 'BLEED QA: PASS' : 'BLEED QA: FAIL')
