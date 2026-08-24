-- Adds manual drag-and-drop ordering for tasks within a category box.
-- Single pass — safe to paste into the Supabase SQL Editor as-is.
--
-- The app does NOT hard-require this migration: lib/tasks.ts probes for the
-- column once per server process and strips it from writes when it's missing,
-- so dragging still re-categorizes tasks — only the position within a box
-- isn't remembered. Run this to make ordering stick.

alter table tasks add column if not exists sort_order integer;

create index if not exists tasks_sort_order_idx on tasks(category_id, sort_order);
