# TESTING.md

## Current test strategy

**There is no automated test suite.** Verified: no test framework is listed in
`package.json` (no Jest, Vitest, Playwright, Cypress, Testing Library), no `test` script
exists, and no files matching `*.test.*` or `*.spec.*` exist anywhere in the repo (checked
via `find`, excluding `node_modules`). All verification to date has been manual:
`npm run build`, `npx tsc --noEmit`, ad hoc `curl` smoke tests of deployed routes, and one-off
Playwright screenshot scripts written and run directly in a shell session (using the
`playwright` npm package installed globally/ad hoc in a scratch directory, **not** added to
this project's `package.json`) to visually verify theme rendering. None of those scripts are
committed to this repository.

## Test directory structure

N/A — none exists.

## Unit / integration / end-to-end tests

None exist.

## Manual testing steps actually used during development (Verified from session history)

1. **Build/type verification:** `npm run build` and `npx tsc --noEmit` after every change.
2. **Auth flow:** curl checks of route status codes (`/login` → 200, `/icon` → 200
   `image/png`, protected routes → 307 redirect when logged out, `/api/tasks` → 401 JSON when
   logged out) against the live Vercel deployment.
3. **Real sign-in:** manually requesting a magic link and clicking it, for both real accounts,
   to confirm end-to-end auth and per-user data isolation (one account's board stays empty
   while the other's existing data remains visible).
4. **Theme verification:** a throwaway Node script using the `playwright` package to
   pre-set `localStorage` (`nodability-theme`/`nodability-palette`) before navigating to the
   public `/login` page and screenshotting all 4 palettes × 2 modes — chosen because `/login`
   is the only page reachable without a real session, and the no-flash script applies theme
   attributes globally regardless of which page loads.

## Test accounts / fixtures

Two real Supabase Auth accounts exist (see `DATABASE.md`) — these are real people's real
accounts, not disposable test fixtures. **There are no throwaway/sandbox test accounts.**
Any manual testing that requires signing in uses one of these two real accounts and their
real (live) data. Be careful with manual testing that mutates data (creating/deleting
tasks, categories, etc.) — there is no separate test database to safely experiment against
(see `DEPLOYMENT.md` for the Preview-environment-shares-production-DB gap).

## Coverage gaps (i.e., everything)

- No component rendering tests.
- No API route tests (request/response shape, auth enforcement, validation).
- No database query function tests (`lib/tasks.ts`, `lib/ideas.ts`, `lib/messages.ts`).
- No auth flow tests.
- **Most critical untested flow:** the chat extraction pipeline
  (`lib/categorize.ts:extractTasks`) — date parsing, multi-day event handling, deletion
  matching — is entirely prompt-engineered with zero automated regression coverage. A prompt
  wording change could silently regress extraction accuracy with nothing to catch it except
  manual observation during actual use.
- Month/Year calendar views and the `/templates` page have **never been visually verified
  while actually logged in** — only build/type-checked and curl-tested for the auth gate
  (Verified from `PROJECT_STATE.md`'s "what currently works" section — this is a real
  observable gap, not a hypothetical one).

## Known flaky tests

N/A — no tests exist to be flaky.

## Pre-deployment / pre-release checklist (recommended, since none is documented elsewhere)

1. `npx tsc --noEmit` — must pass.
2. `npm run build` — must pass.
3. `npm run lint` — currently fails with 9 pre-existing errors (see `CLAUDE.md` ISSUE-001);
   at minimum confirm your change didn't add *new* errors beyond those 9.
4. If the change touches the database schema: confirm the migration has been run against
   Supabase **before** deploying app code that depends on it (see `DEPLOYMENT.md`).
5. If the change touches auth: manually sign in with both real test accounts and confirm data
   isolation still holds (one account must never see the other's tasks/ideas/messages).
6. If the change touches the chat flow: manually send a handful of representative messages
   (a simple task, a multi-day event, a specific-time deadline, a deletion request, a "what do
   I have this week" recall question) and eyeball the responses — there is no automated
   fixture set for this today; consider building one (see `TASKS.md` Testing needed).

## Manual smoke-test checklist (most important user flows, for a future session or human to run by hand)

- [ ] Load `/login` while logged out → page renders, shows the themed background.
- [ ] Request a magic link for one of the 2 real accounts → email arrives → clicking it signs
      you in and lands on `/`.
- [ ] Main board (`/`) shows that account's existing categories/tasks, not the other
      account's.
- [ ] Type a message in the chat ("Pick up milk tomorrow") → a new task appears in the board
      under a sensible category after the assistant replies.
- [ ] Toggle a task done/open from the board → checkbox state persists after a page reload.
- [ ] Delete a task → it disappears; if it was the last task in its category, the category
      disappears from the sidebar too.
- [ ] `/ideas` → save an idea → it appears in the list; delete it → it disappears.
- [ ] `/week` → switch between Week / Month / Year tabs → each renders without error; toggle a
      task done from Month view → reflected back in Week view / the main board.
- [ ] Click the group-cycling dot next to a category in the sidebar → color changes; the
      calendar's group filter chips reflect the new grouping.
- [ ] `/templates` → apply a template → redirected to `/` with the new categories/tasks
      visible.
- [ ] `/changelog` → renders the version history without error.
- [ ] Theme picker (🎨) → switch through all 4 palettes × Light/Dark/System → background
      photo and all text/button contrast stay legible in every combination.
- [ ] Sign out → redirected to `/login`; attempting to load `/` again redirects back to
      `/login` (session actually cleared).

## Recommended starting point if adding real tests (Inferred suggestion, not a repo decision)

Given the architecture (Client Components fetching from API routes), the highest-value first
tests would likely be:
1. API route tests (e.g. with a lightweight HTTP test against the Next.js route handlers, or
   Vitest + mocked Supabase client) covering auth-required-401, validation-400, and
   happy-path shapes for each route in [API_REFERENCE.md](API_REFERENCE.md).
2. A Playwright E2E test for the full sign-in → create task → see it on board flow, reusing
   the ad hoc script pattern already proven out manually during this project's development
   (see `SESSION_LOG.md`).
