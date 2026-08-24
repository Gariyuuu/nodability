# TASKS.md

Active execution queue. IDs are stable — reference them in commits/`SESSION_LOG.md` entries.

## Current task: `T-002` [added 2026-08-24] — run migration `008`, then live-verify the board

Two steps, in this order:

1. **Run `supabase/migrations/008_task_sort_order.sql`** in the Supabase SQL Editor
   (`https://supabase.com/dashboard/project/hwvqnenmnrzdncwznorv/sql/new`). It's a single
   `alter table` + `create index`, safe to paste whole. Until it runs, dragging a task into a
   different list persists but its position *within* a list does not — the board shows a
   notice saying so, and `PATCH /api/tasks/reorder` returns `{"ordered": false}`.
   *Only a human can do this: there is no migration runner and the service-role key cannot
   execute DDL.*
2. **Live-verify the ordering write** afterwards, logged in on the deployed app (the feature
   itself is already live — `622c9f7`, deployed 2026-08-24): drag a task
   within a list, reload, confirm the order stuck. This is the one code path from the
   2026-08-24 feature work that could not be verified before shipping (everything else was —
   see `SESSION_LOG.md`).

Also still open from before: `T-001` below.

## `T-001` [added 2026-08-16]

Live-verify the `ThinkingOrb` animated "assistant is composing" indicator added to
`components/ChatPanel.tsx` in `217373b`/`28f4fbb` (2026-08-15/16, `thinking-orbs` package) —
log into the deployed app and send a chat message, confirm the orb actually renders during
the composing state (never checked live; the commit itself records no verification detail).
Two other feature commits since the 2026-08-07 checkpoint (`fff3db2`/`b9ca352` — OpenGraph
image, `robots.txt`, `proxy.ts` allowlist) **were** live-verified during this 2026-08-16 sweep
(`curl` against production confirmed both `robots.txt` and `/opengraph-image` work) — no
follow-up needed there. See `PROJECT_STATE.md` → "2026-08-16 update" for full detail. All
branches (`chore/metadata-og`, `chore/polish`) are merged into `main`; nothing outstanding on
any branch.

Prior to this: an AI-provider swap (Anthropic Claude API → self-hosted OpenAI-compatible
platform) was completed, verified, committed (`b4fb289`), pushed, and — per the 2026-08-07
checkpoint audit's evidence (`vercel env ls`/`vercel inspect`) — confirmed live in production.
See `DECISIONS.md` → DEC-013 for full detail. The only other open item in the repo is
`ISSUE-006` (deliberately-deferred `npm audit` findings) under "Deferred" — not an active task.

## Next up

If mobile/touch drag is ever wanted, that's a real gap — the board uses native HTML5
drag-and-drop, which doesn't fire on touch (or keyboard). The edit form's list dropdown is the
current fallback; `dnd-kit` is the obvious upgrade path (see `DECISIONS.md` DEC-014).

A real logged-in end-to-end smoke test of `/api/chat` against production (never
done for the AI-provider swap) is the most valuable next check. Otherwise good candidates from
"Technical debt"/"Testing needed" below, or a new feature request from the user.

## Blocked

None.

## High priority

None open.

## Medium priority

None open.

## Low priority

None open.

## Bugs

None open. `BUG-001` and `BUG-002` (below, under Recently completed) were the only two ever
tracked, and both are fixed.

## Technical debt

- No test framework installed at all — see `TESTING.md` for what a minimal starting suite
  should cover. This is the most consequential remaining gap: several fixes in this session
  (the `eslint-disable` justifications, the template-idempotency check, the `proxy.ts` matcher
  broadening) were judgment calls verified only by manual testing — real test coverage would
  catch regressions in this code going forward.
- `categories` has a case-sensitive `unique(user_id, name)` DB constraint but app code does
  case-insensitive lookups (`.ilike()`) before insert — a latent inconsistency risk, not
  currently causing observed problems (`CLAUDE.md` → Database summary).
