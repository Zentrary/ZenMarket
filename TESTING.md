# Verification — 2026-11-05

## Member experience revision

- 24 real Vite HTML entry documents. New editorial dark/lavender CSS-art landing, updated home/products/orders/contact navigation, no footer. No demo products or fake reviews/sales seeded.
- Replaced low-contrast toast and native confirmation with centered accessible dialog popups. Notifications preserve open editor forms; destructive confirmations default focus to cancel, support Escape and restore focus. Cross-page notifications use one-time session flash.
- Anonymous visitors are redirected from member pages to registration, preserving a validated local destination and an existing-member login link. Product/review API permissions are also restricted to authenticated users. Home, legal and authentication pages remain public.
- Product deletion preserves immutable order items and review history. Multi-image editor supports 1–8 images, <=5 MB each, validated before upload; previews, retaining/removing images and customer gallery. Original single-cover products are migrated compatibly.
- Social channel settings validate HTTPS platform hosts; empty values stay hidden. No invented live links/accounts.
- Six-step order timeline distinguishes dispatch and awaiting receipt. `delivered` is customer-confirmed only after `shipped`; not an automatic carrier status. Verified-purchase reviews use guarded RPCs, one review per order/product with editable rating/comment.
- Owner dashboard aggregates paid/shipped/delivered gross receipts including shipping, units, pending work, seven-day Bangkok-date totals, ratings and low stock. Review administration has rating filters and 20-row pagination. No profit/refund/carrier analytics implied.

## Automated checks

- `npm test`: **16 unit tests** — independent PromptPay/CRC/ID/amount checks, escaping/cart reconciliation, all HTML mappings, safe local post-login URLs, membership routes, social URL attack cases, legacy and multiple-image handling, progress stages, no footer/native confirm/toast.
- `npm run test:db`: clean **001–006 migrations** and all four SQL rollback suites on PGlite embedded PostgreSQL. Auth/Storage schemas are minimal stubs; this is SQL/RLS verification, not a real Supabase Auth/Storage E2E test. Zero products remain in the temporary database after tests.
- `npm run build`: configured production bundle, **24 HTML documents**, no SPA fallback. Public publishable key only.
- Static undefined-variable scan of all source modules with browser globals explicitly allowed.
- `npm run test:ui`: Chromium, mocked Supabase API:
  - Guest home, direct-route registration redirects, safe next links and no anonymous catalogue fetch.
  - Header menus, no footer on every route, new landing and social channel links.
  - Popup contrast >=4.5:1, alert-dialog semantics, confirmation/cancel/Escape, no native browser dialogs.
  - Store/logo/shipping/social persistence and malicious host rejection; dynamic categories and occupied-category error.
  - Three-image upload/preview/gallery, product deletion cancel/confirm, preserved order/review after deletion.
  - Cart persistence and custom shipping, member/admin UI guards, unconfigured-payment error, checkout/QR/download/slip/review, manual admin approval/tracking, customer receipt confirmation and review, escaped review markup, dashboard and rating filters.
  - Successful, local-only-failure and cross-tab logout; logo removal; reduced-motion media preference.
  - **24 routes × 7 viewports**: 320×568, 390×844, 768×1024, 844×390 landscape, 1024×768, 1440×1000, 1920×1080. Checks document/editor overflow and uncaught browser exceptions. Screenshots visually inspected.

## Database rollout and live verification

