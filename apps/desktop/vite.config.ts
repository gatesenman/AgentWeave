import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const isTauri = !!process.env.TAURI_ENV_PLATFORM;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // In browser dev mode (without Tauri), use mocks for native APIs
      ...(!isTauri ? {
        "@tauri-apps/api/core": path.resolve(__dirname, "./src/mocks/tauri-api.ts"),
        "@tauri-apps/plugin-dialog": path.resolve(__dirname, "./src/mocks/tauri-dialog.ts"),
      } : {}),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: ["es2021", "chrome100", "safari13"],
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
