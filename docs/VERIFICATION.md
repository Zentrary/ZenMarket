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


## Minimal homepage + neutral night theme revision

- Replaced the multi-section editorial landing with shop name, owner-configured tagline and one shop link. No promotional artwork, floating objects, decorative slogans, extra CTA sections or footer. Real 4–5-star reviews remain as a quiet list, entirely absent when empty/unavailable; no review fixtures are shipped.
- All UI CSS colours are neutral greys, including translucent colours, forms, navigation, popup success/error/confirmation surfaces, order states and the owner workspace. Updated all 27 HTML theme-colour meta values and default SVG favicon/placeholder. Product photographs and owner-uploaded logos retain their original colours; no page-level grayscale filter is used. QR stays black on white.
- Clean `npm ci` (0 audit vulnerabilities), production build (27 documents), home renderer syntax, stylesheet neutral-colour audit and whitespace checks PASS.
- Chromium tested the built production bundle with mocked Supabase APIs at 320 / 390 / 768 / 1440px across all 27 documents, including populated product/order/customer and owner pages. Checked visible computed text/background/border colours are achromatic; no horizontal document overflow or uncaught page errors. Real form-validation error popup is neutral/readable. Screenshots of home (desktop/phone), owner dashboard and popup inspected.
- Home rendering checks: empty/error projection stays optional, 1–3-star ratings omitted, real 4–5-star comments escaped, no artwork or footer.
- This is a visual/frontend-only change: no database, account, product, order, Storage, Edge Function, CAPTCHA or backup setting was changed. Fixtures/screenshots/validation dependencies are outside the repository. Mocked browser coverage is not new real Auth/Storage/payment E2E certification.


## Guest navigation and reversible owner/customer view revision

- Home is shop name, short tagline and real 4–5-star reviews directly below (no shop CTA for guests, no decorative sections or fabricated/empty reviews). The existing neutral night theme remains.
- Guest header contains only Home, Contact and Login, with a responsive menu toggle and no cart/product/order/owner controls. Contact is public, without member utility links. Auth/signup/recovery/privacy routes remain available for their necessary flows. Restricted URLs redirect to Login preserving a safe return path, before catalogue requests.
- Server-verified owner goes to the workspace by default, including login with a storefront `next` parameter or direct storefront URL. Workspace brand links back to dashboard; only the explicit customer-view button enters the storefront.
- Per-tab, owner-ID-bound preview renders customer navigation/account role and no merchant tools, with an always-visible exit bar and real-action warning. Active-product filters, own-order list/detail filters and defensive ownership check prevent the owner preview from showing another customer's order. This is presentation only, not role revocation or customer impersonation.
- Pure audience/identity/storage/route checks: 21 PASS. Clean npm ci: 0 audit vulnerabilities; JS undefined-variable scan, production build (27 HTML documents), and whitespace checks PASS.
- Built-bundle Chromium with mocked Supabase APIs PASS: guest home/contact/login gating, public contact details, restricted URL redirect without product fetch, compact reviews/filtering/escaping; owner default redirects; explicit enter/exit and persisted reload; browser Back after exit; sign-out clearing mode; ordinary member cannot activate preview with a forged sessionStorage marker or enter owner routes.
- Browser loops exercised customer-preview pages and all owner management pages at 320/390/768/1440 widths without horizontal overflow or uncaught errors. Checked account UI lacks owner links and foreign-order refusal exposes no order/slip content. Screenshots of guest home/reviews and phone customer view inspected. A missing semantic main container on the existing render-error fallback was fixed and regression-tested by the foreign-order case.
- No live database/role/Storage/Edge changes were made. All fixtures, browser sessions, screenshots and test dependencies are external to Git; no repository tests directory was restored. Browser mocks are not real Auth/Storage/payment E2E certification.
- Additional guest smoke PASS: signup, password recovery, owner sign-in and privacy at all four widths. Removed the old shopping CTA from the public privacy page for guests; it now returns Home, keeping the minimal guest navigation consistent even in legal/auth flows.


## Refined minimal homepage revision

