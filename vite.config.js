import { defineConfig } from "vite";
import { resolve } from "node:path";
const pages = [
  "index",
  "contact",
  "admin/dashboard",
  "admin/reviews",
  "shop",
  "categories",
  "product",
  "cart",
  "checkout",
  "login",
  "register",
  "account",
  "orders",
  "order",
  "favorites",
  "about",
  "help",
  "privacy",
  "reset-password",
  "admin/products",
  "admin/categories",
  "admin/settings",
  "admin/payments",
  "admin/orders",
];
export default defineConfig({
  server: { host: "0.0.0.0", allowedHosts: [".e2b.app"] },
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        pages.map((page) => [
          page,
          resolve(import.meta.dirname, page + ".html"),
        ]),
      ),
    },
  },
});
