// Telemetrics close-out QA: desktop 1440x900 + mobile 390x844 screenshots.
// Serves the built app (assumes npm run preview:restart already ran on :8081).
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const OUT = path.resolve('screenshots')
fs.mkdirSync(OUT, { recursive: true })
const URL = 'http://127.0.0.1:8081/'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const shots = []

async function enter(page) {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 })
  await page.locator('button[data-enter="read"]').click()
  await page.waitForFunction(() => window.__world && window.__world.ready, null, { timeout: 60000 })
  await sleep(2500) // let boot flights and first feed renders settle
}

async function flyAndCard(page, target, waitMs = 4000) {
  await page.evaluate(t => window.__world.goTo(t), target)
  await sleep(waitMs)
  return await page.evaluate(() => window.__world.card)
}

async function bleedCheck(page) {
  return await page.evaluate(() => {
    const d = document.documentElement
    return { scrollW: d.scrollWidth, innerW: window.innerWidth, overflowX: document.body.scrollWidth - window.innerWidth }
  })
}

async function runViewport(name, vp) {
  const browser = await chromium.launch({ executablePath: '/home/hatch/workspace/.qa/chrome-linux64/chrome' })
  const ctx = await browser.newContext(vp.mobile ? { viewport: vp, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: vp })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', e => errors.push('pageerror: ' + e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)) })

  await enter(page)
  await page.screenshot({ path: path.join(OUT, `${name}-home.png`) })
  shots.push(`${name}-home.png`)
  const homeBleed = await bleedCheck(page)

  // Telemetrics board
  let card = await flyAndCard(page, { kind: 'telemetrics', key: 'telemetrics' })
  await page.screenshot({ path: path.join(OUT, `${name}-telemetrics-card.png`) })
  shots.push(`${name}-telemetrics-card.png`)

  // Corporate Helpers
  card = await flyAndCard(page, { kind: 'corph', key: 'corph' })
  await page.screenshot({ path: path.join(OUT, `${name}-corph-card.png`) })
  shots.push(`${name}-corph-card.png`)

  // DCLM receipts honesty
  card = await flyAndCard(page, { kind: 'dclm', key: 'dclm' }, 3000)
  await page.screenshot({ path: path.join(OUT, `${name}-dclm-card.png`) })
  shots.push(`${name}-dclm-card.png`)
  const dclmCard = await page.evaluate(() => window.__world.card)

  // Iris answers
  const telemReply = await page.evaluate(() => window.__world.ask('telemetrics'))
  const corphReply = await page.evaluate(() => window.__world.ask('corporate helpers'))
  await sleep(1500)

  // 150% font scale emulation: bump root text size, re-check bleed + card
  await page.addStyleTag({ content: 'html { font-size: 24px; }' })
  await page.evaluate(t => window.__world.goTo(t), { kind: 'telemetrics', key: 'telemetrics' })
  await sleep(3000)
  await page.screenshot({ path: path.join(OUT, `${name}-telemetrics-150font.png`) })
  shots.push(`${name}-telemetrics-150font.png`)
  const bigFontBleed = await bleedCheck(page)

  const state = await page.evaluate(() => ({
    feeds: window.__world.feeds,
    integrity: window.__world.integrity,
    card: window.__world.card,
    pickables: window.__world.pickables(),
  }))
  await browser.close()
  return { name, errors, homeBleed, bigFontBleed, telemReplySpeech: telemReply?.speech?.slice(0, 160), corphReplySpeech: corphReply?.speech?.slice(0, 160), dclmCard, state }
}

const results = []
results.push(await runViewport('desktop-1440x900', { width: 1440, height: 900 }))
results.push(await runViewport('mobile-390x844', { width: 390, height: 844, mobile: true }))
console.log(JSON.stringify({ shots, results }, null, 2))