- No rate limiting anywhere, most notably on `/api/chat` (unmetered cost exposure against the
  self-hosted AI platform, formerly Anthropic — see `DECISIONS.md` DEC-013).
- No pagination on any list endpoint — fine at current scale (dozens of rows), will need
  addressing well before hundreds/thousands.
- `dominantGroup` in `components/calendar/YearView.tsx` picks the first matching task's group,
  not a true mode/majority — misleading name vs. behavior (low impact, but worth fixing if
  life-area grouping adoption picks up now that `TODO-001`'s discoverability fix has shipped).
- 3 of 4 `npm audit` high-severity advisories remain (`ISSUE-006`, see Deferred below).
- `app/api/theme-image/route.ts` trusts the client-reported file MIME type rather than
  inspecting file bytes — low risk at 2-user scale, see `SECURITY.md`'s File upload risks.
- Notes' `[[Wikilink]]` resolution is title-based with no stored edges table — renaming a
  note breaks old links to its previous title (deliberate design tradeoff, not a bug, but
  worth remembering — see `FEATURES.md` §11).

## Testing needed

- No automated tests exist for anything. See `TESTING.md`'s recommended starting point and
  manual smoke-test checklist.
- Month/Year calendar views and the templates page have still never been visually verified
  while actually logged in (only build/type-checked + curl-tested for auth gating).
- The `BUG-002` fix (chat error handling) was verified by code review and passing
  `tsc`/`lint`/`build`, but not by actually forcing a live failure (e.g. a temporarily broken
  `AI_PLATFORM_API_KEY`) and confirming the UI shows the friendly error message end-to-end.
- The note graph's visual rendering (actual node/edge layout on screen) was never
  screenshot-verified — only the underlying linking/layout logic was tested directly against
  the database. Worth a manual look with real notes.

## Documentation needed

None outstanding. Keep these files updated per the rules in `CLAUDE.md`'s "Permanent rules"
section as new work happens.

## Recently completed

1. **AI-provider swap: Anthropic Claude API → self-hosted OpenAI-compatible platform** —
   commit `b4fb289`, pushed and deployed (confirmed live via `vercel env ls`/`vercel inspect`
   during the 2026-08-07 checkpoint audit): `lib/anthropic.ts` deleted, replaced by
   `lib/ai-client.ts` (an `openai`-package client pointed at `https://api.gariyuuu.com/v1`,
   exposing `EXTRACTION_MODEL`/`CHAT_MODEL`, both currently `"Yuu no Sekai"`).
   `lib/categorize.ts`'s forced tool-use extraction call and `app/api/chat/route.ts`'s
   streaming chat reply were both translated from Anthropic's Messages API request/response
   shapes to OpenAI's Chat Completions shapes. `ANTHROPIC_API_KEY` renamed to
   `AI_PLATFORM_API_KEY` (set in Vercel Production; **not yet added to Preview scope** — see
   `PROJECT_STATE.md`). Full reasoning and exact before/after shapes: `DECISIONS.md` → DEC-013.
   - Verified: `tsc`/`lint`/`build` all exit 0 (re-confirmed clean during the 2026-08-07 audit
     too). The forced tool-use path — the highest-risk part, core to the app's daily
     task-extraction function — was called directly (the real `extractTasks` function, not a
     mock) with 5 varied real messages including "remind me to buy milk tomorrow"; all 5
     returned correctly-shaped, correctly-parsed structured output. The streaming chat-reply
     path was verified with the same request shape used in `app/api/chat/route.ts`, returning a
     real multi-chunk streamed, context-grounded reply. **Still never verified**: the literal
     authenticated `/api/chat` HTTP round-trip through production, since this app has no
     separate dev database and doing so would write to the 2 real users' production data.
2. **Cleanup for superseded custom theme-background uploads** (not yet committed — see
   `app/api/theme-image/route.ts`): uploading a new custom background now lists the user's
   existing files in the `theme-uploads` bucket and deletes every one except the
   just-uploaded file, instead of leaving old uploads orphaned forever. Verified end-to-end
   against the live Storage bucket (uploaded 2 "old" files, uploaded a 3rd, confirmed the
   first 2 were deleted and only the 3rd remained; test artifacts cleaned up). `tsc`/`lint`/
   `build` all exit 0.
2. **Obsidian-style linked notes system + custom theme background image uploads** — commit
   `f8e46ef` (pushed to `origin/main` as of `620fa67`):
   - New `/notes` page: create/edit notes, optionally tag to a category ("class"), link
     between notes with `[[Wikilink]]` syntax, view everything as a force-directed graph.
     New `notes` table (migration `supabase/migrations/006_notes.sql`) — no stored edges table, links resolve
     dynamically by case-insensitive title match at read time (`lib/notes.ts`). Graph layout
     is a hand-rolled force-directed algorithm (`lib/graph-layout.ts`), no new dependency.
   - New 11th "Custom" theme palette: upload your own photo via `POST /api/theme-image`,
     stored in a new public Supabase Storage bucket (`theme-uploads`, migration
     `supabase/migrations/007_theme_uploads_bucket.sql`), applied at runtime via an inline `--bg-art` CSS
     property (per-user data, unlike the 10 curated palettes' static `app/globals.css` rules).
   - This is the app's first file-upload feature and first new data table since the original
     schema — both are now the precedent to copy for any future upload feature/bucket.
   - Verified: `tsc`/`lint`/`build` all exit 0; real end-to-end test of the Storage upload
     path (uploaded, confirmed publicly fetchable, cleaned up) and the notes table (inserted
     linked notes, confirmed duplicate-title rejection via Postgres `23505`, cleaned up);
     deployed via `vercel --prod --yes`; live route-gating confirmed via curl. Graph's visual
     rendering was not screenshot-verified (see Testing needed).
3. **10 themes total, custom AI personalities, and a liveliness pass** — commit `eb3c34a`
   (pushed to `origin/main` as of `620fa67`):
   - Added 6 new theme palettes (Rose, Mint, Lavender, Amber, Midnight, Coral), each with a
     self-hosted photo background (`public/theme/*.jpg`, sourced/verified the same way as
     the original 4) and full light/dark token set in `app/globals.css`. 10 palettes total.
   - Built a multi-personality AI chat system: `lib/personalities.ts` defines 5 characters
     (Nodo, Rex, Sage, Turbo, Professor Hoot); `lib/prompts.ts` refactored into a shared
     `buildSystemPrompt(personality)` so behavioral/grounding rules stay identical across
     all of them; `/api/chat` accepts `personalityId`; `components/ChatPanel.tsx` got a picker UI
     persisted to `localStorage`.
   - Liveliness/emoji pass across nav links, headers, empty/loading states, template cards,
     calendar tabs, and a completed-task celebration emoji.
   - Backfilled a missing v0.6 in-app changelog entry (previous session's calendar/
     real-photos work had shipped without one) and added v0.7 for this session.
   - Verified: `tsc`/`lint`/`build` all exit 0; deployed; live curl on all 10 `/theme/*.jpg`
     paths + Playwright screenshots of 3 new palettes confirming legibility.
4. **Fixed every open bug/tech-debt item in one session** — commit `18200e7`:
   - `BUG-001` — all 9 `npm run lint` errors fixed (`npm run lint` now exits 0). Real
     structural fix for `components/theme/ThemeProvider.tsx` (lazy `useState` initializers replacing an
     effect); justified `eslint-disable-next-line` for the 3 fetch-on-mount cases; fixed
     the unescaped apostrophe in `components/ChatPanel.tsx`; replaced 4 `any` casts in `lib/tasks.ts`
     with real interfaces.
   - `BUG-002` — `/api/chat` now wraps its body in try/catch, returns a clean `500` on
     failure; `components/ChatPanel.tsx` checks `res.ok` before streaming.
   - `TODO-002` — template application is now idempotent
     (`lib/tasks.ts:taskExistsWithTitle`).
   - `TODO-004` — removed the unused `is_recall_query` field entirely.
   - `TODO-005`/`TODO-006` — deleted unused scaffold SVGs and the old favicon.ico.
   - `TODO-003` — self-hosted the 4 theme background photos at `public/theme/*.jpg`
     (was hotlinked from Unsplash). Also fixed a `proxy.ts` matcher gap this surfaced (new
     static assets were being caught by the auth gate — same bug class as the earlier
     `/icon` issue).
   - `TODO-001` — improved life-area grouping discoverability (visible hint text + a
     larger, bordered dot).
   - `TODO-007` — ran `npm audit fix` (resolved `brace-expansion`; the other 3 advisories
     deliberately deferred, see below).
   - Verified: `npx tsc --noEmit`, `npm run lint`, `npm run build` all exit 0; deployed via
     `vercel --prod --yes`; live curl + Playwright screenshot verification.
5. Documentation/memory system (17 files) for account-switch handoff — commits `071f6a3`,
   `d92a96b`.
6. Real Unsplash photo theme backgrounds (later self-hosted, see #3), Week/Month/Year
   calendar views, life-area grouping, `/templates` page, chat suggestion chips — commit
   `6b55515`.
7. Decorative CSS-gradient theme art (superseded by #6) — commit `b3e614d`.
8. Theming system (4 palettes × light/dark), starter-templates popover (superseded by #6's
   `/templates` page), chat persona "Nodo," `/changelog` page, generated app icon — commit
   `739a283`.
9. Per-user authentication + data isolation (magic link, `user_id` scoping, RLS) plus 2
   follow-up fixes for silent failure modes found during real-world testing — commits
   `1d78489`, `426b01e`, `ffb225c`.
10. Chat bot bug fix: was treating checked-off (`status: "done"`) tasks as still due — commit
    `92bd19f`.
11. Idea box feature — commit `6afc23e`.
12. Original task board + chat panel + week view + Supabase backend — commit `f8d2284`.

## Deferred

- **`ISSUE-006`** — 3 of 4 `npm audit` high-severity advisories (`postcss`, `sharp`, both
  transitive via `next`) remain. Fixing them requires `npm audit fix --force`, which bumps
  `next` to `16.3.0` — outside the pinned `16.2.11`. Deliberately not done as a drive-by fix;
  warrants its own dedicated review-and-test pass (ideally after a test suite exists to catch
  regressions). See `SECURITY.md` for why runtime exposure is currently low.
- Manual add/edit-task-from-grid interaction in Month/Year calendar views — explicitly scoped
  out in favor of "display + toggle done" (see `DECISIONS.md` DEC-004). Revisit if the
  chat-driven capture flow proves insufficient for calendar-first users.
- In-app invite flow for new accounts (currently requires running
  `scripts/create-users.mjs` manually with service-role credentials) — deferred because the
  app is scoped to exactly 2 people; revisit only if a 3rd person needs access regularly.

## Rejected ideas

- **Automatic keyword-based life-area grouping** — considered as an alternative to manual
  tagging; rejected in favor of manual tagging to avoid misclassification. See `DECISIONS.md`
  DEC-003.
- **Full data-fetching-library migration (SWR/React Query/Suspense)** to structurally avoid
  the `react-hooks/set-state-in-effect` lint rule in `app/ideas/page.tsx`/`app/week/page.tsx`/
  `components/TaskBoard.tsx` — rejected as disproportionate effort/risk for this app's scale
  given no test suite exists to catch regressions; used a justified `eslint-disable` instead.
  Revisit if this app's data-fetching needs grow more complex.
