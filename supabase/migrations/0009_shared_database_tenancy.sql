create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists tenant_memberships (
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

insert into tenants (slug, name)
values ('default', 'Default Tenant')
on conflict (slug) do nothing;

drop view if exists v_dashboard_kpis;
drop view if exists v_ip_portfolio_distribution;
drop view if exists v_research_projects_by_status;
drop view if exists v_research_funding_by_status;
drop view if exists v_fund_pipeline_by_title;
drop view if exists v_license_revenue_totals;
drop view if exists v_consultation_fees_by_status;

do $$
declare
  default_tenant_id uuid;
  table_name text;
  tenant_tables text[] := array[
    'entities',
    'entity_industries',
    'app_users',
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
  select id into default_tenant_id from tenants where slug = 'default';

  foreach table_name in array tenant_tables loop
    execute format('alter table public.%I add column if not exists tenant_id uuid references public.tenants(id)', table_name);
    execute format('update public.%I set tenant_id = $1 where tenant_id is null', table_name) using default_tenant_id;
    execute format('alter table public.%I alter column tenant_id set not null', table_name);
    execute format('create index if not exists %I on public.%I (tenant_id)', table_name || '_tenant_id_idx', table_name);
  end loop;
end $$;

create or replace view v_dashboard_kpis
with (security_invoker = true) as
select
  t.id as tenant_id,
  (select count(*) from research r where r.tenant_id = t.id) as research_count,
  (select count(*) from patents p where p.tenant_id = t.id) + (select count(*) from utility_models um where um.tenant_id = t.id) as patents_and_utility_models_count,
  (select count(*) from invention_disclosures idf where idf.tenant_id = t.id) as idf_count,
  (select count(*) from licenses l where l.tenant_id = t.id and current_date between l.start_date and l.end_date) as active_licenses,
  (select count(*) from consultations c where c.tenant_id = t.id) as consultation_count,
  (
    (select count(*) from patents p where p.tenant_id = t.id)
    + (select count(*) from utility_models um where um.tenant_id = t.id)
    + (select count(*) from design_rights dr where dr.tenant_id = t.id)
    + (select count(*) from plant_varieties pv where pv.tenant_id = t.id)
    + (select count(*) from circuit_designs cd where cd.tenant_id = t.id)
    + (select count(*) from copyrights cr where cr.tenant_id = t.id)
    + (select count(*) from know_hows kh where kh.tenant_id = t.id)
  ) as ip_assets_total
from tenants t;

create or replace view v_ip_portfolio_distribution
with (security_invoker = true) as
select tenant_id, 'Patent' as name, count(*) as item_count from patents group by tenant_id union all
select tenant_id, 'Utility Model', count(*) from utility_models group by tenant_id union all
select tenant_id, 'Design Right', count(*) from design_rights group by tenant_id union all
select tenant_id, 'Plant Variety', count(*) from plant_varieties group by tenant_id union all
select tenant_id, 'Circuit Design', count(*) from circuit_designs group by tenant_id union all
select tenant_id, 'Copyrights', count(*) from copyrights group by tenant_id union all
select tenant_id, 'Know-How', count(*) from know_hows group by tenant_id;

create or replace view v_research_projects_by_status
with (security_invoker = true) as
select tenant_id, status as name, count(*) as project_count
from research
group by tenant_id, status;

create or replace view v_research_funding_by_status
with (security_invoker = true) as
select tenant_id, status as name, coalesce(sum(amount), 0) as total_egp
from research
group by tenant_id, status;

create or replace view v_fund_pipeline_by_title
with (security_invoker = true) as
select
  f.tenant_id,
  f.title as name,
  (select count(*) from research_fund rf where rf.tenant_id = f.tenant_id and rf.fund_id = f.id)
  + (select count(*) from idf_fund idff where idff.tenant_id = f.tenant_id and idff.fund_id = f.id) as item_count
from funds f;

create or replace view v_license_revenue_totals
with (security_invoker = true) as
select l.tenant_id, l.id, l.title as name, coalesce(sum(lr.amount), 0) as total_egp
from licenses l
left join license_revenues lr on lr.tenant_id = l.tenant_id and lr.license_id = l.id
group by l.tenant_id, l.id, l.title
order by l.id;

create or replace view v_consultation_fees_by_status
with (security_invoker = true) as
select tenant_id, coalesce(status, 'Unknown') as name, coalesce(sum(fees), 0) as fees_total
from consultations
group by tenant_id, status;
