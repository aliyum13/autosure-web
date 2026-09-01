# Migrations

## Standing up a new database

Run **`000_baseline.sql` alone**, in the Neon SQL Editor. That is the whole
schema: 17 tables and 2 enum types.

**Do not run 001-017 afterwards.** They are already baked into the baseline.
Replaying them is redundant at best, and `009_drop_legacy_auth_tables.sql` will
hard-fail — its safety guard runs `SELECT COUNT(*) FROM users` inside a `DO`
block, and `users` no longer exists.

## What 001-017 are

The applied history of the production database, kept for the reasoning in their
comments. **They are a record, not a runbook.** Each one was pasted into the
Neon SQL Editor once, in order, at the point it was written.

They cannot rebuild a database on their own. They are incremental: they `ALTER`
`orders`, `reports`, `referral_codes` and `referrals` without ever creating
them. The original schema came from `prisma db push` and was never captured as
SQL, and `referral_codes` / `referrals` had no `CREATE TABLE` anywhere in git —
they were created by hand in the SQL Editor and existed only in the live
database. Eleven source files read and write them.

That meant the repository could not reconstruct its own database. Restoring
from git after a total loss would have gotten as far as `001`, which fails on
its first `ALTER` against an empty database. `000_baseline.sql` closes that gap.

## Adding a migration

1. Add `0NN_short_name.sql`. Say in a header comment *why*, not just what —
   that is the convention the existing files follow and the reason they are
   still worth reading.
2. Run it against production.
3. **Re-capture the baseline in the same change:**

   ```bash
   pg_dump --schema-only --no-owner --no-privileges "$DATABASE_URL" > /tmp/schema.sql
   ```

   Then rebuild `000_baseline.sql` from it, keeping the existing header. Strip
   pg_dump 18's `\restrict` / `\unrestrict` psql meta-commands and the `SET`
   preamble — the Neon SQL Editor is not psql and will choke on them.

Step 3 is the one that prevents this drift from recurring. A migration that
lands without it puts the baseline back out of date, and the gap is invisible
until someone needs it.

## prisma/schema.prisma is not the schema

It has drifted and is used only for `prisma generate` at build time. It still
declares a `User` model and both foreign keys that `009` dropped, types
`payment_status` / `report_status` as `String` rather than the enums the
database actually uses, and omits `guest_name` / `guest_email` / `guest_phone` /
`bundle_id` / `bundle_count` along with every table added by 002-017.

The drift is currently inert, because nothing uses Prisma's generated model
API. All 34 files that touch the database go through `$queryRawUnsafe` /
`$executeRawUnsafe`, and `src/lib/db.ts` types the client as `any`, so the
generated types are never consumed. Prisma is acting as a connection pool and a
raw-SQL driver, nothing more.

The file still cannot be deleted: `prisma generate` runs in both `build` and
`postinstall`, and needs a valid schema. Just do not treat it as documentation,
and never run `prisma db push` against a real database — it would try to
reconcile production to that stale model, recreating `users` and both foreign
keys and breaking order creation.

**`000_baseline.sql` is the truth about the database.**
