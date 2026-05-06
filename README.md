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
```

## Database

Migrations live in `supabase/migrations`.

For duplicating the current Supabase instance into a new Supabase project, use the final bootstrap files in `supabase/final`.

```bash
psql "$DATABASE_URL" -f supabase/final/0000_bootstrap_current_instance.sql
```

The bootstrap intentionally excludes obsolete prototype/demo migrations and uses the final tenant-scoped RLS/storage setup.

The current tenant model uses:

- `tenants.slug` to identify the workspace from the URL path, for example `/default` or `/admin` (first path segment).
- `tenant_id` on tenant-owned records.
- `tenant_memberships` to grant authenticated users access to a tenant.
- The reserved `admin` tenant for users who should see and manage records across every tenant.
- Storage paths under `tenants/{tenantSlug}/...`.

Requests without a tenant route segment (for example visiting `/` instead of `/{tenantSlug}`) show a tenant access error instead of falling back to `default`.

The app does not create tenants from the browser. Create tenants and initial memberships through a trusted admin/service-role workflow or a migration. Existing demo data is backfilled into the `default` tenant.

## Edge Functions (Auth user provisioning)

Creating and resetting user passwords requires the Supabase **service role** key, so it cannot run safely in the browser. The app calls these Edge Functions (source in the repo); they verify the caller is a tenant admin, then use the service role server-side:

- `create-tenant-user` — creates an Auth user, `profiles` row, and `tenant_memberships` row.
- `reset-tenant-user-password` — sets a new temporary password on the linked Auth user.

Source files:

- `supabase/functions/create-tenant-user/index.ts`
- `supabase/functions/reset-tenant-user-password/index.ts`

Hosted Edge Functions receive `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` automatically; you typically do not set these manually.

### New Supabase project / deployment

1. Apply database schema and migrations first (for example `supabase db push`, or run your bootstrap SQL as documented above).
2. Link the CLI to the new project and deploy the functions from this repository:

```bash
supabase link --project-ref <new-project-ref>
supabase functions deploy create-tenant-user
supabase functions deploy reset-tenant-user-password
```

Ensure the new database includes `public.profiles`, `public.tenants`, and `public.tenant_memberships` with your production RLS policies before relying on user management in the app.

## Auth

Private app routes are gated by Supabase Auth. Users must sign in at `/login` and must have a matching `tenant_memberships` row for the tenant resolved from the URL path.

## Production Checklist

- Do not deploy demo seed data to real production environments unless it is intentional.
- Keep `VITE_SUPABASE_ANON_KEY` public only; never expose service-role or secret keys in Vite env vars.
- Verify RLS policies after every schema migration.
- Add tenant memberships for new users before they access the app.
- Add automated tests for auth, tenant isolation, file upload, and CRUD flows before release.
