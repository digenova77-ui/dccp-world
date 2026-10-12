#!/usr/bin/env node
/**
 * IPFS static-export snapshotter for DCCP World (Bot World HUD).
 *
 * Crawls the production SSR preview server (STATIC_EXPORT=1 build) and writes
 * a fully static directory:
 *   ipfs-dist/index.html
 *   ipfs-dist/<route>/index.html   (machine, explorer, arbitrage, pyramid, story)
 *   ipfs-dist/<everything from .vercel/output/static>
 *
 * Absolute same-origin URLs left in the SSR HTML (hardcoded /fonts preloads,
 * /-rooted links) are rewritten to depth-relative so the export resolves under
 * both subdomain gateways (<cid>.ipfs.<gw>/) and path gateways (<gw>/ipfs/<cid>/).
 * Bundled JS is already relative (the export build uses base "./").
 *
 * Usage:
 *   STATIC_EXPORT=1 node scripts/with-app-env.mjs vite build
 *   npm run preview:restart            # serves the build on 127.0.0.1:8081
 *   node scripts/ipfs-export.mjs       # writes ipfs-dist/
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PREVIEW = process.env.IPFS_EXPORT_PREVIEW ?? "http://127.0.0.1:8081";
const OUT = join(ROOT, "ipfs-dist");
const ROUTES = ["", "machine", "explorer", "arbitrage", "pyramid", "story"];

/** Rewrite (src|href|content)="/..." to depth-relative. Leaves // and https: alone.
 * Also rewrites bare "./" at depth>0 (Vite base './' emits these for assets;
 * under /route/ they would wrongly resolve to /route/assets/). */
function relativize(html, depth) {
  const rel = depth === 0 ? "./" : "../".repeat(depth);
  html = html.replace(
    /((?:src|href|content)=")\/([^"/][^"]*)"/g,
    (_, attr, rest) => `${attr}${rel}${rest}"`,
  );
  if (depth > 0) {
    html = html.replace(/((?:src|href|content)=")\.\//g, `$1${rel}`);
  }
  return html;
}

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  // 1. Static assets from the production bundle.
  const staticDir = join(ROOT, ".vercel/output/static");
  cpSync(staticDir, OUT, { recursive: true });
  console.log("[ipfs-export] copied .vercel/output/static");

  // 2. Prerendered HTML per route (SSR from the live preview server).
  for (const route of ROUTES) {
    const url = `${PREVIEW}/${route}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
    let html = await res.text();
    if (!html.includes("<html")) throw new Error(`GET ${url} did not return HTML`);
    const depth = route === "" ? 0 : 1;
    html = relativize(html, depth);
    const dir = route === "" ? OUT : join(OUT, route);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), html);
    console.log(`[ipfs-export] ${url} -> ${route === "" ? "" : route + "/"}index.html (${html.length} bytes)`);
  }

  // 3. Static PWA manifest (production serves this from grokPwa middleware;
  //    there is no server on IPFS, so bake the equivalent file).
  {
    const manifest = {
      name: "DCCP World — Bot World HUD",
      short_name: "DCCP World",
      id: "../",
      start_url: "../",
      scope: "../",
      display: "standalone",
      background_color: "#000000",
      theme_color: "#000000",
      icons: [{ src: "./icon-180.png", sizes: "180x180", type: "image/png" }],
    };
    mkdirSync(join(OUT, "__grok"), { recursive: true });
    writeFileSync(join(OUT, "__grok", "manifest.webmanifest"), JSON.stringify(manifest, null, 2));
    console.log("[ipfs-export] wrote __grok/manifest.webmanifest");
  }

  // 4. Sanity: no remaining absolute same-origin refs in HTML.
  const { execSync } = await import("node:child_process");
  const leftovers = execSync(
    `grep -rhoE '(src|href|content)="(/[^"/][^"]*)"' ${OUT} --include="*.html" | sort -u | head -20`,
    { encoding: "utf8" },
  ).trim();
  if (leftovers) {
    console.warn("[ipfs-export] WARNING: absolute refs remain:\n" + leftovers);
  } else {
    console.log("[ipfs-export] no absolute same-origin refs remain in HTML");
  }
  console.log(`[ipfs-export] done -> ${OUT}`);
}

main().catch((e) => {
  console.error("[ipfs-export] FAILED:", e.message);
  process.exit(1);
});
