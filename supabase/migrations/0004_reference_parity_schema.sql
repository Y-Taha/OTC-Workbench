drop schema if exists public cascade;
create schema public;

grant usage on schema public to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;

create table entities (
  id serial primary key,
  name text not null,
  type text not null check (type in ('Company', 'Government', 'OTC', 'Research Center', 'University')),
  address text,
  phone text not null,
  email text not null,
  logo_path text
);

create table entity_industries (
  entity_id int not null references entities(id) on delete cascade,
  industry text not null,
  primary key (entity_id, industry)
);

create table profiles (
  id serial primary key,
  auth_user_id uuid references auth.users(id) on delete set null,
  entity_id int references entities(id) on delete set null,
  name text not null,
  title text,
  mobile text,
  email text,
  department text,
  affiliation_status text check (affiliation_status in ('Full-Time', 'Part-Time', 'Freelancer', 'External Consultant', 'External Researcher', 'Internal Faculty', 'Student', 'Internal Staff'))
);

-- Partial unique index: multiple rows may have null auth_user_id; non-null values must be unique.
create unique index profiles_auth_user_id_key
  on public.profiles (auth_user_id)
  where auth_user_id is not null;

create table funds (
  id serial primary key,
  title text not null,
  description text not null,
  funding_entity_id int not null references entities(id)
);

create table research_areas (
  id serial primary key,
  name text not null,
  description text
);

create table research (
  id serial primary key,
  title text not null,
  detailed_description text not null,
  research_output_description text not null,
  start_date date,
  end_date date,
  pi_user_id int not null references profiles(id),
  previous_research_id int references research(id),
  status text not null check (status in ('In Progress', 'Completed', 'Terminated')),
  is_funded boolean not null default false,
  amount numeric(14, 2) not null default 0
);

create table research_research_area (
  research_id int not null references research(id) on delete cascade,
  research_area_id int not null references research_areas(id),
  primary key (research_id, research_area_id)
);

create table research_team_member (
  research_id int not null references research(id) on delete cascade,
  user_id int not null references profiles(id),
  is_pi boolean not null default false,
  primary key (research_id, user_id)
);

create table research_fund (
  research_id int not null references research(id) on delete cascade,
  fund_id int not null references funds(id),
  amount numeric(14, 2) not null default 0,
  primary key (research_id, fund_id)
);

create table invention_disclosures (
  id serial primary key,
  own_research boolean not null default false,
  assessment_user_id int references profiles(id),
  research_id int references research(id),
  research_link text,
  disclosure_date date not null,
  title text not null,
  field_of_invention text[] not null default '{}',
  description text not null,
  classification text[] not null default '{}',
  problem text,
  existing_solutions text,
  existing_solutions_drawbacks text,
  features text,
  how_invention_works text,
  novel_features text,
  diagrams_path text,
  development_status text check (development_status is null or development_status in ('Concept Stage', 'Proof of Concept', 'Lab Validation', 'Lab-Scale Prototype', 'Prototype Demonstration', 'Pre-Commercial', 'Complete & Qualified', 'Commercial', 'Already Commercialized/In Use')),
  potential_applications text,
  potential_clients text,
  applied_for_ip boolean not null default false,
  previous_protection_details text,
  previously_disclosed boolean not null default false,
  previous_disclosure_details text,
  collaboration_details text,
  support_funds_details text,
  contractual_obligations_details text,
  contractual_obligations_files_path text,
  used_facilities_details text,
  has_protection_potential boolean not null default false,
  potential_protection text[] not null default '{}',
  potential_commercialization_form text[] not null default '{}',
  amount numeric(14, 2) not null default 0,
  is_completed boolean not null default false,
  lead_inventor_id int references profiles(id),
  comments text,
  constraint idf_own_research_required check (
    not own_research or (
      problem is not null and existing_solutions is not null and existing_solutions_drawbacks is not null
      and features is not null and how_invention_works is not null and novel_features is not null
      and development_status is not null and potential_applications is not null
    )
  ),
  constraint idf_previous_protection_reveal check (previous_protection_details is null or applied_for_ip),
  constraint idf_previous_disclosure_reveal check (previous_disclosure_details is null or previously_disclosed)
);

create table idf_inventors (
  invention_disclosure_id int not null references invention_disclosures(id) on delete cascade,
  user_id int not null references profiles(id),
  contribution_percentage int check (contribution_percentage between 0 and 100),
  contribution_description text,
  primary key (invention_disclosure_id, user_id)
);

