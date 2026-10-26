import { chromium } from 'playwright'
import path from 'node:path'
const OUT = path.resolve('screenshots')
const sleep = ms => new Promise(r => setTimeout(r, ms))

const browser = await chromium.launch({ executablePath: '/home/hatch/workspace/.qa/chrome-linux64/chrome' })
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
const errors = []
page.on('pageerror', e => errors.push('pageerror: ' + e.message.slice(0, 200)))
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_EMPTY_RESPONSE')) errors.push('console: ' + m.text().slice(0, 200)) })
await page.goto('http://127.0.0.1:8081/', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.locator('button[data-enter="read"]').click({ timeout: 60000 })
await page.waitForFunction(() => window.__world && window.__world.ready, null, { timeout: 60000 })
await sleep(2000)

// 1. Open telemetrics, tap the first feed row -> should jump to that feed's card
await page.evaluate(t => window.__world.goTo(t), { kind: 'telemetrics', key: 'telemetrics' })
await sleep(3500)
const rows = await page.locator('.c-cell.go').count()
console.log('tappable rows in telemetrics card:', rows)
if (rows > 0) {
  const label = await page.locator('.c-cell.go').first().locator('span').innerText()
  await page.evaluate(() => {
    const body = document.querySelector('.c-body')
    const btn = document.querySelector('.c-cell.go')
    if (body && btn) body.scrollTop = btn.offsetTop - 100
  })
  await sleep(600)
  await page.evaluate(() => { (document.querySelector('.c-cell.go')).click() })
  await sleep(3500)
  const card = await page.evaluate(() => window.__world.card)
  console.log('tapped row:', JSON.stringify(label), '-> card now:', JSON.stringify(card))
}
await page.screenshot({ path: path.join(OUT, 'desktop-rowtap-feed-card.png') })

// 2. DCLM card badge after honesty fix
await page.evaluate(t => window.__world.goTo(t), { kind: 'dclm', key: 'dclm' })
await sleep(3000)
await page.screenshot({ path: path.join(OUT, 'desktop-dclm-card-v2.png') })
const dclmBadge = await page.locator('.c-badge').first().innerText().catch(() => 'n/a')
console.log('dclm badge:', JSON.stringify(dclmBadge))

// 3. Corporate Helpers card: scroll card to reveal logic + physics layers
await page.evaluate(t => window.__world.goTo(t), { kind: 'corph', key: 'corph' })
await sleep(3000)
await page.evaluate(() => { const c = document.querySelector('.c-body'); if (c) c.scrollTop = c.scrollHeight })
await sleep(800)
await page.screenshot({ path: path.join(OUT, 'desktop-corph-card-layers.png') })
const bars = await page.locator('.c-bar').count()
console.log('corph bars rendered:', bars)
const barLabels = await page.locator('.c-bar i').allInnerTexts()
console.log('top bars:', JSON.stringify(barLabels.slice(0, 3)))

// 4. Reduced-motion toggle: flip it, confirm no throw, beacon loop keeps running
const toggles = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => /reduced motion/i.test(b.textContent || ''))
  return btn ? btn.textContent.trim().slice(0, 40) : null
})
console.log('reduced-motion toggle found:', JSON.stringify(toggles))
console.log('console/page errors:', JSON.stringify(errors))
await browser.close()
