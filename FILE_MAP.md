# FILE_MAP.md

Practical map of files a future coding agent is likely to touch. Trivial generated files
(`.next/`, `node_modules/`, `next-env.d.ts`, `tsconfig.tsbuildinfo`) are omitted.

## `proxy.ts` (project root)
- **Purpose:** Next.js 16's request gate (the renamed `middleware.ts`). Refreshes the Supabase
  session cookie on every matched request; redirects unauthenticated page loads to `/login`.
- **Called by:** Next.js runtime automatically, per its `config.matcher`.
- **Calls:** `@supabase/ssr`'s `createServerClient` directly (not `lib/supabase/server.ts` —
  it builds its own client because it runs in the Edge runtime with `NextRequest`/
  `NextResponse`, not the Node `next/headers` API `lib/supabase/server.ts` uses).
- **Edit when:** adding a new public (unauthenticated) route, or changing which paths require
  login.
- **Risk:** High. A wrong `matcher` regex or an incomplete `PUBLIC_PATHS` list can lock out
  every user or expose protected pages. The matcher excludes `/icon`/`/apple-icon` and any
  path ending in a common static-asset extension (`.svg|.png|.jpg|.jpeg|.gif|.webp|.ico|.css|
  .js|.txt|.md`) — this exact bug (a `public/` asset getting redirected to `/login` for
  logged-out visitors) has happened twice: once for `/icon`, once for the self-hosted
  `/theme/*.jpg` background images. If you add a `public/` asset with a different extension,
  add it to this regex.

## `lib/auth.ts`
- **Purpose:** `requireUserId()` — the auth check every API route calls at its start.
- **Called by:** every `app/api/*/route.ts` file.
- **Calls:** `lib/supabase/server.ts:createServerSupabaseClient()`.
- **Edit when:** changing what "authenticated" means (e.g. adding role checks) — currently
  it's purely "is there a valid session."
- **Risk:** High. This is the single choke point for API authorization; a bug here affects
  every route.

## `lib/supabase.ts`
- **Purpose:** The server-only, service-role Supabase client. Bypasses RLS entirely.
- **Called by:** `lib/tasks.ts`, `lib/ideas.ts`, `lib/messages.ts`, `scripts/create-users.mjs`.
- **Risk:** Critical. Never import from a `"use client"` file. Never use for anything that
  should be scoped to "the current user" without manually adding `.eq("user_id", userId)`.

## `lib/supabase/server.ts` and `lib/supabase/browser.ts`
- **Purpose:** Session-aware (anon-key) Supabase clients using `@supabase/ssr` — one for
  server contexts (cookies via `next/headers`), one for client components (browser storage).
- **Called by:** `server.ts` → `lib/auth.ts`, `lib/actions.ts`, `app/auth/callback/route.ts`.
  `browser.ts` → `app/login/page.tsx` only.
- **Edit when:** changing how sessions are read/written, or Supabase client config
  (e.g. adding OAuth providers).
- **Risk:** Medium. Getting the cookie `getAll`/`setAll` wiring wrong breaks session
  persistence across requests.

## `lib/tasks.ts`
- **Purpose:** All CRUD for `tasks` and `categories`. Every function takes `userId` first.
  Includes the chat-flow helpers (`deleteCategoryByName`, `deleteTaskByTitle`,
  `findTasksByCategoryName`) used by `lib/categorize.ts`'s extraction results.
- **Called by:** `app/api/tasks/route.ts`, `app/api/categories/route.ts`,
  `app/api/chat/route.ts`, `app/api/templates/route.ts`.
- **Calls:** `lib/supabase.ts`.
- **Edit when:** changing task/category schema or query behavior.
- **Risk:** High. Contains the app's core data-access logic and the 4 `: any` casts flagged in
  `CLAUDE.md` ISSUE-001. Any new function here must follow the existing
  `userId`-first-parameter + `.eq("user_id", userId)` pattern or it will leak data across
  accounts.

## `lib/ideas.ts`, `lib/messages.ts`
- **Purpose:** Same pattern as `lib/tasks.ts`, scoped to the `ideas` and `messages` tables
  respectively. `messages.ts` is only used by the chat flow (persisting/retrieving
  conversation history).
- **Called by:** `app/api/ideas/route.ts` (ideas.ts); `app/api/chat/route.ts` (messages.ts).
- **Risk:** Medium-high, same reasoning as `lib/tasks.ts`.

