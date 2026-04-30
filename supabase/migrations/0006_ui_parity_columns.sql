alter table entities add column industries text[] not null default '{}';

alter table research add column research_area_ids int[] not null default '{}';
alter table research add column team_member_ids int[] not null default '{}';
alter table research add column research_funds jsonb not null default '[]'::jsonb;

alter table invention_disclosures add column inventors jsonb not null default '[]'::jsonb;
alter table invention_disclosures add column applicants jsonb not null default '[]'::jsonb;
alter table invention_disclosures add column idf_funds jsonb not null default '[]'::jsonb;

alter table patents add column inventor_ids int[] not null default '{}';
alter table patents add column applicants jsonb not null default '[]'::jsonb;
alter table utility_models add column inventor_ids int[] not null default '{}';
alter table utility_models add column applicants jsonb not null default '[]'::jsonb;
alter table design_rights add column inventor_ids int[] not null default '{}';
alter table design_rights add column applicants jsonb not null default '[]'::jsonb;
alter table plant_varieties add column inventor_ids int[] not null default '{}';
alter table plant_varieties add column applicants jsonb not null default '[]'::jsonb;
alter table circuit_designs add column inventor_ids int[] not null default '{}';
alter table circuit_designs add column applicants jsonb not null default '[]'::jsonb;
alter table copyrights add column inventor_ids int[] not null default '{}';
alter table copyrights add column applicants jsonb not null default '[]'::jsonb;
alter table know_hows add column inventor_ids int[] not null default '{}';
alter table know_hows add column applicants jsonb not null default '[]'::jsonb;

alter table licenses add column licensors jsonb not null default '[]'::jsonb;
alter table licenses add column milestones jsonb not null default '[]'::jsonb;

alter table industry_common_challenges add column linked_problem_statement_ids int[] not null default '{}';

update entities e
set industries = coalesce((
  select array_agg(ei.industry order by ei.industry)
  from entity_industries ei
  where ei.entity_id = e.id
), '{}');

update research r
set
  research_area_ids = coalesce((select array_agg(research_area_id order by research_area_id) from research_research_area where research_id = r.id), '{}'),
  team_member_ids = coalesce((select array_agg(user_id order by user_id) from research_team_member where research_id = r.id and not is_pi), '{}'),
  research_funds = coalesce((select jsonb_agg(jsonb_build_object('fund_id', fund_id, 'amount', amount) order by fund_id) from research_fund where research_id = r.id), '[]'::jsonb);

update invention_disclosures idf
set
  inventors = coalesce((select jsonb_agg(jsonb_build_object('user_id', user_id, 'contribution_percentage', contribution_percentage, 'contribution_description', contribution_description) order by user_id) from idf_inventors where invention_disclosure_id = idf.id), '[]'::jsonb),
  applicants = coalesce((select jsonb_agg(jsonb_build_object('user_applicant_id', user_applicant_id, 'entity_applicant_id', entity_applicant_id, 'ownership_percentage', ownership_percentage) order by id) from idf_applicants where invention_disclosure_id = idf.id), '[]'::jsonb),
  idf_funds = coalesce((select jsonb_agg(jsonb_build_object('fund_id', fund_id, 'amount', amount) order by fund_id) from idf_fund where invention_disclosure_id = idf.id), '[]'::jsonb);

update patents p
set
  inventor_ids = coalesce((select array_agg(user_id order by user_id) from ip_inventors where ip_type = 'Patent' and ip_id = p.id), '{}'),
  applicants = coalesce((select jsonb_agg(jsonb_build_object('user_applicant_id', user_applicant_id, 'entity_applicant_id', entity_applicant_id, 'ownership_percentage', ownership_percentage) order by id) from ip_applicants where ip_type = 'Patent' and ip_id = p.id), '[]'::jsonb);

update utility_models p
set
  inventor_ids = coalesce((select array_agg(user_id order by user_id) from ip_inventors where ip_type = 'Utility Model' and ip_id = p.id), '{}'),
  applicants = coalesce((select jsonb_agg(jsonb_build_object('user_applicant_id', user_applicant_id, 'entity_applicant_id', entity_applicant_id, 'ownership_percentage', ownership_percentage) order by id) from ip_applicants where ip_type = 'Utility Model' and ip_id = p.id), '[]'::jsonb);

update design_rights p
set
  inventor_ids = coalesce((select array_agg(user_id order by user_id) from ip_inventors where ip_type = 'Design Right' and ip_id = p.id), '{}'),
  applicants = coalesce((select jsonb_agg(jsonb_build_object('user_applicant_id', user_applicant_id, 'entity_applicant_id', entity_applicant_id, 'ownership_percentage', ownership_percentage) order by id) from ip_applicants where ip_type = 'Design Right' and ip_id = p.id), '[]'::jsonb);

update plant_varieties p
set
  inventor_ids = coalesce((select array_agg(user_id order by user_id) from ip_inventors where ip_type = 'Plant Variety' and ip_id = p.id), '{}'),
  applicants = coalesce((select jsonb_agg(jsonb_build_object('user_applicant_id', user_applicant_id, 'entity_applicant_id', entity_applicant_id, 'ownership_percentage', ownership_percentage) order by id) from ip_applicants where ip_type = 'Plant Variety' and ip_id = p.id), '[]'::jsonb);

update circuit_designs p
set
  inventor_ids = coalesce((select array_agg(user_id order by user_id) from ip_inventors where ip_type = 'Circuit Design' and ip_id = p.id), '{}'),
  applicants = coalesce((select jsonb_agg(jsonb_build_object('user_applicant_id', user_applicant_id, 'entity_applicant_id', entity_applicant_id, 'ownership_percentage', ownership_percentage) order by id) from ip_applicants where ip_type = 'Circuit Design' and ip_id = p.id), '[]'::jsonb);

update copyrights p
set
  inventor_ids = coalesce((select array_agg(user_id order by user_id) from ip_inventors where ip_type = 'Copyrights' and ip_id = p.id), '{}'),
  applicants = coalesce((select jsonb_agg(jsonb_build_object('user_applicant_id', user_applicant_id, 'entity_applicant_id', entity_applicant_id, 'ownership_percentage', ownership_percentage) order by id) from ip_applicants where ip_type = 'Copyrights' and ip_id = p.id), '[]'::jsonb);

update know_hows p
set
  inventor_ids = coalesce((select array_agg(user_id order by user_id) from ip_inventors where ip_type = 'Know-How' and ip_id = p.id), '{}'),
  applicants = coalesce((select jsonb_agg(jsonb_build_object('user_applicant_id', user_applicant_id, 'entity_applicant_id', entity_applicant_id, 'ownership_percentage', ownership_percentage) order by id) from ip_applicants where ip_type = 'Know-How' and ip_id = p.id), '[]'::jsonb);

update licenses l
set
  licensors = coalesce((select jsonb_agg(jsonb_build_object('user_licensor_id', user_licensor_id, 'entity_licensor_id', entity_licensor_id) order by id) from license_licensors where license_id = l.id), '[]'::jsonb),
  milestones = coalesce((select jsonb_agg(jsonb_build_object('description', description, 'amount', amount) order by id) from license_milestones where license_id = l.id), '[]'::jsonb);

update industry_common_challenges c
set linked_problem_statement_ids = coalesce((
  select array_agg(industry_problem_statement_id order by industry_problem_statement_id)
  from industry_challenge_problem_statement
  where industry_common_challenge_id = c.id
), '{}');
