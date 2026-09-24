import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages serves project sites under /<repo>/. The workflow passes the right base in.
const base = process.env.VITE_BASE ?? "/";
const buildId = process.env.BUILD_ID ?? String(Date.now());

export default defineConfig({
  base,
  define: { __BUILD_ID__: JSON.stringify(buildId) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/favicon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "X Reader",
        short_name: "X Reader",
        description: "A quiet reader for the X accounts you follow",
        lang: "en",
        start_url: base,
        scope: base,
        display: "standalone",
        background_color: "#fafafa",
        theme_color: "#0369a1",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Data changes several times a day; never precache it, always try the network first.
        globIgnores: ["**/data/**"],
        navigateFallbackDenylist: [/\/data\//, /\.(?:xml|json)$/],
        runtimeCaching: [
          {
            urlPattern: /\/data\/.*\.json/,
            handler: "NetworkFirst",
            options: {
              cacheName: "data",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 60 },
            },
          },
        ],
      },
    }),
  ],
});
