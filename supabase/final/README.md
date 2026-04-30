# Final Supabase Bootstrap

Use `0000_bootstrap_current_instance.sql` to recreate the current Supabase database/storage setup in a new project.

## Recommended Use

Run from this folder with a Postgres connection string for the target Supabase project:

```bash
psql "$DATABASE_URL" -f 0000_bootstrap_current_instance.sql
```

This file uses `\ir` include statements, so it is intended for `psql`/Supabase CLI style execution, not the Supabase Dashboard SQL editor.

## What It Includes

- Final reference-parity schema.
- Demo seed data.
- UI helper columns used by the React/Refine app.
- Shared-database tenant model.
- Tenant-scoped dashboard views.
- Storage buckets.
- Production tenant RLS and tenant-scoped storage policies.

## What It Excludes

- `0001_initial_multi_tenant_schema.sql` because it is the superseded prototype schema.
- `0002_storage_buckets_and_policies.sql` because its broad storage policies were replaced by final tenant-scoped policies.
- `0003_lookup_enums.sql` because it targeted the superseded prototype schema.
- `0007_demo_rls_policies.sql` because it creates permissive demo policies.
- Auth users. Create users through Supabase Auth, then add memberships using `add_tenant_membership_template.sql`.