## `lib/categorize.ts`
- **Purpose:** Calls Haiku with a forced `extract_tasks` tool-use to turn a free-form chat
  message into structured tasks/categories/deletions/recall-query flag.
- **Called by:** `app/api/chat/route.ts`.
- **Calls:** `lib/anthropic.ts`, `lib/prompts.ts:EXTRACTION_INSTRUCTIONS`.
- **Edit when:** changing what fields get extracted, or the extraction prompt/schema.
- **Risk:** Medium. Throws if the model doesn't return the expected tool call — this
  propagates as an unhandled error into `app/api/chat/route.ts` (see ISSUE-002). Changing the
  `EXTRACT_TOOL` JSON schema requires updating every place `ExtractionResult`'s shape is
  consumed in `app/api/chat/route.ts`.

## `lib/prompts.ts`
- **Purpose:** All LLM system-prompt text — `EXTRACTION_INSTRUCTIONS` (Haiku, personality-
  neutral) and `buildSystemPrompt(personality)` (Sonnet — merges a personality's `voice` from
  `lib/personalities.ts` into the shared `CORE_RULES` block).
- **Called by:** `lib/categorize.ts` (`EXTRACTION_INSTRUCTIONS`), `app/api/chat/route.ts`
  (`buildSystemPrompt`).
- **Edit when:** changing shared chat-assistant behavior/grounding rules (edit `CORE_RULES`
  here) or extraction rules. To change tone/personality, edit `lib/personalities.ts` instead
  — don't add personality-specific behavior logic here, only in the `voice` strings.
- **Risk:** Medium-high. The extraction prompt and `CORE_RULES` encode several precise,
  load-bearing behavioral rules (date parsing, multi-day event handling, avoiding
  hallucinated confirmations) shared across **all 5 personalities** — read fully before
  editing; a wording change here affects every character at once, with no test suite to catch
  regressions.

## `lib/personalities.ts`
- **Purpose:** Defines the 5 selectable AI chat characters (Nodo, Rex, Sage, Turbo, Professor
  Hoot) — each an `{id, name, emoji, tagline, voice, greeting}` record.
