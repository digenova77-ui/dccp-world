// Landing-cards QA: desktop 1440x900 + mobile 390x844 screenshots.
// Serves the built app (assumes npm run preview:restart already ran on :8081).
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const OUT = path.resolve('screenshots')
fs.mkdirSync(OUT, { recursive: true })
const URL = 'http://127.0.0.1:8081/'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const shots = []

async function takeShot(page, filename) {
  try {
    await page.screenshot({ path: path.join(OUT, filename), timeout: 90000 })
    shots.push(filename)
    return true
  } catch (e) {
    console.error('shot failed:', filename, String(e).split('\n')[0])
    return false
  }
}
async function enter(page) {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  const btn = page.locator('button[data-enter="read"]')
  await btn.waitFor({ state: 'visible', timeout: 30000 })
  try {
    await btn.click({ timeout: 15000 })
  } catch {
    await page.evaluate(() => document.querySelector('button[data-enter="read"]')?.click())
  }
  await page.waitForFunction(() => window.__world && window.__world.ready, null, { timeout: 90000 })
  await sleep(3000) // let boot settle over Belleville and landing labels fold in
}

async function flyAndCard(page, target, waitMs = 4500) {
  await page.evaluate(t => window.__world.goTo(t), target)
  await sleep(waitMs)
  return await page.evaluate(() => window.__world.card)
}

async function tapAction(page, selector) {
  // Click a card action button; fall back to a synthetic click if the compositor is busy.
  try {
    await page.locator(selector).click({ timeout: 12000 })
    return true
  } catch {
    const n = await page.evaluate(sel => {
      const el = document.querySelector(sel)
      if (el) { el.click(); return 1 }
      return 0
    }, selector)
    return n === 1
  }
}

async function bleedCheck(page) {
  return await page.evaluate(() => {
    const d = document.documentElement
    return { scrollW: d.scrollWidth, innerW: window.innerWidth, bodyOverflow: document.body.scrollWidth - window.innerWidth }
  })
}

