# FEATURES.md

Every major feature, with an explicit status classification verified by tracing the full
stack (UI → API → DB), not by filename existence alone.

Status legend: **Verified complete** / Mostly complete / Partially implemented / UI only /
Backend only / Mocked / Planned / Broken / Deprecated / Unable to verify.

---

## 1. Chat-driven task capture ("Nodo")

- **Purpose:** Type a free-form message; the assistant extracts tasks/categories/deletions
  and replies conversationally.
- **User flow:** Open `/` → type in the chat panel or tap a suggestion chip → message streams
  back → task board (`TaskBoard`) refreshes to show newly added/removed tasks.
- **Status: Verified complete**, with one known fragile edge case (see below).
- **Frontend:** `components/ChatPanel.tsx`.
- **Backend:** `app/api/chat/route.ts`, `lib/categorize.ts`, `lib/prompts.ts`.
- **Database:** `tasks`, `categories`, `messages` (all read/written).
- **External integrations:** Anthropic Claude API (Haiku for extraction, Sonnet for reply).
- **Environment variables:** `ANTHROPIC_API_KEY`.
- **Permissions:** Requires auth (`requireUserId()`); fully scoped to the caller's own data.
- **Validation:** Only checks `message` is a non-empty string (`app/api/chat/route.ts:27`).
  No length limit, no profanity/abuse filtering, no rate limiting.
- **Error states:** Network-level fetch failure or a server-side error (Haiku extraction
  failure, Supabase write failure) both now surface the friendly "Something went wrong
  reaching the assistant" message (`ChatPanel.tsx`) — the route wraps its body in try/catch
  and returns a clean `500`, and the client checks `res.ok` before streaming. Fixed as
  `CLAUDE.md` ISSUE-002 (was previously the single most concrete "broken edge case" in this
  app; verified fixed via code review + passing checks, not yet forced-triggered live).
- **Loading states:** Assistant bubble shows "…" while streaming (`sending` state).
- **Empty state:** Shows a greeting + 3 suggestion chips when `messages.length === 0`.
- **Edge cases handled:** Multi-day date ranges, specific due times, category reuse via
  case-insensitive match. (The extraction schema previously had an unused `is_recall_query`
  field — removed entirely rather than left dead.)
- **Tests:** None.
- **Known issues:** Mid-stream errors still skip persisting that turn to `messages` (an
  inherent limit of streaming — not addressed, low impact).
- **Remaining work / future improvements:** Wrap the route body in try/catch; use or remove
  the unused `is_recall_query` field; add basic rate limiting.

---

## 2. Task board (list view, grouped by category)

- **Purpose:** Browse/toggle/delete tasks, grouped by category, with a category filter.
- **User flow:** `/` → `Sidebar` category list on the left, `TaskBoard` list in the middle.
- **Status: Verified complete.**
- **Frontend:** `components/TaskBoard.tsx`, `components/Sidebar.tsx`, `app/page.tsx`.
- **Backend:** `GET/PATCH/DELETE /api/tasks`, `GET /api/categories`.
- **Database:** `tasks`, `categories`.
- **Permissions:** Auth required, `userId`-scoped.
- **Validation:** `PATCH`/`DELETE` require a valid `id`; `PATCH` requires `status` to be
  exactly `"open"` or `"done"`.
- **Error states:** None surfaced to the user beyond generic fetch failures (no try/catch on
  the client side of `toggle`/`remove` in `TaskBoard.tsx`).
- **Loading state:** "Loading tasks…" text.
- **Empty state:** "No tasks yet — tell the chat what you have to do, or grab a template
  above, and it'll show up here."
- **Tests:** None.
- **Known issues:** None. (The `react-hooks/set-state-in-effect` lint error previously here
  was fixed via a justified `eslint-disable-next-line` — see `CLAUDE.md` ISSUE-001.)

---

## 3. Idea box