- **Called by:** `components/ChatPanel.tsx` (picker UI, greeting text),
  `app/api/chat/route.ts` (`findPersonality` resolves the request's `personalityId`),
  `lib/prompts.ts` (`buildSystemPrompt` consumes `voice`).
- **Edit when:** adding/removing/adjusting a personality. Adding one only requires a new
  entry here — the shared behavioral rules in `lib/prompts.ts` apply automatically (see
  `DECISIONS.md` DEC-009).
- **Risk:** Low. Purely additive data; `findPersonality` always has a safe fallback (the
  first entry, Nodo) for unrecognized IDs.

## `lib/anthropic.ts`
- **Purpose:** Anthropic client instance + the two model-name constants
  (`HAIKU_MODEL`, `SONNET_MODEL`).
- **Edit when:** changing which Claude models are used.
- **Risk:** Low, but changing model names has direct cost/quality/billing implications — see
  `CLAUDE.md`'s Anthropic billing note.

## `app/api/*/route.ts` (tasks, ideas, categories, templates, chat)
- **Purpose:** The entire internal HTTP API surface. Full request/response detail in
  [API_REFERENCE.md](API_REFERENCE.md).
- **Edit when:** adding a new API route — **copy the try/catch `requireUserId()` /
  `UnauthorizedError` pattern from `app/api/tasks/route.ts`**, not `app/api/chat/route.ts`
  (which is missing the rest of the error handling — see ISSUE-002).
- **Risk:** High for auth/authorization correctness; each route is a potential data-leak
  surface if the pattern isn't followed exactly.

## `app/auth/callback/route.ts`
- **Purpose:** Exchanges the magic-link PKCE `code` for a session.
- **Risk:** Medium. Must stay excluded from `proxy.ts`'s auth gate (`PUBLIC_PATHS`) or the
  redirect loop breaks.

## `app/login/page.tsx`
- **Purpose:** The only sign-in UI. `shouldCreateUser: false` is the entire access-control
  mechanism restricting the app to pre-provisioned accounts.
- **Risk:** High. Changing `shouldCreateUser` to `true` would open self-serve signup to
  anyone with any email — almost certainly not intended given the 2-person design.

## `app/page.tsx`
- **Purpose:** Main board — composes `Sidebar`, `TaskBoard`, `ChatPanel`, plus the header nav
  (Ideas / Calendar / What's new / Templates / theme toggle / sign out).
- **Edit when:** changing global navigation, or the main board's layout.
- **Risk:** Low-medium; it's the landing page so layout regressions are highly visible.

## `app/week/page.tsx`
- **Purpose:** The "Calendar" shell — Week/Month/Year tabs, the group filter row, owns the
  `tasks` fetch and the `toggle`/`remove` handlers passed down to whichever view is active.
- **Calls:** `components/calendar/{WeekView,MonthView,YearView}.tsx`, `lib/groups.ts`.
- **Edit when:** adding a new calendar view mode, or changing the group-filter UX
  (see ISSUE-003 — this feature is under-used, consider improving discoverability here first).
- **Risk:** Medium.

## `components/calendar/{WeekView,MonthView,YearView}.tsx`
- **Purpose:** The three calendar renderings. All are presentational — receive `tasks` and
  callbacks from `app/week/page.tsx`, use `lib/calendar.ts`/`lib/week.ts` for date math and
  `lib/groups.ts` for color-coding.
- **Edit when:** changing how a specific view looks/behaves. `MonthView` and `WeekView`
  support toggling task status; `YearView` is intentionally read-only (density dots only) —
  see `DECISIONS.md` DEC-005 for why.

## `lib/calendar.ts`, `lib/week.ts`
- **Purpose:** Pure date-math helpers — month-grid generation (`getMonthGrid`), week-day
  generation (`getCurrentWeekDays`), and `taskFallsOnDay` (shared by all 3 calendar views).
- **Risk:** Low to edit in isolation, but subtly wrong date math (timezone, month-boundary
  off-by-ones) would silently mis-place tasks across all 3 views — write down and manually
  verify edge cases (month boundaries, year boundaries) if you touch this.

## `lib/groups.ts`
- **Purpose:** Single source of truth for the 4 life-area groups (Academic/Personal/Work/
  Other): colors, labels, and cycle order.
- **Called by:** `components/Sidebar.tsx`, `components/calendar/*`, `app/week/page.tsx`.
- **Edit when:** adding/removing a group — **must stay in sync with the DB check constraint**
  in `supabase/migrations/005_category_group.sql` (`group_name in (...)`). Changing one
  without the other breaks category updates.

## `app/notes/page.tsx`, `lib/notes.ts`, `app/api/notes/route.ts`, `components/notes/NoteGraph.tsx`
- **Purpose:** The Obsidian-style linked-notes feature. `lib/notes.ts` has all DB CRUD plus
  the pure functions `extractWikilinkTitles` (regex-parses `[[Title]]` syntax) and
  `buildNoteGraph` (resolves titles to note IDs, dedupes edges). `NoteGraph.tsx` renders the
  result as SVG.
- **Called by:** `app/notes/page.tsx` orchestrates all of the above; nothing else in the app
  touches notes.
- **Edit when:** changing note linking syntax/behavior (edit `extractWikilinkTitles`'s regex
  and `buildNoteGraph` together — they must agree on what counts as a link), or the note
  editor/graph UI.
- **Risk:** Medium. The unique-title-per-user DB constraint (migration `006`) and the
  title-based (not ID-based) link resolution are coupled — renaming a note breaks old
  `[[Links]]` to its previous title by design (see `FEATURES.md` §11). Don't "fix" this
  without realizing it's the deliberate simple-linking-model tradeoff, not a bug.

## `lib/graph-layout.ts`
- **Purpose:** Hand-rolled force-directed graph layout (repulsion + spring + centering,
  fixed iteration count) — positions note nodes for `NoteGraph.tsx`. No graph/viz library
  dependency.
- **Called by:** `components/notes/NoteGraph.tsx` only.
- **Edit when:** tuning the graph's visual spacing/settle behavior (see the constants at the
  top: `REPULSION`, `SPRING_LENGTH`, etc.) or if note counts grow large enough that the O(n²)
  repulsion pass becomes slow (fine for dozens of notes, would need a spatial-partitioning
  optimization for hundreds+).
- **Risk:** Low — purely visual, no data correctness implications.

## `app/api/theme-image/route.ts`
- **Purpose:** Handles custom theme background photo uploads to the `theme-uploads` Supabase
  Storage bucket.
- **Called by:** `components/theme/ThemeToggle.tsx` (the only caller).
- **Edit when:** changing upload validation (allowed types, size cap) or storage path scheme.
- **Risk:** Medium — this is the app's only file-upload endpoint and only place that uses
  `supabase.storage` instead of `supabase.from()`. Trusts the client-reported MIME type
  rather than inspecting file bytes (see `SECURITY.md`'s File upload risks section) — a
  known, accepted gap at this app's 2-user scale, not an oversight to silently "fix" by
  adding heavier validation without discussing the tradeoff.

## `app/templates/page.tsx`, `lib/templates.ts`, `app/api/templates/route.ts`
- **Purpose:** Starter-template browsing/application. `lib/templates.ts` is pure data (3
  templates: Student, Work, Home & Life).
- **Edit when:** adding a new template, or changing what a template seeds.
- **Risk:** Low, but see ISSUE-005 — applying a template twice duplicates tasks (not
  idempotent).

## `app/changelog/page.tsx`, `lib/changelog.ts`
- **Purpose:** "What's new" page. `lib/changelog.ts` is a hand-maintained array — **nothing
  auto-generates it from git history.**
- **Edit when:** shipping a user-visible change worth announcing — add a new entry to the top
  of `CHANGELOG` in `lib/changelog.ts`.

## `app/globals.css`
- **Purpose:** Tailwind v4 entry point + every theme/palette CSS variable + the
  `body::before` decorative-background layer.
- **Edit when:** adding a palette, changing a color token, or changing the background-photo
  URLs.
- **Risk:** High for visual regressions — every component references these token names by
  Tailwind utility class (`bg-bg`, `text-fg`, etc.). Renaming a `--variable` requires a
  project-wide find/replace of its corresponding utility class.

## `lib/theme.ts`, `components/theme/ThemeProvider.tsx`, `components/theme/ThemeToggle.tsx`
- **Purpose:** Theme state (mode + palette), `localStorage` persistence, the no-flash inline
  script, and the picker UI.
- **Risk:** Medium. `ThemeProvider`'s effect-based `localStorage` sync is one of the 4 flagged
  `react-hooks/set-state-in-effect` lint errors (ISSUE-001) — be aware if refactoring this
  file that the lint rule will still flag the pattern unless restructured.

## `app/icon.tsx`, `app/apple-icon.tsx`
- **Purpose:** Generated favicon/app-icon via `next/og`'s `ImageResponse` (a simple gradient
  "n" mark). Statically cached by Next.js at build time.
- **Note:** `app/favicon.ico` (the original Create-Next-App placeholder) is still present and
  unused/superseded — safe to delete, but harmless if left.

## `components/ChatPanel.tsx`
- **Purpose:** The chat UI — message list, streaming response rendering, suggestion chips
  (`SUGGESTIONS` constant), the `send(override?)` function used by both the input box and the
  chip buttons.
- **Risk:** Medium. See ISSUE-002 — this component does not check `res.ok` before reading the
  response stream, so a server error surfaces as garbled text rather than a clean message.

## `components/Sidebar.tsx`
- **Purpose:** Category list + the "All" filter + the group-cycling colored dot
  (`cycleGroup`).
- **Calls:** `GET/PATCH /api/categories`.
- **Risk:** Low-medium. The group dot is the *only* UI for setting `group_name` — see
  ISSUE-003 for its current low real-world usage.

## `components/TaskBoard.tsx`
- **Purpose:** The category-grouped task list on the main board (`app/page.tsx`).
- **Risk:** Low.

## `scripts/create-users.mjs`
- **Purpose:** One-off admin script to provision new Supabase Auth accounts (used exactly
  twice in this project's history — the 2 real accounts).
- **Risk:** High if run carelessly — uses the service-role admin API. There is no
  corresponding delete-user script committed to the repo.

## `supabase/schema.sql` + `supabase/migrations/002..005*.sql`
- **Purpose:** The full schema history, applied manually and in order via the Supabase SQL
  Editor. Full detail in [DATABASE.md](DATABASE.md).
- **Risk:** Critical. Never edit an already-applied migration; add a new one. `004` in
  particular has a mandatory two-pass, manual-backfill-in-between execution order documented
  in its own header comment.

## `public/theme/` (slate.jpg, ocean.jpg, sunset.jpg, forest.jpg, SOURCES.md)
- **Purpose:** Self-hosted theme background photos, one per palette, referenced from
  `app/globals.css`'s `--bg-art` values. `SOURCES.md` records the original Unsplash photo IDs
  and license for provenance.
- **Called by:** `app/globals.css` via `url("/theme/<name>.jpg")`.
- **Edit when:** changing a palette's background photo — replace the file (keep the same
  name) or add a new palette's image and update `globals.css` accordingly.
- **Risk:** Medium. Must stay excluded from `proxy.ts`'s auth gate (it is, via the
  extension-based matcher) or the images 307-redirect for logged-out visitors — this exact
  bug happened once already when these files were added.

