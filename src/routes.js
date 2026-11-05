// Actual HTML entry points. IDs and filters use query parameters, never inline code.
export const pagePaths = {
  "/": "/index.html",
  "/shop": "/shop.html",
  "/collections": "/categories.html",
  "/product": "/product.html",
  "/cart": "/cart.html",
  "/checkout": "/checkout.html",
  "/login": "/login.html",
  "/register": "/register.html",
  "/account": "/account.html",
  "/orders": "/orders.html",
  "/order": "/order.html",
  "/favorites": "/favorites.html",
  "/about": "/about.html",
  "/help": "/help.html",
  "/privacy": "/privacy.html",
  "/reset-password": "/reset-password.html",
  "/admin": "/admin/products.html",
  "/admin/products": "/admin/products.html",
  "/admin/categories": "/admin/categories.html",
  "/admin/settings": "/admin/settings.html",
  "/admin/payments": "/admin/payments.html",
  "/admin/orders": "/admin/orders.html",
};
export function pageURL(route) {
  const [path, query = ""] = route.split("?");
  const match = path.match(/^\/(product|order)\/([^/]+)$/);
  if (match)
    return pagePaths["/" + match[1]] + "?id=" + encodeURIComponent(match[2]);
  return (pagePaths[path] || "/index.html") + (query ? "?" + query : "");
}
export function currentRoute(locationLike = location) {
  const path =
    locationLike.pathname === "/" ? "/index.html" : locationLike.pathname;
  const entry = Object.entries(pagePaths).find(
    ([key, value]) => value === path && key !== "/admin",
  );
  if (!entry) return "/not-found";
  const base = entry[0];
  const id = new URLSearchParams(locationLike.search).get("id");
  return (base === "/order" || base === "/product") && id
    ? base + "/" + id
    : base;
}
export function migrateLegacyLink(locationLike = location) {
  return locationLike.hash.startsWith("#/")
    ? pageURL(locationLike.hash.slice(1))
    : null;
}
