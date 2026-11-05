# Verification — 2026-11-05

## Current revision: dark theme, real pages, owner customization

- 21 separate HTML entry documents, built by Vite. Storefront, member account and admin workspace have distinct layouts. Direct links/reloads and legacy `/#/...` bookmarks are supported. Removed the top shipping announcement.
- Dark navy/slate palette with self-hosted Prompt; white QR background is intentionally retained for scanning.
- Header shows signed-in username and a properly aligned logout button. Local-session logout disables buttons while pending, distinguishes local removal from remote revocation failure without leaving stale identity, and redirects other open tabs after sign-out.
- Owner can configure shop name, tagline/about, logo upload/removal, public contact/address, shipping message, fee and free-shipping threshold. Payment-account settings stay on a separate admin page.
- Categories are database-managed with admin-only mutation, cascading rename and protection against deleting occupied categories. Products and settings are not hardcoded.
- Live migration `store_customization_and_categories` applied successfully. Existing owner-added product preserved: **1 product before and after migration/rollback tests**. No accounts/orders/payment settings removed, no demo products inserted. Zero `TEST-%` products remained after checks. Payment settings are present; bank ownership/validity was not verified.

## Passed

- `npm test`: **8 tests**, including PromptPay comparison with independent `promptpay-qr`, CRC/amount/ID validation, HTML/URL escaping, cart parsing/reconciliation, actual page mappings, auth-hash preservation, public-settings allowlist and custom shipping calculations.
- `npm run build`: configured Supabase client included; **21 HTML outputs**, no SPA fallback rewrite. No private server credential bundled.
- Static `no-undef` scan of shared app/page/route/settings modules, with browser globals explicitly allowed.
- `npm run test:ui`: Chromium with mocked Supabase requests:
  - Separate document links and legacy bookmark migration; no `#/` navigation links remain after render.
  - Catalogue filtering/favorites/cart quantity and persistence; empty catalogue has no demo fallback.
  - Member/admin page guards; username/header; failed and successful logout and same-browser cross-tab sign-out.
  - Custom category creation, rename, empty-category deletion, occupied-category delete error; custom category appears in product editor and storefront filters.
  - Shop name/contact/shipping and uploaded logo persist across page loads; uploaded logo decodes as an image; removing logo restores the default mark. Public settings form has no private payment fields.
  - Unconfigured payment guard (mock), order creation, QR/download, slip upload/review, private payment settings and admin payment approval.
  - **13 viewports**, **21 page routes** plus product edit dialog: 320×568, 360×800, 375×667, 390×844, 430×932, 600×960, 768×1024, 820×1180, 844×390 landscape, 1024×768, 1280×800, 1440×1000, 1920×1080. Checked document/dialog horizontal overflow and uncaught browser exceptions. Desktop/mobile screenshots visually reviewed.
- Live Supabase `tests/security.sql`, all fixtures/settings **rolled back**: anon private-data denial, profile/order isolation, blocked role escalation/customer product insertion, authoritative prices, stock reservation, idempotency, oversized/null cart rejection, blocked self-approval and single cancellation stock restoration.
- Live Supabase `tests/customization.sql`, all fixtures/settings **rolled back**: safe public settings exclude PromptPay/name; customer category/settings writes denied; owner category changes allowed; FK, rename cascade and occupied-category restriction; checkout charges configured 75 fee below 500 threshold and zero shipping above it, ignoring client price tampering.
- Canonical Supabase auth redirect allowlist permits the new HTML callback paths.

## Boundaries / launch requirements

- UI tests mock API requests. Live browser → Auth/Edge Function login, confirmation/recovery email, Storage uploads and bank payment have not been verified end-to-end from this network-restricted sandbox.
- Responsive checks use Chromium emulation, not physical-device testing or Safari/Firefox. Check real iPhone/Safari and Android/Chrome before public launch.
- Custom SMTP is not configured. Confirm real email delivery before public registration. Replace `.example` test accounts with owner-controlled email and rotate passwords.
- Validate the configured PromptPay receiver/name against a bank app before accepting funds. No test funds transferred. Approval remains manual: verify bank transactions, not just a slip.
- Complete contact/privacy retention/return policies; add CAPTCHA, server Auth password minimum (frontend 12; current server default 6), monitoring/backups and a security review. Consider admin MFA with supporting UI.
- No guarantee of universal browser/device compatibility or comprehensive security certification.
