#!/usr/bin/env node
/**
 * Static integrity check for ipfs-dist:
 * 1. Every relative src/href in every HTML resolves to a real file.
 * 2. No absolute same-origin or localhost/127.0.0.1 URLs remain.
 * 3. Every route dir has an index.html.
 * 4. Key content markers present per route (SSR actually rendered).
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve, dirname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "ipfs-dist");

const EXPECTED = {
  "index.html": /<canvas|bot-world|CORE/i,
  "machine/index.html": /wallet|agency|dclm/i,
  "explorer/index.html": /ledger|block|claim/i,
  "arbitrage/index.html": /arbitrage/i,
  "pyramid/index.html": /pyramid|apex/i,
  "story/index.html": /story|unity/i,
};

let fails = 0;
let warns = 0;
const fail = (m) => { fails++; console.log("FAIL " + m); };
const warn = (m) => { warns++; console.log("WARN(pre-existing) " + m); };
// Assets referenced by source but absent from the project itself (broken on
// production too — not caused by the static export). Reported, not fixed.
const PREEXISTING_MISSING = new Set(["/conscious-cosmos.png"]);

function* htmlFiles(dir, base = "") {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? base + "/" + e.name : e.name;
    if (e.isDirectory()) yield* htmlFiles(join(dir, e.name), rel);
    else if (e.name.endsWith(".html")) yield rel;
  }
}

for (const rel of htmlFiles(DIST)) {
  const html = readFileSync(join(DIST, rel), "utf8");
  const dir = dirname(join(DIST, rel));
  // 1. resolve refs
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|data:|blob:|#|mailto:)/.test(url)) continue;
    if (url.startsWith("//")) continue;
    const clean = url.split(/[?#]/)[0];
    if (!clean) continue;
    const abs = normalize(join(dir, clean));
    if (!abs.startsWith(DIST)) { fail(`${rel}: ref escapes dist: ${url}`); continue; }
    if (!existsSync(abs)) {
      const rootRel = abs.slice(DIST.length) || "/";
      if (PREEXISTING_MISSING.has(rootRel)) warn(`${rel}: missing asset ${url} (absent from project source)`);
      else fail(`${rel}: missing asset ${url} -> ${rootRel}`);
    }
  }
  // 2. no absolute/local refs
  for (const m of html.matchAll(/(?:src|href|content)="(\/[^"/][^"]*)"/g)) fail(`${rel}: absolute ref ${m[1]}`);
  if (/127\.0\.0\.1|localhost/.test(html)) fail(`${rel}: localhost ref`);
  // 4. content marker
  const marker = EXPECTED[rel];
  if (marker && !marker.test(html)) fail(`${rel}: SSR content marker missing`);
}
for (const r of Object.keys(EXPECTED)) {
  if (!existsSync(join(DIST, r))) fail(`missing ${r}`);
}
console.log(fails === 0 ? `[integrity] ALL GREEN (${warns} pre-existing warnings)` : `[integrity] ${fails} FAILURES (${warns} warnings)`);
process.exit(fails === 0 ? 0 : 1);
