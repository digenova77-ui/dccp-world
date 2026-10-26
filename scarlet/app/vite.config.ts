import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { grokPwaPlugin } from "./scripts/grok-pwa-plugin.mjs";
import { appEnvPlugin } from "./scripts/app-env-plugin.mjs";

export default defineConfig(({ command, isPreview }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 8081,
    strictPort: true,
  },
  resolve: { tsconfigPaths: true },
  plugins: [
    appEnvPlugin(),
    grokPwaPlugin(),
    tanstackStart(),
    ...(command === "build" || isPreview
      ? [
          nitro({
            preset: process.env.NITRO_PRESET || "vercel",
            compressPublicAssets: { gzip: true, brotli: true },
            serverDir: "./server",
          }),
        ]
      : []),
    viteReact(),
  ],
}));