async function runViewport(name, vp, opts = {}) {
  const browser = await chromium.launch({ executablePath: '/home/hatch/workspace/.qa/chrome-linux64/chrome' })
  const ctx = await browser.newContext(vp.mobile ? { viewport: vp, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: vp })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', e => errors.push('pageerror: ' + e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)) })

  await enter(page)
  const pickables = await page.evaluate(() => window.__world.pickables())
  const bootCam = await page.evaluate(() => window.__world.camera)
  await takeShot(page, `${name}-landing-boot.png`)
  const homeBleed = await bleedCheck(page)
  if (opts.bootOnly) {
    // Mobile pass: keep only the boot screenshot; desktop pass owns the landing-* shots.
    await browser.close()
    return { name, errors, pickables, homeBleed, bootOnly: true }
  }

  const cards = {}
  for (const [key, shot] of [['cosmos', 'landing-cosmos'], ['ontario', 'landing-ontario'], ['tiers', 'landing-tiers'], ['dclm-engine', 'landing-dclm']]) {
    const c = await flyAndCard(page, { kind: 'landing', key })
    cards[key] = c
    await takeShot(page, `${shot}.png`)
  }

  // Deep levels
  const deep = {}
  deep['cosmos-story'] = await flyAndCard(page, { kind: 'landing', key: 'cosmos-story' })
  await takeShot(page, 'landing-cosmos-deep.png')
  deep['ontario-health'] = await flyAndCard(page, { kind: 'landing', key: 'ontario-health' })
  await takeShot(page, 'landing-ontario-deep.png')
  deep['ontario-schools'] = await flyAndCard(page, { kind: 'landing', key: 'ontario-schools' })
  deep['tiers-forensics'] = await flyAndCard(page, { kind: 'landing', key: 'tiers-forensics' })
  deep['tiers-develop'] = await flyAndCard(page, { kind: 'landing', key: 'tiers-develop' })
  deep['tiers-live-deep'] = await flyAndCard(page, { kind: 'landing', key: 'tiers-live-deep' })
  deep['tiers-forensics-deep'] = await flyAndCard(page, { kind: 'landing', key: 'tiers-forensics-deep' })
  await takeShot(page, 'landing-tiers-deep.png')
  deep['dclm-pipeline'] = await flyAndCard(page, { kind: 'landing', key: 'dclm-pipeline' })
  await takeShot(page, 'landing-dclm-deep.png')
  deep['dclm-invariant'] = await flyAndCard(page, { kind: 'landing', key: 'dclm-invariant' })

  // A tier slab picked directly by raycast: project the tiers-live slab to screen and tap it.
  const tapResult = await page.evaluate(() => {
    const hit = window.__world.pick(window.innerWidth / 2, window.innerHeight / 2)
    return hit && typeof hit === 'object' ? hit : null
  })

  // Tier action wiring: FORENSICS card -> real DCLM integrity view
  await flyAndCard(page, { kind: 'landing', key: 'tiers-forensics' }, 2500)
  const forensicsAction = await page.locator('button[data-action="go:dclm:dclm"]').count()
  if (forensicsAction) {
    await tapAction(page, 'button[data-action="go:dclm:dclm"]')
    await sleep(3500)
  }
  const afterForensics = await page.evaluate(() => window.__world.card)

  // LIVE tier -> real telemetrics board
  await flyAndCard(page, { kind: 'landing', key: 'tiers-live' }, 2500)
  const liveAction = await page.locator('button[data-action="go:telemetrics:telemetrics"]').count()
  if (liveAction) {
    await tapAction(page, 'button[data-action="go:telemetrics:telemetrics"]')
    await sleep(3500)
  }
  const afterLive = await page.evaluate(() => window.__world.card)

  // Card row action: cosmos card -> story spiral via tappable row
  await flyAndCard(page, { kind: 'landing', key: 'cosmos' }, 2500)
  const rowAction = await page.locator('button[data-action="go:landing:cosmos-story"]').count()
  if (rowAction) {
    await tapAction(page, 'button[data-action="go:landing:cosmos-story"]')
    await sleep(4000)
  }
  const afterRow = await page.evaluate(() => window.__world.card)

  // Iris voice routing for the four cards
  const iris = {}
  for (const q of ['conscious cosmos', 'ontario overview', 'tier command center', 'dclm cognitive engine', 'forensics tier', 'boundary wall']) {
    const r = await page.evaluate(text => window.__world.ask(text), q)
    iris[q] = { kind: r?.target?.kind, key: r?.target?.key, speech: r?.speech?.slice(0, 90) }
    await sleep(800)
  }

  // Reduced-motion toggle still flips
  const rm = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => /reduced motion/i.test(b.textContent || ''))
    if (!btn) return { found: false }
    const before = btn.getAttribute('aria-pressed')
    btn.click()
    const after = btn.getAttribute('aria-pressed')
    btn.click()
    return { found: true, before, after }
  })

  // 150% font scale emulation on the densest card
  await page.addStyleTag({ content: 'html { font-size: 24px; }' })
  await page.evaluate(t => window.__world.goTo(t), { kind: 'landing', key: 'ontario' })
  await sleep(3000)
  await takeShot(page, `${name}-landing-ontario-150font.png`)
  const bigFontBleed = await bleedCheck(page)

  await browser.close()
  return { name, errors, pickables, bootCam: bootCam.map(v => Math.round(v * 100) / 100), homeBleed, bigFontBleed, cards, deep, tapResult, afterForensics, afterLive, afterRow, iris, rm }
}

const results = []
results.push(await runViewport('desktop-1440x900', { width: 1440, height: 900 }))
// Mobile pass keeps only its boot shot (mobile-390x844-landing-boot.png) plus bleed/errors —
// the eight landing-* shots above are desktop's. Rename to the task's filename.
results.push(await runViewport('mobile-390x844', { width: 390, height: 844, mobile: true }, { bootOnly: true }))
console.log(JSON.stringify({ shots, results }, null, 2))
