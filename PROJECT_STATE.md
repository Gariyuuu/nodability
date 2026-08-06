# PROJECT_STATE.md

**This file describes the exact state of the repository at the moment of the last update. It
is meant to let a new session resume from precisely this point.**

- **Last updated:** 2026-08-06 — a feature session that added 6 new theme palettes (10 total),
  a multi-personality AI chat system, and a liveliness/emoji pass across the UI.
- **Current branch:** `main`
- **Latest commit:** `eb3c34a` — "Add 10 themes total, custom AI personalities, and a
  livelier UI". Previous commits: `720e9a2` (doc updates), `18200e7` (bug/tech-debt fix pass),
  `d92a96b` (doc-sync), `071f6a3` (documentation/memory system), `6b55515` (calendar views,
  real photo backgrounds, templates page, chat suggestions).
- **Working tree: clean** (Verified via `git status` after the commit).
- **Pushed:** `720e9a2` and everything before it were pushed earlier (the user explicitly
  asked to push, and `git push origin main` was run and confirmed). **This session's new
  commit, `eb3c34a`, has not been pushed yet** — ask before pushing, per this repo's
  git-safety rules. Verify current push status with `git status`/`git log` rather than
  trusting this note, since it can go stale the moment a new commit is made.
- **Deployed to production.** `vercel --prod --yes` was run after `eb3c34a`; live smoke tests
  (curl on all 10 `/theme/*.jpg` paths, `/login`, and protected-route gating) plus Playwright
  screenshots of 3 of the 6 new palettes on the live `/login` page confirm the deployment
  matches the commit.
- **Uncommitted files:** None. **Untracked files:** None.

## Active development objective

None. The feature request ("improve Nodo, make the site livelier with more emoji, expand
from 4 themes to 10, add custom AI personalities with Nodo as just one of them, and add a
patch note") is complete:
- **10 themes total:** added Rose, Mint, Lavender, Amber, Midnight, Coral (each with a
  self-hosted photo background + full light/dark token set) alongside the original Slate,
  Ocean, Sunset, Forest.
- **Custom AI personalities:** `lib/personalities.ts` defines 5 selectable characters —
  Nodo 🌱 (original, warm/encouraging), Rex 🐺 (tough-love hype coach), Sage 🧘 (calm/unbothered),
  Turbo ⚡ (maximum hype), Professor Hoot 🦦 (nerdy/dad-joke). `lib/prompts.ts` was refactored
  so the grounding/behavior rules (date reasoning, "Actions just taken" trust, etc.) stay
  identical across every personality — only tone/voice varies. Picked via a new dropdown in
  `ChatPanel.tsx`'s header, persisted to `localStorage` (`nodability-personality`) the same
  way theme choice is.
- **Liveliness pass:** emoji added across nav links, page headers, empty/loading states,
  template cards, calendar view tabs, and a small celebration emoji on completed tasks.
- **Patch notes:** `lib/changelog.ts` got a new v0.7 entry for this work, plus a backfilled
  v0.6 entry for the previous session's calendar/real-photos/templates-page work (which had
  shipped without an in-app changelog entry — caught and fixed while doing this one).

## Last completed task

The theme/personality/liveliness feature request above, commit `eb3c34a`. Key implementation
details for a future session:
- New palettes follow the exact same pattern as the original 4 (see `app/globals.css`'s
  `--bg-art` blocks and `public/theme/SOURCES.md` for photo provenance) — copy that pattern
  for an 11th palette if one is ever added.
- The personality system's extraction step (Haiku, `lib/categorize.ts`) is **unaffected** —
  extraction stays personality-neutral by design; only the Sonnet reply persona
  (`lib/prompts.ts:buildSystemPrompt`) varies. This was a deliberate choice to avoid any
  personality voice affecting task-extraction accuracy.
- `app/api/chat/route.ts` now reads `personalityId` from the request body and falls back to
  the first personality (Nodo) if missing/invalid (`lib/personalities.ts:findPersonality`).
- The extension-based `proxy.ts` matcher fix from the previous session (excluding
  `.jpg`/`.png`/etc. broadly) meant the 6 new `/theme/*.jpg` paths worked immediately with
  **no proxy changes needed this time** — confirmed via local + live curl checks before
  considering the task done.