create table idf_applicants (
  id serial primary key,
  invention_disclosure_id int not null references invention_disclosures(id) on delete cascade,
  user_applicant_id int references profiles(id),
  entity_applicant_id int references entities(id),
  ownership_percentage int not null check (ownership_percentage between 0 and 100),
  constraint idf_applicant_one_party check (num_nonnulls(user_applicant_id, entity_applicant_id) = 1)
);

create table idf_fund (
  invention_disclosure_id int not null references invention_disclosures(id) on delete cascade,
  fund_id int not null references funds(id),
  amount numeric(14, 2) not null default 0,
  primary key (invention_disclosure_id, fund_id)
);

create table prior_art_searches (
  id serial primary key,
  invention_disclosure_id int not null references invention_disclosures(id) on delete cascade,
  can_be_protected boolean not null default false,
  prior_art_report_path text not null
);

create table patents (
  id serial primary key,
  prior_art_search_id int references prior_art_searches(id),
  type text not null check (type in ('Provisional Patent', 'Non-Provisional Patent')),
  status text not null check (status in ('Pending', 'Search Report Received', 'Published', 'Granted', 'Abandoned', 'Expired')),
  title text not null,
  priority_number text not null,
  application_number text not null,
  application_date date not null,
  application_jurisdiction text not null check (application_jurisdiction in ('One Country', 'PCT', 'EPO', 'GCC', 'ARIPO', 'OAPI', 'EAPO')),
  countries text[] not null default '{}',
  publication_number text,
  publication_date date,
  cpc text,
  ipc text not null,
  abstract text not null,
  description text not null,
  claims text not null,
  drawings_path text not null,
  original_document_path text,
  office_search_report_path text,
  fund_id int references funds(id)
);

create table utility_models (
  id serial primary key,
  prior_art_search_id int references prior_art_searches(id),
  type text not null check (type in ('Provisional Utility Model', 'Non-Provisional Utility Model')),
  status text not null check (status in ('Pending', 'Search Report Received', 'Published', 'Granted', 'Abandoned', 'Expired')),
  title text not null,
  priority_number text not null,
  application_number text not null,
  application_date date not null,
  application_jurisdiction text not null check (application_jurisdiction in ('One Country', 'PCT', 'EPO', 'GCC', 'ARIPO', 'OAPI', 'EAPO')),
  countries text[] not null default '{}',
  publication_number text,
  publication_date date,
  cpc text,
  ipc text not null,
  abstract text not null,
  description text not null,
  claims text not null,
  drawings_path text not null,
  original_document_path text,
  office_search_report_path text,
  fund_id int references funds(id)
);

create table design_rights (
  id serial primary key,
  title text not null,
  prior_art_search_id int references prior_art_searches(id),
  original_document_path text not null,
  fund_id int references funds(id)
);

create table plant_varieties (
  id serial primary key,
  title text not null,
  prior_art_search_id int references prior_art_searches(id),
  original_document_path text not null,
  fund_id int references funds(id)
);

create table circuit_designs (
  id serial primary key,
  title text not null,
  prior_art_search_id int references prior_art_searches(id),
  original_document_path text not null,
  fund_id int references funds(id)
);

create table copyrights (
  id serial primary key,
  title text not null,
  prior_art_search_id int references prior_art_searches(id),
  original_document_path text not null,
  fund_id int references funds(id)
);

create table know_hows (
  id serial primary key,
  title text not null,
  prior_art_search_id int references prior_art_searches(id),
  original_document_path text not null,
  privacy_compliant boolean not null default false,
  compliance_document_path text,
  constraint know_how_compliance_reveal check (not privacy_compliant or compliance_document_path is not null)
);

create table ip_inventors (
  id serial primary key,
  ip_type text not null check (ip_type in ('Patent', 'Utility Model', 'Design Right', 'Plant Variety', 'Circuit Design', 'Copyrights', 'Know-How')),
  ip_id int not null,
  user_id int not null references profiles(id),
  unique (ip_type, ip_id, user_id)
);

create table ip_applicants (
  id serial primary key,
  ip_type text not null check (ip_type in ('Patent', 'Utility Model', 'Design Right', 'Plant Variety', 'Circuit Design', 'Copyrights', 'Know-How')),
  ip_id int not null,
  user_applicant_id int references profiles(id),
  entity_applicant_id int references entities(id),
  ownership_percentage int not null check (ownership_percentage between 0 and 100),
  constraint ip_applicant_one_party check (num_nonnulls(user_applicant_id, entity_applicant_id) = 1)
);

