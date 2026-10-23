// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import { VitePWA } from 'vite-plugin-pwa';

// Netlify sets NITRO_PRESET=netlify via netlify.toml. Locally / other hosts fall
// back to the default cloudflare-module preset unless NITRO_PRESET overrides.
const nitroPreset = process.env.NITRO_PRESET;
const isCloudflare = !nitroPreset || nitroPreset.startsWith("cloudflare");

export default defineConfig({
  tanstackStart: isCloudflare ? { server: { entry: "server" } } : {},
  nitro: nitroPreset ? { preset: nitroPreset } : undefined,
  vite: {
    plugins: [mcpPlugin(), VitePWA({
      strategies: 'generateSW', filename: 'sw.js', registerType: 'autoUpdate', injectRegister: null,
      devOptions: { enabled: false },
      manifest: { name: 'FinScope Financial Analyst', short_name: 'FinScope', start_url: '/dashboard', scope: '/', display: 'standalone', theme_color: '#0b1e3f', background_color: '#ffffff', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }] },
      includeAssets: ['icon-192.png', 'icon-512.png', 'offline.html', 'offline.css'],
      workbox: { globPatterns: ['**/*.{js,css,woff2,png,ico}'], navigateFallback: '/offline.html', navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//, /^\/auth/, /^\/reset-password/, /^\/mcp/, /^\/\.well-known/, /^\/\.lovable/], runtimeCaching: [{ urlPattern: ({ request }) => request.mode === 'navigate', handler: 'NetworkFirst', options: { cacheName: 'finscope-public-navigation', cacheableResponse: { statuses: [] } } }] },
    })],
    build: {
      rollupOptions: {
        // mcp-js dynamically imports cloudflare:workers; mark external so
        // non-Cloudflare presets (Netlify, Node) don't try to bundle it.
        external: ["cloudflare:workers"],
      },
    },
  },
});
