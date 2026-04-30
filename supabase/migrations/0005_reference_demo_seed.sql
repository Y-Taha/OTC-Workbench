insert into entities (id, name, type, address, phone, email, logo_path) values
  (1, 'Cairo University', 'University', 'Giza, Egypt', '+20-2-35676510', 'research@cu.edu.eg', null),
  (2, 'Ain Shams University', 'University', 'Cairo, Egypt', '+20-2-24824012', 'research@asu.edu.eg', null),
  (3, 'National Research Centre (NRC)', 'Research Center', 'Giza, Egypt', '+20-2-33371211', 'info@nrc.sci.eg', null),
  (4, 'ITIDA', 'Government', 'New Cairo, Egypt', '+20-2-26163333', 'info@itida.gov.eg', null),
  (5, 'Telecom Egypt', 'Company', 'Cairo, Egypt', '+20-2-23181111', 'research@te.eg', null),
  (6, 'Juhayna Food Industries', 'Company', '6th of October City, Giza, Egypt', '+20-2-38350220', 'info@juhayna.com', null),
  (7, 'Ministry of Higher Education and Scientific Research', 'Government', 'Cairo, Egypt', '+20-2-25353601', 'contact@mohe.gov.eg', null),
  (8, 'Alexandria University', 'University', 'Alexandria, Egypt', '+20-3-5921675', 'research@alexu.edu.eg', null),
  (9, 'Academy of Scientific Research and Technology (ASRT)', 'Research Center', 'Cairo, Egypt', '+20-2-27622718', 'info@asrt.sci.eg', null),
  (10, 'Egyptian Petrochemicals Holding Company', 'Company', 'Cairo, Egypt', '+20-2-24150401', 'info@epchemco.com.eg', null);

insert into entity_industries (entity_id, industry) values
  (1, 'Agriculture'), (1, 'Healthcare & Medicine'),
  (2, 'Science'), (2, 'Technology'), (2, 'Pharmacy'),
  (3, 'Biotechnology'), (3, 'Chemistry'), (3, 'Materials'),
  (4, 'ICT'), (4, 'Software'), (4, 'Digital Transformation'),
  (5, 'Telecommunications'), (5, 'Infrastructure'),
  (6, 'Food & Beverage'), (6, 'Agriculture'),
  (7, 'Education'), (7, 'Research Policy'),
  (8, 'Marine Science'), (8, 'Healthcare & Medicine'),
  (9, 'Policy'), (9, 'Innovation'), (9, 'Technology Transfer'),
  (10, 'Petrochemicals'), (10, 'Energy'), (10, 'Materials');

insert into app_users (id, entity_id, name, title, mobile, email, department, affiliation_status) values
  (1, 1, 'Dr. Ahmed Hassan El-Sayed', 'Professor of Biomedical Engineering', '+20-10-12345678', 'a.hassan@cu.edu.eg', 'Biomedical Engineering', 'Full-Time'),
  (2, 3, 'Dr. Fatima Ibrahim El-Sharif', 'Senior Research Scientist', '+20-10-22334455', 'f.ibrahim@nrc.sci.eg', 'Biotechnology', 'Full-Time'),
  (3, 2, 'Dr. Mohamed Abdel-Rahman Khalil', 'Associate Professor', '+20-11-55667788', 'm.khalil@asu.edu.eg', 'Environmental Engineering', 'Full-Time'),
  (4, 5, 'Eng. Sara Mostafa Nour', 'R&D Lead Engineer', '+20-10-98765432', 's.nour@te.eg', 'Network Innovation', 'Full-Time'),
  (5, 1, 'Dr. Omar Farouk Mansour', 'Assistant Professor', '+20-12-44556677', 'o.mansour@cu.edu.eg', 'Computer Science', 'Internal Faculty'),
  (6, 8, 'Dr. Nadia Mahmoud Abdallah', 'Principal Investigator', '+20-10-11223344', 'n.abdallah@alexu.edu.eg', 'Marine Biotechnology', 'Internal Faculty'),
  (7, 9, 'Dr. Tarek Samir El-Wakeel', 'Technology Transfer Specialist', '+20-11-77889900', 't.wakeel@asrt.sci.eg', 'Innovation & Commercialization', 'Full-Time');

