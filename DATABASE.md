# DATABASE.md

- **Provider:** Supabase (managed Postgres), project ref `hwvqnenmnrzdncwznorv`
  (`NEXT_PUBLIC_SUPABASE_URL=https://hwvqnenmnrzdncwznorv.supabase.co`).
- **Schema source:** `supabase/schema.sql` (base) + `supabase/migrations/002_date_range_and_time.sql`,
  `supabase/migrations/003_ideas.sql`, `supabase/migrations/004_user_scoping.sql`, `supabase/migrations/005_category_group.sql`, `supabase/migrations/006_notes.sql`,
  `supabase/migrations/007_theme_uploads_bucket.sql`, applied **manually, in numeric order**, by pasting into the
  Supabase SQL Editor. There is no Supabase CLI (`supabase/config.toml` does not exist), no
  automated migration runner, and no `down` migrations — this is forward-only. **`007` is not
  a table migration** — it inserts a row into `storage.buckets` to create the `theme-uploads`
  Storage bucket (Verified live: `public: true`).
- **Live row counts at audit time (2026-08-06, before the notes feature shipped):** `tasks` 19,
  `messages` 112, `ideas` 7, `categories` 3, `notes` 0 (brand new table; a smoke-test insert/
  delete was performed during development, table confirmed empty of real data at last check).
  **This is real production data belonging to 2 real people.**

## ⚠️ Known inconsistency: `supabase/schema.sql` does not replay cleanly against the migrations

`supabase/schema.sql` already contains `start_date`/`end_date`/`due_time` columns on `tasks`
directly — but `supabase/migrations/002_date_range_and_time.sql` is written as if starting from a schema that has
a single `due_date` column (it does `update tasks set start_date = due_date, end_date =
due_date where due_date is not null` then `drop column if exists due_date`). This means
**`supabase/schema.sql` was edited after the fact to reflect the post-`002` shape**, rather than
staying a true "before `002`" snapshot. Running `supabase/schema.sql` fresh today, then `002`, would
execute the `update ... where due_date is not null` line against a table that never had a
`due_date` column — Postgres would error (`column "due_date" does not exist`) since the
`where` clause references a nonexistent column. **This means the migration set is not
actually replayable from scratch as ordered.** In practice this doesn't matter for the *live*
database (it was migrated incrementally, in the order the columns were actually added, not by
replaying from `supabase/schema.sql`), but it matters for anyone trying to spin up a *new* Supabase
project from these files — they would need to skip `002`'s `due_date`-migration lines (or
run `supabase/schema.sql` alone, which already has the right shape, then skip straight to `003`).

## Tables

### `categories`
| Column | Type | Constraints | Added in |
|---|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` | schema.sql |
| `name` | text | not null | schema.sql (originally globally `unique`, see below) |
| `created_at` | timestamptz | not null, default `now()` | schema.sql |
| `user_id` | uuid | not null, FK → `auth.users(id)` | `004` |
| `group_name` | text | not null, default `'other'`, CHECK in `('academic','personal','work','other')` | `005` |

- **Indexes:** `categories_user_id_idx(user_id)` (`004`);
  `categories_user_id_name_key` — **unique** on `(user_id, name)` (`004`, replacing the
  original global-unique constraint on `name` alone, which `004` drops).
- **Known risk:** the unique index is **case-sensitive**, but application code
  (`lib/tasks.ts:getOrCreateCategory`) looks up existing categories case-insensitively via
  `.ilike()` before deciding whether to insert. A race condition or a manually-inserted row
  could create two rows differing only by case (e.g. `"Chemistry"` and `"chemistry"`) that the
  unique index would not catch. Not observed in production data at audit time (3 categories,
  no case collisions).
- **RLS:** Enabled (`004`). Policy `categories_owner`: `for all using (user_id = auth.uid())
  with check (user_id = auth.uid())`.

### `tasks`
| Column | Type | Constraints | Added in |
|---|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` | schema.sql |
| `title` | text | not null | schema.sql |
| `category_id` | uuid | FK → `categories(id)`, nullable, **no ON DELETE clause** (defaults to `NO ACTION` — deleting a category that still has tasks referencing it will fail at the DB level; app code avoids this via `deleteCategoryIfEmpty`) | schema.sql |
| `start_date` | date | nullable | schema.sql |
| `end_date` | date | nullable | schema.sql |
| `due_time` | time | nullable | schema.sql |
| `status` | text | not null, default `'open'`, CHECK in `('open','done')` | schema.sql |
| `source_message_id` | uuid | nullable, **no FK constraint** — not linked to `messages.id` at the DB level despite the name | schema.sql |
| `created_at` | timestamptz | not null, default `now()` | schema.sql |
| `user_id` | uuid | not null, FK → `auth.users(id)`, **no ON DELETE clause** | `004` |
| `sort_order` | integer | nullable — hand-dragged position within its category box, 0-based; `null` means "never dragged," which sorts after every arranged task (ordering is applied in JS in `lib/tasks.ts:listTasks`, not in SQL) | `008` |