- **Purpose:** A separate free-form scratchpad, decoupled from the structured task system.
- **User flow:** `/ideas` → type in a textarea, "Save", list of saved ideas below with delete.
- **Status: Verified complete.**
- **Frontend:** `app/ideas/page.tsx`.
- **Backend:** `GET/POST/DELETE /api/ideas`, `lib/ideas.ts`.
- **Database:** `ideas` table (added in migration `003_ideas.sql`).
- **Permissions:** Auth required, `userId`-scoped.
- **Validation:** `content` must be non-empty after `.trim()`.
- **Error/loading/empty states:** All present ("Loading…", "No ideas yet — jot one down
  above.").
- **Tests:** None.
- **Known issues:** None (same lint fix as the task board — see `CLAUDE.md` ISSUE-001).

---

## 4. Calendar — Week view

- **Purpose:** See the current Mon–Sun week, tasks placed on the day(s) they fall on.
- **Status: Verified complete.** This is the original (pre-audit-session) week view, extracted
  unchanged into `components/calendar/WeekView.tsx` during the calendar-views feature pass.
- **Frontend:** `components/calendar/WeekView.tsx`, `app/week/page.tsx` (shell).
- **Backend:** `GET/PATCH/DELETE /api/tasks` (same endpoints as the main board).
- **Database:** `tasks`, `categories` (for group color).
- **Edge cases handled:** Multi-day tasks appear on every day in their range
  (`taskFallsOnDay` in `lib/week.ts`).
- **Tests:** None.

## 4b. Calendar — Month view

- **Purpose:** Google-Calendar-style month grid with leading/trailing days from adjacent
  months, task chips per day (max 3 visible + "+N more"), checkbox toggle.
- **Status: Verified complete** for display + toggle-done. **Explicitly not built:**
  add/edit tasks directly from the grid (a deliberate scope decision — see `DECISIONS.md`
  DEC-004).
- **Frontend:** `components/calendar/MonthView.tsx`.
- **Backend/DB:** Same as Week view.
- **Known issues:** None found; not manually verified with real browser interaction after
  deployment (see `TESTING.md` for the gap — this feature has never been screenshot-tested
  logged-in, only build/type-checked).

## 4c. Calendar — Year view

- **Purpose:** 12 mini-months, density dots per day (colored by dominant group), click a
  month to jump into Month view.
- **Status: Verified complete** for its intentionally limited scope (read-only density
  overview — no per-task interaction, by design, since text/checkboxes don't fit at that
  zoom level).
- **Frontend:** `components/calendar/YearView.tsx`.
- **Known issues:** `dominantGroup` picks the *first* task found on a given day with a
  non-null `category_group` (`tasks.find(...)`), not a true "dominant" (most common) group if
  a day has multiple groups represented — the name is slightly misleading vs. actual behavior.
  Low impact given grouping is barely used yet (ISSUE-003).

---

## 5. Life-area grouping (Academic / Personal / Work / Other)

- **Purpose:** Tag categories into one of 4 life areas; color-code and filter tasks by area
  across all calendar views.
- **User flow:** `Sidebar` → click the colored dot next to a category → cycles to the next
  group. `app/week/page.tsx` → filter chip row (All/Academic/Personal/Work/Other).
- **Status: Verified complete as a mechanism** (DB column + API + UI all wired end-to-end and
  working) — **adoption unconfirmed**: all 3 live categories were still `group_name = 'other'`
  as of the original audit. A discoverability fix shipped afterward (a visible hint line +
  larger, bordered dot instead of an unlabeled one, see `CLAUDE.md` ISSUE-003), but whether
  that actually gets the two real users to use it hasn't been re-checked — verify live
  `group_name` values in a future session rather than assuming the fix "worked."
- **Frontend:** `components/Sidebar.tsx` (set), `app/week/page.tsx` +
  `components/calendar/*` (filter/display).
- **Backend:** `PATCH /api/categories`, `lib/tasks.ts:updateCategoryGroup`.
- **Database:** `categories.group_name` (migration `005_category_group.sql`).
- **Validation:** Server-side allow-list check (`VALID_GROUPS`) in
  `app/api/categories/route.ts`; matching DB `CHECK` constraint.
- **Tests:** None.
- **Known issues:** None code-level; adoption is a UX question, not a bug (see above).

---

## 6. Theming (light/dark × 4 palettes + real photo backgrounds)

- **Purpose:** Let each of the two users pick a personal light/dark mode and color palette,
  with actual photographic backgrounds rather than a flat color.
- **User flow:** Click the 🎨 icon in any header → pick Light/Dark/System and one of 4
  palettes (Slate/Ocean/Sunset/Forest) → persisted per-browser via `localStorage` (not
  per-account in the database — see note below).
- **Status: Verified complete.**
- **Frontend:** `components/theme/{ThemeProvider,ThemeToggle}.tsx`, `lib/theme.ts`,
  `app/globals.css`, no-flash script wired in `app/layout.tsx`.
- **Backend/DB:** None — this is a pure client-side/CSS feature. **Note:** theme choice is
  stored in `localStorage`, not in the `profiles`/user record (there is no `profiles` table
  at all in this schema) — so switching browsers/devices resets the theme choice. This is
  Inferred to be intentional given the app's small scope, not a bug.
- **Assets:** Self-hosted photos at `public/theme/{slate,ocean,sunset,forest}.jpg` (originally
  hotlinked from Unsplash — moved to self-hosted for durability, see `CLAUDE.md` ISSUE-004 and
  `public/theme/SOURCES.md`).
- **Tests:** Verified visually via ad hoc Playwright screenshots during development, both
  before and after self-hosting the images — see `SESSION_LOG.md`.
- **Known issues:** None. (`ThemeProvider.tsx`'s lint error was fixed with a genuine
  structural change — lazy `useState` initializers instead of an effect — not a suppression.)

---

## 7. Starter templates

- **Purpose:** One-click seed of categories + a few example tasks for a chosen "starting
  point" (Student / Work / Home & Life).
- **User flow:** `/templates` → pick a card → "Use this template" → redirected to `/` with
  the new categories/tasks visible.
- **Status: Verified complete**, now idempotent.
- **Frontend:** `app/templates/page.tsx` (full page — replaced an earlier header popover,
  removed in the same commit).
- **Backend:** `POST /api/templates`, `lib/templates.ts` (pure data, 3 templates).
- **Database:** `categories`, `tasks` (writes via existing `getOrCreateCategory`/`insertTask`,
  guarded by `lib/tasks.ts:taskExistsWithTitle`).
- **Known issues:** None. (Previously, re-applying a template duplicated its example tasks —
  fixed by checking for an existing task with the same title/category before inserting, see
  `CLAUDE.md` ISSUE-005.)

---

## 8. Changelog / "What's new"

- **Purpose:** Human-readable release notes inside the app.
- **Status: Verified complete**, but **fully manual** — `lib/changelog.ts` is a hand-written
  array; nothing generates it from git history or commit messages. Whoever ships a
  user-visible change is responsible for remembering to add an entry.
- **Frontend:** `app/changelog/page.tsx`.
- **Backend/DB:** None — static data.

---

## 9. Authentication & per-user data isolation

- **Purpose:** Ensure the two account holders each see only their own data — this was
  retrofitted onto an originally-single-tenant app.
- **User flow:** `/login` → enter email → magic link → `/auth/callback` → signed in.
- **Status: Verified complete.** This was the single largest engineering effort in this
  project's history (migration `004_user_scoping.sql` plus 2 follow-up bug-fix commits for
  silent failure modes discovered during real-world testing — see `SESSION_LOG.md` for the
  exact debugging story: localhost-redirect links, Supabase Site URL misconfiguration, PKCE
  flow-state mismatches from forwarding links between browsers, and an email rate limit).
