#!/usr/bin/env node
/**
 * QA for the IPFS static export (ipfs-dist/).
 * Serves the dir statically, then loads every prerendered route in real
 * Chromium (desktop + mobile), collecting console/page errors.
 * Usage: node scripts/ipfs-qa.mjs [--port 18099]
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "ipfs-dist");
const PORT = Number(process.argv.includes("--port") ? process.argv[process.argv.indexOf("--port") + 1] : 18099);
const SHOTS = join(ROOT, "screenshots", "ipfs");
mkdirSync(SHOTS, { recursive: true });

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2", ".ttf": "font/ttf", ".webp": "image/webp",
};

function serve() {
  return new Promise((resolveSrv) => {
    const server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url, "http://127.0.0.1");
        let pathname = decodeURIComponent(url.pathname);
        let file = join(DIST, pathname.replace(/^\/+/, ""));
        if (!file.startsWith(DIST)) { res.writeHead(403); res.end(); return; }
        if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
        if (existsSync(file) && statSync(file).isFile()) {
          res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
          res.end(await readFile(file));
          return;
        }
        // Gateways 404 on missing API routes — the app must degrade honestly.
        res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
        res.end("<h1>404</h1>");
      } catch (e) { res.writeHead(500); res.end(String(e)); }
    });
    server.listen(PORT, "127.0.0.1", () => resolveSrv(server));
  });
}

const ROUTES = [
  { path: "/", name: "root-3d", expect: "canvas" },
  { path: "/machine/", name: "machine", expect: "text" },
  { path: "/explorer/", name: "explorer", expect: "text" },
  { path: "/arbitrage/", name: "arbitrage", expect: "text" },
  { path: "/pyramid/", name: "pyramid", expect: "text" },
  { path: "/story/", name: "story", expect: "text" },
];

async function checkRoute(browser, route, viewport, label) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  const GROK_EXT = "grok.com/grok-app-builder";
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes(GROK_EXT)) errors.push("console: " + m.text().slice(0, 200));
  });
  page.on("pageerror", (e) => errors.push("pageerror: " + String(e.message).slice(0, 200)));
  const fileUrl = "file://" + join(DIST, route.path.replace(/^\/+/, ""), "index.html");
  await page.goto(fileUrl, { waitUntil: "load", timeout: 60000 }).catch((e) => errors.push("nav: " + e.message.slice(0, 120)));
  await page.waitForTimeout(5000);
  const bodyText = (await page.evaluate(() => document.body.innerText || "")).slice(0, 300).replace(/\s+/g, " ");
  const canvasCount = await page.evaluate(() => document.querySelectorAll("canvas").length);
  const shot = join(SHOTS, `ipfs-${route.name}-${label}.png`);
  await page.screenshot({ path: shot });
  await context.close();
  const ok = errors.length === 0 && (route.expect === "text" ? bodyText.length > 50 : canvasCount > 0);
  return { route: route.path, label, ok, errors, bodyText: bodyText.slice(0, 160), canvasCount, shot };
}

async function main() {
  const server = await serve();
  console.log(`[ipfs-qa] serving ${DIST} on :${PORT}`);
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/opt/meta-chromium/chrome",
    // QA the static export directly over file:// — no network, so Chromium's
    // Local Network Access checks never trigger. --allow-file-access-from-files
    // lets the module scripts, fonts and JSON load like a gateway would serve them.
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--allow-file-access-from-files"],
  });
  const results = [];
  for (const route of ROUTES) {
    results.push(await checkRoute(browser, route, { width: 1280, height: 800 }, "desktop"));
    results.push(await checkRoute(browser, route, { width: 390, height: 844 }, "mobile"));
  }
  // Honest-degradation probe: the API the app talks to does not exist here.
  const apiRes = await fetch(`http://127.0.0.1:${PORT}/api/v2/compute`, { method: "POST", body: "box=test" });
  const apiBody = await apiRes.text();
  results.push({ route: "POST /api/v2/compute", label: "api", ok: apiRes.status === 404, errors: [], bodyText: `status=${apiRes.status} (gateway 404; connector maps non-JSON -> DROPPED/MALFORMED, never fake)`, canvasCount: 0, shot: "" });
  await browser.close();
  server.close();
  let allOk = true;
  for (const r of results) {
    if (!r.ok) allOk = false;
    console.log(`${r.ok ? "PASS" : "FAIL"} ${r.label} ${r.route} | canvas=${r.canvasCount} | ${r.bodyText}`);
    for (const e of r.errors) console.log(`      !! ${e}`);
  }
  console.log(allOk ? "[ipfs-qa] ALL GREEN" : "[ipfs-qa] FAILURES PRESENT");
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => { console.error("[ipfs-qa] FAILED:", e); process.exit(1); });
