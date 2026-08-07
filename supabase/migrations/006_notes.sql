-- Adds an Obsidian-style notes system: notes optionally tagged to a category
-- ("class"), with [[Wikilink]]-style connections resolved dynamically at
-- read time by title match (see lib/notes.ts) rather than a stored edges
-- table — simplest correct approach at this app's scale.

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  category_id uuid references categories(id),
  title text not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_id_idx on notes(user_id);
create index if not exists notes_category_id_idx on notes(category_id);
-- Title uniqueness (case-insensitive) per user, so a [[Wikilink]] resolves
-- to exactly one note.
create unique index if not exists notes_user_id_title_key on notes(user_id, lower(title));

alter table notes enable row level security;

create policy "notes_owner" on notes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
