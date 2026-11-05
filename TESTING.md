# Verification — 2026-11-05

## Passed

- `npm run build` — production bundle generated successfully.
- `npm test` — four suites: independent PromptPay payload comparison with `promptpay-qr`, CRC/amount/ID validation, HTML/URL escaping, cart restore validation.
- `tests/ui.mjs` — Chromium, 1440px desktop and 390px mobile, **Supabase API mocked**. Catalogue, icons, categories, search, favorites, persisted cart, registration password mismatch, user/admin routes, missing receiver rejection, checkout + QR PNG, slip upload/review, admin price editing, receiver validation, manual payment approval, mobile menu/overflow.
- Live Supabase transaction via connector, executing `tests/security.sql` and **rolling back**: anon denied private orders and username/email lookup; customer profile isolation; blocked role escalation/product insert; server recalculates 390 + 50 even if browser submits price=1; stock reservation; idempotent request does not double reserve; invalid/null/oversized cart rejected; customer cannot mark paid; cancel restores stock once; unrelated user cannot read orders/profiles; singleton admin can access settings.
- Vercel first production deployment reported `READY` and assigned `zenmarket-blue.vercel.app`.

## Not yet verified / launch requirements

- Live browser → Supabase Auth / Edge Function login, confirmation email, recovery email, and live Storage uploads were not exercised end-to-end from this sandbox (outbound network restrictions). UI API tests are mocks, not proof of live network flows.
- Custom SMTP is not configured; Supabase default email sending restrictions apply. Configure before public registration/recovery tests.
- PromptPay receiver intentionally **unset**. Checkout is blocked until owner configures a real registered receiver and account name. No funds have been transferred.
- No automated bank settlement / slip authenticity service. Admin must inspect bank transactions before approving.
- Sample products/images/inventory, `.example` test accounts, shop contact/privacy retention/return terms must be replaced before launch.
- Add CAPTCHA, harden Auth password minimum in dashboard (frontend currently enforces 12, backend default is 6), consider MFA/monitoring/backups and a dedicated security review.
