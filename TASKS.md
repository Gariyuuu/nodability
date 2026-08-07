# TASKS.md

Active execution queue. IDs are stable — reference them in commits/`SESSION_LOG.md` entries.

## Current task

**None.** The Obsidian-style notes system + custom theme image uploads request is complete
as of commit `f8e46ef` (**not yet pushed, along with `eb3c34a` and `49cd6e4`** — ask before
pushing). Everything through `720e9a2` is pushed. See "Recently completed" below for what was
done. The only open item in the whole repo is `ISSUE-006` (deliberately-deferred `npm audit`
findings) under "Deferred" — not an active task.

## Next up

None queued. If you're picking up fresh work, good candidates from "Technical debt"/"Testing
needed" below, or a new feature request from the user.

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
- No rate limiting anywhere, most notably on `/api/chat` (real Anthropic API cost exposure).
- No pagination on any list endpoint — fine at current scale (dozens of rows), will need
  addressing well before hundreds/thousands.
- `dominantGroup` in `components/calendar/YearView.tsx` picks the first matching task's group,
  not a true mode/majority — misleading name vs. behavior (low impact, but worth fixing if
  life-area grouping adoption picks up now that `TODO-001`'s discoverability fix has shipped).
- 3 of 4 `npm audit` high-severity advisories remain (`ISSUE-006`, see Deferred below).
- Custom theme-background uploads are never cleaned up — replacing your photo orphans the
  old one in the `theme-uploads` Storage bucket forever (see `FEATURES.md` §6b,
  `DATABASE.md`'s Storage buckets section).
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
  `ANTHROPIC_API_KEY`) and confirming the UI shows the friendly error message end-to-end.
- The note graph's visual rendering (actual node/edge layout on screen) was never
  screenshot-verified — only the underlying linking/layout logic was tested directly against
  the database. Worth a manual look with real notes.

## Documentation needed

None outstanding. Keep these files updated per the rules in `CLAUDE.md`'s "Permanent rules"
section as new work happens.

## Recently completed

1. **Obsidian-style linked notes system + custom theme background image uploads** — commit
   `f8e46ef` (not yet pushed):
   - New `/notes` page: create/edit notes, optionally tag to a category ("class"), link
     between notes with `[[Wikilink]]` syntax, view everything as a force-directed graph.
     New `notes` table (migration `006_notes.sql`) — no stored edges table, links resolve
     dynamically by case-insensitive title match at read time (`lib/notes.ts`). Graph layout
     is a hand-rolled force-directed algorithm (`lib/graph-layout.ts`), no new dependency.
   - New 11th "Custom" theme palette: upload your own photo via `POST /api/theme-image`,
     stored in a new public Supabase Storage bucket (`theme-uploads`, migration
     `007_theme_uploads_bucket.sql`), applied at runtime via an inline `--bg-art` CSS
     property (per-user data, unlike the 10 curated palettes' static `globals.css` rules).
   - This is the app's first file-upload feature and first new data table since the original
     schema — both are now the precedent to copy for any future upload feature/bucket.
   - Verified: `tsc`/`lint`/`build` all exit 0; real end-to-end test of the Storage upload
     path (uploaded, confirmed publicly fetchable, cleaned up) and the notes table (inserted
     linked notes, confirmed duplicate-title rejection via Postgres `23505`, cleaned up);
     deployed via `vercel --prod --yes`; live route-gating confirmed via curl. Graph's visual
     rendering was not screenshot-verified (see Testing needed).
2. **10 themes total, custom AI personalities, and a liveliness pass** — commit `eb3c34a`
   (not yet pushed):
   - Added 6 new theme palettes (Rose, Mint, Lavender, Amber, Midnight, Coral), each with a
     self-hosted photo background (`public/theme/*.jpg`, sourced/verified the same way as
     the original 4) and full light/dark token set in `app/globals.css`. 10 palettes total.
   - Built a multi-personality AI chat system: `lib/personalities.ts` defines 5 characters
     (Nodo, Rex, Sage, Turbo, Professor Hoot); `lib/prompts.ts` refactored into a shared
     `buildSystemPrompt(personality)` so behavioral/grounding rules stay identical across
     all of them; `/api/chat` accepts `personalityId`; `ChatPanel.tsx` got a picker UI
     persisted to `localStorage`.
   - Liveliness/emoji pass across nav links, headers, empty/loading states, template cards,
     calendar tabs, and a completed-task celebration emoji.
   - Backfilled a missing v0.6 in-app changelog entry (previous session's calendar/
     real-photos work had shipped without one) and added v0.7 for this session.
   - Verified: `tsc`/`lint`/`build` all exit 0; deployed; live curl on all 10 `/theme/*.jpg`
     paths + Playwright screenshots of 3 new palettes confirming legibility.
2. **Fixed every open bug/tech-debt item in one session** — commit `18200e7`:
   - `BUG-001` — all 9 `npm run lint` errors fixed (`npm run lint` now exits 0). Real
     structural fix for `ThemeProvider.tsx` (lazy `useState` initializers replacing an
     effect); justified `eslint-disable-next-line` for the 3 fetch-on-mount cases; fixed
     the unescaped apostrophe in `ChatPanel.tsx`; replaced 4 `any` casts in `lib/tasks.ts`
     with real interfaces.
   - `BUG-002` — `/api/chat` now wraps its body in try/catch, returns a clean `500` on
     failure; `ChatPanel.tsx` checks `res.ok` before streaming.
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
3. Documentation/memory system (17 files) for account-switch handoff — commits `071f6a3`,
   `d92a96b`.
4. Real Unsplash photo theme backgrounds (later self-hosted, see #2), Week/Month/Year
   calendar views, life-area grouping, `/templates` page, chat suggestion chips — commit
   `6b55515`.
5. Decorative CSS-gradient theme art (superseded by #4) — commit `b3e614d`.
6. Theming system (4 palettes × light/dark), starter-templates popover (superseded by #4's
   `/templates` page), chat persona "Nodo," `/changelog` page, generated app icon — commit
   `739a283`.
7. Per-user authentication + data isolation (magic link, `user_id` scoping, RLS) plus 2
   follow-up fixes for silent failure modes found during real-world testing — commits
   `1d78489`, `426b01e`, `ffb225c`.
8. Chat bot bug fix: was treating checked-off (`status: "done"`) tasks as still due — commit
   `92bd19f`.
9. Idea box feature — commit `6afc23e`.
10. Original task board + chat panel + week view + Supabase backend — commit `f8d2284`.

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