create table trl_assessments (
  id serial primary key,
  research_id int references research(id),
  prior_art_search_id int references prior_art_searches(id),
  ip_type text check (ip_type is null or ip_type in ('Patent', 'Utility Model', 'Design Right', 'Plant Variety', 'Circuit Design', 'Copyrights', 'Know-How')),
  ip_id int,
  trl_level text not null check (trl_level in ('TRL 1', 'TRL 2', 'TRL 3', 'TRL 4', 'TRL 5', 'TRL 6', 'TRL 7', 'TRL 8', 'TRL 9')),
  trl_description text not null,
  trl_report_path text not null,
  constraint trl_link_required check (research_id is not null or prior_art_search_id is not null or ip_id is not null)
);

create table mrl_assessments (
  id serial primary key,
  research_id int references research(id),
  prior_art_search_id int references prior_art_searches(id),
  ip_type text check (ip_type is null or ip_type in ('Patent', 'Utility Model', 'Design Right', 'Plant Variety', 'Circuit Design', 'Copyrights', 'Know-How')),
  ip_id int,
  mrl_level text not null check (mrl_level in ('MRL 1', 'MRL 2', 'MRL 3', 'MRL 4', 'MRL 5', 'MRL 6', 'MRL 7', 'MRL 8', 'MRL 9', 'MRL 10')),
  mrl_description text not null,
  mrl_report_path text not null,
  constraint mrl_link_required check (research_id is not null or prior_art_search_id is not null or ip_id is not null)
);

create table crl_assessments (
  id serial primary key,
  research_id int references research(id),
  prior_art_search_id int references prior_art_searches(id),
  ip_type text check (ip_type is null or ip_type in ('Patent', 'Utility Model', 'Design Right', 'Plant Variety', 'Circuit Design', 'Copyrights', 'Know-How')),
  ip_id int,
  market_potential_level text not null check (market_potential_level in ('CRL 1', 'CRL 2', 'CRL 3', 'CRL 4', 'CRL 5', 'CRL 6', 'CRL 7', 'CRL 8', 'CRL 9')),
  crl_description text not null,
  potential_commercialization_type text not null check (potential_commercialization_type in ('Licensing', 'Consulting')),
  commercial_assessment_report_path text not null,
  constraint crl_link_required check (research_id is not null or prior_art_search_id is not null or ip_id is not null)
);

create table licenses (
  id serial primary key,
  title text not null,
  description text not null,
  licensee_id int not null references entities(id),
  start_date date not null,
  end_date date not null,
  ip_type text not null check (ip_type in ('Patent', 'Utility Model', 'Design Right', 'Plant Variety', 'Circuit Design', 'Copyrights', 'Know-How')),
  ip_id int not null,
  exclusivity_type text not null check (exclusivity_type in ('Exclusive', 'Non-Exclusive', 'Sole')),
  field_of_use text not null,
  territory text[] not null default '{}',
  upfront_fee numeric(14, 2),
  royalty_base text check (royalty_base is null or royalty_base in ('Net Sales', 'Gross Sales', 'Per Unit')),
  royalty_amount numeric(14, 4),
  currency text,
  payment_frequency text not null check (payment_frequency in ('Monthly', 'Quarterly', 'Semi-Annually', 'Annually')),
  paid_amount numeric(14, 2) not null default 0,
  licensing_document_path text not null,
  constraint license_date_order check (end_date >= start_date)
);

create table license_licensors (
  id serial primary key,
  license_id int not null references licenses(id) on delete cascade,
  user_licensor_id int references profiles(id),
  entity_licensor_id int references entities(id),
  constraint license_licensor_one_party check (num_nonnulls(user_licensor_id, entity_licensor_id) = 1)
);

create table license_milestones (
  id serial primary key,
  license_id int not null references licenses(id) on delete cascade,
  description text not null,
  amount numeric(14, 2) not null default 0
);

create table license_revenues (
  id serial primary key,
  license_id int not null references licenses(id) on delete cascade,
  title text not null,
  description text,
  date date not null,
  amount numeric(14, 2) not null check (amount >= 0),
  comments text,
  invoice_path text
);

create table consultations (
  id serial primary key,
  title text not null,
  description text,
  consultant_id int not null references profiles(id),
  company_id int not null references entities(id),
  research_id int references research(id),
  invention_disclosure_id int references invention_disclosures(id) on delete set null,
  status text check (status is null or status in ('Proposed', 'Accepted', 'Contracted', 'Completed')),
  contract_path text,
  start_date date,
  end_date date,
  fees numeric(14, 2),
  fund_id int references funds(id),
  constraint consultation_link_required check (research_id is not null or invention_disclosure_id is not null)
);