insert into funds (id, title, description, funding_entity_id) values
  (1, 'STDF Research Grant 2024', 'Science and Technology Development Fund applied research grants', 7),
  (2, 'ITIDA Innovation Fund Cycle 7', 'ITIDA funding for ICT-driven innovation projects', 4),
  (3, 'Cairo University Research Excellence Grant', 'Internal competitive research grant for faculty projects', 1),
  (4, 'EU-Egypt Horizon Partnership Fund', 'EU co-funded research collaboration under Horizon Europe Egypt pillar', 7),
  (5, 'ASRT National Technology Transfer Fund', 'Commercialization support from ASRT', 9);

insert into research_areas (id, name, description) values
  (1, 'Renewable Energy', 'Solar, wind, and clean energy technologies for Egypt'),
  (2, 'Water Resources & Desalination', 'Nile water management, irrigation efficiency, and seawater desalination'),
  (3, 'Agricultural Technology', 'Precision farming and drought-resistant crops'),
  (4, 'Medical Diagnostics & Infectious Disease', 'Endemic disease screening tools'),
  (5, 'Information & Communication Technology', '5G, cybersecurity, and smart cities'),
  (6, 'Biotechnology & Biomanufacturing', 'Biofuels, biomaterials, and pharmaceutical biotechnology'),
  (7, 'Environmental Engineering', 'Waste management, air quality, and pollution control');

insert into research (id, title, detailed_description, research_output_description, start_date, end_date, pi_user_id, previous_research_id, status, is_funded) values
  (1, 'Solar-Powered Desalination for Red Sea Coastal Communities', 'Development of a low-cost solar-driven RO desalination unit.', 'Functional prototype producing 500 L/day of potable water.', '2023-02-01', '2025-12-31', 1, null, 'In Progress', true),
  (2, 'AI-Based Hepatitis C Rapid Screening System', 'ML model for HCV diagnosis from routine blood panel data.', 'Screening model with high sensitivity and specificity.', '2022-09-01', '2024-08-31', 2, null, 'Completed', true),
  (3, 'Smart Drip Irrigation Controller for Nile Delta Farms', 'IoT-based precision irrigation system.', 'LoRaWAN soil-moisture controller with dashboard.', '2024-03-01', '2026-02-28', 3, null, 'In Progress', true),
  (4, '5G Network Spectrum Optimisation for Dense Urban Areas', 'Algorithms for dynamic spectrum sharing.', 'Spectrum-sharing algorithm for dense urban environments.', '2023-07-01', '2025-06-30', 4, null, 'In Progress', true),
  (5, 'Biodegradable Packaging from Sugarcane Bagasse', 'Conversion of sugarcane bagasse into biodegradable packaging films.', 'Composite film meeting food-contact standards.', '2021-06-01', '2023-12-31', 6, null, 'Completed', false),
  (6, 'Perovskite Solar Cell Manufacturing for Egyptian Climate', 'Perovskite PV adapted for high-temperature desert environments.', 'Stable lab-scale perovskite cells.', '2024-01-01', '2026-12-31', 1, null, 'In Progress', true);

insert into research_research_area (research_id, research_area_id) values (1,1),(1,2),(2,4),(3,3),(4,5),(5,6),(5,3),(6,1);
insert into research_team_member (research_id, user_id, is_pi) values (1,1,true),(1,3,false),(2,2,true),(2,5,false),(3,3,true),(3,7,false),(4,4,true),(4,5,false),(5,6,true),(5,2,false),(6,1,true),(6,6,false);
insert into research_fund (research_id, fund_id, amount) values (1,1,4800000),(1,4,2400000),(2,1,3500000),(3,5,1200000),(4,2,5200000),(6,4,7000000);