All changes were verified (`npx tsc --noEmit`, `npm run lint`, `npm run build` all exit 0),
committed, deployed via `vercel --prod --yes`, and smoke-tested live (curl on every new
`/theme/*.jpg` path, `/login`, protected-route gating; Playwright screenshots of Rose/light,
Midnight/dark, and Amber/dark on the live `/login` page confirming legibility).

## Current unfinished task

**None.**

## Files related to the unfinished task

N/A — no task is unfinished.

## What has already been attempted (this session, informational)

- All 6 new background photos were sourced via live Unsplash search (WebFetch), verified
  live with `curl` (200 + correct content-type) before committing to any of them, and
  visually previewed before final download — same rigor as the original 4.
- Deliberately kept the personality system's *behavioral* rules (grounding, date reasoning,
  actions-log trust) identical across all 5 personas, varying only tone — extraction accuracy
  must not depend on which character is selected.

## What currently works (Verified)

- Production deployment is live and correctly gated: `/login` → 200, all 10
  `/theme/*.jpg` paths → 200 `image/jpeg`, protected routes → 307/401 when logged out.
- `npm run build`, `npx tsc --noEmit`, and `npm run lint` all pass cleanly (exit 0).
- The theme picker shows and applies all 10 palettes (visually confirmed for 3 of the 6 new
  ones via live screenshot; the other 3 follow the identical code path so were not separately
  screenshotted).
- Two real Supabase Auth accounts exist and have been used to sign in successfully. Real
  email addresses are intentionally not recorded in this repo's docs (public GitHub remote).
- Live production data: 19 tasks, 112 chat messages, 7 ideas, 3 categories as of the original
  audit — not re-queried this session since none of this session's changes touch that data.

## What currently fails / errors observed

Nothing application-level. `npm audit` still reports 3 high-severity advisories (deliberately
deferred, see `ISSUE-006` in `CLAUDE.md`) — unchanged by this session.

## Blockers

None.

## Assumptions currently in use (Inferred, not stated anywhere explicitly)

- Personality choice, like theme choice, is per-browser (`localStorage`), not per-account —
  consistent with the existing theme-storage pattern and the app's lack of a `profiles`/
  settings table. Switching devices resets which personality is selected.
- The 5 personalities chosen (Nodo/Rex/Sage/Turbo/Professor Hoot) are a reasonable creative
  default for "a few distinct, fun voices," not a user-specified exact list — the user's
  request ("add custom ai personalities, nodo is just one of them") didn't name specific
  personas, so this was a judgment call. Revisit naming/count if the user wants something
  different.
- The app is intended to remain a 2-person tool — inferred from `shouldCreateUser: false` and
  the complete absence of any invite/signup UI.
- No test framework is intended to be added imminently — inferred only from absence.

## Temporary decisions (things done for expedience, flagged as such at the time)

- The `eslint-disable-next-line react-hooks/set-state-in-effect` comments (3 of them, from
  the prior session) remain a documented, justified suppression rather than a structural
  rewrite.
- Personality voice differences are implemented as a single flavor-text string per
  personality merged into a shared prompt template — not a fully independent prompt per
  character — to guarantee the shared behavioral rules can't drift out of sync across
  personas as new ones are added.

## Next recommended actions

1. **Ask before pushing** `eb3c34a` — everything through `720e9a2` is already pushed
   (confirmed), this new commit is local-only.
2. Consider whether the 5 personalities need adjusting (names, voices, count) — this was a
   creative default, not a user-specified list.
3. When there's bandwidth: the still-deferred `npm audit fix --force` (`ISSUE-006`) and a
   minimal test suite (see `TESTING.md`) remain open from before this session.
4. Watch real usage of life-area grouping (`TODO-001`'s discoverability fix, from a prior
   session) — still unconfirmed whether it changed real adoption.

## Verification required before continuing

- Run `git status` and `git log --oneline -3` at the start of any new session. Expect: clean
  tree, `HEAD` at `eb3c34a`, `main` ahead of `origin/main` by 1 commit (unless it's been
  pushed since this was written — always verify push status directly rather than trusting
  this file, since it changes independently of code).
- Re-run `npm run build`, `npx tsc --noEmit`, and `npm run lint` to confirm the "all pass"
  status in this file is still accurate.
- If resuming much later, re-verify Supabase migration state and re-check live row counts,
  since real usage continues independent of code changes.
