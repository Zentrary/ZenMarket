# Store operations — expiry, alerts, diagnostics and backups

## Payment expiry (active after migrations 008–010)

- New orders reserve stock for **30 minutes**. Existing pending orders receive a fresh 30-minute deadline at migration time.
- `pg_cron` job `zenmarket-expire-unpaid-orders` runs every minute, independent of browser sessions. Expiry runs in its own transaction (010), not inside checkout, to avoid shared heartbeat/product lock inversion. Stock release can lag its deadline until the next successful sweep.
- Only `pending` with **no slip** and an elapsed deadline can expire. `review`, `paid`, `shipped` and `delivered` are never expired automatically. Late slip attachment is rejected under the same order row lock; the customer must contact the shop if money was already transferred.
- Sweep claims at most 200 rows with `FOR UPDATE SKIP LOCKED`, locks stock rows in product-ID order, and commits cancellation/restock together. Repeat sweeps cannot restock the same order twice. No active order is deleted. A skipped busy order is retried by the next run.
- Customer countdown uses device time for display; the database clock is authoritative. QR/slip input disappears when the displayed deadline elapses. Pending status can remain visible until the next sweep/reload. Bank transfers themselves cannot be stopped or reversed by hiding a QR.
- Inspect the last successful sweep on `/admin/operations.html`. More than three minutes without a heartbeat needs attention in Supabase Cron run history. Job failures do not mean funds were refunded. Products deleted since purchase cannot be restored as a listing.

## Booking abuse controls

Server-enforced per-account creation cap: **3 new orders per 15 minutes, 20 per rolling 24 hours**, including cancelled orders. The previous cap of five pending/review orders remains. Idempotent request retries return the same order without consuming a new slot. The internal pricing/stock function has no authenticated/anonymous execution permission, so it cannot bypass the wrapper. There is no claim that account caps prevent distributed abuse or fake accounts.

## Owner notifications (in-app, active)

Order creation and changed slip paths produce durable database notifications in the same transaction. Owner-only RLS protects them. `/admin/operations.html` shows the latest 50; mark-all-read persists. The owner header polls unread count every 30 seconds while visible and shows a popup when a newer alert arrives (does not interrupt an open dialog). Read notifications are retained 90 days; unread ones remain.

This is **not LINE/email/push delivery**: when the browser is closed no external message is sent. External delivery needs an owner-selected channel, destination and server credentials. No invented address, bot token or webhook is used.

## Minimal error reporting (active)

Authenticated clients report only an allowlisted area and category (e.g. checkout / DATABASE). No raw exception text, stack, URL query, token, payment proof, email or shipping details is sent. A user ID is retained internally for abuse limits, not displayed in the log projection. Owner-only log visibility; no direct client insert. Limit one event/minute and ten/day/account, retained 30 days. Telemetry failures do not prevent checkout or recursively log themselves.

This is not comprehensive error monitoring or external uptime checking. Anonymous signup failures, backend SQL/Edge exceptions and deployment errors still require Supabase/Vercel logs. No webhook, alert subscription or SLA monitoring has been configured.

## Encrypted application-data export (available in owner workspace)

1. Open `/admin/operations.html`, enter and confirm a strong **12+ character export password**, then confirm the privacy warning.
2. The owner-only RPC exports a consistent application snapshot (catalogue/settings, profiles, addresses, orders, reviews and shipping update metadata). Browser encrypts using **AES-256-GCM, PBKDF2-SHA256, 250,000 iterations**, fresh 16-byte salt and 12-byte IV; only ciphertext is downloaded. Password is never sent to Supabase or persisted in browser storage.
3. Keep encrypted exports off-device, with password in a separate password manager. Max application export is 20 MB. Forgotten password means no recovery.
4. Verify integrity/decryption with Node 22+: set `ZEN_BACKUP_PASSWORD` securely in your shell environment, then `node scripts/inspect-backup.mjs /path/to/file.zenbackup.json`. The script prints table counts, never plaintext customer data, and restores nothing automatically. Clear the environment variable afterwards.

**Not a full Supabase backup:** no Auth users/passwords/sessions, Storage object bytes, database definitions/roles/secrets or automatic restore. Image paths are only references. Re-import needs schema/Auth mapping and a reviewed procedure in an isolated project. Do not overwrite production from a browser export. Keep this limitation visible to the owner.

## Daily encrypted database backup (prepared, NOT configured/verified active)

`.github/workflows/encrypted-backup.yml` runs daily at 03:17 Bangkok **only after it is on main**, or manually via workflow_dispatch. It fails clearly when configuration is missing; it does not report a fake successful backup.

In **GitHub repository Settings → Secrets and variables → Actions**, configure privately (never in chat, code or README):

- `ZENMARKET_BACKUP_DB_URL`: Supabase PostgreSQL/session-pooler connection URL for a role permitted to dump the necessary schemas. Prefer a dedicated least-privilege backup role. Do not use transaction pooling. TLS verification must remain enabled; if the URL specifies SSL settings they must agree with verify-full and the container CA bundle.
- `ZENMARKET_BACKUP_PASSPHRASE`: random, unique **20+ character** encryption secret, independently stored in a password manager.

Workflow uses PostgreSQL 17 `pg_dump`, encrypts with GPG AES256 before upload, deletes runner plaintext on exit, and stores only encrypted artifact + checksum for seven days. It does not back up Storage image bytes or external services. Public-repository artifacts may be downloaded by other signed-in users: use a genuinely strong random passphrase and treat encryption as essential. Secrets never belong in Git. Configure GitHub workflow-failure notifications, and copy encrypted backups to an independently controlled location for longer retention.

**Do not call this operational until verified:** run manually, download encrypted artifact, verify checksum, decrypt in a secure scratch location, run `pg_restore --list`, then test restoration into a separate non-production Supabase environment following Supabase's supported restore procedure. Record row counts, image availability, Auth behavior and recovery time. Do not change production credentials, roles or data merely to test this workflow. This session did not have the required DB connection/password and has not executed a real backup/restore drill.

## Signup/login bot protection (integration prepared; keys required)

- Existing Supabase email confirmation and Auth endpoint limits remain; username-login already limits IP/identifier server-side.
- Cloudflare Turnstile integration supports signup, customer login and owner login. Set **public** `VITE_TURNSTILE_SITE_KEY` in Vercel; configure the **matching secret** and enable Turnstile in Supabase Auth protection settings. Secret stays in Supabase, never the frontend/Git/chat.
- Add the canonical production domain in the Turnstile dashboard. Site CSP permits only the required `https://challenges.cloudflare.com` script/frame/connect origin, not arbitrary scripts.
- Deploy the updated username-login Edge Function before enabling server CAPTCHA: it forwards captchaToken into Supabase Auth. Both direct signup and password login must reject missing/invalid tokens server-side; the widget alone is not protection. Test success, expiry, retry and invalid-token failures from a real browser before calling protection active.
- If no public site key is configured, no widget is inserted; do not claim CAPTCHA is enabled. Do not turn on required CAPTCHA at the server without a working client, or customers/owner will be locked out. This session did not have Turnstile keys and did not enable mandatory CAPTCHA.
