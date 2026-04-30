alter table solutions
add column if not exists ip_type text check (
  ip_type is null
  or ip_type in ('Patent', 'Utility Model', 'Design Right', 'Plant Variety', 'Circuit Design', 'Copyrights', 'Know-How')
);
