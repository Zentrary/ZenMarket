# Deployment and operations

## Vercel

- Project: existing isolated `zenmarket` (not the buffet project).
- Framework: Vite. Install `npm ci`; build `npm run build`; output `dist`; repository Root Directory unchanged.
- Vite's document root is `web/`, environment directory is repository root, static files are `public/`.
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (public publishable key) in production/preview/development. Never expose service-role credentials.
- 26 actual HTML outputs. Store documents grouped by audience, no SPA fallback. Source pages all reference `/src/app.js`, resolved by Vite to the repository source directory.
- `vercel.json` includes permanent redirects for old root-level `.html` URLs. Product/order IDs and other query strings are retained. Vite development middleware applies the same map. Old hash bookmarks are migrated in the browser. Keep redirects while existing emails/bookmarks still use old paths.
- Canonical domain remains `zenmarket-blue.vercel.app`; verify its explicit deployment alias assignment after promotion, not merely the deployment READY state.

## Supabase

Apply numbered migrations in sequence, only to the ZenMarket project. Preserve all existing product/account/order data. Do not rerun migrations against an existing schema or reset a live database.

New additive migration `007_home_reviews.sql` must precede this frontend deployment. It grants anonymous/authenticated access only to a safe projection of the latest six 4–5-star reviews. It does not grant anonymous SELECT on products/full reviews, change stock, delete data or fabricate reviews.

Existing core protections remain: authoritative prices/stock reservation in transactions, immutable order snapshots, role assignment in the singleton owner table, RLS/private customer data, delivery-purchase-gated reviews and private shipment/slip Storage policies. Frontend route groups and hiding merchant controls are UX, not a replacement for backend authorization.

Auth redirect allowlist must cover `https://zenmarket-blue.vercel.app/**`, including `/auth/reset-password.html` and `/account/index.html`. Existing canonical wildcard covers the reorganized paths. Never disable confirmation just to work around email delivery. Configure custom SMTP and test with real owner-controlled email before launch.

## Owner workflow

1. Open `/admin/login.html` with the sole owner's account.
2. Use dashboard, product/category editor, shop/contact/logo settings and private payment settings.
3. Open an order via `/admin/orders.html`; verify real bank receipt before approving.
4. On a paid order, enter tracking/message and optional shipment photos; publish dispatch. Add later updates from the same management page.
5. Customer opens `/account/orders.html` to see their own order and shipment updates, confirms receipt, then reviews the actual purchased product.

The customer order document never contains owner approval/shipment forms, even when an owner previews it. Administrative order details use `/admin/order.html` and recheck owner access. Owner login does not permit signup/role escalation; ordinary customers receive no management privileges.

No carrier API, automatic bank verification, refunds, stock expiry, profit accounting or orphan-upload cleanup is implied. Backups, retention/returns/contact policies, MFA, CAPTCHA and monitoring remain owner launch considerations. Previously committed passwords must be rotated; do not republish them.
