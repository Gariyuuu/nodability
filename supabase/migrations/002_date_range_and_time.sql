-- Run this in the Supabase SQL Editor once, on top of the existing schema.
-- Replaces the single `due_date` column with a start/end date range plus an
-- optional time of day, so multi-day events (e.g. a trip) and specific
-- deadline times (e.g. "due 5pm Friday") can both be represented.

alter table tasks
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists due_time time;

update tasks
set start_date = due_date, end_date = due_date
where due_date is not null and start_date is null;

alter table tasks drop column if exists due_date;

create index if not exists tasks_start_date_idx on tasks(start_date);
