#!/usr/bin/env node
/**
 * Gateway QA for the IPFS static export.
 * Loads the pinned CID through real public gateways in Chromium (desktop +
 * mobile), collecting console/page errors and screenshots.
 * Usage: node scripts/ipfs-gateway-qa.mjs <cid>
 */
import { mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = join(ROOT, "screenshots", "ipfs");
mkdirSync(SHOTS, { recursive: true });

const CID = process.argv[2];
if (!CID) { console.error("usage: ipfs-gateway-qa.mjs <cid>"); process.exit(2); }

const GATEWAYS = [
  { name: "dweb-sub", base: `https://${CID}.ipfs.dweb.link` },
  { name: "ipfsio-path", base: `https://ipfs.io/ipfs/${CID}` },
];

const ROUTES = [
  { path: "/", name: "root", want: "canvas" },
  { path: "/machine/", name: "machine", want: /wallet|dclm|agency/i },
  { path: "/explorer/", name: "explorer", want: /block|ledger|claim|dag/i },
  { path: "/arbitrage/", name: "arbitrage", want: /arbitrage|propose|veto/i },
  { path: "/pyramid/", name: "pyramid", want: /pyramid|apex/i },
  { path: "/story/", name: "story", want: /story|unity/i },
];
// Full route matrix on dweb subdomain; root+machine also on ipfs.io path gateway.
const PLAN = [];
for (const g of GATEWAYS) {
  const routes = g.name === "dweb-sub" ? ROUTES : ROUTES.slice(0, 2);
  for (const r of routes) PLAN.push({ gw: g, route: r });
}

async function check(browser, gw, route, viewport, label) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error" && !t.includes("grok.com/grok-app-builder")) errors.push("console: " + t.slice(0, 180));
  });
  page.on("pageerror", (e) => errors.push("pageerror: " + String(e.message).slice(0, 180)));
  const url = gw.base + route.path;
  let status = 0;
  try {
    const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
    status = resp ? resp.status() : 0;
  } catch (e) { errors.push("nav: " + e.message.slice(0, 120)); }
  await page.waitForTimeout(9000);
  const bodyText = (await page.evaluate(() => document.body ? document.body.innerText : "")).replace(/\s+/g, " ");
  const canvasCount = await page.evaluate(() => document.querySelectorAll("canvas").length);
  const contentOk = route.want === "canvas" ? canvasCount > 0 : route.want.test(bodyText);
  const shot = join(SHOTS, `gw-${gw.name}-${route.name}-${label}.png`);
  await page.screenshot({ path: shot }).catch(() => {});
  await ctx.close();
  const ok = errors.length === 0 && status === 200 && contentOk;
  return { gw: gw.name, route: route.path, label, ok, status, errors, contentOk, canvasCount, text: bodyText.slice(0, 140), shot };
}

async function main() {
  const browser = await chromium.launch({
    headless: true, executablePath: "/opt/meta-chromium/chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  let allOk = true;
  for (const { gw, route } of PLAN) {
    for (const [label, vp] of [["desktop", { width: 1280, height: 800 }], ["mobile", { width: 390, height: 844 }]]) {
      const r = await check(browser, gw, route, vp, label);
      if (!r.ok) allOk = false;
      console.log(`${r.ok ? "PASS" : "FAIL"} ${r.gw} ${r.label} ${r.route} http=${r.status} canvas=${r.canvasCount} content=${r.contentOk}`);
      console.log(`      text: ${r.text.slice(0, 120)}`);
      for (const e of r.errors) console.log(`      !! ${e}`);
    }
  }
  await browser.close();
  console.log(allOk ? "[gw-qa] ALL GREEN" : "[gw-qa] FAILURES PRESENT");
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => { console.error("[gw-qa] FAILED:", e.message); process.exit(1); });
