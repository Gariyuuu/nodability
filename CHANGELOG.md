# CHANGELOG.md

This is a repository/engineering changelog, derived from `git log` (dates and commit hashes
are Verified from git history: `git log --format="%h %ad %s" --date=short`). This is distinct
from the in-app "What's new" page (`lib/changelog.ts`, rendered at `/changelog`), which is a
hand-maintained, user-facing summary — the two are related but not identical; see
`lib/changelog.ts` for the user-facing version numbering (0.1–0.5).

No CHANGELOG.md existed in this repository before this entry — this file is new, not a
rewrite of prior history. No dates or versions below are invented.

## 2026-08-06 — Fixed every open bug and tech-debt item (`18200e7`)

Per explicit user instruction to finish all outstanding work: fixed all 9 `npm run lint`
errors (`npm run lint` now exits 0 — genuine structural fix for `ThemeProvider.tsx`'s
localStorage hydration, justified suppressions for 3 standard fetch-on-mount patterns, fixed
an unescaped apostrophe, replaced 4 `any` casts with real types); hardened `/api/chat` with
proper error handling; made template application idempotent; removed the unused
`is_recall_query` field; deleted unused scaffold assets; self-hosted the 4 theme background
photos (`public/theme/`) instead of hotlinking Unsplash — which surfaced and required fixing
a new `proxy.ts` auth-gate gap for the new static paths; improved life-area-grouping
discoverability; resolved the `brace-expansion` `npm audit` advisory. 3 `npm audit` advisories
remain, deliberately deferred (would require bumping `next` past the pinned version). Full
detail in `CLAUDE.md`'s Known Issues section and `TASKS.md`. Deployed to production and
verified live.

## 2026-08-06 — Documentation handoff audit + real photo backgrounds / calendar views

- **Documentation handoff audit** (this entry): performed a full repository audit (source,
  config, schema, migrations, live database state, live deployment state, git history) and
  created a permanent, in-repository documentation system: `CLAUDE.md`, `PROJECT_STATE.md`,
  `ARCHITECTURE.md`, `FILE_MAP.md`, `FEATURES.md`, `TASKS.md`, `ROADMAP.md`, `DECISIONS.md`,
  `DATABASE.md`, `API_REFERENCE.md`, `UI_SYSTEM.md`, `SECURITY.md`, `TESTING.md`,
  `DEPLOYMENT.md`, this file, `SESSION_LOG.md`, `HANDOFF.md`. No product behavior was
  intentionally changed. Verification commands were run (`npx tsc --noEmit`, `npm run build`,
  `npm run lint`, `npm audit`) to ground the documentation in actual current state; findings
  were recorded, not fixed (out of scope by design — see `HANDOFF.md`). Significant problems
  discovered: `npm run lint` fails with 9 pre-existing errors; `app/api/chat/route.ts` has no
  error handling past its initial auth check; the life-area grouping feature is fully built
  but unused in live data; `supabase/schema.sql` does not replay cleanly against
  `002_date_range_and_time.sql` from scratch; 4 high-severity `npm audit` advisories exist
  (transitive, build-tooling-related). Full detail in `CLAUDE.md`'s Known issues section and
  `SECURITY.md`.
- `6b55515` Add real photo backgrounds, month/year calendar views, templates page, chat
  suggestions

## 2026-08-05 — Theming system and auth reliability fixes

In chronological order:
- `426b01e` Surface auth callback errors instead of silently redirecting to login
- `ffb225c` Surface the real signInWithOtp error instead of a generic message
- `739a283` Add themes, patch notes, starter templates, and a friendlier chat
- `b3e614d` Add decorative background artwork per theme palette

## 2026-08-04 — Per-user authentication and data isolation

- `1d78489` Add per-user auth so tasks/ideas/messages aren't a single shared dataset

## 2026-08-03 — Idea box and a chat bug fix

In chronological order:
- `6afc23e` Add idea box: a place to jot down and save ideas
- `92bd19f` Fix chat bot treating checked-off tasks as still due

## 2026-07-24 — Original task board

- `f8d2284` Add task board, chat panel, week view, and Supabase backend

## 2026-07-22 — Project created

- `4bd02bc` Initial commit from Create Next App
