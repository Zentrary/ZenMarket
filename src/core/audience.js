// Presentation only. Supabase is_admin/RLS remains the authority for permissions.
export const customerViewKey = "zen-owner-customer-view";
export function readCustomerView(storage, userId, isOwner) {
  if (!userId || !isOwner) return false;
  try {
    return storage.getItem(customerViewKey) === userId;
  } catch {
    return false;
  }
}
export function audienceRedirect({ route, signedIn, isOwner, customerView }) {
  if (!signedIn) return ""; // Membership redirect preserves the original URL separately.
  if (isOwner) {
    if (route === "/admin/login") return "/admin/dashboard.html";
    if (
      !customerView &&
      !route.startsWith("/admin/") &&
      route !== "/reset-password"
    )
      return "/admin/dashboard.html";
  } else if (route.startsWith("/admin/")) return "/shop/index.html";
  if (["/login", "/register"].includes(route))
    return isOwner && !customerView ? "/admin/dashboard.html" : "/index.html";
  return "";
}
