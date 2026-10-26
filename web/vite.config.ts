import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";

// Build emits to backend/internal/web/dist so the Go binary can go:embed it.
// During dev, /api is proxied to the running backend on :8080.
// Local builds emit into the Go embed dir; the Docker web stage overrides this
// via OPPAI_WEB_OUTDIR since the backend tree isn't present in that stage.
const outDir = process.env.OPPAI_WEB_OUTDIR ?? "../backend/internal/web/dist";

// The fonts in public/ keep their names from one release to the next, so anything
// that cached one — a browser, or a reverse proxy in front of the server that caches
// by file extension whatever the headers say — goes on serving it after the icon
// subset changes, and an icon added since renders as its own name. It did: the
// Train button read "model_training". So each font URL in index.html carries a hash
// of the file, and a font that changed is a URL nothing has cached.
function fontVersions(): Plugin {
  return {
    name: "font-versions",
    transformIndexHtml(page) {
      return page.replace(/\/fonts\/([\w.-]+\.woff2)/g, (url, file: string) => {
        const bytes = readFileSync(new URL(`./public/fonts/${file}`, import.meta.url));
        return `${url}?v=${createHash("sha256").update(bytes).digest("hex").slice(0, 10)}`;
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [fontVersions()],
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
