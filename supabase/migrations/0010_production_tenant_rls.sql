create index if not exists tenant_memberships_user_id_tenant_id_idx
on public.tenant_memberships (user_id, tenant_id);

create index if not exists tenants_slug_id_idx
on public.tenants (slug, id);

create schema if not exists app_private;

create or replace function app_private.current_tenant_role(target_tenant_id uuid)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select tm.role::text
  from public.tenant_memberships tm
  where tm.tenant_id = target_tenant_id
    and tm.user_id = auth.uid()
  limit 1
$$;

insert into public.tenants (slug, name)
values ('admin', 'Platform Admin')
on conflict (slug) do update
set name = excluded.name;

create or replace function app_private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    join public.tenants t on t.id = tm.tenant_id
    where tm.user_id = auth.uid()
      and t.slug = 'admin'
      and tm.role = 'admin'::public.tenant_membership_role
  )
$$;

grant usage on schema app_private to authenticated;
grant execute on function app_private.current_tenant_role(uuid) to authenticated;
grant execute on function app_private.is_platform_admin() to authenticated;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      or (schemaname = 'storage' and tablename = 'objects')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end $$;

alter table public.tenants enable row level security;
alter table public.tenant_memberships enable row level security;

create policy tenants_select_member
on public.tenants
for select
to authenticated
using (
  app_private.is_platform_admin()
  or app_private.current_tenant_role(id) is not null
);

create policy tenant_memberships_select_self
on public.tenant_memberships
for select
to authenticated
using (
  app_private.is_platform_admin()
  or user_id = auth.uid()
  or app_private.current_tenant_role(tenant_id) = 'admin'
);

create policy tenant_memberships_insert_admin
on public.tenant_memberships
for insert
to authenticated
with check (
  app_private.is_platform_admin()
  or app_private.current_tenant_role(tenant_id) = 'admin'
);

create policy tenant_memberships_update_admin
on public.tenant_memberships
for update
to authenticated
using (
  app_private.is_platform_admin()
  or app_private.current_tenant_role(tenant_id) = 'admin'
)
with check (
  app_private.is_platform_admin()
  or app_private.current_tenant_role(tenant_id) = 'admin'
);

create policy tenant_memberships_delete_admin
on public.tenant_memberships
for delete
to authenticated
using (
  app_private.is_platform_admin()
  or app_private.current_tenant_role(tenant_id) = 'admin'
);

do $$
declare
  table_name text;
  tenant_tables text[] := array[
    'entities',
    'entity_industries',
    'profiles',
    'funds',
    'research_areas',
    'research',
    'research_research_area',
    'research_team_member',
    'research_fund',
    'invention_disclosures',
    'idf_inventors',
    'idf_applicants',
    'idf_fund',
    'prior_art_searches',
    'patents',
    'utility_models',
    'design_rights',
    'plant_varieties',
    'circuit_designs',
    'copyrights',
    'know_hows',
    'ip_inventors',
    'ip_applicants',
    'trl_assessments',
    'mrl_assessments',
    'crl_assessments',
    'licenses',
    'license_licensors',
    'license_milestones',
    'license_revenues',
    'consultations',
    'equipment',
    'industry_problem_statements',
    'industry_common_challenges',
    'industry_challenge_problem_statement',
    'solutions'
  ];
begin
  foreach table_name in array tenant_tables loop
    execute format('alter table public.%I enable row level security', table_name);

    execute format(
      'create policy %I on public.%I for select to authenticated using (
        app_private.is_platform_admin()
        or app_private.current_tenant_role(tenant_id) is not null
      )',
      table_name || '_tenant_select',
      table_name
    );

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (
        app_private.is_platform_admin()
        or app_private.current_tenant_role(tenant_id) = ''admin''
      )',
      table_name || '_tenant_insert',
      table_name
    );

    execute format(
      'create policy %I on public.%I for update to authenticated using (
        app_private.is_platform_admin()
        or app_private.current_tenant_role(tenant_id) = ''admin''
      ) with check (
        app_private.is_platform_admin()
        or app_private.current_tenant_role(tenant_id) = ''admin''
      )',
      table_name || '_tenant_update',
      table_name
    );

    execute format(
      'create policy %I on public.%I for delete to authenticated using (
        app_private.is_platform_admin()
        or app_private.current_tenant_role(tenant_id) = ''admin''
      )',
      table_name || '_tenant_delete',
      table_name
    );
  end loop;
end $$;

create policy "public read tenant logos"
on storage.objects
for select
to public
using (
  bucket_id = 'logos'
  and split_part(name, '/', 1) = 'tenants'
);

create policy "tenant members read files"
on storage.objects
for select
to authenticated
using (
  bucket_id in ('logos', 'documents', 'reports', 'contracts', 'invoices')
  and (
    app_private.is_platform_admin()
    or exists (
      select 1
      from public.tenants t
      join public.tenant_memberships tm on tm.tenant_id = t.id
      where t.slug = split_part(storage.objects.name, '/', 2)
        and tm.user_id = auth.uid()
    )
  )
);

create policy "tenant members upload files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('logos', 'documents', 'reports', 'contracts', 'invoices')
  and split_part(name, '/', 1) = 'tenants'
  and (
    app_private.is_platform_admin()
    or exists (
      select 1
      from public.tenants t
      join public.tenant_memberships tm on tm.tenant_id = t.id
      where t.slug = split_part(storage.objects.name, '/', 2)
        and tm.user_id = auth.uid()
    )
  )
);

create policy "tenant members update files"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('logos', 'documents', 'reports', 'contracts', 'invoices')
  and (
    app_private.is_platform_admin()
    or exists (
      select 1
      from public.tenants t
      join public.tenant_memberships tm on tm.tenant_id = t.id
      where t.slug = split_part(storage.objects.name, '/', 2)
        and tm.user_id = auth.uid()
    )
  )
)
with check (
  bucket_id in ('logos', 'documents', 'reports', 'contracts', 'invoices')
  and split_part(name, '/', 1) = 'tenants'
  and (
    app_private.is_platform_admin()
    or exists (
      select 1
      from public.tenants t
      join public.tenant_memberships tm on tm.tenant_id = t.id
      where t.slug = split_part(storage.objects.name, '/', 2)
        and tm.user_id = auth.uid()
    )
  )
);

create policy "tenant members delete files"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('logos', 'documents', 'reports', 'contracts', 'invoices')
  and (
    app_private.is_platform_admin()
    or exists (
      select 1
      from public.tenants t
      join public.tenant_memberships tm on tm.tenant_id = t.id
      where t.slug = split_part(storage.objects.name, '/', 2)
        and tm.user_id = auth.uid()
    )
  )
);
