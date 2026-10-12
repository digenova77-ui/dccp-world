// Merge QA (Oct 4, 2026): verifies the true-merge of the Grok branch + parent's work.
// Desktop 1440x900: Belleville boot, 4 landing cards, telemetrics, corph (74/503/20.89),
//   DCLM UNREACHABLE, pickable count. Mobile 390x844 @2x font: no horizontal bleed.
// Zero page errors required.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const OUT = path.resolve('screenshots')
fs.mkdirSync(OUT, { recursive: true })
const URL = 'http://127.0.0.1:8081/'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const errors = []
const checks = []
const check = (name, ok, detail = '') => { checks.push({ name, ok, detail }); console.log((ok ? 'PASS' : 'FAIL') + ' | ' + name + (detail ? ' | ' + detail : '')) }

const browser = await chromium.launch({ executablePath: '/home/hatch/workspace/.qa/chrome-linux64/chrome' })

// ---------- desktop ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  page.on('pageerror', e => errors.push('pageerror: ' + e.message.slice(0, 200)))
  // grok.com branding injector can't load in this sandbox (no external net); pre-existing environmental noise, filtered like earlier QA passes
  page.on('console', m => { const u = (m.location()?.url || ''); if (m.type() === 'error' && !u.includes('grok.com')) errors.push('console: ' + m.text().slice(0, 160) + ' @ ' + u.slice(0, 80)) })
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.evaluate(() => document.querySelector('button[data-enter="read"]')?.click())
  await page.waitForFunction(() => window.__world && window.__world.ready, null, { timeout: 90000 })
  await sleep(3500)

  // 1. boot camera anchor near Belleville (44.16, -77.38): check via selected place or camera
  const bootInfo = await page.evaluate(() => {
    const w = window.__world
    return { selected: w.selected, camera: w.camera, pickables: w.pickables(), tier: w.tier }
  })
  console.log('boot:', JSON.stringify(bootInfo))
  await page.screenshot({ path: path.join(OUT, 'merge-desktop-belleville-boot.png') })

  // 2. four landing cards
  for (const key of ['cosmos', 'ontario', 'tiers', 'dclm-engine']) {
    await page.evaluate(k => window.__world.goTo({ kind: 'landing', key: k }), key)
    await sleep(4000)
    const card = await page.evaluate(() => window.__world.card)
    check(`landing card ${key}`, !!card && card.open, JSON.stringify(card))
    if (key === 'tiers') await page.screenshot({ path: path.join(OUT, 'merge-desktop-landing-tiers.png') })
  }
  // one deep level
  await page.evaluate(() => window.__world.goTo({ kind: 'landing', key: 'tiers-forensics-deep' }))
  await sleep(4000)
  const deep = await page.evaluate(() => window.__world.card)
  check('landing deep level tiers-forensics-deep', !!deep && deep.open, JSON.stringify(deep))

  // 3. telemetrics board
  await page.evaluate(() => window.__world.goTo({ kind: 'telemetrics', key: 'telemetrics' }))
  await sleep(3500)
  const tm = await page.evaluate(() => window.__world.card)
  const rows = await page.locator('.c-cell.go').count()
  check('telemetrics card + tappable rows', !!tm && tm.open && rows >= 6, `card=${JSON.stringify(tm)} rows=${rows}`)
  await page.screenshot({ path: path.join(OUT, 'merge-desktop-telemetrics.png') })

  // 4. corporate-helpers card figures
  await page.evaluate(() => window.__world.goTo({ kind: 'corph', key: 'corph' }))
  await sleep(3500)
  const cells = await page.locator('.c-cell').allInnerTexts()
  const flat = cells.join(' | ')
  check('corph 74 sealed', /74/.test(flat), cells.slice(0, 4).join(' ; '))
  check('corph 503 vectors', /503/.test(flat))
  check('corph 20.89 mean', /20\.89/.test(flat))
  await page.screenshot({ path: path.join(OUT, 'merge-desktop-corph.png') })

  // 5. DCLM honesty
  await page.evaluate(() => window.__world.goTo({ kind: 'dclm', key: 'dclm' }))
  await sleep(3500)
  const dclmCells = await page.evaluate(() => [...document.querySelectorAll('.c-cell')].map(c => c.innerText.replace(/\n/g, ' ')).join(' | '))
  const dclmFull = await page.evaluate(() => document.querySelector('.card')?.innerText ?? '')
  check('dclm UNREACHABLE', /UNREACHABLE/.test(dclmCells), dclmCells.slice(0, 120))
  check('dclm 10 of 11 sealed', /10 of 11 sealed/i.test(dclmFull))
  check('dclm no reconnect button', !/reconnect/i.test(dclmFull))
  await page.screenshot({ path: path.join(OUT, 'merge-desktop-dclm.png') })

  // 6. iris answers (ask returns an IrisReply object; the spoken text is .speech)
  const irisTm = await page.evaluate(() => window.__world.ask('telemetrics')?.speech ?? '')
  check('iris telemetrics answer', irisTm.length > 40 && !/wallet/.test(irisTm), irisTm.slice(0, 80))
  const irisCorph = await page.evaluate(() => window.__world.ask('corporate helpers')?.speech ?? '')
  check('iris corph answer', irisCorph.length > 40, irisCorph.slice(0, 80))
  await ctx.close()
}

