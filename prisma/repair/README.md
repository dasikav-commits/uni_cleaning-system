# Database schema repair

Use these scripts when the app fails with errors like

```
The table `public.PhiMonthlyAttendanceReport` does not exist in the current database.   (P2021)
The column `...` does not exist in the current database.                                (P2022)
```

This happens when the database was created outside Prisma Migrate (for example with
`prisma db push` or by hand) and later migrations were marked as applied with
`prisma migrate resolve --applied` without their changes actually being in the database.

The scripts are generated from `prisma/schema.prisma` and **only add what is missing**:
they never drop tables, columns, types or data, and they are safe to run any number of times.
If a single statement cannot be applied (for example, existing rows violate a new unique
index), a `WARNING` is printed and the rest of the script still runs.

| File | What it does |
|---|---|
| `00_check.sql` | **Read-only.** Lists missing tables, columns and enum values. No rows = complete. |
| `01_enums.sql` | Creates missing enum types and adds missing enum values. |
| `02_tables_columns_indexes.sql` | Creates missing tables, columns, indexes and foreign keys. |

## How to run

**Option A: Supabase dashboard → SQL Editor**

1. Paste `00_check.sql` and run it to see what is missing (optional).
2. Paste `01_enums.sql`, then click **Run**.
3. In a **separate run**, paste `02_tables_columns_indexes.sql`, then click **Run**.
4. Run `00_check.sql` again. It should return **no rows**.

**Option B: command line** (uses the database URL from `prisma.config.ts` / `.env`)

```bash
npx prisma db execute --file prisma/repair/01_enums.sql
npx prisma db execute --file prisma/repair/02_tables_columns_indexes.sql
```

Steps 2 and 3 must be separate runs: Postgres does not allow a new enum value to be used in
the same transaction that added it. If you ran them together and saw a warning containing
`unsafe use of new value`, run `02_tables_columns_indexes.sql` once more.

You do **not** need to change the migration history afterwards. `npx prisma migrate status`
should report that the database schema is up to date.

## Regenerating

If `schema.prisma` changes, regenerate these files from
`prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`, so they match
the new schema. Normal schema changes should be shipped as regular migrations in
`prisma/migrations/` and applied with `npx prisma migrate deploy`.
