-- OTC Workbench final Supabase bootstrap.
--
-- Run this from psql or Supabase CLI against a new Supabase project to recreate
-- the current schema, demo data, storage buckets, tenant model, views, and
-- production RLS/storage policies.
--
-- Important:
-- - This script intentionally skips 0001 and 0002 because 0004 replaces the
--   earlier prototype schema and 0012 replaces the early storage setup.
-- - 0007_demo_rls_policies.sql is intentionally excluded because it creates
--   permissive demo policies that are not production-safe.
-- - The old storage setup is intentionally not included because its broad
--   policies were superseded by 0012 and tenant-scoped storage policies.
-- - Auth users are not recreated by this script. After creating users in the
--   new project, add rows to public.tenant_memberships for the right tenant.

\ir ../migrations/0003_project_extensions.sql
\ir ../migrations/0004_reference_parity_schema.sql
\ir ../migrations/0005_reference_demo_seed.sql
\ir ../migrations/0006_ui_parity_columns.sql
\ir ../migrations/0008_solution_ip_type.sql
\ir ../migrations/0009_shared_database_tenancy.sql
\ir ../migrations/0012_storage_buckets.sql
\ir ../migrations/0010_production_tenant_rls.sql
