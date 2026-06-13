const path = require("path");
const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react-swc");
const { VitePWA } = require("vite-plugin-pwa");

module.exports = defineConfig({
  base: process.env.ELECTRON_BUILD === "true" ? "" : "/",
  build: {
    target: "es2015",
    assetsDir: "assets",
    modulePreload: false,
    rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
  },
  optimizeDeps: {
    exclude: ["android"],
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ["**/android/**", "**/dist-electron/**", "**/dist/**"],
    },
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react.default ? react.default() : react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "icon.png",
        "logo.png",
        "logos/*.png",
      ],
      manifest: {
        name: "Adonai Tareas",
        short_name: "Adonai",
        description: "Organiza tus tareas con propósito",
        theme_color: "#151820",
        background_color: "#151820",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "/icon.png", sizes: "192x192", type: "image/png" },
          { src: "/icon.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallbackDenylist: [/\.apk$/i, /^\/downloads\/.*\.apk$/i],
        runtimeCaching: [
          {
            urlPattern: /\/(?:downloads\/)?[^/?]+\.apk$/i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https?:\/\/.*\/rest\/v1\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              expiration: { maxEntries: 100, maxAgeSeconds: 300 },
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /^https?:\/\/.*clerk\.accounts\.dev\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "clerk-auth",
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
});