insert into invention_disclosures (
  id, own_research, assessment_user_id, research_id, research_link, disclosure_date, title, field_of_invention, description,
  classification, problem, existing_solutions, existing_solutions_drawbacks, features, how_invention_works, novel_features,
  diagrams_path, development_status, potential_applications, potential_clients, applied_for_ip, previous_protection_details,
  previously_disclosed, previous_disclosure_details, collaboration_details, support_funds_details, contractual_obligations_details,
  contractual_obligations_files_path, used_facilities_details, has_protection_potential, potential_protection,
  potential_commercialization_form, is_completed, lead_inventor_id, comments
) values
  (1, true, 7, 1, null, '2023-08-01', 'Anti-Fouling Nanocomposite Coating for RO Membranes', array['Chemical Sciences','Materials Science & Nanotechnology'], 'Anti-fouling nanocomposite coating for RO membranes.', array['Composition of Matter','Process/Method'], 'Rapid biofouling of RO membranes', 'Chemical cleaning cycles and surface modification', 'Existing methods degrade or lose effectiveness', 'UV-activated TiO2 nanocomposite embedded in polyamide', 'TiO2 nanoparticles generate reactive oxygen species under UV exposure.', 'Dual photocatalytic and anti-adhesion mechanism', null, 'Lab-Scale Prototype', 'Desalination plants and marine applications', 'Water utilities and membrane manufacturers', false, null, false, null, 'Joint research with Ain Shams University', 'STDF Research Grant 2024', 'STDF requires shared ownership', null, 'Cairo University Renewable Energy Lab', true, array['Patent','Know-How'], array['IP Licensing'], false, 1, ''),
  (2, true, 7, 2, null, '2024-01-15', 'HCV Rapid Screening Algorithm', array['Computer Science & Information Technology','Medical & Health Sciences'], 'ML-based HCV screening algorithm.', array['Software/Algorithm','Biotechnology'], 'HCV diagnosis unaffordable outside major cities', 'PCR testing and rapid antibody tests', 'PCR too expensive and rapid tests insufficient', 'Gradient-boosted model on routine blood parameters', 'The algorithm analyzes standard CBC and liver enzyme panels.', 'First Egyptian genotype-4 calibrated model', null, 'Prototype Demonstration', 'Public health screening and primary care triage', 'Ministry of Health and public hospitals', true, 'Patent application filed PCT/EG2024/000182', false, null, null, 'STDF Grant', null, null, 'NRC Medical AI Lab', true, array['Patent','Copyrights'], array['IP Licensing'], true, 2, 'Patent filed March 2024'),
  (3, true, 7, 5, null, '2024-05-10', 'Sugarcane Bagasse Biopolymer Composite Film', array['Biological & Life Sciences','Materials Science & Nanotechnology'], 'Biodegradable food-packaging film.', array['Composition of Matter','Manufacture/Article'], 'Plastic packaging waste', 'PLA and starch-based films', 'Feedstock and moisture-barrier limitations', 'Uses Egyptian agro-waste as raw material', 'Cellulose nanofibers are extracted and blended with chitosan.', 'Agro-waste raw material with biodegradability', null, 'Lab Validation', 'Food packaging and agricultural mulch films', 'Packaging converters', false, null, false, null, null, null, null, null, 'Alexandria University Marine Biotechnology Lab', true, array['Know-How'], array['IP Licensing'], false, 6, '');

insert into idf_inventors (invention_disclosure_id, user_id, contribution_percentage, contribution_description) values (1,1,55,'Conceived formulation'),(1,3,45,'Conducted fouling tests'),(2,2,65,'Designed ML pipeline'),(2,5,35,'Clinical validation'),(3,6,70,'Developed extraction process'),(3,2,30,'Characterisation testing');
insert into idf_applicants (invention_disclosure_id, entity_applicant_id, ownership_percentage) values (1,1,70),(1,3,30),(2,3,100),(3,8,100);
insert into idf_fund (invention_disclosure_id, fund_id, amount) values (1,1,280000),(2,1,175000);

