import { defineConfig } from "vite";
import { resolve } from "node:path";
import { readdirSync, readFileSync } from "node:fs";
const root = resolve(import.meta.dirname, "web");
const pages = readdirSync(root, { recursive: true }).filter((p) =>
  p.endsWith(".html"),
);
export default defineConfig({
  plugins: [
    {
      name: "legacy-page-redirects",
      configureServer(server) {
        const { redirects } = JSON.parse(
          readFileSync(resolve(import.meta.dirname, "vercel.json"), "utf8"),
        );
        server.middlewares.use((req, res, next) => {
          const url = new URL(req.url, "http://vite.local");
          const redirect = redirects.find((r) => r.source === url.pathname);
          if (!redirect) return next();
          res.writeHead(308, { Location: redirect.destination + url.search });
          res.end();
        });
      },
    },
  ],
  root,
  envDir: "..",
  resolve: { alias: { "/src": resolve(import.meta.dirname, "src") } },
  publicDir: "../public",
  server: { host: "0.0.0.0", allowedHosts: [".e2b.app"] },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: Object.fromEntries(
        pages.map((page) => [page, resolve(root, page)]),
      ),
    },
  },
});
