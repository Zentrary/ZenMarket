# Verification record — 2026-11-05

The owner explicitly requested removal of the `tests/` directory from GitHub. Validation was performed **before removing the suites**, then testing-only dependencies and npm test commands were removed as well. This repository intentionally does not retain an automated test harness; future changes need independent checks. Deleting tracked files does not erase earlier Git history.

## Prior structure/review revision (329da45)

- 18 unit checks passed: previous PromptPay/cart/validation/routing protections plus 4–5-star homepage filtering, review escaping, honest empty/error states and separate owner order routes.
- Clean migrations 001–007 and five rollback suites passed on embedded PostgreSQL, including previous customer/address/shipping security coverage and the new public review projection. Embedded Auth/Storage are schema stubs, not real services.
- Migration 007 was applied to the existing isolated live ZenMarket database before frontend deployment. Its real PostgreSQL rollback fixture verified that anonymous homepage requests return only 4–5 stars, cap at six, expose no private identifiers and cannot query the full review table. All fixtures rolled back.
- Chromium with mocked Supabase APIs passed 26 logical routes × seven viewports (320, 390, 768, 844 landscape, 1024, 1440, 1920px), with no document/editor overflow, uncaught browser errors or native dialogs. Screenshots of the editorial homepage, mobile layout and separate owner workspace were inspected.
- Browser flow checked public homepage review filtering/escaping, legacy redirect + query preservation, guest admin redirect to dedicated owner login, no signup link on owner login, member gates, separate merchant order controls, profile/address CRUD/default/5-cap, checkout product/address details, atomic-order UI, shipping photo/feed UI, receipt-gated reviews, product editor/deletion/history, dashboard and cross-tab/local logout.
- Admin module is a separate lazy-loaded build chunk; customer pages do not request the owner page module merely to render the shop. Backend RLS/RPC remains authoritative.
- Source undefined-variable scan passed. Production builds 26 real HTML documents, including nested customer/owner paths. Final clean-install build is checked after removing test dependencies.

## Data preservation

Live baseline at the beginning of **this** revision: 0 products, 0 orders, 3 profiles, 0 reviews, 1 admin. Earlier revisions had a product, but it was already absent before this work. No owner data was removed or demo data inserted by this revision. New test orders/reviews existed only inside a rollback transaction.

## Manual smoke checklist for future updates

- Guest: open home; test 4/5-star review display and empty/error states; verify 1/2/3-star ratings never appear there. No private user/order/contact fields in homepage RPC. Full ratings remain on member product pages.
- Old bookmarks: `/product.html?id=…`, `/order.html?id=…`, `/account.html`, recovery links and old hash links must arrive at the new page with parameters intact.
- Customer: register/login, cart, saved/manual addresses, checkout items/amounts, slip, own order tracking, receipt and review. No admin controls on customer order pages. A normal user cannot access owner data/actions by entering an admin URL or calling an RPC.
- Owner: login, dashboard/product/category/settings/payment pages, private order details, approval, tracking and shipment updates; owner header has no shopping cart/customer navigation.
- Phone/desktop: navigation, form focus, modal/confirmation contrast, long review/name/address text, sold-out/restock, image expiry/reload and logout across tabs.
- Deployment: production READY and canonical alias assigned to the exact intended SHA; review Vercel build logs and inspect the live site from an unrestricted browser.

## Boundaries

Browser APIs were mocked; real Auth/email/HTTP Storage/bank/carrier E2E is not certified. This network-restricted workspace cannot fetch production pages directly, so production alias validation uses the Vercel control plane. Responsive testing is Chromium emulation, not physical iOS/Safari/Firefox coverage. Custom SMTP was not configured at the time of inspection. Password rotation and a real owner email remain necessary; no password was changed without owner consent.

## Operations + dark homepage revision

- Fresh embedded PostgreSQL applied 001–008 and 010; operations rollback assertions passed. pg_cron is not emulated there.
- Live isolated ZenMarket: applied 008–010 additively, then ran rollback assertions for authoritative 30-minute deadlines, idempotency, exact-once expiry/restock, late slip denial, protected review orders, private durable order/slip notifications, mark-read persistence, customer/anonymous RPC denial, no direct telemetry insert, telemetry throttling, encrypted-export RPC authorization, internal checkout revocation, order rate limits including cancelled orders.
- Verified actual pg_cron job active (`* * * * *`), run status `succeeded` and advancing operation heartbeat. Live post-fixture counts: 0 products, 0 orders, 3 profiles, 0 notifications/errors. No fixtures retained.
- Chromium + mocked APIs: dark homepage palette, absent empty reviews, only 4–5-star reviews with escaped HTML; countdown removes QR and slip form; customer denied owner backup UI; notifications/mark-read; real browser WebCrypto encrypted download; error payload has no raw message. 27 document paths × widths 320/390/768/1440: no horizontal overflow or uncaught page errors. Mock session/fixture screenshots are validation only, never persisted to the application database.
- Node WebCrypto round-trip and corruption rejection passed; exported JSON contains no plaintext fixture data. Source no-undef scan, build (27 HTML outputs), and diff whitespace check passed. Browser check rerun after alert/notification refinements.
- Turnstile keys/server enforcement and scheduled database-backup secrets not configured. Live follow-up also verified that late-slip rejection is specifically the deadline error even when object metadata exists, and that the daily cap independently rejects the 21st order with only one order inside the 15-minute window. Updated username-login Edge Function version 2 is ACTIVE with optional captchaToken forwarding; real HTTP Auth is not certified. No real automatic backup or restore drill certified. Manual export is encrypted application data, not a full Auth/Storage recovery solution. See OPERATIONS.md.
