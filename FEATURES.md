# FEATURES.md

Every major feature, with an explicit status classification verified by tracing the full
stack (UI → API → DB), not by filename existence alone.

Status legend: **Verified complete** / Mostly complete / Partially implemented / UI only /
Backend only / Mocked / Planned / Broken / Deprecated / Unable to verify.

---

## 1. Chat-driven task capture (multi-personality: Nodo, Rex, Sage, Turbo, Professor Hoot)

- **Purpose:** Type a free-form message; the assistant extracts tasks/categories/deletions
  and replies conversationally, in the voice of whichever AI personality is selected.
- **User flow:** Open `/` → optionally click the personality name/avatar in the chat header to
  pick a different character → type in the chat panel or tap a suggestion chip → message
  streams back in that personality's voice → task board (`TaskBoard`) refreshes to show
  newly added/removed tasks.
- **Status: Verified complete**, with one known fragile edge case (see below).
- **Frontend:** `components/ChatPanel.tsx` (includes the personality picker).
- **Backend:** `app/api/chat/route.ts`, `lib/categorize.ts`, `lib/prompts.ts`,
  `lib/personalities.ts`.
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
- **Remaining work / future improvements:** Add basic rate limiting.

---

## 1b. AI personality system

- **Purpose:** Let the user pick which AI character they're talking to, instead of a single
  fixed assistant — Nodo is now one of 5 options.
- **User flow:** Click the personality name/emoji at the top of the chat panel → a dropdown
  lists all 5 characters with their emoji and tagline → click one → future replies (not past
  chat bubbles) use that character's voice.
- **Status: Verified complete.**
- **Frontend:** `components/ChatPanel.tsx` (picker UI, `localStorage` persistence under key
  `nodability-personality`, same pattern as theme storage).
- **Backend:** `lib/personalities.ts` (5 character definitions: Nodo 🌱, Rex 🐺, Sage 🧘,
  Turbo ⚡, Professor Hoot 🦦 — name/emoji/tagline/voice/greeting each), `lib/prompts.ts`
  (`buildSystemPrompt(personality)` merges the personality's `voice` string into a shared
  `CORE_RULES` block), `app/api/chat/route.ts` (reads `personalityId` from the request body,
  resolves via `findPersonality`, falls back to Nodo if missing/invalid).
- **Database:** None — personality choice is `localStorage`-only, not persisted server-side
  (consistent with how theme choice works; there's no `profiles`/settings table in this
  schema).
- **Design constraint (deliberate):** The extraction step (Haiku, `lib/categorize.ts`) is
  **personality-neutral** — only the Sonnet reply persona varies. This was a deliberate choice
  so that switching characters can't affect task-extraction accuracy or the grounding/
  confirmation rules (which live in `lib/prompts.ts`'s shared `CORE_RULES`, identical across
  all 5 personas).
- **Validation:** `app/api/chat/route.ts` only accepts `personalityId` if it's a string;
  `findPersonality` falls back to the first personality (Nodo) for any unrecognized ID — no
  allow-list rejection, just a safe default.
- **Tests:** None.
- **Known issues:** None found. The 5 personalities (names/voices/count) were a creative
  default chosen during implementation, not a user-specified exact list — worth confirming
  with the user whether they match what was wanted.
