# PROJECT_STATE.md

**This file describes the exact state of the repository at the moment of a documentation
handoff audit. It is meant to let a new session resume from precisely this point.**

- **Audit timestamp:** 2026-08-06 (documentation audit); **checkpoint timestamp: 2026-08-06,
  same day, later** (account-switch checkpoint — a second pass over the same audit, no code
  changes in between).
- **Current branch:** `main`
- **Latest commit:** `6b55515` — "Add real photo backgrounds, month/year calendar views, templates page, chat suggestions"
  (no new commits since the documentation audit — `git log` is unchanged).
- **Working tree: NOT clean.** `CLAUDE.md` is modified (originally just an `@AGENTS.md`
  import; now the full rewritten operating manual) and 16 new documentation files are
  untracked. **This is expected and intentional** — it is the direct, not-yet-committed
  output of the 2026-08-06 documentation-handoff audit, not stray/unexplained work.
- **Uncommitted files:** `CLAUDE.md` (modified).
- **Untracked files:** `API_REFERENCE.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, `DATABASE.md`,
  `DECISIONS.md`, `DEPLOYMENT.md`, `FEATURES.md`, `FILE_MAP.md`, `HANDOFF.md`,
  `PROJECT_STATE.md` (this file), `ROADMAP.md`, `SECURITY.md`, `SESSION_LOG.md`, `TASKS.md`,
  `TESTING.md`, `UI_SYSTEM.md`.
- **No application code has changed.** Only `.md` documentation files are affected. `git diff
  --stat` confirms zero changes to anything under `app/`, `components/`, `lib/`, `scripts/`,
  `supabase/`, or any config file.

## Active development objective

**`DOC-001` (see `TASKS.md`): commit (or explicitly decide not to commit) the 17 pending
documentation files.** This is the one concrete open action at this checkpoint — everything
else is verification/consistency
work, already done. No product feature work is in progress or intended right now. Per this
repository's git-safety rules (see `CLAUDE.md`), **no commit has been made without the user's
explicit instruction to do so** — committing these files requires the user to say so
explicitly; do not assume "documentation task" implies "also commit it."

## Last completed task

Full feature pass across 3 sub-sessions (all now merged to `main` and deployed to
production):

1. **Per-user authentication** (commit `1d78489` + 2 follow-up fixes `426b01e`, `ffb225c`) —
   magic-link, invite-only auth; `user_id` scoping added to all 4 tables; RLS policies added.
2. **Theming + templates + chat character + patch notes** (commits `739a283`, `b3e614d`) —
   4-palette light/dark theme system, starter-templates popover (later replaced), chat persona
   "Nodo", `/changelog` page, generated app icon.
3. **Real photo backgrounds + calendar views + templates page + chat suggestions** (commit
   `6b55515`, the current `HEAD`) — swapped CSS-gradient theme art for real Unsplash photos;
   added `categories.group_name` (Academic/Personal/Work/Other) via migration `005`; built
   Week/Month/Year calendar views (`components/calendar/*`); replaced the templates popover
   with a full `/templates` page; added suggestion chips to the chat panel.

All of the above were deployed via `vercel --prod --yes` and smoke-tested (curl status checks
+ ad hoc Playwright screenshots of the public `/login` page across all 4 palettes × 2 modes).
The `categories.group_name` migration was run in the Supabase SQL Editor by the user and
confirmed live (Verified via direct `select` against the `categories` table showing the new
column present, defaulting to `'other'` on all 3 existing rows).

## Current unfinished task

**Committing the documentation set.** No product/feature work is in progress. The only
concrete unfinished item is that the 17 documentation files described above exist only in the
working tree, not in git history. A new session must not assume they're "safely saved" just
because they're on disk — until committed, they are one `git checkout`/`git clean`/accidental
overwrite away from being lost.

Beyond that, the nearest thing to "unfinished" is the set of known issues in `CLAUDE.md` /
`TASKS.md` (lint errors, `/api/chat` error handling, etc.) — none of which were being actively
worked when either the documentation audit or this checkpoint began.

## Files related to the unfinished task

All 17 documentation files listed at the top of this file (`CLAUDE.md` modified; 16 others
untracked). No application source files are involved.

## What has already been attempted (this session, informational)

- Attempted `npm run lint` → **failed**, 9 pre-existing errors (see
  [Known issues in CLAUDE.md](CLAUDE.md#known-issues)). This was a *discovery* during the
  audit, not a fix attempt — no code was changed to address it, per this task's "do not
  implement new features" scope.
- Attempted `npx tsc --noEmit` → passed, exit 0.
- Attempted `npm run build` → passed, exit 0, all 15 routes generated successfully.

## What currently works (Verified)

- Production deployment at https://nodability.vercel.app is live and responding correctly:
  `/login` → 200, `/icon` and `/apple-icon` → 200 `image/png`, protected routes (`/`, `/week`,
  `/templates`, `/changelog`, all `/api/*`) → 307 redirect to `/login` (or 401 JSON for API
  routes) when unauthenticated.
- Two real Supabase Auth accounts exist (the app owner's and their partner's) and have been
  used to sign in successfully. Real email addresses are intentionally not recorded in this
  repo's docs since it's pushed to a public GitHub remote — look them up in the Supabase
  dashboard if needed.
- Live production data exists and is being actively used: 19 tasks, 112 chat messages, 7
  ideas, 3 categories.
- `categories.group_name` column exists in production and is queryable.
- Build and type-check both pass cleanly.

## What currently fails / errors observed

- `npm run lint` exits 1 with 9 errors (full list in `CLAUDE.md` → Known issues → ISSUE-001).
- `app/api/chat/route.ts` has an unguarded failure path (ISSUE-002 in `CLAUDE.md`) — **not
  reproduced/triggered during this audit**, identified by code inspection only. Treat as
  "logically certain, empirically unconfirmed."

## Blockers

None currently blocking further development. The known issues above are all non-blocking.

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

- The `console.error` in `app/auth/callback/route.ts:15` is a debug/observability leftover
  from diagnosing the magic-link redirect issues encountered during development — mirrors a
  real incident (localhost redirect + Supabase rate-limit issues) documented in
  `SESSION_LOG.md`. Not harmful, but not part of a structured logging strategy.
- Theme background images are hotlinked from Unsplash rather than self-hosted, as an
  explicit "real quick" tradeoff (see `DECISIONS.md` DEC-006).

## Next three recommended actions

1. **Ask the user whether to commit the 17 pending documentation files**, and if yes, commit
   them (do not push unless separately instructed — see `CLAUDE.md`'s git safety rules).
   This is the single most important action, since uncommitted work is fragile across an
   account switch.
2. **Fix or triage ISSUE-001** (`npm run lint` failures) — either fix the 9 errors or make a
   documented decision to accept/suppress specific rules, so `npm run lint` becomes a
   trustworthy signal again. See `TASKS.md` → `BUG-001`.
3. **Harden `/api/chat` error handling** (ISSUE-002) — add a try/catch around the route body
   and make `ChatPanel.tsx` check `res.ok` before streaming the response. See `TASKS.md` →
   `BUG-002`.

(ISSUE-003 — the life-area grouping feature's low adoption — remains a valid lower-priority
follow-up; see `TASKS.md` for the full queue.)

## Verification required before continuing

- Run `git status` at the start of any new session. As of this checkpoint it correctly shows
  `CLAUDE.md` modified + 16 new `.md` files untracked (the documentation set) and **nothing
  else** — if it shows anything beyond that (different files, application code changes), stop
  and investigate before assuming this file's description still matches reality.
- Confirm the Supabase migration state matches `supabase/migrations/` — i.e., that migration
  `005_category_group.sql` (the latest) has actually been run against production (Verified at
  audit time via a direct query — but re-verify if resuming much later, in case another
  session or the user made further out-of-band SQL changes).
- Re-run `npm run build` and `npx tsc --noEmit` at the start of any new session to confirm the
  "currently passes" status in this file is still accurate.
