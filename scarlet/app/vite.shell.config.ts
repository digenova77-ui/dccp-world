import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** One document. No captured router, no host, no sibling script the file protocol would refuse. */
function inlineShell(): Plugin {
  return {
    name: 'shell-inline',
    apply: 'build',
    writeBundle(options) {
      const dir = options.dir
      if (!dir) return
      const htmlPath = join(dir, 'shell.html')
      let html = readFileSync(htmlPath, 'utf8')
      const cssHref = html.match(/href="(\.\/assets\/[^"]+\.css)"/)?.[1]
      const jsSrc = html.match(/src="(\.\/assets\/[^"]+\.js)"/)?.[1]
      if (!cssHref || !jsSrc) throw new Error('shell assets missing')
      const css = readFileSync(join(dir, cssHref.slice(2)), 'utf8')
      const js = readFileSync(join(dir, jsSrc.slice(2)), 'utf8')
      if (js.includes('import(')) throw new Error('shell still has a dynamic import')
      html = html
        .replace(/<link rel="stylesheet" crossorigin href="\.\/assets\/[^"]+\.css">/, () => `<style>${css}</style>`)
        .replace(/<script type="module" crossorigin src="\.\/assets\/[^"]+\.js"><\/script>/, () => `<script type="module">${js}</script>`)
      writeFileSync(join(dir, 'index.html'), html)
      rmSync(htmlPath)
      rmSync(join(dir, 'assets'), { recursive: true, force: true })
    },
  }
}

export default defineConfig({
  base: './',
  publicDir: 'public',
  plugins: [react(), inlineShell()],
  resolve: { tsconfigPaths: true },
  build: {
    outDir: '../shell',
    emptyOutDir: true,
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: {
      input: fileURLToPath(new URL('./shell.html', import.meta.url)),
      output: { codeSplitting: false },
    },
  },
})
