// Actual HTML entry points. IDs and filters use query parameters, never inline code.
export const pagePaths = {
  "/": "/index.html",
  "/admin/login": "/admin/login.html",
  "/admin/order": "/admin/order.html",
  "/contact": "/pages/contact.html",
  "/admin/dashboard": "/admin/dashboard.html",
  "/admin/reviews": "/admin/reviews.html",
  "/shop": "/shop/index.html",
  "/collections": "/shop/categories.html",
  "/product": "/shop/product.html",
  "/cart": "/shop/cart.html",
  "/checkout": "/shop/checkout.html",
  "/login": "/auth/login.html",
  "/register": "/auth/register.html",
  "/account": "/account/index.html",
  "/orders": "/account/orders.html",
  "/order": "/account/order.html",
  "/favorites": "/account/favorites.html",
  "/about": "/pages/about.html",
  "/help": "/pages/help.html",
  "/privacy": "/pages/privacy.html",
  "/reset-password": "/auth/reset-password.html",
  "/admin": "/admin/products.html",
  "/admin/products": "/admin/products.html",
  "/admin/categories": "/admin/categories.html",
  "/admin/settings": "/admin/settings.html",
  "/admin/payments": "/admin/payments.html",
  "/admin/orders": "/admin/orders.html",
};
export function pageURL(route) {
  const [path, query = ""] = route.split("?");
  const match = path.match(/^\/(product|order|admin\/order)\/([^/]+)$/);
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
  return ["/order", "/product", "/admin/order"].includes(base) && id
    ? base + "/" + id
    : base;
}
export function migrateLegacyLink(locationLike = location) {
  return locationLike.hash.startsWith("#/")
    ? pageURL(locationLike.hash.slice(1))
    : null;
}

export function safeReturnPath(value) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  )
    return "";
  try {
    const u = new URL(value, "https://zenmarket.invalid");
    if (
      u.origin !== "https://zenmarket.invalid" ||
      !Object.values(pagePaths).includes(u.pathname) ||
      [
        "/auth/login.html",
        "/auth/register.html",
        "/auth/reset-password.html",
        "/admin/login.html",
      ].includes(u.pathname)
    )
      return "";
    return u.pathname + u.search;
  } catch {
    return "";
  }
}
export function needsMembership(route) {
  return ![
    "/",
    "/login",
    "/register",
    "/reset-password",
    "/privacy",
    "/not-found",
    "/admin/login",
  ].includes(route);
}
