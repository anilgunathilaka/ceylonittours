# Ceylon IT Tours

Next.js 16 (App Router) site with Sanity CMS for content, Auth.js (email/password + Google) for accounts,
and PostgreSQL (Prisma 7) for users and bookings.

| Concern | Where |
|---|---|
| Website content (packages, blogs, …) | Sanity — Studio at `/cms` |
| Users, Google links, bookings, booking history | PostgreSQL — `prisma/schema.prisma` |
| Auth | `src/auth.ts`, `src/lib/auth/*`, route protection in `src/proxy.ts` |
| Bookings | `src/lib/bookings.ts`, created from `/api/contact`, managed at `/admin/bookings` |
| Email (Resend) | `src/lib/email.ts`, `src/app/api/contact/route.ts` |

Requires **Node.js 24 LTS** (see `.nvmrc`; with nvm-windows: `nvm install 24.21.0 && nvm use 24.21.0`).
npm 11 only runs dependency install scripts listed under `allowScripts` in `package.json`; after upgrading one of
those packages, run `npm install-scripts ls` and approve the new version.

## Local development

```bash
npm install                      # also runs `prisma generate`
cp .env.example .env.local       # fill in values (see below)

npm run db:dev                   # start a local Postgres (no Docker needed); copy its TCP URL into DATABASE_URL
npm run db:migrate               # apply migrations to the dev database
npm run db:migrate-json          # one-off: import legacy data/users.json + data/bookings.json
npm run dev
```

`npx prisma dev ls` shows the local instances and their URLs. Use the **TCP** `postgres://…` URL, not the `prisma+postgres://` one.

## Environment variables

See `.env.example`. Summary:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Direct Postgres URL. On serverless hosts use the provider's **pooled** URL. |
| `AUTH_SECRET` | yes | `npx auth secret` |
| `AUTH_URL` | production | Public site URL, used for links in emails |
| `ADMIN_EMAILS` | for admins | Comma-separated; case-insensitive |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | optional | Google button is hidden when unset |
| `RESEND_API_KEY` / `EMAIL_FROM` | optional | Without a key, emails are skipped (logged) and everything else still works |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` / `NEXT_PUBLIC_SANITY_DATASET` | yes | Sanity CMS |

## Admins

1. The person registers (or signs in with Google) on the site.
2. Add their email to `ADMIN_EMAILS` and restart/redeploy.
3. They get **Manage Bookings** in the profile menu → `/admin/bookings`.

Admin access is re-checked on the server for every admin page load and every admin action
(email must be in `ADMIN_EMAILS` **and** belong to an existing account). Removing an email takes effect immediately.

## Booking flow

Customer clicks **Check Availability** → (login) → contact form → booking saved as **Pending** →
admin confirms (final travel date required) / cancels / reopens with a customer message →
change + history entry committed in one transaction → optional Resend email → customer sees it on `/profile`.
If two admins edit the same booking, the second (stale) submission is rejected and asked to reload.

## Migrating the legacy JSON data

```bash
npm run db:migrate-json -- --dry-run   # report only
npm run db:migrate-json                # backs up data/*.json to data/backup/<timestamp>/ then imports
```

Safe to re-run (existing ids are skipped; users with an existing email are merged, not duplicated).
The JSON files are never deleted — remove them yourself once you've verified the import.

## Google OAuth

In Google Cloud Console → Credentials → OAuth client ID (Web application), add redirect URIs:

- `http://localhost:3000/api/auth/callback/google`
- `https://<your-domain>/api/auth/callback/google`

Only verified Google emails are accepted. A Google sign-in with the same email as an existing account links to that account.

## Resend

Verify your sending domain in Resend, then set `RESEND_API_KEY` and `EMAIL_FROM` (an address on that domain).
Enquiries go to `hello@ceylonittours.com`; booking confirmations/cancellations go to the customer's account email.

## Tests

```bash
npm run typecheck && npm run lint
npm test                         # unit + database integration tests (Vitest)
npm run test:e2e                 # end-to-end against a running server (see scripts/e2e.mjs)
```

Integration tests **wipe** their database, so they need a separate Postgres instance:

```bash
npx prisma dev --name ceylonittours-test --detach      # note its TCP URL
export TEST_DATABASE_URL=postgres://...                 # that URL
DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy
npm test
```

The test config refuses to run if `TEST_DATABASE_URL` points at the same server as `DATABASE_URL` in `.env.local`.

## Production

```bash
npm ci
npm run db:deploy        # prisma migrate deploy — run once per release, before starting the new version
npm run build            # prisma generate && next build
npm start
```

On Vercel: set the environment variables, use a pooled `DATABASE_URL`, and run `npm run db:deploy`
from CI or locally against the production database when migrations change.
