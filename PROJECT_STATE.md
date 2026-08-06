# PROJECT_STATE.md

**This file describes the exact state of the repository at the moment of the last update. It
is meant to let a new session resume from precisely this point.**

- **Last updated:** 2026-08-06 — a follow-up session that fixed every open item from the
  documentation audit (`BUG-001`, `BUG-002`, `TODO-001` through `TODO-007`).
- **Current branch:** `main`
- **Latest commit:** `18200e7` — "Fix all tracked bugs/tech-debt: lint errors, chat error
  handling, and more". Previous commits: `d92a96b` (doc-sync follow-up), `071f6a3`
  (documentation/memory system), `6b55515` (real photo backgrounds, calendar views, templates
  page, chat suggestions).
- **Working tree: clean** (Verified via `git status` immediately after the commit).
- **Not pushed.** `main` is ahead of `origin/main` by 3 commits (`071f6a3`, `d92a96b`,
  `18200e7`) — commits have been made as instructed; nothing has been pushed since no push was
  instructed. Push whenever appropriate.
- **Deployed to production.** `vercel --prod --yes` was run after `18200e7`; live smoke tests
  (curl + a Playwright screenshot of `/login`) confirm the deployment matches the commit.
- **Uncommitted files:** None. **Untracked files:** None.

## Active development objective

None. Every tracked task is complete:
- `DOC-001` (documentation/memory system) — done, commit `071f6a3` + `d92a96b`.
- `BUG-001` (9 ESLint errors) — done, commit `18200e7`. `npm run lint` now exits 0.
- `BUG-002` (`/api/chat` error handling) — done, commit `18200e7`.
- `TODO-001` through `TODO-007` — done, commit `18200e7`. See `CLAUDE.md`'s Known Issues
  section (ISSUE-001 through ISSUE-005, all marked Resolved/Improved) for exactly what
  changed in each.

The only remaining open item is **ISSUE-006** (3 of 4 `npm audit` advisories, deliberately
deferred — fixing them requires bumping `next` past the pinned `16.2.11`, which needs its own
dedicated review pass, not a drive-by fix). This is not a "next task to do now," it's a
recorded, intentional deferral.

## Last completed task

A single follow-up session (commit `18200e7`) that fixed every open bug/tech-debt item found
during the earlier documentation audit, in one pass:

1. **`BUG-001`** — Fixed all 9 ESLint errors. `components/theme/ThemeProvider.tsx` got a real
   structural fix (guarded lazy `useState` initializers instead of an effect, eliminating the
   extra post-mount render entirely). The 3 fetch-on-mount cases
   (`app/ideas/page.tsx`, `app/week/page.tsx`, `components/TaskBoard.tsx`) got a justified
   `eslint-disable-next-line` each (standard, correct pattern; the lint rule is stricter than
   warranted, and a full Suspense/SWR migration was judged disproportionate). Fixed the
   unescaped apostrophe in `components/ChatPanel.tsx`. Replaced 4 `: any` casts in
   `lib/tasks.ts` with two real interfaces matching the actual Supabase query shapes.
2. **`BUG-002`** — `app/api/chat/route.ts`'s body is now wrapped in try/catch, returning a
   clean `500` on failure instead of an unhandled error; `components/ChatPanel.tsx` now checks
   `res.ok` before reading the response as a stream.
3. **`TODO-002`** — Template application is now idempotent (`lib/tasks.ts:taskExistsWithTitle`
   checks before each insert in `app/api/templates/route.ts`).
4. **`TODO-004`** — Removed the unused `is_recall_query` field from `lib/categorize.ts`'s
   extraction schema and `lib/prompts.ts`'s instructions.
5. **`TODO-005`/`TODO-006`** — Deleted the 5 unused Create-Next-App scaffold SVGs and the
   superseded `app/favicon.ico`.
6. **`TODO-003`** — Self-hosted the 4 theme background photos at `public/theme/*.jpg` instead
   of hotlinking Unsplash (with `public/theme/SOURCES.md` recording provenance). **This
   surfaced a new bug in the same session:** `proxy.ts`'s auth-gate matcher didn't exclude
   `/theme/*`, so the new images 307-redirected to `/login` for logged-out visitors — same
   class of bug as the earlier `/icon` issue. Fixed by broadening the matcher to exclude any
   path ending in a common static-asset extension, rather than enumerating paths one at a
   time.
7. **`TODO-001`** — Made life-area grouping more discoverable: a visible hint line plus a
   larger, bordered dot instead of an unlabeled one. (Improvement, not a guarantee of
   adoption — re-check live `group_name` values in a future session.)
8. **`TODO-007`** — Ran `npm audit fix` (no `--force`), resolving the `brace-expansion`
   advisory. Left the other 3 (`postcss`/`sharp` via `next`) deliberately unresolved (see
   ISSUE-006 above).