- **Frontend:** `app/login/page.tsx`.
- **Backend:** `app/auth/callback/route.ts`, `proxy.ts`, `lib/auth.ts`,
  `lib/supabase/{server,browser}.ts`, `lib/actions.ts:signOutAction`.
- **Database:** `user_id` on all 4 tables + RLS policies (migration `004`).
- **Permissions:** Binary — signed in or not; no roles.
- **Validation:** `shouldCreateUser: false` is the entire access-control gate (no email
  allow-list check in app code beyond Supabase's own "does this user already exist" check).
- **Tests:** None automated; extensively manually tested during development (see
  `SESSION_LOG.md`).
- **Known issues:** None currently open — all discovered issues during rollout were fixed
  (commits `426b01e`, `ffb225c`).

---

## 10. App icon / favicon

- **Purpose:** Replace the default Next.js favicon with a branded one.
- **Status: Verified complete.**
- **Frontend:** `app/icon.tsx`, `app/apple-icon.tsx` (generated via `next/og`).
- **Known issues:** None. (`app/favicon.ico`, the old Create-Next-App default, was deleted.)

---

## Unused / dead code found during audit (not a "feature," but worth tracking)

**Status: cleaned up.** Both items below were removed in the fix-everything session (commit
`18200e7`) — kept here as a record, not because they still exist:
- ~~`public/{file,globe,next,vercel,window}.svg`~~ — deleted.
- ~~`ExtractionResult.is_recall_query`~~ — removed entirely from the extraction schema and
  prompt instructions.
- `app/favicon.ico` — see Feature 10 above.
