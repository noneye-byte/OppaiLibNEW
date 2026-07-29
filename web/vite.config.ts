import { defineConfig } from "vite";

// Build emits to backend/internal/web/dist so the Go binary can go:embed it.
// During dev, /api is proxied to the running backend on :8080.
// Local builds emit into the Go embed dir; the Docker web stage overrides this
// via OPPAI_WEB_OUTDIR since the backend tree isn't present in that stage.
const outDir = process.env.OPPAI_WEB_OUTDIR ?? "../backend/internal/web/dist";

export default defineConfig({
  base: "./",
  build: {
    outDir,
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8080",
    },
  },
});