- Replaced the bare name/tagline with a single charcoal bordered introduction: real logo (or shop-name initial), welcome label, larger shop name, tagline, contact action and compact payment/shipping details. No large illustration, gradients, fake statistics, demo products or footer. Guest CTA remains Contact only; shop CTA is member-only. Actual 4–5-star reviews appear underneath only when available.
- Shipping note, fee and free-shipping threshold come from current storefront settings; zero fee/zero threshold displays free shipping, consistent with existing checkout rules. No private bank identifier or new database data is requested.
- 20 renderer assertions PASS: review filtering/six-cap/escaping, no guest shop link, optional unavailable reviews, free-shipping edge cases, hostile shop text/logo URL handling and member CTA.
- Production bundle Chromium with mocked APIs PASS at 320/390/768/1024/1440/1920: neutral computed UI colours, no document overflow/uncaught errors, no footer, correct guest navigation. Long settings and missing logo file remain contained. Owner default redirect and customer-preview enter/exit remain functional. Desktop/mobile screenshots inspected.
- npm ci (0 audit vulnerabilities), production build (27 HTML documents), home syntax and diff checks PASS. Only homepage rendering/styles/docs changed; no database, role, Auth, Storage, order or provider settings changed. External checks are not real payment/Auth/Storage E2E certification.


## Expanded editorial homepage revision (2026-11-05)

- Supersedes the single-panel design above at the owner's request for a fuller homepage. Added a two-column typographic hero with shop identity, a clearly labelled three-step order guide (not a fake order/status), live shipping/payment information, detailed ordering steps, native keyboard-operable FAQ disclosures and a contact panel. No footer, fabricated statistics, products or reviews. Neutral palette/Prompt typography remain.
- Only signed-in members see up to six actual configured categories, with escaped labels and encoded query links to the existing filtered catalogue. Empty categories produce no invented entries. Guest main CTA is Login, secondary CTA scrolls to ordering guidance; header remains Home/Contact/Login and no guest catalogue fetch occurs.
- Existing genuine 4–5-star review RPC remains optional and capped at six. Content escaping and shipping zero-fee/threshold behavior are preserved. No extra backend requests or permission changes.
- 27 external renderer assertions PASS: sections/CTAs, category cap/query escaping, absent categories, genuine review filtering/cap/escaping/error isolation, shop/shipping/image sanitization and free-shipping edge cases.
- Production-bundle Chromium with mocked Supabase APIs PASS at 320/390/768/1024/1440/1920px for guests and members: neutral computed colours, no horizontal overflow, no unrendered icons, one main heading and no footer. Tested actual login/category navigation, on-page ordering link, FAQ keyboard Enter open/close, expanded disclosures, long settings, unavailable logo and review success/failure states. Owner default workspace and explicit enter/exit customer view regression PASS. Desktop/mobile screenshots inspected; all fixtures, screenshots and browser dependencies remain outside Git.
- Clean npm ci: 0 audit vulnerabilities. Production build: 27 HTML documents. Home JS syntax and git diff checks PASS. No schema, Auth, Storage, order, Edge, CAPTCHA or backup configuration was modified. Mocked browser tests are not real Auth/bank/carrier E2E certification.


## Homepage duplicate logo and registration action (2026-11-05)

- Removed the duplicate identity/logo/monogram block from the homepage hero; the actual configured shop logo/name in the shared header and favicon remain unchanged. Removed now-unused hero identity styles and renderer dependency.
- Added a visible guest-only **สมัครสมาชิก** header button next to Login, linked to the existing `/auth/register.html` page. Signed-in account/logout and owner controls are unchanged. Compact mobile action spacing keeps both buttons visible with the menu toggle. No signup/Auth behavior or database changes.
- Clean npm ci: 0 audit vulnerabilities. Production build (27 HTML pages), both modified JS syntax checks and git diff whitespace check PASS.
- External Chromium checks on the built bundle with mocked Supabase APIs PASS: guest uploaded/fallback logo has a single header identity and none in hero; visible 44px-minimum Login/Signup buttons and no horizontal overflow at 320/360/390/650/768/1024/1440/1920px; mobile menu open/Escape; actual Signup-to-registration-form and Login-to-login-form navigation; public Contact retains Signup; no guest product fetch; member account/logout remains and signup/login buttons are absent; no uncaught page errors. Desktop/mobile screenshots inspected. No account created or form submitted; not real Auth signup E2E certification. Validation stays outside Git.
