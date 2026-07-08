import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Vite config tuned for Tauri: fixed dev port, no clear-screen so Rust logs survive.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1430,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    target: "chrome105",
    sourcemap: true,
  },
});
