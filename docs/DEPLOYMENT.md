# Deployment and operations

## Vercel

- Project: existing isolated `zenmarket` (not the buffet project).
- Framework: Vite. Install `npm ci`; build `npm run build`; output `dist`; repository Root Directory unchanged.
- Vite's document root is `web/`, environment directory is repository root, static files are `public/`.
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (public publishable key) in production/preview/development. Never expose service-role credentials.
- 27 actual HTML outputs. Store documents grouped by audience, no SPA fallback. Source pages all reference `/src/app.js`, resolved by Vite to the repository source directory.
- `vercel.json` includes permanent redirects for old root-level `.html` URLs. Product/order IDs and other query strings are retained. Vite development middleware applies the same map. Old hash bookmarks are migrated in the browser. Keep redirects while existing emails/bookmarks still use old paths.
- Canonical domain remains `zenmarket-blue.vercel.app`; verify its explicit deployment alias assignment after promotion, not merely the deployment READY state.

## Supabase

Apply numbered migrations in sequence, only to the ZenMarket project. Preserve all existing product/account/order data. Do not rerun migrations against an existing schema or reset a live database.

Additive migrations `007_home_reviews.sql`, `008_store_operations.sql`, `009_expiry_schedule.sql`, `010_checkout_expiry_isolation.sql`, and `011_category_icons.sql` must precede the matching frontend deployment. Migration 008 adds expiry, private notifications, rate controls, minimal diagnostics and the owner export; 009 schedules the database sweep. Migration 010 keeps its transaction separate from checkout to avoid shared heartbeat/product lock inversion. Migration 011 adds a constrained icon identifier to categories while preserving existing rows. Never rerun already-applied migrations.

Migration `007_home_reviews.sql` grants anonymous/authenticated access only to a safe projection of the latest six 4–5-star reviews. It does not grant anonymous SELECT on products/full reviews, change stock, delete data or fabricate reviews.

Existing core protections remain: authoritative prices/stock reservation in transactions, immutable order snapshots, role assignment in the singleton owner table, RLS/private customer data, delivery-purchase-gated reviews and private shipment/slip Storage policies. Frontend route groups and hiding merchant controls are UX, not a replacement for backend authorization.

Auth redirect allowlist must cover `https://zenmarket-blue.vercel.app/**`, including `/auth/reset-password.html` and `/account/index.html`. Existing canonical wildcard covers the reorganized paths. Never disable confirmation just to work around email delivery. Configure custom SMTP and test with real owner-controlled email before launch.

## Owner workflow

1. Open `/admin/login.html` with the sole owner's account.
2. Use dashboard, product/category editor, shop/contact/logo settings and private payment settings.
3. Open an order via `/admin/orders.html`; verify real bank receipt before approving.
4. On a paid order, enter tracking/message and optional shipment photos; publish dispatch. Add later updates from the same management page.
5. Customer opens `/account/orders.html` to see their own order and shipment updates, confirms receipt, then reviews the actual purchased product.

The customer order document never contains owner approval/shipment forms, even when an owner previews it. Administrative order details use `/admin/order.html` and recheck owner access. Owner login does not permit signup/role escalation; ordinary customers receive no management privileges.

Stock expiry and in-app notifications are implemented; see [OPERATIONS.md](OPERATIONS.md) for scope and operating checks. No carrier API, automatic bank verification, refunds, profit accounting or orphan-upload cleanup is implied. Automated offsite backups and enforced signup CAPTCHA still need owner configuration. Retention/returns/contact policies, MFA and external uptime monitoring remain launch considerations. Previously committed passwords must be rotated; do not republish them.


## Audience navigation and reversible owner view

Guest navigation has only Home, Contact and Login; no cart, catalogue, orders or owner shortcut. Contact is public. Auth/signup/recovery/legal routes remain available where needed; direct member-only URLs redirect to Login with a safe return path. Member attempts to open owner URLs return to the shop before privileged page queries.

The server-verified owner defaults to the workspace on login and when navigating directly to storefront URLs. The explicit **มุมมองผู้ใช้** button sets a per-tab, user-ID-bound presentation flag. It enables the ordinary customer shell, including profile, catalogue, cart and own orders, with an always-visible exit bar. Owner links and management forms are not rendered. Active-product queries and customer order details are explicitly filtered; order ownership is checked before showing snapshots/slips. Going to an owner URL, exiting, or signing out clears preview. Back/Forward-cache restoration reloads identity/route state instead of restoring a stale preview. Password recovery remains possible without entering customer view.

This is UI presentation, not impersonation or a downscoped Auth session: actual owner privileges remain with the real owner in Supabase. No flags grant permissions to members. Any order/profile/address changes are real, as the banner states. Do not insert fake customers/orders to demonstrate this feature. No database migration or change to RLS/roles is needed.

## Initial owner account (manual bootstrap)

ZenMarket is a **single-owner** store. `supabase/seed.sql` is deliberately safe and does not create a privileged account or demo data automatically. To set up a new installation after applying all migrations:

1. Configure Supabase Auth, email confirmation and the application environment. Register a normal account through the site's registration form using a real owner-controlled email and a strong unique password; confirm the email. The registration flow supplies the profile metadata required by the signup trigger. Do not put a password in SQL, Git, chat, or a public configuration file.
2. In the correct Supabase project, open **Authentication → Users**, verify the account/email and copy its user UUID. Verify the project is the intended store before proceeding.
3. Copy `supabase/admin-bootstrap.sql` into that project's privileged SQL Editor. Replace `target_user_id uuid := null` in the editor with `target_user_id uuid := 'UUID-from-Authentication'::uuid` (the real UUID, including quotes). Run the entire transaction once. Keep the modified query private and do not commit it.
4. Sign in at `/admin/login.html` as that account and verify access. Also verify an ordinary account cannot access the owner workspace or its APIs. The existing RLS and RPC checks remain authoritative.

The bootstrap grants an **existing confirmed account** the owner role; it does not create an Auth user or bypass email confirmation. It refuses to replace a different existing owner, and repeating it for the same owner is harmless. An unset UUID, missing profile, or unconfirmed email fails without assigning ownership. Do not run this on a store that already has an owner to transfer access: ownership transfer requires a separate, deliberately reviewed secure procedure. Never expose the SQL Editor or service-role credentials to customers. This script is manual, not a migration or browser endpoint, and is not run automatically on deploy.
