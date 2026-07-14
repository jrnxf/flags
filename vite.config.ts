import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Ship a new service worker as soon as one is built; it takes over on the
      // next visit without the user doing anything.
      registerType: "autoUpdate",
      // Precache the whole shell plus every flag SVG and the self-hosted fonts,
      // so a first-load-then-offline session plays with zero network calls.
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // El Salvador's crest SVG is ~250KB — the default 2MB cap already covers
        // it, but keep headroom in case a heavier asset lands later.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // Single-page app: serve the cached shell for any navigation offline.
        navigateFallback: "index.html",
      },
      includeAssets: ["favicon.svg", "apple-touch-icon.png", "og.png"],
      manifest: {
        name: "flags — guess the flag",
        short_name: "flags",
        description:
          "A fast, terminal-styled flag quiz. Type the nation, build a streak, beat your best.",
        theme_color: "#211f1c",
        background_color: "#211f1c",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          {
            src: "/maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