- Existing isolated ZenMarket project only. Before this revision: **1 owner-added product, 0 orders, 1 administrator, 0 test products**.
- Migration 004 is additive and applied before frontend rollout; migration 005 activates authenticated catalogue permissions after frontend deployment, avoiding an outage for the old frontend's anonymous fetch.
- `tests/security.sql`: anonymous/private-data isolation, privilege escalation prevention, server prices/stock/idempotency/null-cart/cancellation.
- `tests/customization.sql`: public/private settings separation, admin-only category/settings mutations, FK/cascade/restrict and custom shipping.
- `tests/member-experience.sql`: catalogue membership, social settings, private review order-ID protection, dashboard owner-only access, delivered-purchase/identity checks, timestamped receipt transitions, rating/comment limits, review upsert and cross-user isolation, deletion/history and authoritative sales totals.
- Live checks use postgres transaction fixtures and **ROLLBACK**, never live orders or real product deletion. Migration changes are intentionally persistent; test data/settings are not. Migrations 004/005 and all three live rollback suites passed; final counts were 1 product, 0 orders, 0 reviews, 1 admin, 0 test products, and anonymous catalogue SELECT denied. Deployment identifiers are recorded in the pull-request verification comment.

## Boundaries / launch requirements

- UI API requests are mocked. Real browser → Supabase Auth/Edge login, email confirmation/recovery, Storage upload and bank/carrier integrations are not certified end-to-end from this network-restricted sandbox.
- Custom SMTP was previously unset. Configure and verify real confirmation email before opening mandatory registration to the public. Do not disable email verification silently to bypass this requirement.
- Physical iPhone/Safari, Android/Chrome and Firefox have not been tested. Responsive checks are Chromium emulation, not all-device certification.
- Replace `.example` test accounts with real owner-controlled email and rotate privately delivered passwords. This revision adds no working passwords or service keys. An upstream README contained an apparent live admin credential: the merged working tree retains non-secret guidance instead; rotate any previously committed password, because deletion does not remove Git history. Password was not changed without owner approval.
- Validate the real PromptPay account with the bank; no test money transferred. Manual bank verification, retention/returns/contact policies, CAPTCHA, monitoring/backups, stronger server Auth password minimum and a security review remain launch considerations.
- Product images remain public Storage URLs and historical image files are retained intentionally; membership gating is not image DRM. Uploaded orphan-file cleanup is not automated.
- No automatic delivery detection, stock expiry, refunds, profit accounting, review moderation or claim of comprehensive security coverage.

## Customer/delivery revision (006)

- Added pure-helper tests for safe HTTPS favicon/fallback, stock/restock states, and copying saved/manual checkout recipient data without mutating the address book.
- Undefined-variable scan and 24-document production build pass. Clean migrations 001–006 and all four embedded PostgreSQL rollback suites pass.
- Extended Chromium mocked-API suite passes profile editing; address add/edit/delete/5-limit/default; checkout saved/manual selection and product breakdown; sold-out and restock refresh; merchant shipment photo previews/publishing; customer delivery feed/photo viewer/refresh; dynamic favicon and fallback. Retains the previous 24-route × 7-viewport regression suite. Additional final pass checks periodic stock polling (not only focus) and follow-up message-only updates.
- `tests/customer-delivery.sql` also passed against the real isolated Supabase project after additive migration 006. Tests prove anonymous/direct profile-write denial, duplicate-username enforcement, self-only updates without administrator elevation, five-address cap/default reassignment, cross-user edit/delete/read denial, immutable order address snapshot, last-unit reservation/oversell rejection, admin-only atomic dispatch/publication, invalid-photo rollback, four-photo/message bounds, unpublished-photo privacy, owner-only published photo reads, and cross-customer isolation.
- Live SQL Storage checks use metadata-only fixtures inside a rollback transaction, **not real HTTP object upload/signing or image bytes**. The browser Storage API is mocked. Address locks/default uniqueness are implemented and SQL-inspected; no multi-connection load/race benchmark was run.
- Live final preservation counts after rollback: **1 product, 0 orders, 3 profiles, 1 admin, 0 test products, 0 saved addresses, 0 shipment updates, 0 shipment objects**; delivery bucket private and anonymous catalogue SELECT denied. No owner product/account/order was deleted and no demo data was seeded.
- Deployment SHA, production readiness and canonical alias assignment are recorded in the PR comment. Browser-to-production HTTP is not reachable from this host-restricted sandbox; Vercel control-plane alias assignment verification is not a live-page browser check.
