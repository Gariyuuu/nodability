-- Adds a life-area grouping to categories (Academic / Personal / Work /
-- Other) so the calendar views can filter/color tasks by group. Single
-- pass — safe default, no backfill needed.

alter table categories
  add column if not exists group_name text not null default 'other'
  check (group_name in ('academic', 'personal', 'work', 'other'));