insert into prior_art_searches (id, invention_disclosure_id, can_be_protected, prior_art_report_path) values
  (1,1,true,'prior_art_report_001.pdf'),(2,2,true,'prior_art_report_002.pdf');

insert into trl_assessments (id, research_id, prior_art_search_id, ip_type, ip_id, trl_level, trl_description, trl_report_path) values
  (1,1,null,null,null,'TRL 4','Proof of concept demonstrated in lab environment.','trl_report_001.pdf'),
  (2,2,null,null,null,'TRL 6','Prototype validated in primary-care clinics.','trl_report_002.pdf'),
  (3,3,null,null,null,'TRL 5','Controller tested on pilot farm.','trl_report_003.pdf');

insert into crl_assessments (id, research_id, prior_art_search_id, ip_type, ip_id, market_potential_level, crl_description, potential_commercialization_type, commercial_assessment_report_path) values
  (1,1,null,null,null,'CRL 8','Strong market pull from MENA desalination operators.','Licensing','commercial_report_001.pdf'),
  (2,2,null,null,null,'CRL 9','National programme ready to deploy.','Licensing','commercial_report_002.pdf'),
  (3,5,null,null,null,'CRL 5','Standards and regulatory path identified.','Consulting','commercial_report_003.pdf');

insert into patents (id, prior_art_search_id, type, status, title, priority_number, application_number, application_date, application_jurisdiction, countries, publication_number, publication_date, cpc, ipc, abstract, description, claims, drawings_path, original_document_path, office_search_report_path, fund_id) values
  (1,1,'Non-Provisional Patent','Pending','Anti-Fouling Nanocomposite Coating for Reverse Osmosis Membranes','EG/P/2023/001234','PCT/EG2023/000321','2023-10-20','PCT',array['Egypt','United States'],null,null,'B01D67/00','B01D71/00','A TiO2-polyamide coating for RO membranes.','Method of coating RO membranes with nanocomposite layer.','1. A reverse osmosis membrane comprising TiO2 nanoparticles...','drawings_patent_001.pdf',null,null,1),
  (2,2,'Non-Provisional Patent','Granted','Machine-Learning System for Hepatitis C Screening','EG/P/2024/000182','EG/2024/0182','2024-03-05','One Country',array['Egypt'],'EG-005791','2024-09-20','G16H50/20','G06N20/00','ML system for HCV screening.','Computer-implemented method for HCV infection screening.','1. A computer-implemented screening method...','drawings_patent_002.pdf',null,null,1);

insert into design_rights (id, title, prior_art_search_id, original_document_path, fund_id) values (1,'Modular Solar Desalination Unit Enclosure',null,'design_right_001.pdf',1),(2,'Portable HCV Screening Device Casing',null,'design_right_002.pdf',1);
insert into plant_varieties (id, title, prior_art_search_id, original_document_path, fund_id) values (1,'Sakha 95-DT - Drought-Tolerant Egyptian Wheat',null,'plant_variety_001.pdf',4);
insert into circuit_designs (id, title, prior_art_search_id, original_document_path, fund_id) values (1,'Low-Power Soil Moisture Sensor ASIC',null,'circuit_design_001.pdf',2),(2,'Edge AI Inference Chip for Rural 5G Base Stations',null,'circuit_design_002.pdf',2);
insert into copyrights (id, title, prior_art_search_id, original_document_path, fund_id) values (1,'HCV-Screen AI Software Platform v1.0',null,'copyright_001.pdf',1),(2,'AquaSense Irrigation Management Mobile Application',null,'copyright_002.pdf',null);
insert into know_hows (id, title, prior_art_search_id, original_document_path, privacy_compliant, compliance_document_path) values (1,'Proprietary RO Membrane Casting Protocol',null,'know_how_001.pdf',true,'compliance_kh_001.pdf'),(2,'HCV Dataset Preprocessing Pipeline',null,'know_how_002.pdf',true,'compliance_kh_002.pdf'),(3,'Sugarcane Bagasse Nanofiber Extraction Formulation',null,'know_how_003.pdf',true,'compliance_kh_003.pdf');

