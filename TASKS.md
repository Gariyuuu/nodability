# TASKS.md

Active execution queue. IDs are stable — reference them in commits/`SESSION_LOG.md` entries.

## Current task

- **ID:** DOC-001
- **Description:** Commit the 17-file documentation/memory system produced by the
  2026-08-06 documentation-handoff audit (and reconfirmed by an account-switch checkpoint
  the same day). No product/feature code is involved or was changed.
- **Status:** Complete except for the actual `git commit` — deliberately left uncommitted
  pending explicit user instruction, per this repo's git-safety rule ("never commit unless
  explicitly asked").
- **Priority:** High — not because it's urgent product work, but because uncommitted files
  are fragile across a session/account switch (a `git checkout`, `git clean`, or careless
  overwrite could lose them with no history to recover from).
- **What has already been completed:**
  - Full repository audit: every source file, config file, migration, the live Supabase
    database (schema, row counts, auth users), the live Vercel deployment (route behavior,
    env var scopes, project settings), and full git history.
  - All 17 files written and internally cross-verified: `CLAUDE.md` (rewritten from an
    `@AGENTS.md`-import stub into a full operating manual), `PROJECT_STATE.md`,
    `ARCHITECTURE.md`, `FILE_MAP.md`, `FEATURES.md`, `TASKS.md` (this file), `ROADMAP.md`,
    `DECISIONS.md`, `DATABASE.md`, `API_REFERENCE.md`, `UI_SYSTEM.md`, `SECURITY.md`,
    `TESTING.md`, `DEPLOYMENT.md`, `CHANGELOG.md`, `SESSION_LOG.md`, `HANDOFF.md`.
  - A self-verification pass caught and fixed two real inaccuracies before they could
    mislead a future session: an overclaim that "every page is a Client Component" (false —
    `app/changelog/page.tsx` is a Server Component) and an overclaim about `console.*` usage
    (missed that `scripts/create-users.mjs` also logs to console, which is expected for a
    CLI script but wasn't called out).
  - A privacy check (broader than the literal "secrets" ask) found and redacted two real
    personal email addresses that had been written into `DATABASE.md` and `PROJECT_STATE.md`
    — this repo is pushed to a public GitHub remote, so real third-party email addresses
    (specifically, the app owner's partner's) should not sit in it. Replaced with
    non-identifying descriptions ("the app owner's account", "their partner's account").
  - A second, lighter "account-switch checkpoint" pass (this update) re-verified git state,
    checked for any secret/PII leakage across all 17 files, and confirmed the "current task"
    description is now consistent across `CLAUDE.md`, `PROJECT_STATE.md`, `TASKS.md`, and
    `HANDOFF.md`.
- **What remains:** Nothing except the commit itself, which requires the user's explicit
  go-ahead. If/when instructed, the recommended commit scope is all 17 files together (they
  were produced as one coherent unit), with a message describing this as a documentation-only
  change with no application behavior modified.
- **Relevant files:** All 17 documentation files listed above. No application source,
  config, or migration files are part of this task.
- **Known errors:** None caused by this task (it made no application code changes). Pre-existing
  errors discovered *while auditing* (not part of this task's own scope to fix) are tracked
  separately as `BUG-001` and `BUG-002` below.
- **Blockers:** None technical. The only "blocker" is procedural: this repo's rules require
  explicit user instruction before committing, and that instruction has not yet been given.
- **Acceptance criteria:** Either (a) all 17 files are committed in a single documentation
  commit with a clear message and `git status` returns to clean, or (b) the user explicitly
  decides not to commit yet and that decision is itself recorded (e.g. back in this file) so
  a future session doesn't re-ask the same question from scratch.
- **Validation steps:** After committing — `git status` shows a clean tree; `git show --stat
  HEAD` lists exactly the 17 expected files; `npx tsc --noEmit` and `npm run build` still pass
  (they're unaffected by `.md`-only changes, but re-run for certainty); confirm the commit was
  **not** pushed unless the user separately asked for that too.

## Next up

- **BUG-001** — Fix `npm run lint` failures (9 errors)
  - **Status:** Open
  - **Priority:** High (it's the only "red" signal in an otherwise clean repo)
  - **Files:** `app/ideas/page.tsx:27`, `app/week/page.tsx:32`, `components/TaskBoard.tsx:35`,
    `components/theme/ThemeProvider.tsx:40` (all `react-hooks/set-state-in-effect`);
    `components/ChatPanel.tsx:79` (`react/no-unescaped-entities`); `lib/tasks.ts:105,235,236,251`
    (`@typescript-eslint/no-explicit-any`).
  - **Dependencies:** None.
  - **Acceptance criteria:** `npm run lint` exits 0.
  - **Validation steps:** Run `npm run lint`; run `npm run build` and `npx tsc --noEmit`
    afterward to confirm no regression; manually verify the 4 affected pages/components still
    fetch/render correctly (fetch-on-mount behavior must not change).
  - **Notes:** The `set-state-in-effect` fixes likely just need the fetch logic restructured
    (e.g. an IIFE or a differently-shaped effect) — don't just silence the rule without
    understanding whether the underlying pattern is actually fine (it probably is; this is a
    stylistic lint rule, not a correctness one, but confirm before dismissing). For the `any`
    casts in `lib/tasks.ts`, define a real type for the Supabase join-row shape
    (`{ id, title, ..., categories: { name: string; group_name: string } | null }`).

- **BUG-002** — Harden `/api/chat` error handling
  - **Status:** Open
  - **Priority:** High (real user-facing failure mode, logically certain, unconfirmed live)
  - **Files:** `app/api/chat/route.ts`, `components/ChatPanel.tsx`
  - **Dependencies:** None.
  - **Acceptance criteria:** A thrown error anywhere in the chat route (e.g. force it by
    temporarily breaking `EXTRACT_TOOL`'s schema) results in a clean JSON/text error response
    with a non-200 status, and `ChatPanel.tsx` shows its existing friendly error message
    instead of raw error text.
  - **Validation steps:** Manually trigger a failure (e.g. temporarily set an invalid
    `ANTHROPIC_API_KEY` locally) and confirm the chat UI shows the friendly error message, not
    garbled text.
  - **Notes:** Follow the same try/catch pattern already used in
    `app/api/tasks/route.ts`/`app/api/ideas/route.ts`/`app/api/categories/route.ts`.

## Blocked

None.

## High priority

- **TODO-001** — Decide the fate of life-area grouping (ISSUE-003 in `CLAUDE.md`)
  - **Status:** Open, needs a product decision, not just an engineering fix.
  - **Files:** `components/Sidebar.tsx`, `lib/groups.ts`, `app/week/page.tsx`
  - **Notes:** All 3 live categories are still `group_name = 'other'`. Either make the
    control easier to discover (currently just a small colored dot with a hover tooltip) or
    accept it's low-value and stop investing further in group-based calendar features until
    it's actually used.

## Medium priority

- **TODO-007** — Decide on the 4 high-severity `npm audit` advisories
  - **Files:** `package.json`, `package-lock.json`
  - **Notes:** `npm audit fix` alone resolves the `brace-expansion` DoS advisory safely. The
    other 3 (`postcss`, `sharp`, both transitive via `next`) require `npm audit fix --force`,
    which bumps `next` to `16.3.0` (outside the currently pinned `16.2.11`) — do not do this
    without deliberately reviewing the Next.js changelog for breaking changes first, per this
    repo's "don't casually upgrade dependencies" rule. See `SECURITY.md` for full detail on
    why runtime exposure is currently low (no `next/image` usage, no runtime CSS/source-map
    processing of untrusted input).

- **TODO-002** — Fix template re-application duplicating tasks (ISSUE-005)
  - **Files:** `app/api/templates/route.ts`, `lib/templates.ts`
  - **Acceptance criteria:** Applying the same template twice does not create duplicate tasks
    (either dedupe by title+category before insert, or disable the button after first use).

- **TODO-003** — Self-host theme background photos instead of hotlinking Unsplash (ISSUE-004)
  - **Files:** `app/globals.css`, `public/`
  - **Notes:** Download the 4 specific photos already chosen (IDs are in `app/globals.css`'s
    `--bg-art` values) into `public/theme/`, reference them locally. Preserves attribution
    considerations per the Unsplash License even when self-hosted.

- **TODO-004** — Wire up or remove `is_recall_query`
  - **Files:** `lib/categorize.ts`, `lib/prompts.ts`, `app/api/chat/route.ts`
  - **Notes:** Currently extracted by Haiku but never read. Either use it to adjust the
    Sonnet prompt/behavior for recall-style questions, or remove it from the extraction
    schema to reduce prompt/schema surface area.

## Low priority

- **TODO-005** — Delete unused `public/*.svg` scaffold assets
  - **Files:** `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`,
    `public/window.svg`
  - **Notes:** Verified zero references anywhere in source.

- **TODO-006** — Delete unused `app/favicon.ico`
  - **Notes:** Superseded by `app/icon.tsx`. Harmless to leave, cosmetic only.

## Bugs

See BUG-001 and BUG-002 above. No other confirmed bugs found during this audit.

## Technical debt

- No test framework installed at all — see `TESTING.md` for what a minimal starting suite
  should cover.
- `categories` has a case-sensitive `unique(user_id, name)` DB constraint but app code does
  case-insensitive lookups (`.ilike()`) before insert — a latent inconsistency risk, not
  currently causing observed problems (`CLAUDE.md` → Database summary).
- `app/api/chat/route.ts` doesn't follow the same error-handling pattern as every other route
  (BUG-002).
- No rate limiting anywhere, most notably on `/api/chat` (real Anthropic API cost exposure).
- No pagination on any list endpoint — fine at current scale (dozens of rows), will need
  addressing well before hundreds/thousands.
- `dominantGroup` in `components/calendar/YearView.tsx` picks the first matching task's group,
  not a true mode/majority — misleading name vs. behavior (very low impact while grouping is
  unused).

## Testing needed

- No automated tests exist for anything. See `TESTING.md`'s recommended starting point and
  manual smoke-test checklist.
- Month/Year calendar views and the templates page have never been visually verified while
  actually logged in (only build/type-checked + curl-tested for auth gating) — see
  `PROJECT_STATE.md`.

## Documentation needed

None outstanding as of this audit — this task *is* the documentation pass. Future sessions:
keep these files updated per the rules in `CLAUDE.md`'s "Permanent rules" section.

## Recently completed

1. Real Unsplash photo theme backgrounds, Week/Month/Year calendar views, life-area grouping,
   `/templates` page, chat suggestion chips — commit `6b55515`.
2. Decorative CSS-gradient theme art (superseded by #1) — commit `b3e614d`.
3. Theming system (4 palettes × light/dark), starter-templates popover (superseded by #1's
   `/templates` page), chat persona "Nodo," `/changelog` page, generated app icon — commit
   `739a283`.
4. Per-user authentication + data isolation (magic link, `user_id` scoping, RLS) plus 2
   follow-up fixes for silent failure modes found during real-world testing — commits
   `1d78489`, `426b01e`, `ffb225c`.
5. Chat bot bug fix: was treating checked-off (`status: "done"`) tasks as still due — commit
   `92bd19f`.
6. Idea box feature — commit `6afc23e`.
7. Original task board + chat panel + week view + Supabase backend — commit `f8d2284`.
8. **This documentation handoff audit** — created/updated the 17-file memory system described
   in `CLAUDE.md`.

## Deferred

- Manual add/edit-task-from-grid interaction in Month/Year calendar views — explicitly scoped
  out in favor of "display + toggle done" (see `DECISIONS.md` DEC-004). Revisit if the
  chat-driven capture flow proves insufficient for calendar-first users.
- In-app invite flow for new accounts (currently requires running
  `scripts/create-users.mjs` manually with service-role credentials) — deferred because the
  app is scoped to exactly 2 people; revisit only if a 3rd person needs access regularly.

## Rejected ideas

- **Uploaded custom PNG backgrounds** — considered during the theming work, rejected in favor
  of curated Unsplash photos for scope/time reasons (would have needed image storage). See
  `DECISIONS.md` DEC-006.
- **Automatic keyword-based life-area grouping** — considered as an alternative to manual
  tagging; rejected in favor of manual tagging to avoid misclassification. See `DECISIONS.md`
  DEC-003. (Worth revisiting given ISSUE-003 shows manual tagging isn't being used either.)
