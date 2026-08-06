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
- **Error states:** Network-level fetch failure → friendly "Something went wrong reaching the
  assistant" message (`ChatPanel.tsx`). **Server-side errors (Haiku extraction failure,
  Supabase write failure) are NOT caught** — see `CLAUDE.md` ISSUE-002. This is the single
  most concrete "broken edge case" found in this audit; not reproduced live, found by code
  inspection.
- **Loading states:** Assistant bubble shows "…" while streaming (`sending` state).
- **Empty state:** Shows a greeting + 3 suggestion chips when `messages.length === 0`.
- **Edge cases handled:** Multi-day date ranges, specific due times, category reuse via
  case-insensitive match, "recall query" detection (though `is_recall_query` is extracted but
  **not currently used** to change behavior anywhere in `app/api/chat/route.ts` — Inferred
  dead field, extracted but unread).
- **Tests:** None.
- **Known issues:** ISSUE-002 (no error handling past auth check); mid-stream errors skip
  persisting that turn to `messages`.
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
- **Known issues:** None beyond the shared lint issue (`react-hooks/set-state-in-effect` at
  `TaskBoard.tsx:35`).

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
- **Known issues:** Shares the `react-hooks/set-state-in-effect` lint error at
  `app/ideas/page.tsx:27`.

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
  working) **but effectively unused in real data** — all 3 live categories are still
  `group_name = 'other'` as of the audit (see `CLAUDE.md` ISSUE-003). Classify the *feature
  mechanism* as Verified complete; classify *actual adoption* as a UX gap.
- **Frontend:** `components/Sidebar.tsx` (set), `app/week/page.tsx` +
  `components/calendar/*` (filter/display).
- **Backend:** `PATCH /api/categories`, `lib/tasks.ts:updateCategoryGroup`.
- **Database:** `categories.group_name` (migration `005_category_group.sql`).
- **Validation:** Server-side allow-list check (`VALID_GROUPS`) in
  `app/api/categories/route.ts`; matching DB `CHECK` constraint.
- **Tests:** None.
- **Known issues:** ISSUE-003 (low discoverability/adoption).

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
- **External integration:** Hotlinked Unsplash CDN photo URLs (one specific photo ID per
  palette) — see ISSUE-004.
- **Tests:** Verified visually via ad hoc Playwright screenshots during development (not
  committed to the repo as a reusable test) — see `SESSION_LOG.md`.
- **Known issues:** ISSUE-004 (external image dependency); `ThemeProvider.tsx:40` is one of
  the 4 `react-hooks/set-state-in-effect` lint errors.

---

## 7. Starter templates

- **Purpose:** One-click seed of categories + a few example tasks for a chosen "starting
  point" (Student / Work / Home & Life).
- **User flow:** `/templates` → pick a card → "Use this template" → redirected to `/` with
  the new categories/tasks visible.
- **Status: Verified complete**, with a known non-idempotency issue.
- **Frontend:** `app/templates/page.tsx` (full page — replaced an earlier header popover,
  removed in the same commit).
- **Backend:** `POST /api/templates`, `lib/templates.ts` (pure data, 3 templates).
- **Database:** `categories`, `tasks` (writes via existing `getOrCreateCategory`/`insertTask`).
- **Known issues:** ISSUE-005 — re-applying a template duplicates its example tasks
  (`getOrCreateCategory` is idempotent, `insertTask` is not).

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
- **Known issues:** `app/favicon.ico` (old Create-Next-App default) is still present,
  unused/superseded — cosmetic cleanup only, not a bug.

---

## Unused / dead code found during audit (not a "feature," but worth tracking)

- `public/{file,globe,next,vercel,window}.svg` — Create-Next-App scaffold defaults, zero
  references anywhere in source. Safe to delete.
- `ExtractionResult.is_recall_query` (from `lib/categorize.ts`) — extracted by Haiku but never
  read/used in `app/api/chat/route.ts`. Either wire it up (e.g. to change response framing for
  recall queries) or remove it from the extraction schema.
- `app/favicon.ico` — see Feature 10 above.