insert into ip_inventors (ip_type, ip_id, user_id) values ('Patent',1,1),('Patent',1,3),('Patent',2,2),('Patent',2,5),('Design Right',1,1),('Design Right',2,2),('Plant Variety',1,3),('Circuit Design',1,4),('Circuit Design',2,4),('Circuit Design',2,5),('Copyrights',1,2),('Copyrights',1,5),('Copyrights',2,3),('Know-How',1,1),('Know-How',2,2),('Know-How',3,6);
insert into ip_applicants (ip_type, ip_id, entity_applicant_id, ownership_percentage) values ('Patent',1,1,70),('Patent',1,3,30),('Patent',2,3,100),('Design Right',1,1,100),('Design Right',2,3,100),('Plant Variety',1,1,100),('Circuit Design',1,5,100),('Circuit Design',2,5,100),('Copyrights',1,3,100),('Copyrights',2,2,100),('Know-How',1,1,100),('Know-How',2,3,100),('Know-How',3,8,100);

insert into licenses (id, title, description, licensee_id, start_date, end_date, ip_type, ip_id, exclusivity_type, field_of_use, territory, upfront_fee, royalty_base, royalty_amount, currency, payment_frequency, licensing_document_path) values
  (1,'HCV Screening Algorithm License','Exclusive license for public university hospitals.',7,'2024-07-01','2029-06-30','Patent',2,'Exclusive','Public health screening in government facilities',array['Egypt'],800000,'Per Unit',3,'EGP - Egyptian Pound','Quarterly','license_agreement_001.pdf'),
  (2,'Smart Irrigation IP Non-Exclusive License','Non-exclusive license for agricultural supply chain farms.',6,'2024-10-01','2027-09-30','Circuit Design',1,'Non-Exclusive','Commercial agriculture',array['Egypt'],350000,'Net Sales',4,'EGP - Egyptian Pound','Annually','license_agreement_002.pdf');
insert into license_licensors (license_id, entity_licensor_id) values (1,3),(2,2);
insert into license_milestones (license_id, description, amount) values (1,'Public health portal integration launch',1500000),(1,'1 million screenings milestone',3000000);
insert into license_revenues (id, license_id, title, description, date, amount, comments, invoice_path) values (1,1,'Upfront License Fee','Initial licensing fee','2024-07-20',800000,'Paid on schedule','invoice_mohe_001.pdf'),(2,2,'Upfront License Fee','Initial fee','2024-10-15',350000,'Payment received','invoice_juhayna_001.pdf'),(3,1,'Q1 2025 Royalty Payment','Quarterly royalty','2025-04-01',215000,'Q1 usage report submitted','invoice_mohe_002.pdf');

insert into consultations (id, title, description, consultant_id, company_id, research_id, invention_disclosure_id, status, contract_path, start_date, end_date, fees, fund_id) values
  (1,'RO Coating Technology Scale-Up Feasibility','Assess industrial scale-up pathway.',1,10,1,null,'Contracted',null,'2024-08-01','2025-04-30',420000,5),
  (2,'HCV AI Platform Market Entry Strategy','Advisory on HCV screening platform pricing.',2,7,null,2,'Contracted',null,'2024-04-01','2024-12-31',280000,1),
  (3,'Smart Irrigation Technology Transfer','Technology transfer consultation.',3,6,3,null,'Proposed',null,'2025-02-01','2025-08-31',150000,null),
  (4,'Perovskite Solar IP Commercialisation Advisory','Structure IP and licensing deal.',7,9,6,null,'Accepted',null,'2025-01-01','2025-06-30',180000,5);

