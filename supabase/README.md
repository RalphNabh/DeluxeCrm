# Database migrations

Every schema change lives in `supabase/migrations/` as a timestamped `.sql` file
that runs exactly once, in filename order.

Before this directory existed, schema changes were 32 loose `.sql` files in the
repository root, pasted into the Supabase SQL editor by hand. Nothing recorded
which had been applied, so code and schema drifted: the application read columns
no file defined, wrote a status value the CHECK constraint rejected, and inserted
column names the table did not have. `00000000000000_baseline.sql` is those 32
files squashed in dependency order; every change after it is its own migration.

**Do not add `.sql` files to the repository root.** CI rejects them.

## Adding a migration

```bash
npx supabase migration new short_description
# edit supabase/migrations/<timestamp>_short_description.sql
./scripts/verify-migrations.sh
```

Write migrations to be re-runnable (`if not exists`, `drop policy if exists`
before `create policy`). `verify-migrations.sh` applies every migration twice and
fails if the second pass errors.

## Verifying locally

`scripts/verify-migrations.sh` applies the shim and all migrations to a scratch
database, applies them a second time to prove idempotency, then asserts the
invariants in `tests/10-assertions.sql`.

It needs a local Postgres 16. It has no Docker dependency, so it runs anywhere:

```bash
sudo apt-get install -y postgresql
sudo pg_ctlcluster 16 main start
./scripts/verify-migrations.sh
```

Against an arbitrary Postgres, set `DATABASE_URL` to a superuser connection
string on the `postgres` maintenance database.

`tests/00-shim.sql` recreates the handful of Supabase primitives our migrations
reference — `auth.users`, `auth.uid()`, `storage.objects`, `storage.foldername()`,
the anon/authenticated/service_role roles, pgcrypto, and the
`supabase_realtime` publication. It is a local test fixture and is never applied
to a Supabase project.

`tests/10-assertions.sql` is where drift guards go. When you fix a bug caused by
schema and code disagreeing, add an assertion so it cannot come back.

## Applying to a Supabase project

```bash
npx supabase link --project-ref <ref>
npx supabase db push
```

An existing project already contains everything in the baseline. Mark it applied
rather than running it, or `db push` will attempt to recreate live tables:

```bash
npx supabase migration repair --status applied 00000000000000
npx supabase db push
```

That `db push` applies `20250104000000_repair_schema_drift` (estimate columns,
`Changes Requested`, dropped `leads.status` CHECK, `leads.client_id`) and any
later migrations. After push, smoke:

1. Record a payment on an invoice
2. Download an invoice PDF (`?download=true`)
3. Convert a request → estimate
4. Drag a lead to a custom pipeline stage
5. Create a client that already has a matching lead (no duplicate card)

## Two things the baseline deliberately changes

- **`setup-materials-table.sql` was dropped.** It duplicated
  `supabase-materials-schema.sql` apart from one comment.
- **`supabase-automations-rls-fix.sql` was dropped.** It replaced the automations
  read policy with `using (true)`, making every tenant's automations readable by
  any authenticated request. Its own comments described it as a temporary
  workaround for the executor running without a user session. The executor uses
  `SUPABASE_SERVICE_ROLE_KEY`, which bypasses RLS, so the workaround is
  unnecessary. If your database has this policy, drop it:

  ```sql
  drop policy if exists "Enable read automations for executor" on public.automations;
  ```
