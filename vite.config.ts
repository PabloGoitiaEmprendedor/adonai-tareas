import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "./",
  build: {
    target: "es2015",
    assetsDir: "assets",
    modulePreload: false,
  },
  optimizeDeps: {
    exclude: ["android"],
  },
  server: {
    host: "::",
    port: 8080,
    watch: {
      ignored: ["**/android/**", "**/dist-electron/**", "**/dist/**"],
    },
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