- **Indexes:** `tasks_category_id_idx(category_id)`, `tasks_start_date_idx(start_date)`,
  `tasks_sort_order_idx(category_id, sort_order)` (`008`)
  (`tasks_start_date_idx` is declared twice, harmless — both `supabase/schema.sql` and `002` create it with `if not exists`),
  `tasks_status_idx(status)`, `tasks_user_id_idx(user_id)` (`004`).
- **RLS:** Enabled (`004`). Policy `tasks_owner`, same owner-only shape as `categories_owner`.

### `messages`
| Column | Type | Constraints | Added in |
|---|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` | schema.sql |
| `role` | text | not null, CHECK in `('user','assistant')` | schema.sql |
| `content` | text | not null | schema.sql |
| `created_at` | timestamptz | not null, default `now()` | schema.sql |
| `user_id` | uuid | not null, FK → `auth.users(id)` | `004` |

- **Indexes:** `messages_created_at_idx(created_at)`, `messages_user_id_idx(user_id)` (`004`).
- **RLS:** Enabled (`004`). Policy `messages_owner`.
- **Purpose:** Full chat transcript (both user and assistant turns), used to build
  conversation-history context for the next chat turn (`lib/messages.ts:listRecentMessages`,
  capped at the last 20 by the caller in `app/api/chat/route.ts`).

### `ideas`
| Column | Type | Constraints | Added in |
|---|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` | `003` |
| `content` | text | not null | `003` |
| `created_at` | timestamptz | not null, default `now()` | `003` |
| `user_id` | uuid | not null, FK → `auth.users(id)` | `004` |

- **Indexes:** `ideas_created_at_idx(created_at)`, `ideas_user_id_idx(user_id)` (`004`).
- **RLS:** Enabled (`004`). Policy `ideas_owner`.

