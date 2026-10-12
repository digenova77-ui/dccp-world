#!/usr/bin/env node
/**
 * Serves the built Nitro SSR bundle (.vercel/output) locally for QA.
 * Static files come from .vercel/output/static; everything else delegates to
 * the real Nitro server function (the same bundle the deployment serves).
 *
 * Env: NITRO_QA_PORT (default 18098). Args: serve|stop.
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync, statSync } from 'node:fs'
import { join, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..')
const PORT = Number(process.env.NITRO_QA_PORT || 18098)
const PID_FILE = '/tmp/nitro-qa.pid'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
}

async function runServer() {
  const { default: handler } = await import(join(ROOT, '.vercel/output/functions/__server.func/index.mjs'))
  const STATIC = join(ROOT, '.vercel/output/static')

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1')
      const pathname = decodeURIComponent(url.pathname)
      // Static first (strip query already handled by URL).
      if (req.method === 'GET') {
        const rel = pathname.replace(/^\/+/, '')
        const candidate = join(STATIC, rel)
        if (candidate.startsWith(STATIC) && existsSync(candidate) && statSync(candidate).isFile()) {
          res.writeHead(200, { 'content-type': MIME[extname(candidate)] || 'application/octet-stream' })
          res.end(await readFile(candidate))
          return
        }
      }
      // Everything else: the real Nitro SSR bundle.
      const chunks = []
      for await (const c of req) chunks.push(c)
      const body = chunks.length ? Buffer.concat(chunks) : undefined
      const request = new Request(`http://127.0.0.1:${PORT}${req.url}`, {
        method: req.method,
        headers: req.headers,
        body,
        duplex: 'half',
      })
      const response = await handler.fetch(request, {})
      const headers = {}
      response.headers.forEach((v, k) => { headers[k] = v })
      res.writeHead(response.status, headers)
      res.end(Buffer.from(await response.arrayBuffer()))
    } catch (e) {
      res.writeHead(500, { 'content-type': 'text/plain' })
      res.end('nitro-qa error: ' + String((e && e.message) || e))
    }
  })

  server.listen(PORT, '127.0.0.1', () => console.log(`[nitro-qa] serving .vercel/output on http://127.0.0.1:${PORT}`))
}

const action = process.argv[2]
if (action === 'serve') {
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '__child'], {
    detached: true,
    stdio: ['ignore', 'ignore', 'ignore'],
  })
  child.unref()
  const { writeFileSync } = await import('node:fs')
  writeFileSync(PID_FILE, String(child.pid))
  console.log('[nitro-qa] started pid ' + child.pid)
} else if (action === '__child') {
  await runServer()
} else if (action === 'stop') {
  const { readFileSync, unlinkSync, existsSync: ex } = await import('node:fs')
  if (ex(PID_FILE)) {
    const pid = Number(readFileSync(PID_FILE, 'utf8').trim())
    try { process.kill(pid, 'SIGTERM') } catch { /* already gone */ }
    try { unlinkSync(PID_FILE) } catch { /* already gone */ }
    console.log('[nitro-qa] stopped pid ' + pid)
  } else {
    console.log('[nitro-qa] no pid file')
  }
} else {
  console.error('usage: node scripts/serve-nitro-qa.mjs serve|stop')
  process.exit(1)
}
