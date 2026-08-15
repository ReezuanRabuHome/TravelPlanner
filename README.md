# Boarding Pass

A trip planner that becomes a travel companion. Plan the days, attach the paperwork
to the moment it is needed, then switch to **On Trip** and the app shows one thing:
what is happening next and which documents it requires.

Seeded with the Perth family holiday, 22–29 August 2026.

## Why it exists

A trip plan in a PDF cannot tell you that Friday is empty, that the rental agreement
was never uploaded, or that you leave the Airbnb six hours before checkout. This one
is data, so it checks itself — see [`src/lib/flags.ts`](src/lib/flags.ts).

## Stack

| Layer    | Choice                                   |
| -------- | ---------------------------------------- |
| App      | Next.js 16 (App Router), React 19, TypeScript |
| Database | Supabase Postgres, row level security     |
| Files    | Supabase Storage, private bucket, signed URLs |
| Auth     | Supabase magic links                      |
| Hosting  | Vercel                                    |

No CSS framework — the design system is plain CSS custom properties in
[`src/app/globals.css`](src/app/globals.css), light and dark.

## Access model

- **You** sign in with a magic link and own your trips. RLS makes a trip invisible to
  anyone else — there is no query that returns another person's data.
- **Family** get a share link (`/share/<token>`). Read-only, no account, revocable at
  any time. These render through server code that validates the token, so the
  read-only rules are not something a client can talk its way around.
- **Files** live in a private bucket. Every view or download mints a signed URL that
  expires in five minutes. Nothing is ever publicly addressable.

## Setup

### 1. Supabase

Create a project, then run the migrations in order — SQL Editor, or the CLI:

```
supabase/migrations/0001_schema.sql    tables
supabase/migrations/0002_rls.sql       row level security
supabase/migrations/0003_storage.sql   private bucket + storage policies
```

In **Authentication → URL Configuration**, add your site URL and
`https://<your-app>/auth/confirm` as a redirect URL.

### 2. Environment

Copy `.env.example` to `.env.local` and fill in the values from
**Project Settings → API**:

```bash
cp .env.example .env.local
```

`SUPABASE_SECRET_KEY` is server-only and bypasses RLS. It is used for exactly one
thing — rendering share links for people with no account. Never expose it. Find it
under **Project Settings → API Keys → Secret keys → Create new secret key**; older
projects can supply their `service_role` JWT as `SUPABASE_SERVICE_ROLE_KEY` instead.

Everything except share links works without it, so it is safe to add later.

### 3. Run

```bash
npm install
npm run dev
```

Sign in, then press **Add the Perth 2026 trip** to load real data.

### 4. Deploy

Push to `main`. Vercel builds it. Set the same four environment variables in
**Project Settings → Environment Variables**, with `NEXT_PUBLIC_SITE_URL` set to the
deployed URL rather than localhost.

## Layout

```
src/
  app/
    trips/[tripId]/            the planner: overview, itinerary, bookings, documents
    trips/[tripId]/today/      On Trip mode
    share/[token]/             read-only family view
    api/doc/[docId]/           signed-URL redirect for owners
  components/                  upload zone, nav, mode switch
  lib/
    flags.ts                   the checks that a PDF cannot do
    format.ts                  wall-clock date and time handling
    seed/perth-2026.ts         the Perth trip as data
supabase/migrations/           schema, RLS, storage
```

## A note on time

Booking times are stored as `timestamp` without a zone, on purpose. "Check out at
10:00" means 10:00 where you are standing — there is no instant to convert. Dates and
times are read as strings rather than pushed through `new Date()`, which is how a
03:00 car return quietly becomes 19:00 the previous day for a reader in another
timezone. See [`src/lib/format.ts`](src/lib/format.ts).

## Scripts

```bash
npm run dev      # development server
npm run build    # production build (also type-checks)
npm run lint     # eslint
npm run format   # prettier
```