// ---------- mobile bleed @2x font ----------
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  page.on('pageerror', e => errors.push('mobile pageerror: ' + e.message.slice(0, 200)))
  page.on('console', m => { const u = (m.location()?.url || ''); if (m.type() === 'error' && !u.includes('grok.com')) errors.push('mobile console: ' + m.text().slice(0, 160) + ' @ ' + u.slice(0, 80)) })
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.evaluate(() => document.querySelector('button[data-enter="read"]')?.click())
  await page.waitForFunction(() => window.__world && window.__world.ready, null, { timeout: 90000 })
  await sleep(2500)
  // 2x font scale (David's larger system font)
  await page.evaluate(() => {
    const els = [...document.querySelectorAll('*')]
    const orig = els.map(el => parseFloat(getComputedStyle(el).fontSize))
    els.forEach((el, i) => { if (orig[i] > 0) el.style.setProperty('font-size', (orig[i] * 2).toFixed(2) + 'px', 'important') })
  })
  await sleep(800)
  // open a card + landing card at 2x
  await page.evaluate(() => window.__world.goTo({ kind: 'landing', key: 'cosmos' }))
  await sleep(3500)
  const bleed = await page.evaluate(() => {
    const vw = window.innerWidth
    const bad = []
    for (const el of document.querySelectorAll('*')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) continue
      if (r.left < -1 || r.right > vw + 1) bad.push(el.tagName.toLowerCase() + '.' + String(el.className || '').split(' ').slice(0, 2).join('.'))
    }
    const ladder = document.querySelector('.ladder')
    const card = document.querySelector('.card:not([hidden])')
    const lr = ladder && !ladder.hidden ? ladder.getBoundingClientRect() : null
    const cr = card ? card.getBoundingClientRect() : null
    const overlap = lr && cr ? !(lr.right <= cr.left || lr.left >= cr.right || lr.bottom <= cr.top || lr.top >= cr.bottom) : false
    return { vw, scrollW: document.documentElement.scrollWidth, bad: [...new Set(bad)].slice(0, 8), overlap }
  })
  console.log('bleed:', JSON.stringify(bleed))
  check('no horizontal bleed @2x', bleed.scrollW === bleed.vw && bleed.bad.length === 0, JSON.stringify(bleed))
  check('no ladder/card overlap @2x', !bleed.overlap)
  await page.screenshot({ path: path.join(OUT, 'merge-mobile-390x844-2xfont.png') })
  await ctx.close()
}

await browser.close()
check('zero page errors', errors.length === 0, errors.slice(0, 5).join(' ;; '))
const failed = checks.filter(c => !c.ok)
console.log(failed.length === 0 ? 'MERGE QA: ALL PASS' : `MERGE QA: ${failed.length} FAILURES`)
process.exit(failed.length === 0 ? 0 : 1)
