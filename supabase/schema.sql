-- Run this in the Supabase SQL Editor (Project > SQL Editor > New query) once.

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category_id uuid references categories(id),
  start_date date,
  end_date date,
  due_time time,
  status text not null default 'open' check (status in ('open', 'done')),
  source_message_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists tasks_category_id_idx on tasks(category_id);
create index if not exists tasks_start_date_idx on tasks(start_date);
create index if not exists tasks_status_idx on tasks(status);
create index if not exists messages_created_at_idx on messages(created_at);
