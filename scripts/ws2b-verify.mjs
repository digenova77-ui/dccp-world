#!/usr/bin/env node
/** WS2b completion verification: the generative pyramid DAG on /explorer.
 * Uses the repo's pinned system Chromium against the real Nitro SSR.
 */
import { chromium } from 'playwright'

const CHROME = '/home/hatch/workspace/.qa/chrome-linux64/chrome'
const BASE = process.env.NITRO_QA_BASE || 'http://127.0.0.1:18098'
const SHOT = '/home/hatch/workspace/dccp-world/screenshots'
const checks = []
const errors = []

const check = (name, ok, detail = '') => {
  checks.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true })

async function newPage(vp) {
  const page = await browser.newPage({ viewport: vp })
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`))
  page.on('console', m => {
    if (m.type() !== 'error') return
    // Known sandbox limitation (documented in CLOSEOUT.md): the platform
    // branding injector can't reach the external network here. Filtered from
    // QA like all prior passes — environmental only, not an app error.
    const url = m.location().url ?? ''
    if (url.includes('grok.com/grok-app-builder/extensions.js')) return
    errors.push(`console.error: ${m.text().slice(0, 160)} [${url.slice(-40)}]`)
  })
  await page.goto(`${BASE}/explorer`, { waitUntil: 'networkidle', timeout: 45000 })
  return page
}

try {
  const page = await newPage({ width: 1440, height: 900 })

  // 1. Pyramid section renders with geometry toggle + stats
  const pyr = page.locator('section[aria-label="Pyramid"]')
  check('pyramid section present', (await pyr.count()) === 1)
  check('geometry toggle both options', (await pyr.getByRole('button', { name: /4-simplex unfolding/ }).count()) === 1 && (await pyr.getByRole('button', { name: /fractal tesseract/ }).count()) === 1)
  const verdict = await pyr.locator('.pyr-verdict').textContent()
  check('simplex geometry verdict mentions truth lineage', /Simplex unfolding/.test(verdict ?? '') && /truth lineage/.test(verdict ?? ''), (verdict ?? '').slice(0, 60))
  const statNums = await pyr.locator('.stat b').allTextContents()
  check('stats show derived nodes', statNums.length >= 4, JSON.stringify(statNums))

  // 2. AUDIT DERIVATION — chain-verify honest
  await pyr.getByRole('button', { name: /AUDIT DERIVATION/ }).click()
  await pyr.locator('.verifyline').waitFor({ timeout: 15000 })
  const audit = await pyr.locator('.verifyline').textContent()
  check('audit walks all derivation paths to the apex', /derivation paths valid/.test(audit ?? ''), audit)

  // 3. Geometry toggle → tesseract verdict differs; R8 hollow emanations
  await pyr.getByRole('button', { name: /fractal tesseract/ }).click()
  const verdict2 = await pyr.locator('.pyr-verdict').textContent()
  check('tesseract geometry reading appears', /Fractal tesseract/.test(verdict2 ?? ''), (verdict2 ?? '').slice(0, 60))
  check('tesseract hollow share is the awaiting structure', /hollow emanations materialized/.test(verdict2 ?? ''))

  // 4. Shells collapse/expand (LOD collapse) + virtualized list
  const shellCount = await pyr.locator('.pyr-shell').count()
  check('shells rendered', shellCount >= 2, `${shellCount} shells`)
  await pyr.locator('.pyr-shellhead').first().click()
  const rowCount = await pyr.locator('.pyr-vrow').count()
  check('shell expands to virtualized node list', rowCount > 0, `${rowCount} rows in window`)
  const firstRowLabel = await pyr.locator('.pyr-vrow').first().getAttribute('aria-label')
  check('virtualized rows carry 4D coordinate labels', /\(t \d+ · n \d+ · h \d+ · c \d+\)/.test(firstRowLabel ?? ''), firstRowLabel)
  await pyr.locator('.pyr-vrow').first().click()
  const focusCoord = await pyr.locator('.pyr-focus .pyr-coord').textContent()
  check('picking a node sets drill focus', /\(t \d+ · n \d+ · h \d+ · c \d+\)/.test(focusCoord ?? ''), focusCoord)
  await page.screenshot({ path: `${SHOT}/ws2b-pyramid-desktop.png`, fullPage: false })

  // 5. Drill: step along an emanation from the apex → honest hollow for underived address
  await pyr.getByRole('button', { name: 'back to apex' }).click()
  const apexFocus = await pyr.locator('.pyr-focus .pyr-coord').textContent()
  check('back to apex resets focus', apexFocus === '(t 0 · n 0 · h 0 · c 0)', apexFocus)
  await pyr.getByRole('button', { name: /Step along TRUTH_OR_NOTHING/ }).click()
  const stepFocus = await pyr.locator('.pyr-focus .pyr-coord').textContent()
  check('emanation step moves coordinate (+t)', stepFocus === '(t 1 · n 0 · h 0 · c 0)', stepFocus)
  // walk beyond the truth lineage end → address exists but content is hollow (honest)
  for (let i = 0; i < 60; i++) {
    await pyr.getByRole('button', { name: /Step along CLEANUP_FIRST/ }).click()
  }
  const farFocus = await pyr.locator('.pyr-focus .pyr-coord').textContent()
  const farTitle = await pyr.locator('.pyr-focus .pyr-focus-head b').textContent()
  check('deep unmaterialized address is honestly hollow', /\(t 1 · n 0 · h 0 · c 60\)/.test(farFocus ?? '') && /not yet derived/i.test(farTitle ?? ''), `${farFocus} / ${farTitle}`)
  const crumbGhost = await pyr.locator('.pyr-crumb.ghost').count()
  check('unmaterialized address shows ghost breadcrumb', crumbGhost === 1)

  // 6. DAG mapper still renders the generated structure
  const dag = page.locator('section[aria-label="DAG mapper"]')
  check('DAG mapper section present', (await dag.count()) === 1)
  const dagSvg = await dag.locator('svg').count()
  check('DAG mapper renders from generated nodes', dagSvg >= 1)

  // 7. No horizontal bleed on desktop
  const desktopBleed = await page.evaluate(() => {
    const over = []
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect()
      if (r.right > window.innerWidth + 1 || r.left < -1) over.push(el.tagName + '.' + (el.className || '').toString().slice(0, 30))
    }
    return { scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, over: over.slice(0, 5) }
  })
  check('desktop: no horizontal bleed', desktopBleed.scrollW <= desktopBleed.innerW && desktopBleed.over.length === 0, `${desktopBleed.scrollW}/${desktopBleed.innerW}`)

  await page.close()

  // 8. Mobile 390×844 — no bleed, pyramid usable
  const mob = await newPage({ width: 390, height: 844 })
  const mpyr = mob.locator('section[aria-label="Pyramid"]')
  await mpyr.scrollIntoViewIfNeeded()
  check('mobile: pyramid section renders', (await mpyr.count()) === 1)
  await mpyr.getByRole('button', { name: /AUDIT DERIVATION/ }).click()
  await mpyr.locator('.verifyline').waitFor({ timeout: 15000 })
  const maudit = await mpyr.locator('.verifyline').textContent()
  check('mobile: audit works', /derivation paths valid/.test(maudit ?? ''))
  await mpyr.locator('.pyr-shellhead').nth(2).click()
  check('mobile: shell expands', (await mpyr.locator('.pyr-vrow').count()) > 0)
  await mob.screenshot({ path: `${SHOT}/ws2b-pyramid-mobile-390x844.png`, fullPage: false })
  const mobBleed = await mob.evaluate(() => {
    const over = []
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect()
      if (r.right > window.innerWidth + 1 || r.left < -1) over.push(el.tagName)
    }
    return { scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, over: over.slice(0, 5) }
  })
  check('mobile: no horizontal bleed', mobBleed.scrollW <= mobBleed.innerW && mobBleed.over.length === 0, `${mobBleed.scrollW}/${mobBleed.innerW} over:${JSON.stringify(mobBleed.over)}`)
  await mob.close()
} finally {
  await browser.close()
}

check('zero page errors', errors.length === 0, errors.length ? errors.slice(0, 4).join(' | ') : 'clean console')
const failed = checks.filter(c => !c.ok)
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`)
process.exit(failed.length ? 1 : 0)
