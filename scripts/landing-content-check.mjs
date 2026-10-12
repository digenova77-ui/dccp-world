import { chromium } from 'playwright'
import fs from 'node:fs'
const URL = 'http://127.0.0.1:8081/'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const browser = await chromium.launch({ executablePath: '/home/hatch/workspace/.qa/chrome-linux64/chrome' })
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 })
await page.evaluate(() => document.querySelector('button[data-enter="read"]')?.click())
await page.waitForFunction(() => window.__world && window.__world.ready, null, { timeout: 90000 })
await sleep(2000)

const texts = {}
for (const key of ['cosmos', 'ontario', 'ontario-schools', 'tiers', 'tiers-develop-deep', 'dclm-engine', 'dclm-invariant']) {
  await page.evaluate(t => window.__world.goTo(t), { kind: 'landing', key })
  await sleep(4000)
  texts[key] = await page.evaluate(() => document.querySelector('.card:not([hidden])')?.textContent ?? 'NO CARD')
}
await browser.close()
fs.writeFileSync('/tmp/landing-card-texts.txt', JSON.stringify(texts, null, 2))

const assert = (name, cond) => console.log((cond ? 'PASS' : 'FAIL') + ' | ' + name)
const c = texts.cosmos, o = texts.ontario, os = texts['ontario-schools'], t = texts.tiers, td = texts['tiers-develop-deep'], de = texts['dclm-engine'], di = texts['dclm-invariant']

assert('cosmos opens', c !== 'NO CARD')
assert('cosmos no measurements', !/\$\d|\d+\s*(beds|visits)|M [0-9]|det ?=\s*1/i.test(c))
assert('cosmos stance', /Philosophy as philosophy/.test(c))
for (const f of ['$348.5M','320','144,200','$812.4M','575','112,500','72','2,071,550','$32.02B','$1.27B','HIGH','MODERATE','MONITORING']) assert('ontario has ' + f, o.includes(f))
for (const f of ['$215/visit','$5,940','$6,820','6.08B','1,273.5M','81%']) assert('ontario lacks invented ' + f, !o.includes(f))
assert('schools figures', os.includes('$32.02B') && os.includes('$1.27B') && !os.includes('1,273.5M'))
assert('tiers six tiers', ['LIVE','DEVELOP','PUBLISH','ORDER','FORENSICS','DESIGN'].every(x => t.includes(x)))
assert('develop-deep UNKNOWN honest', /UNKNOWN/i.test(td) && /no instrumentation|nothing is wired/i.test(td))
assert('dclm det(M) 1.0', /det\(M\) ≡ 1\.0/.test(de))
assert('dclm UNREACHABLE', /UNREACHABLE/.test(de))
assert('dclm phases', ['Apprentice','Boundary','Master','Twain'].every(p => de.includes(p)))
assert('invariant wall', /det\(M\) ≡ 1\.0/.test(di) && /UNREACHABLE/.test(di) && /NO_FORCE|TRUTH_OR_NOTHING/.test(di))
assert('no fake compute', !/reconnect/i.test(de))
