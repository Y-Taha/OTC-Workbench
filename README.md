# OTC Workbench Supabase Refine

TypeScript rebuild of OTC Workbench using:

- Vite + React + TypeScript
- Refine for resource-driven CRUD
- Supabase Auth, Postgres, Realtime, and Storage
- Shared-database multi-tenancy with tenant-scoped RLS

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Set these values in `.env`:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_TENANT_SLUG=default
```

## Database

Migrations live in `supabase/migrations`.

For duplicating the current Supabase instance into a new Supabase project, use the final bootstrap files in `supabase/final`.

```bash
psql "$DATABASE_URL" -f supabase/final/0000_bootstrap_current_instance.sql
```

The bootstrap intentionally excludes obsolete prototype/demo migrations and uses the final tenant-scoped RLS/storage setup.

The current tenant model uses:

- `tenants.slug` to identify the frontend deployment.
- `tenant_id` on tenant-owned records.
- `tenant_memberships` to grant authenticated users access to a tenant.
- Storage paths under `tenants/{tenantSlug}/...`.

The app does not create tenants from the browser. Create tenants and initial memberships through a trusted admin/service-role workflow or a migration. Existing demo data is backfilled into the `default` tenant.

## Auth

Private app routes are gated by Supabase Auth. Users must sign in at `/login` and must have a matching `tenant_memberships` row for the configured `VITE_TENANT_SLUG`.

## Production Checklist

- Do not deploy demo seed data to real production environments unless it is intentional.
- Keep `VITE_SUPABASE_ANON_KEY` public only; never expose service-role or secret keys in Vite env vars.
- Verify RLS policies after every schema migration.
- Add tenant memberships for new users before they access the app.
- Add automated tests for auth, tenant isolation, file upload, and CRUD flows before release.
