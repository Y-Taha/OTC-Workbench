-- Template for granting an authenticated user access to a tenant after the
-- user has been created in Supabase Auth.
--
-- Replace the email, tenant slug, and role before running.

insert into public.tenant_memberships (tenant_id, user_id, role)
select t.id, u.id, 'owner'
from public.tenants t
join auth.users u on lower(u.email) = lower('user@example.com')
where t.slug = 'default'
on conflict (tenant_id, user_id) do update
set role = excluded.role;
