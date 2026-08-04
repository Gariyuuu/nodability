-- Adds per-user data isolation. Run this file's statements in the SQL
-- Editor in TWO passes, with manual steps in between — see nodability's
-- README/AGENTS notes on the rollout order. Do not run this as one paste.

-- ============================================================
-- PASS 1 — run first
-- ============================================================

alter table tasks add column if not exists user_id uuid references auth.users(id);
alter table messages add column if not exists user_id uuid references auth.users(id);
alter table ideas add column if not exists user_id uuid references auth.users(id);
alter table categories add column if not exists user_id uuid references auth.users(id);

alter table categories drop constraint if exists categories_name_key;
create unique index if not exists categories_user_id_name_key on categories(user_id, name);

-- --- Manual steps between Pass 1 and Pass 2 ---
-- 1. Run `node scripts/create-users.mjs <your-email> <partner-email>` to
--    create both Supabase Auth accounts (prints each user's id).
-- 2. Backfill existing rows to your account (replace the uuid):
--      update tasks set user_id = '<your-uuid>' where user_id is null;
--      update messages set user_id = '<your-uuid>' where user_id is null;
--      update ideas set user_id = '<your-uuid>' where user_id is null;
--      update categories set user_id = '<your-uuid>' where user_id is null;

-- ============================================================
-- PASS 2 — run after the manual backfill above
-- ============================================================

alter table tasks alter column user_id set not null;
alter table messages alter column user_id set not null;
alter table ideas alter column user_id set not null;
alter table categories alter column user_id set not null;

create index if not exists tasks_user_id_idx on tasks(user_id);
create index if not exists messages_user_id_idx on messages(user_id);
create index if not exists ideas_user_id_idx on ideas(user_id);
create index if not exists categories_user_id_idx on categories(user_id);

alter table tasks enable row level security;
alter table messages enable row level security;
alter table ideas enable row level security;
alter table categories enable row level security;

-- Defense-in-depth only: the app's API routes use the service-role key
-- (lib/supabase.ts) and enforce user_id filtering in application code
-- (lib/tasks.ts, lib/ideas.ts, lib/messages.ts), which bypasses RLS. These
-- policies matter if anything ever queries these tables with the anon key.
create policy "tasks_owner" on tasks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "messages_owner" on messages
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "ideas_owner" on ideas
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "categories_owner" on categories
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