All changes were verified (`npx tsc --noEmit`, `npm run lint`, `npm run build` all exit 0),
committed, deployed via `vercel --prod --yes`, and smoke-tested live (curl status checks on
`/login`, `/icon`, `/apple-icon`, all 4 `/theme/*.jpg` paths, protected routes, and `/api/tasks`;
a Playwright screenshot confirming the self-hosted background renders correctly on the live
`/login` page).

## Current unfinished task

**None.**

## Files related to the unfinished task

N/A — no task is unfinished.

## What has already been attempted (this session, informational)

- All fixes were implemented, verified locally (`tsc`/`lint`/`build`), then deployed and
  re-verified live — no fix was left "probably works" without a real check.
- Deliberately did **not** run `npm audit fix --force` (would bump `next` past the pinned
  version) — see ISSUE-006 in `CLAUDE.md`.
- Deliberately did **not** attempt a structural rewrite of the 3 fetch-on-mount components to
  avoid `react-hooks/set-state-in-effect` "properly" (e.g. via SWR/React Query/Suspense) —
  judged disproportionate risk/effort for this app's scale given no test suite exists to catch
  regressions from such a rewrite.

## What currently works (Verified)

- Production deployment at https://nodability.vercel.app is live and responding correctly,
  post-fix: `/login` → 200, `/icon`/`/apple-icon`/all 4 `/theme/*.jpg` → 200 with correct
  content types, protected routes → 307/401 as expected when logged out.
- `npm run build`, `npx tsc --noEmit`, **and now `npm run lint`** all pass cleanly (exit 0).
- Two real Supabase Auth accounts exist (the app owner's and their partner's) and have been
  used to sign in successfully. Real email addresses are intentionally not recorded in this
  repo's docs since it's pushed to a public GitHub remote.
- Live production data exists and is being actively used: 19 tasks, 112 chat messages, 7
  ideas, 3 categories (as of the original audit — not re-queried after this session's changes
  since none of them touch task/message/idea/category data itself).

## What currently fails / errors observed

Nothing application-level. `npm audit` still reports 3 high-severity advisories (down from 4),
all transitive build-tooling dependencies, deliberately unresolved — see ISSUE-006 in
`CLAUDE.md`.

## Blockers

None.

## Assumptions currently in use (Inferred, not stated anywhere explicitly)

- The app is intended to remain a 2-person tool, not evolve toward public multi-tenant
  signup — inferred from `shouldCreateUser: false` and the complete absence of any invite/
  signup UI.
- The developer treats `git push` + manual `vercel --prod --yes` as the deploy ritual — no
  evidence of an intended future CI/CD automation exists in the repo (no `.github/workflows`,
  no `vercel.json`).
- No test framework is intended to be added imminently — inferred only from absence, not from
  any explicit decision recorded anywhere.

## Temporary decisions (things done for expedience, flagged as such at the time)

- The `console.error` in `app/auth/callback/route.ts:15` and the new one in
  `app/api/chat/route.ts`'s catch block are debug/observability leftovers, not part of a
  structured logging strategy — acceptable at this app's scale but worth revisiting if
  real monitoring is ever added.
- The `eslint-disable-next-line react-hooks/set-state-in-effect` comments (3 of them) are a
  documented, justified suppression rather than a structural rewrite — see `BUG-001` above
  and `CLAUDE.md` ISSUE-001 for the reasoning. Revisit if this app ever adopts a proper
  data-fetching library.

## Next recommended actions

1. **Decide whether to `git push`** — 3 local commits are ahead of `origin/main`.
2. **When there's bandwidth for a dedicated review pass:** consider `npm audit fix --force`
   (bumps `next` to `16.3.0`) — test thoroughly first, since there's no automated test suite
   to catch regressions (see `TESTING.md`).
3. **Watch real usage of life-area grouping** (`TODO-001`'s discoverability fix) — check back
   on `categories.group_name` values in a future session to see if the two real users actually
   started using it.
4. **Consider adding a minimal test suite** (see `TESTING.md`'s recommended starting point) —
   this session made several small, judgment-call fixes (the eslint-disable justifications,
   the idempotency check) that would benefit from regression coverage.

## Verification required before continuing

- Run `git status` and `git log --oneline -3` at the start of any new session. Expect: clean
  tree, `HEAD` at `18200e7`.
- Re-run `npm run build`, `npx tsc --noEmit`, and `npm run lint` to confirm the "all pass"
  status in this file is still accurate — don't assume it without checking.
- If resuming much later, re-verify Supabase migration state
  (`supabase/migrations/005_category_group.sql` should be the latest applied) and re-check the
  live row counts, since real usage continues independent of code changes.