- **Remaining work / future improvements:** Persisting personality choice server-side (would
  need a `profiles` table, which doesn't exist); a way for the user to add/edit their own
  custom personality beyond the fixed 5.

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

## 6. Theming (light/dark × 10 palettes + real photo backgrounds)

- **Purpose:** Let each of the two users pick a personal light/dark mode and color palette,
  with actual photographic backgrounds rather than a flat color.
- **User flow:** Click the 🎨 icon in any header → pick Light/Dark/System and one of 10
  palettes (Slate, Ocean, Sunset, Forest, Rose, Mint, Lavender, Amber, Midnight, Coral) →
  persisted per-browser via `localStorage` (not per-account in the database — see note below).
- **Status: Verified complete.** Grew from 4 to 10 palettes in commit `eb3c34a`; the last 6
  were spot-checked (3 of 6) via live Playwright screenshots rather than all individually,
  since they follow an identical code path to the original 4.
- **Frontend:** `components/theme/{ThemeProvider,ThemeToggle}.tsx`, `lib/theme.ts`,
  `app/globals.css`, no-flash script wired in `app/layout.tsx`.
- **Backend/DB:** None — this is a pure client-side/CSS feature. **Note:** theme choice is
  stored in `localStorage`, not in the `profiles`/user record (there is no `profiles` table
  at all in this schema) — so switching browsers/devices resets the theme choice. This is
  Inferred to be intentional given the app's small scope, not a bug.
- **Assets:** Self-hosted photos at `public/theme/<name>.jpg`, one per palette (originally the
  first 4 were hotlinked from Unsplash — moved to self-hosted for durability at commit
  `18200e7`; the 6 newer palettes were self-hosted from the start). See `CLAUDE.md`
  ISSUE-004 and `public/theme/SOURCES.md` for all 10 photo sources.
- **Tests:** Verified visually via ad hoc Playwright screenshots during development, across
  multiple sessions as palettes were added — see `SESSION_LOG.md`.
- **Known issues:** None. (`ThemeProvider.tsx`'s lint error was fixed with a genuine
  structural change — lazy `useState` initializers instead of an effect — not a suppression.)

---

## 6b. Custom theme background images

- **Purpose:** Let a user upload their own photo as the theme background instead of picking
  from the 10 curated palettes.
- **User flow:** Open the 🎨 theme popover → "📷 Upload your own background" → pick an image
  file → it uploads, and the app immediately switches to the "Custom" palette showing that
  photo.
- **Status: Verified complete.** End-to-end tested during development (a real upload to the
  live `theme-uploads` bucket, confirmed publicly fetchable, then cleaned up) in addition to
  the usual `tsc`/`lint`/`build` checks.
- **Frontend:** `components/theme/ThemeToggle.tsx` (file input, upload handling, swatch
  preview), `components/theme/ThemeProvider.tsx` (applies the uploaded URL as an inline
  `--bg-art` CSS custom property when palette is `"custom"`), `lib/theme.ts`
  (`customBgArt()` builds the scrim+photo value; `NO_FLASH_SCRIPT` replicates this so a
  custom background doesn't flash-then-appear on reload).
- **Backend:** `POST /api/theme-image` (auth required, validates file type/size, uploads via
  the service-role client, returns a public URL).
- **Database:** None directly — the chosen image's URL lives in `localStorage`
  (`nodability-custom-bg`), same per-browser pattern as theme/palette/personality choice. The
  actual file lives in Supabase Storage (`theme-uploads` bucket, see `DATABASE.md`).
- **Permissions:** Upload requires auth; the bucket is public-read (by design — CSS
  `background-image` needs an unauthenticated URL, and the photos aren't sensitive).
- **Validation:** Content-type allow-list (JPEG/PNG/WebP/GIF), 5MB size cap, both enforced
  server-side in the API route (not just client-side).
- **Error states:** Upload failure shows an inline error message in the theme popover
  (`uploadError` state in `ThemeToggle.tsx`).
- **Known issues:** None — uploading a new custom background now deletes the user's prior
  upload(s) from Storage automatically (see below). No "remove custom background" control
  exists yet (switching back to a curated palette just stops referencing the uploaded file,
  it doesn't delete it — that file is removed the next time a new custom image is uploaded).
- **Cleanup behavior:** After a successful upload, `POST /api/theme-image` lists every file
  under that user's folder in the `theme-uploads` bucket and deletes all except the
  just-uploaded one. Verified end-to-end against the live bucket (uploaded 2 stale files,
  uploaded a 3rd, confirmed only the 3rd remained).

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

## 11. Notes (Obsidian-style linked notes)

- **Purpose:** A note-taking system separate from tasks/ideas, where notes can reference each
  other via `[[Wikilink]]` syntax and be viewed as a connected graph — modeled directly on
  Obsidian's note-linking mechanic, scoped per user, optionally organized by class (category).
- **User flow:** `/notes` → "+ New note" → type a title, optionally pick a class/category,
  write content (typing `[[Another Note's Title]]` creates a link once that note exists) →
  Save. Switch to the "🕸️ Graph" tab to see every note as a node and every resolved wikilink
  as an edge, color-coded by the note's category group; click a node to jump to editing it.
- **Status: Verified complete.** End-to-end tested during development directly against the
  live database (insert two notes with a link between them, confirm the case-insensitive
  unique-title constraint correctly rejects a duplicate, clean up) in addition to
  `tsc`/`lint`/`build`. The graph's visual rendering was not separately screenshot-verified
  (unlike the theme palette work) — worth a manual check with real notes.
- **Frontend:** `app/notes/page.tsx` (list/editor, grouped by category like the task board),
  `components/notes/NoteGraph.tsx` (SVG graph rendering).
- **Backend:** `GET/POST/PATCH/DELETE /api/notes`, `lib/notes.ts` (CRUD, wikilink extraction,
  graph building), `lib/graph-layout.ts` (force-directed node positioning).
- **Database:** `notes` table (migration `006`) — `title`, `content`, optional `category_id`,
  owner-scoped like every other table.
- **Permissions:** Auth required, `userId`-scoped, same pattern as tasks/ideas.
- **Validation:** `title` required and non-empty; case-insensitive per-user title uniqueness
  enforced at the DB level (`23505` → friendly 409 in the API route).
- **Linking mechanism (important design detail):** Links are **not stored** — every note's
  `content` is scanned for `[[Title]]` patterns at read time
  (`lib/notes.ts:extractWikilinkTitles`, `buildNoteGraph`) and resolved by case-insensitive
  title match among the same user's notes. A link to a nonexistent or misspelled title is
  silently omitted from the graph (no error, no "unlinked reference" UI — simpler than real
  Obsidian in this respect).
- **Error states:** Save errors (e.g. duplicate title) show inline in the editor.
- **Loading states:** "⏳ Loading…" while fetching notes+categories.
- **Empty states:** Sidebar shows "No notes yet"; the graph view shows a prompt to add a note
  and start linking.
- **Edge cases handled:** Renaming a note doesn't break existing `[[Links]]` to its *new*
  title going forward, but any note that already linked to the *old* title will silently stop
  resolving that link (since resolution is title-based, not ID-based) — this is an inherent
  tradeoff of the "no stored edges" design, not a bug, but worth knowing.
- **Tests:** None automated.
- **Known issues:** None found in code review. The rename-breaks-old-links behavior above is
  a known *design characteristic*, not a bug — flagging it so a future session doesn't
  "fix" it without realizing it's the deliberate simple-linking-model tradeoff.
- **Remaining work / future improvements:** Autocomplete for `[[Wikilink]]` titles while
  typing (currently the user has to remember/type the exact title); a way to see truly
  "unlinked" note pairs; per-category graph filtering (currently the graph always shows all
  notes, colored by category, rather than being filterable like the calendar's group filter).

---

## Unused / dead code found during audit (not a "feature," but worth tracking)

**Status: cleaned up.** Both items below were removed in the fix-everything session (commit
`18200e7`) — kept here as a record, not because they still exist:
- ~~`public/{file,globe,next,vercel,window}.svg`~~ — deleted.
- ~~`ExtractionResult.is_recall_query`~~ — removed entirely from the extraction schema and
  prompt instructions.
- `app/favicon.ico` — see Feature 10 above.