### `notes`
| Column | Type | Constraints | Added in |
|---|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` | `006` |
| `user_id` | uuid | not null, FK → `auth.users(id)` | `006` |
| `category_id` | uuid | FK → `categories(id)`, nullable — a note's optional "class" | `006` |
| `title` | text | not null | `006` |
| `content` | text | not null, default `''` — may contain `[[Wikilink]]` references to other note titles | `006` |
| `created_at` | timestamptz | not null, default `now()` | `006` |
| `updated_at` | timestamptz | not null, default `now()` — set explicitly by `lib/notes.ts:updateNote` on every edit, not a DB trigger | `006` |

- **Indexes:** `notes_user_id_idx(user_id)`, `notes_category_id_idx(category_id)`, and a
  **unique** index `notes_user_id_title_key` on `(user_id, lower(title))` — case-insensitive
  per-user title uniqueness, so a `[[Wikilink]]` resolves to exactly one note. A duplicate
  title insert/update fails with Postgres error code `23505`, which
  `app/api/notes/route.ts` catches and turns into a friendly `409` response.
- **RLS:** Enabled (`006`). Policy `notes_owner`, same owner-only shape as every other table.
- **Linking model:** There is **no edges/links table**. `[[Wikilink]]` connections are
  resolved dynamically at read time by title match (`lib/notes.ts:buildNoteGraph`), not
  stored — simplest correct approach at this app's personal scale (dozens of notes, not
  thousands). A link to a not-yet-created or misspelled title is simply omitted from the
  graph, same as Obsidian's own "unlinked reference" behavior conceptually, though this app
  doesn't surface unlinked references as a separate UI concept.

### `auth.users` (Supabase-managed, not defined in this repo's SQL)
Referenced by every table's `user_id` FK. Managed entirely by Supabase Auth. New rows are
created only via `scripts/create-users.mjs` (admin API, no self-serve signup — see
`SECURITY.md`). **2 rows exist** at audit time: the app owner's account and their partner's
account. (Real email addresses intentionally omitted from this doc — this repo is pushed to
a public GitHub remote; see `scripts/create-users.mjs` usage comment for how to look up or
add accounts, and query `auth.users` directly in the Supabase dashboard if you need the
actual addresses.)

## Entity-relationship diagram

```mermaid
erDiagram
  AUTH_USERS ||--o{ CATEGORIES : owns
  AUTH_USERS ||--o{ TASKS : owns
  AUTH_USERS ||--o{ MESSAGES : owns
  AUTH_USERS ||--o{ IDEAS : owns
  CATEGORIES ||--o{ TASKS : "groups (nullable)"

  AUTH_USERS {
    uuid id PK
    text email
  }
  CATEGORIES {
    uuid id PK
    uuid user_id FK
    text name
    text group_name "academic|personal|work|other, default other"
    timestamptz created_at
  }
  TASKS {
    uuid id PK
    uuid user_id FK
    uuid category_id FK "nullable"
    text title
    date start_date "nullable"
    date end_date "nullable"
    time due_time "nullable"
    text status "open|done"
    uuid source_message_id "no FK constraint"
    timestamptz created_at
  }
  MESSAGES {
    uuid id PK
    uuid user_id FK
    text role "user|assistant"
    text content
    timestamptz created_at
  }
  IDEAS {
    uuid id PK
    uuid user_id FK
    text content
    timestamptz created_at
  }
```

## Access patterns

- Every read/write goes through `lib/tasks.ts` / `lib/ideas.ts` / `lib/messages.ts`, using the
  **service-role** client (`lib/supabase.ts`) — RLS is not the active enforcement layer for
  the app itself (see `ARCHITECTURE.md` and `SECURITY.md`).
- Category lookup by name is case-insensitive at the application layer (`.ilike()`) but
  case-sensitive at the DB-constraint layer (see the known risk under `categories` above).
- No pagination on any query — `listTasks`, `listIdeas` fetch unbounded result sets per user;
  `listRecentMessages` is capped by an explicit `.limit(20)` call from
  `app/api/chat/route.ts`.

## Ownership model

Strict single-owner: every row belongs to exactly one `user_id`, no shared/team rows, no
concept of a row visible to both accounts. There is no `profiles` table and no per-user
settings table — theme preference, for example, lives only in browser `localStorage`, not in
the database.

## Deletion / cascading behavior

**No `ON DELETE CASCADE` is configured anywhere.** Concretely:
- Deleting an `auth.users` row (a whole account) would be **blocked** by Postgres if that user
  has any rows in `categories`/`tasks`/`messages`/`ideas`, since none of those FKs specify a
  delete behavior (default `NO ACTION`). There is no account-deletion flow in the app or a
  script for it.
- Deleting a `categories` row that still has `tasks` pointing at it via `category_id` is
  similarly blocked at the DB level — the app avoids ever attempting this via
  `lib/tasks.ts:deleteCategoryIfEmpty`, which only deletes a category once its task count
  reaches 0.

## Retention

No retention/archival policy exists — all data (including old `messages` rows) accumulates
indefinitely. 112 message rows already exist for what is a fairly young project; this will
grow unbounded without any pruning logic.

## Storage buckets

One: **`theme-uploads`** (created by migration `007`, `public: true` — Verified live).
Holds user-uploaded custom theme background photos only (`app/api/theme-image/route.ts`),
stored under `<userId>/<timestamp>.<ext>`. Public read (needed so the image is usable in a
plain CSS `background-image: url(...)` without an auth header); all writes go through the
service-role client in that one API route, so no client-side Storage RLS policy exists or is
needed for writes. `app/api/theme-image/route.ts` deletes a user's previous upload(s)
whenever a new one succeeds (lists the user's folder, removes every file except the one just
uploaded) — so uploads don't accumulate unbounded. The only case still not cleaned up is a
user switching back to a curated palette without ever uploading again — their last uploaded
file remains in Storage, unreferenced but harmless.

## Generated types

None — there is no `supabase gen types` workflow. All row shapes are hand-written TypeScript
interfaces (`Category`, `Task`, `Message`, `Idea`) in `lib/tasks.ts` / `lib/ideas.ts` /
`lib/messages.ts`. If the schema changes, these interfaces must be updated by hand and kept in
sync — there's no compiler-enforced link between the SQL and the TypeScript types.

## Sensitive data

No specially sensitive personal data is stored beyond task/message/idea free-text content
(which could contain anything the two users type) and their email addresses (managed by
Supabase Auth, not stored redundantly in any app table). No payment data, no health data
schema, no SSNs, etc.

## Migration risks

- **`supabase/migrations/004_user_scoping.sql` must run in its documented two-pass order** with a manual backfill
  step in between (see the comment block at the top of that file). Running it as a single
  paste will fail: Pass 2's `set not null` on `user_id` will reject any row where the
  Pass-1-added nullable column was never backfilled.
- **Never re-run an already-applied migration file** — several use `add column if not
  exists` / `create index if not exists` (safe to re-run), but `004`'s `alter column ...
  set not null` and RLS policy creation (`create policy ...`, no `if not exists` guard for
  policies) are **not** safely re-runnable — re-running the policy-creation lines against a
  database that already has those policies will error with "policy already exists."
- See the ⚠️ known inconsistency section above regarding `supabase/schema.sql` vs. `002` for anyone
  provisioning a brand-new Supabase project from these files.


## Migration `008_task_sort_order.sql` [2026-08-24]

Adds `tasks.sort_order integer` (nullable) plus `tasks_sort_order_idx(category_id, sort_order)`,
backing drag-and-drop ordering on the task board. Single pass, safe to paste whole into the
Supabase SQL Editor.

**This migration is optional for the app to run**, unusually for this repo. `lib/tasks.ts`
probes for the column once per server process (`hasSortOrderColumn`, keyed on Postgres error
`42703` = undefined_column) and strips `sort_order` from every write when it's absent — so
deploying the board's code *before* running the migration is safe: dragging a task between
lists still works and persists, only the position *within* a list is forgotten on reload.
`PATCH /api/tasks/reorder` returns `{"ordered": false}` in that state and the board shows a
notice pointing at this file. Verified 2026-08-24: before the migration, the live database
returns `{"code":"42703","message":"column tasks.sort_order does not exist"}` for a
`select sort_order` — exactly the code the probe branches on.
