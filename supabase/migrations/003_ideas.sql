-- Run this in the Supabase SQL Editor once, on top of the existing schema.
-- Adds an idea box: a lightweight place to jot things down before they
-- become tasks.

create table if not exists ideas (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists ideas_created_at_idx on ideas(created_at);