create table equipment (
  id serial primary key,
  name text not null,
  description text,
  specifications text,
  research_id int references research(id),
  hosting_entity_id int not null references entities(id),
  department text,
  price numeric(14, 2),
  purchase_date date,
  available_for_rent boolean not null default false,
  rent_term text,
  rent_price numeric(14, 2),
  contact_person_id int not null references profiles(id),
  fund_id int references funds(id),
  constraint equipment_rent_reveal check (not available_for_rent or (rent_term is not null and rent_price is not null))
);

create table industry_problem_statements (
  id serial primary key,
  entity_id int not null references entities(id),
  title text not null,
  description text not null
);

create table industry_common_challenges (
  id serial primary key,
  entity_id int not null references entities(id),
  title text not null,
  description text not null
);

create table industry_challenge_problem_statement (
  industry_common_challenge_id int not null references industry_common_challenges(id) on delete cascade,
  industry_problem_statement_id int not null references industry_problem_statements(id) on delete cascade,
  primary key (industry_common_challenge_id, industry_problem_statement_id)
);

create table solutions (
  id serial primary key,
  title text not null,
  industry_common_challenge_id int not null references industry_common_challenges(id),
  consultation_id int references consultations(id),
  solution_description text,
  associated_ip text[] not null default '{}',
  constraint solution_consultation_or_ip_required check (consultation_id is not null or array_length(associated_ip, 1) > 0)
);

create or replace function trg_research_amount_recalc() returns trigger
language plpgsql as $$
begin
  update research
  set amount = coalesce((select sum(amount) from research_fund where research_id = coalesce(new.research_id, old.research_id)), 0)
  where id = coalesce(new.research_id, old.research_id);
  return null;
end $$;

create trigger research_fund_amount_sync
after insert or update or delete on research_fund
for each row execute function trg_research_amount_recalc();

create or replace function trg_idf_amount_recalc() returns trigger
language plpgsql as $$
begin
  update invention_disclosures
  set amount = coalesce((select sum(amount) from idf_fund where invention_disclosure_id = coalesce(new.invention_disclosure_id, old.invention_disclosure_id)), 0)
  where id = coalesce(new.invention_disclosure_id, old.invention_disclosure_id);
  return null;
end $$;

create trigger idf_fund_amount_sync
after insert or update or delete on idf_fund
for each row execute function trg_idf_amount_recalc();

create or replace function trg_license_paid_recalc() returns trigger
language plpgsql as $$
begin
  update licenses
  set paid_amount = coalesce((select sum(amount) from license_revenues where license_id = coalesce(new.license_id, old.license_id)), 0)
  where id = coalesce(new.license_id, old.license_id);
  return null;
end $$;

create trigger license_revenue_paid_sync
after insert or update or delete on license_revenues
for each row execute function trg_license_paid_recalc();

create or replace view v_dashboard_kpis as
select
  (select count(*) from research) as research_count,
  (select count(*) from patents) + (select count(*) from utility_models) as patents_and_utility_models_count,
  (select count(*) from invention_disclosures) as idf_count,
  (select count(*) from licenses where current_date between start_date and end_date) as active_licenses,
  (select count(*) from consultations) as consultation_count,
  (
    (select count(*) from patents) + (select count(*) from utility_models) + (select count(*) from design_rights)
    + (select count(*) from plant_varieties) + (select count(*) from circuit_designs)
    + (select count(*) from copyrights) + (select count(*) from know_hows)
  ) as ip_assets_total;

create or replace view v_ip_portfolio_distribution as
select 'Patent' as name, count(*) as item_count from patents union all
select 'Utility Model', count(*) from utility_models union all
select 'Design Right', count(*) from design_rights union all
select 'Plant Variety', count(*) from plant_varieties union all
select 'Circuit Design', count(*) from circuit_designs union all
select 'Copyrights', count(*) from copyrights union all
select 'Know-How', count(*) from know_hows;

create or replace view v_research_projects_by_status as
select status as name, count(*) as project_count from research group by status;

create or replace view v_research_funding_by_status as
select status as name, coalesce(sum(amount), 0) as total_egp from research group by status;

create or replace view v_fund_pipeline_by_title as
select f.title as name,
  (select count(*) from research_fund rf where rf.fund_id = f.id) +
  (select count(*) from idf_fund idff where idff.fund_id = f.id) as item_count
from funds f;

create or replace view v_license_revenue_totals as
select l.id, l.title as name, coalesce(sum(lr.amount), 0) as total_egp
from licenses l
left join license_revenues lr on lr.license_id = l.id
group by l.id, l.title
order by l.id;

create or replace view v_consultation_fees_by_status as
select coalesce(status, 'Unknown') as name, coalesce(sum(fees), 0) as fees_total
from consultations group by status;

grant all on all tables in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;
grant all on all functions in schema public to postgres, anon, authenticated, service_role;
