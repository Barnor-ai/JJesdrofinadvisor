// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

// Netlify sets NITRO_PRESET=netlify via netlify.toml. Locally / other hosts fall
// back to the default cloudflare-module preset unless NITRO_PRESET overrides.
const nitroPreset = process.env.NITRO_PRESET;
const isCloudflare = !nitroPreset || nitroPreset.startsWith("cloudflare");

export default defineConfig({
  tanstackStart: isCloudflare ? { server: { entry: "server" } } : {},
  nitro: nitroPreset ? { preset: nitroPreset } : undefined,
  vite: {
    plugins: [mcpPlugin()],
    build: {
      rollupOptions: {
        // mcp-js dynamically imports cloudflare:workers; mark external so
        // non-Cloudflare presets (Netlify, Node) don't try to bundle it.
        external: ["cloudflare:workers"],
      },
    },
  },
});
