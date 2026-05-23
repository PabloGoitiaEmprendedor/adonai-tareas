export default {
  base: "",
  root: ".",
  build: {
    target: "es2015",
    assetsDir: "assets",
    modulePreload: false,
  },
  optimizeDeps: {
    exclude: ["android"],
  },
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
    hmr: {
      overlay: false,
    },
  },
  resolve: {
    alias: {
      "@": "C:/Users/Usuario/Downloads/Antigravity/adonai-tareas/src",
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
};
