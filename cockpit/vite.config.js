import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// This app lives in cockpit/ but reads the shared CSVs in the repo-root data/
// folder, so the dev server needs permission to serve files from one level up.
// The production build resolves them at bundle time and needs no extra config.
export default defineConfig({
  plugins: [react()],
  server: { fs: { allow: [".."] } },
});