(The old `public/*.svg` Create-Next-App scaffold defaults — `file.svg`, `globe.svg`,
`next.svg`, `vercel.svg`, `window.svg` — were unused and have been deleted.)

## `AGENTS.md` / `CLAUDE.md` at repo root
- `AGENTS.md` contains a short, tool-managed (has `<!-- BEGIN/END:nextjs-agent-rules -->`
  markers) warning about Next.js 16's breaking changes vs. training-data expectations —
  **do not remove**, it may be regenerated by tooling.
- `CLAUDE.md` (this documentation set's primary file) now contains the full operating manual;
  it previously was just an `@AGENTS.md` import — that content has been folded in explicitly
  rather than left as an import, per this audit's requirements.

---

## Where to make common changes

- **Add a page:** create `app/<name>/page.tsx` with `"use client"` at the top; add a nav
  `<Link>` in `app/page.tsx`'s header (and `app/week/page.tsx`'s if it should be reachable
  from the calendar too). Remember `proxy.ts` gates it by default unless added to
  `PUBLIC_PATHS`.
- **Add an API route:** create `app/api/<name>/route.ts`; copy the `requireUserId()` +
  try/catch pattern from `app/api/tasks/route.ts`, not `app/api/chat/route.ts`.
- **Modify authentication:** `app/login/page.tsx` (UI), `app/auth/callback/route.ts`
  (callback), `lib/supabase/{server,browser}.ts` (clients), `proxy.ts` (gate),
  `scripts/create-users.mjs` (provisioning).
