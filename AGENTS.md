# AGENTS.md

## Cursor Cloud specific instructions

DyluxePro is a single Next.js 15 (App Router, Turbopack) application — the
contractor CRM lives in `src/app`, shared server/data logic in `src/lib`. It
talks to Supabase (Postgres + Auth + Storage). Stripe (subscription billing),
Resend (email), OpenAI (AI estimates), Upstash (rate limiting) and Sentry are
optional integrations that degrade gracefully when their env vars are unset, so
none are required to run the app locally.

Standard commands are defined in `package.json` (`dev`, `build`, `lint`,
`test`) and `supabase/README.md` (migration workflow). The notes below are the
non-obvious things.

### Dependencies already provisioned in this environment

The startup/update script runs `npm install`. Additionally, Docker (with the
`fuse-overlayfs` storage driver and the `containerd-snapshotter` feature
disabled, required for docker-in-docker on Docker 29) is installed and the
Supabase CLI is available via `npx supabase`. These are captured in the VM
snapshot; the update script does not reinstall them.

### Running the app (requires Supabase)

The app cannot boot meaningfully without Supabase — `middleware.ts` calls
Supabase Auth on nearly every request, and unauthenticated users are redirected
to `/login`. Bring up a local Supabase stack, then run the dev server:

1. Start Docker if it is not already running: `sudo dockerd &` (wait a few
   seconds; verify with `docker ps`). If the socket is not group-accessible,
   run `sudo chmod 666 /var/run/docker.sock`.
2. **Local Postgres version override (required, do NOT commit):** the hosted
   project is Postgres 16, but the Supabase CLI only ships local images for 15
   and 17, so `supabase start` rejects `major_version = 16`. Temporarily set it
   to 17 for local only:
   `sed -i 's/^major_version = 16/major_version = 17/' supabase/config.toml`
   Leave this change unstaged — the committed value must stay `16` so the team's
   `supabase db push` tooling targets the real PG16 project.
3. `npx supabase start` — pulls images (first run only), applies
   `supabase/migrations/*`, then runs `supabase/seed.sql`. It prints the local
   API URL and the anon / service_role keys.
4. `npm run dev` — serves on `http://localhost:3000`, reading `.env.local`.

`.env.local` is git-ignored and must exist for the app to find Supabase. It is
recreated during setup with the local stack's URL
(`http://127.0.0.1:54321`) and the standard deterministic local anon /
service_role keys. If it is missing, copy `.env.example` and fill in the
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` /
`SUPABASE_SERVICE_ROLE_KEY` values printed by `supabase start`.

### Why `supabase/seed.sql` exists (important)

The migrations are a squash of schema originally applied to the hosted project
through the Supabase SQL editor (see `supabase/README.md`), so they contain no
table GRANTs — Supabase's default privileges for `supabase_admin`-owned objects
covered that. Applied to a fresh LOCAL stack the migrations run as `postgres`,
whose default privileges omit `SELECT/INSERT/UPDATE` for the
anon/authenticated/service_role roles, so the app hits "permission denied for
table ...". `supabase/seed.sql` re-grants those privileges. It runs only on
local `supabase start` / `supabase db reset` and never touches production. If
you add a fresh migration and the app suddenly gets permission errors on the new
table, `supabase db reset` (which re-runs the seed) fixes it.

### Subscription gating

After login, `middleware.ts` redirects contractors to `/subscription` unless
their org (or user) has an `active` row in `public.subscriptions`. There is no
local Stripe, so to reach `/dashboard` and the rest of the app, insert an active
subscription directly, e.g.:

```sql
insert into subscriptions (id, user_id, organization_id, status,
  current_period_start, current_period_end)
values (gen_random_uuid(), '<auth_user_id>', '<org_id>', 'active',
  now(), now() + interval '30 days');
```

`/settings` and `/profile` are subscription-exempt (see
`src/lib/route-access.ts`), so those are reachable without a subscription.

### Auth notes

Local Supabase auto-confirms new signups (no email verification step), so
`/api/auth/signup` returns a usable session immediately. Signup also creates the
org, owner membership, and user profile via the service-role client — this only
works once `seed.sql` grants are in place.

### Database access

Query the local DB directly with:
`docker exec -e PGPASSWORD=postgres supabase_db_dyluxepro psql -U postgres -d postgres`

### Migration verification

`scripts/verify-migrations.sh` (documented in `supabase/README.md`) verifies
migrations against a plain Postgres 16 and is independent of the Docker/Supabase
local stack. It needs a system Postgres 16, not the running Supabase containers.
