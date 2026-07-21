/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  server: {
    allowedHosts: true,
    host: true,
    strictPort: true,
    cors: true,
    hmr: true,
  },

  plugins: [
    react(),

    svgr({
      svgrOptions: {
        icon: true,
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),

    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",

      injectManifest: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },

      includeAssets: ["apple-touch-icon.png", "pwa-192x192.png", "pwa-512x512.png", "favicon.ico"],

      manifest: {
        id: "/hme-component-intelligence-system",
        name: "HME Component Intelligence System",
        short_name: "HME",
        description: "Advanced fleet component lifecycle monitoring and risk management.",
        theme_color: "#0f172a",
        background_color: "#ffffff",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone"],
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        prefer_related_applications: false,

        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),

    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: "stats.html",
    }),
  ],

  build: {
    chunkSizeWarningLimit: 3000,

    rollupOptions: {
      output: {
        manualChunks: {
          reactVendor: ["react", "react-dom"],

          charts: ["react-apexcharts", "apexcharts"],
        },
      },
    },
  },

  test: {
    globals: true,
    environment: "jsdom",
  },
});
