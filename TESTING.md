# Verification — 2026-11-05

## Current revision: simpler design + empty catalogue

- Replaced the cream/coral lifestyle layout with a plain white/blue/slate storefront, shorter navigation, simple purchase instructions, and a compact footer. Removed demo product artwork from home/auth/category/information pages.
- Removed the eight original demo products from the live ZenMarket Supabase project using an ID + original SKU + original image migration. No member, admin, order, or payment-setting records were deleted.
- Verified live database after cleanup and rollback tests: **0 total products, 0 visible products, 0 orders, 1 admin account**.
- `supabase/seed.sql` is intentionally empty. The storefront never imports test fixtures and has no demo-data fallback, even without Supabase configuration.
- README documents the existing admin username/email and sign-in/admin links. No working password, auth session, or service key is published in the public repository.

## Passed

- `npm test` — 5 tests: independent PromptPay payload comparison with `promptpay-qr`, CRC/amount/ID validation, HTML/URL escaping, cart restore validation, and removal/clamping of deleted/hidden/out-of-stock cart entries.
- `npm run build` — production bundle generated successfully with Supabase configuration.
- `npm run test:ui` — Chromium with mocked Supabase API calls:
  - Empty home/shop/categories/cart/favorites; 0-count display and cleanup of previously saved demo carts.
  - Admin adds the first product with an image; it appears in the catalogue only after saving.
  - Category/search/favorite/cart persistence, registration password mismatch, user/admin guards, unconfigured payment-account guard, order/QR download, slip upload/review, admin price edit/settings/payment approval.
  - **13 viewport sizes**, from **320 to 1920px**: 320×568, 360×800, 375×667, 390×844, 430×932, 600×960, 768×1024, 820×1180, 844×390 (landscape), 1024×768, 1280×800, 1440×900, 1920×1080.
  - Checked horizontal document overflow on **14 routes**, long product names, empty and populated catalogues, admin tables, and product dialogs.
  - Mobile navigation `aria-expanded`, Escape close, keyboard focus return, and rendered icons.
- Live Supabase transaction executing the updated `tests/security.sql`, using a dedicated temporary fixture and **rolling back**: anon private-data denial, customer profile/order isolation, blocked role escalation/product insertion, authoritative server prices, stock reservation, idempotency, oversized/null cart rejection, blocked self-payment approval, and single stock restoration on cancellation. Real shop remains at zero products after the test.

## Boundaries / launch requirements

- Device checks use Chromium viewport emulation, not physical-device testing or Safari/Firefox engines. No assertion of identical rendering on every brand/browser/version. Recommend a real iPhone/Safari and Android/Chrome check before public launch.
- Live browser → Supabase Auth / Edge Function login, confirmation email, recovery email, live Storage uploads, and bank payments were not exercised end-to-end from this sandbox. UI API tests are mocks, not proof of live network flows.
- Custom SMTP is not configured; configure and verify confirmation/recovery mail before public registration.
- PromptPay receiver remains intentionally unset. Owner must configure a real registered receiver and account name before checkout. No funds have been transferred.
- Payment approval remains manual; verify bank transactions, not just an uploaded slip.
- Replace `.example` test accounts with real owner-controlled email and rotate passwords. Complete shop contact/privacy retention/return terms before launch.
- Add CAPTCHA, harden Auth password minimum in dashboard (frontend enforces 12; backend default is 6), consider MFA/monitoring/backups and a dedicated security review.