insert into equipment (id, name, description, specifications, research_id, hosting_entity_id, department, price, purchase_date, available_for_rent, rent_term, rent_price, contact_person_id, fund_id) values
  (1,'Solar Simulator - Class AAA','Large-area solar simulator','AM1.5G, 1000 W/m2',6,1,'Renewable Energy Lab',680000,'2023-02-01',true,'Daily',8000,1,4),
  (2,'Reverse Osmosis Pilot Rig','Pilot-scale RO test rig','Max feed pressure 80 bar',1,1,'Water Technology Lab',320000,'2023-05-15',false,null,null,3,1),
  (3,'NVIDIA DGX A100 AI Server','Deep learning workstation','8x A100 GPUs',2,3,'Medical AI Lab',1850000,'2023-09-10',true,'Weekly',22000,5,1),
  (4,'IoT Sensor Network Kit','LoRaWAN agriculture sensor network','50-node kit',3,2,'AgriTech Innovation Lab',185000,'2024-03-20',false,null,null,3,null);

insert into industry_common_challenges (id, entity_id, title, description) values
  (1,7,'Water Scarcity and Desalination Cost Barrier','Freshwater scarcity and high desalination cost.'),
  (2,7,'High Prevalence of Hepatitis C and Screening Gap','Undiagnosed cases due to testing cost.'),
  (3,6,'Agricultural Water Waste in Nile Delta','Surface irrigation wastes allocated water.'),
  (4,10,'Plastic Packaging Waste Crisis','Single-use plastics in food packaging.'),
  (5,5,'Off-Grid Base Station Energy Cost','Diesel generation costs for remote stations.');
insert into industry_problem_statements (id, entity_id, title, description) values
  (1,7,'Potable water inaccessibility in South Sinai','Coastal villages lack treated water.'),
  (2,7,'Rural HCV diagnosis backlog','Upper Egypt governorates lack PCR testing capacity.'),
  (3,6,'Excessive irrigation water losses','Supplier farms use excessive water.'),
  (4,10,'No commercially viable biodegradable packaging','Need bio-based alternatives.'),
  (5,5,'Base station energy costs unsustainable','Remote diesel generation is costly.');
insert into industry_challenge_problem_statement (industry_common_challenge_id, industry_problem_statement_id) values (1,1),(2,2),(3,3),(4,4),(5,5);
insert into solutions (id, title, industry_common_challenge_id, consultation_id, associated_ip, solution_description) values
  (1,'Deploy Solar-RO Desalination Units',1,1,array['Patent:1'],'License solar-powered RO technology for pilot deployment.'),
  (2,'Roll Out HCV Screening AI',2,2,array['Patent:2'],'Deploy HCV-Screen AI in primary care facilities.'),
  (3,'Smart Drip Irrigation Deployment',3,3,array['Circuit Design:1'],'Transfer IoT irrigation system to supplier farms.'),
  (4,'Commercialise Bagasse Biopolymer Film',4,null,array['Know-How:3'],'Spin off packaging film manufacturing.');

select setval(pg_get_serial_sequence('entities', 'id'), (select max(id) from entities));
select setval(pg_get_serial_sequence('app_users', 'id'), (select max(id) from app_users));
select setval(pg_get_serial_sequence('funds', 'id'), (select max(id) from funds));
select setval(pg_get_serial_sequence('research_areas', 'id'), (select max(id) from research_areas));
select setval(pg_get_serial_sequence('research', 'id'), (select max(id) from research));
select setval(pg_get_serial_sequence('invention_disclosures', 'id'), (select max(id) from invention_disclosures));
select setval(pg_get_serial_sequence('prior_art_searches', 'id'), (select max(id) from prior_art_searches));
select setval(pg_get_serial_sequence('patents', 'id'), (select max(id) from patents));
select setval(pg_get_serial_sequence('licenses', 'id'), (select max(id) from licenses));
select setval(pg_get_serial_sequence('license_revenues', 'id'), (select max(id) from license_revenues));
select setval(pg_get_serial_sequence('consultations', 'id'), (select max(id) from consultations));
select setval(pg_get_serial_sequence('equipment', 'id'), (select max(id) from equipment));
select setval(pg_get_serial_sequence('industry_common_challenges', 'id'), (select max(id) from industry_common_challenges));
select setval(pg_get_serial_sequence('industry_problem_statements', 'id'), (select max(id) from industry_problem_statements));
select setval(pg_get_serial_sequence('solutions', 'id'), (select max(id) from solutions));
