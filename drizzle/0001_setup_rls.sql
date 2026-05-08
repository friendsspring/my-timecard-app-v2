-- Row Level Security policies. Apply manually after `drizzle-kit migrate`
-- by running this file against the Supabase database (Supabase SQL Editor or psql).

alter table "projects" enable row level security;
alter table "time_entries" enable row level security;
alter table "monthly_rates" enable row level security;

drop policy if exists "own_projects" on "projects";
create policy "own_projects" on "projects"
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "own_time_entries" on "time_entries";
create policy "own_time_entries" on "time_entries"
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "own_monthly_rates" on "monthly_rates";
create policy "own_monthly_rates" on "monthly_rates"
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