- **Change the database schema:** add a new numbered file under `supabase/migrations/`; run
  it manually in the Supabase SQL Editor; update the relevant `lib/*.ts` interfaces and query
  `.select()` strings; update [DATABASE.md](DATABASE.md).
- **Add a feature:** decide if it needs a new table (→ migration), a new API route, and a new
  page/component — follow the existing `userId`-scoped pattern throughout.
- **Change themes/colors:** `app/globals.css` (variables), `lib/theme.ts` (palette list +
  no-flash script), `components/theme/ThemeToggle.tsx` (picker UI).
- **Update deployment settings:** Vercel dashboard (no `vercel.json` in-repo) — see
  [DEPLOYMENT.md](DEPLOYMENT.md).
- **Add an environment variable:** add to `.env.local`, `.env.local.example`, and the Vercel
  dashboard (both Production and Preview scopes) — see `CLAUDE.md`'s Environment setup table.
- **Modify global styles:** `app/globals.css` only — there's no separate CSS-in-JS or module
  CSS anywhere in the app.
- **Change task grouping/coloring:** `lib/groups.ts` (colors/labels/order) — keep in sync with
  the `group_name` CHECK constraint in `supabase/migrations/005_category_group.sql`.
- **Change the chat assistant's behavior:** `lib/prompts.ts` (tone/rules),
  `lib/categorize.ts` (what gets extracted), `app/api/chat/route.ts` (context-building logic).
- **Add/edit an AI personality:** `lib/personalities.ts` only — the shared behavioral rules
  in `lib/prompts.ts`'s `CORE_RULES` apply automatically to any new entry.
- **Change note-linking behavior:** `lib/notes.ts` (`extractWikilinkTitles`,
  `buildNoteGraph`) — edit both together, they must agree on link syntax/resolution.
- **Add a file-upload feature:** copy the pattern in `app/api/theme-image/route.ts`
  (`req.formData()`, service-role `supabase.storage` client, type/size validation) — it's the
  only precedent for file uploads in this app.
- **Add a Storage bucket:** a new numbered migration doing
  `insert into storage.buckets (id, name, public) values (...)`, same as
  `supabase/migrations/007_theme_uploads_bucket.sql`.
