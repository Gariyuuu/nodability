# HANDOFF.md

Short, high-signal onboarding for a new Claude Code account with zero access to prior chat
history. Last updated 2026-08-07 (final-transfer-checkpoint audit); re-verified and corrected
2026-08-16 (documentation sweep, no feature work) — see the block immediately below.

## 2026-08-24 update [Verified] — newest block, read first

A feature session made the task board directly manipulable, at the user's request: tasks can
now be **dragged** between and within category boxes, and **edited by hand** (title, list,
dates, time) instead of only through the chat assistant — plus hand-adding tasks, creating
empty lists, and deleting empty ones. Rewrote `components/TaskBoard.tsx`, extended
`lib/tasks.ts` and the tasks/categories API routes, added `app/api/tasks/reorder/route.ts` and
migration `008_task_sort_order.sql`.

**The one thing a next session must know:** **migration `008` has not been run** against the live database. The code deliberately
   tolerates that (it probes for `tasks.sort_order` and drops it from writes when absent), so
   nothing breaks — but within-list drag order won't persist until a human pastes the SQL into
   the Supabase SQL Editor. That's `T-002` in `TASKS.md`, and the one code path that could not
   be verified before shipping. Everything else was: `tsc`/`lint`/`build` clean, all new
   endpoints 401 when logged out, and 16/16 real-browser interaction checks.

See `PROJECT_STATE.md`'s 2026-08-24 block, `DECISIONS.md` DEC-014, and `FEATURES.md` §2.

## 2026-08-16 update [Verified]

Two more feature commits landed since 2026-08-07, both merged to `main` (HEAD `28f4fbb`,
tree clean): OpenGraph image + `robots.txt` + a `proxy.ts` allowlist fix (`fff3db2`/`b9ca352`,
live-verified via `curl` against production during this sweep), and an animated `ThinkingOrb`
chat-composing indicator (`217373b`/`28f4fbb`, **not** live-verified — needs an authenticated
session, now current task `T-001` in `TASKS.md`). Full detail in `PROJECT_STATE.md`'s
2026-08-16 block. Everything else below this point is the original 2026-08-07 account.

## Status: new features shipped, deployed, and pushed

Latest work: an AI-provider swap replacing the direct Anthropic API with a self-hosted
OpenAI-compatible platform — commit `b4fb289`. Confirmed live in production during this
checkpoint audit (`AI_PLATFORM_API_KEY` present in Vercel Production, newest Production
deployment created after the commit). **Everything through `b4fb289` is pushed to
`origin/main`.** Before that: an Obsidian-style linked notes system (`/notes`) and custom theme
background image uploads — commit `f8e46ef`, documented as of `620fa67`.

**Correction found during this checkpoint:** `PROJECT_STATE.md` and `TASKS.md` had described
the AI-provider swap as uncommitted/unpushed/undeployed — that was true only for the moment
those files were written; the swap was committed immediately afterward and is now live. Both
files have been corrected. If you see similar "uncommitted work" language anywhere else in
these docs going forward, verify against real `git`/`vercel` state before trusting it.

## What is this project?

Nodability — a chat-driven personal task organizer for 2 specific people (a couple), built
with Next.js 16 + Supabase + a self-hosted OpenAI-compatible AI platform (formerly the direct
Anthropic API — see `DECISIONS.md` DEC-013). It's live at **https://nodability.vercel.app**,
in real daily use, with real data (19 tasks, 112 messages, 7 ideas, 3 categories, 0 notes as of
the original audit — not re-counted at this checkpoint since no DB access was available).

## What should I read first?

In this order:
1. **`CLAUDE.md`** — the full operating manual. Read it completely before touching code.
2. **`PROJECT_STATE.md`** — exact stopping point, what works, what doesn't.
3. **`TASKS.md`** — the active queue (currently empty except one deliberately-deferred item).
4. Whichever of `ARCHITECTURE.md` / `FEATURES.md` / `DATABASE.md` / `API_REFERENCE.md` /
   `UI_SYSTEM.md` / `SECURITY.md` / `TESTING.md` / `DEPLOYMENT.md` is relevant to what you're
   about to do.

## What is the current task?

**None.** The most recent work (AI-provider swap, Anthropic → self-hosted platform) is
complete, committed, pushed, and deployed — commit `b4fb289`. Before that: Obsidian-style
notes + custom theme background uploads, commit `f8e46ef`. The only recorded open item is
`ISSUE-006` in `CLAUDE.md` (3 remaining `npm audit` advisories, deliberately deferred). Not
urgent, not a task to pick up unprompted.

## What was the previous agent doing?

A long handoff arc: (1) documentation audit → 17 memory files; (2) account-switch checkpoint;
(3) fixed every bug/tech-debt item found (`18200e7`), pushed everything through `720e9a2` per
explicit user instruction; (4) expanded theming from 4 to 10 palettes and added a
multi-personality AI chat system plus a liveliness pass (`eb3c34a`); (5) the user then asked
to add custom image uploads and an "Obsidian-style neural network" note-linking system for
studying. After 3 clarifying questions (all answered with the recommended option), built and
shipped: a `/notes` page with `[[wikilink]]`-style note connections and a force-directed graph
view, plus an 11th "Custom" theme palette backed by a real Supabase Storage upload. Deployed
as commit `f8e46ef` — verified live and pushed to `origin/main`, along with a follow-up
documentation commit (`620fa67`); (6) a follow-up session cleaned up superseded custom
theme-background uploads on replace (`e91699f`); (7) a provider-swap session replaced the
direct Anthropic API with a self-hosted OpenAI-compatible platform for both the chat reply and
task-extraction call sites, committed as `b4fb289` — its own `PROJECT_STATE.md`/`TASKS.md`
entries said this was left uncommitted, which was stale by the time of (8); (8) this
2026-08-07 checkpoint audit re-verified real git/Vercel state, found and corrected that
staleness, re-ran `tsc`/`lint`/`build` (all clean), scanned for secrets (none found beyond
placeholders), and refreshed this section. See `SESSION_LOG.md` for full chronological detail.

## What works right now?

- Production deployment is live and correctly gated (verified via curl post-deploy: `/notes`
  → 307, `/api/notes` → 401, `/api/theme-image` POST → 401, all when logged out).
- Both real user accounts can sign in and see only their own data.
- `npm run build`, `npx tsc --noEmit`, `npm run lint` all pass cleanly (exit 0).
- The `notes` table and `theme-uploads` Storage bucket exist in production and behave
  correctly (unique-title constraint, public-read bucket) — verified with real inserted rows/
  uploaded files, not just "the migration ran without error."
- The theme picker offers 10 curated palettes plus a "Custom" upload slot; the chat panel
  offers 5 personalities — both persisted to `localStorage`.

## What is broken?

Nothing known. This session's additions were verified by passing checks + real end-to-end
Storage/database operations + live route-gating curl checks. **Not yet verified**: the note
graph's actual visual rendering (node/edge positions on screen) — only the underlying linking
and layout-math logic were confirmed directly against the database. Worth a manual look once
there are real notes to render.

## What should I do next?

Nothing is queued. If picking up fresh work: (1) try the notes/graph feature with real notes
and eyeball the visual layout; (2) the longer-standing deferred items (`ISSUE-006`'s
`npm audit` advisories, a minimal test suite) are still open from before this session.

## Which files are most important?

- `proxy.ts` — the entire auth gate. Its matcher excludes static-asset file extensions
  broadly; `/notes` and `/api/notes`/`/api/theme-image` are ordinary protected routes, no
  matcher changes were needed for them.
- `lib/notes.ts` — notes CRUD plus `extractWikilinkTitles`/`buildNoteGraph`, the whole
  linking mechanism. No stored edges table — links resolve by title match at read time.
- `lib/graph-layout.ts` — hand-rolled force-directed layout for the note graph, no new
  dependency.
- `app/api/theme-image/route.ts` and `supabase/migrations/007_theme_uploads_bucket.sql` — the
  precedent to copy for any future file-upload feature or Storage bucket (this app's first).
- `lib/theme.ts` / `components/theme/ThemeProvider.tsx` — the "Custom" palette applies its
  `--bg-art` via an inline JS-set CSS property (per-user data), unlike the 10 curated
  palettes' static `app/globals.css` rules. See `DECISIONS.md` DEC-012.
- `lib/auth.ts` — the API-route auth check every route depends on.
- `lib/supabase.ts` — the service-role client; never expose it to the client bundle.
- `lib/tasks.ts` / `lib/ideas.ts` / `lib/messages.ts` / `lib/notes.ts` — the actual
  authorization boundary (manual `userId` filtering).
- `supabase/migrations/*.sql` — the schema history; forward-only, apply manually in order
  (currently through `007`).

Full detail in `FILE_MAP.md`.

## Which areas are dangerous to modify?

See `CLAUDE.md`'s "DO NOT CHANGE WITHOUT REVIEW" section in full. Short version: `proxy.ts`,
`lib/supabase.ts`, any already-applied migration file, the auth pattern in every API route,
and anything involving the live production Supabase data (there is no separate staging
database — Preview deployments share the same production database, see `DEPLOYMENT.md`).
Also: don't run `npm audit fix --force` casually (see `ISSUE-006`); `app/api/theme-image/
route.ts` trusts the client-reported file MIME type rather than inspecting bytes (acceptable
at 2-trusted-user scale, see `SECURITY.md`); notes' `[[Wikilink]]` resolution is title-based
with no stored edges (renaming a note breaks old links, by design — see `DECISIONS.md`
DEC-011).

## Which commands should I run first?

```bash
git status                # expect: clean, HEAD at b4fb289, main up to date with origin/main
npx tsc --noEmit          # should pass
npm run build             # should pass
npm run lint              # should pass (exit 0)
```

## How do I verify the app still works?

Use `TESTING.md`'s manual smoke-test checklist — there is no automated test suite. At
minimum: sign in with a real account, confirm the board/calendar/ideas/notes pages load your
own data, send a chat message (try switching the AI personality first) and confirm a task
appears, cycle through a few theme palettes (including uploading a custom one) and confirm
legibility, create two notes and link them with `[[Note Title]]` and check the graph view.
Do not run destructive database operations against production — there is no separate dev
database to fall back to.

---

## Prompt for the next Claude Code account

```
Read CLAUDE.md, PROJECT_STATE.md, TASKS.md, and HANDOFF.md in full before doing anything else.

Then:
1. Run `git status` and `git log --oneline -10`. Expect: a clean working tree, HEAD at
   b4fb289 ("Switch chat + task extraction from Anthropic to self-hosted goat-ai-platform"),
   main up to date with origin/main (everything through b4fb289 has been pushed). If you see
   anything else (uncommitted files, a different HEAD, unpushed commits), stop and reconcile
   before proceeding — and note that a prior checkpoint (2026-08-07) found this exact kind of
   drift: PROJECT_STATE.md/TASKS.md had described b4fb289's work as uncommitted when it had
   actually already landed, simply because the docs weren't updated after the commit happened.
   Don't assume any "uncommitted"/"not deployed" claim in these docs is current — verify with
   real `git`/`vercel` commands first.
2. Run `npx tsc --noEmit`, `npm run build`, and `npm run lint` — all three should pass (exit
   0). If any fail, something regressed since this handoff; investigate before assuming the
   docs are simply stale.
3. If your task touches AI calls, deployment, or env vars: `AI_PLATFORM_API_KEY` is set in
   Vercel **Production** but **not Preview** (confirmed via `vercel env ls` at the 2026-08-07
   checkpoint) — a real gap if a Preview deployment is ever created. `ANTHROPIC_API_KEY` is
   still present in both scopes but unused by the app now (legacy, safe to remove later).
4. Summarize your understanding of the project back to the user in a few sentences before
   editing anything, so any misunderstanding surfaces immediately.
5. Identify any contradictions between what these memory files claim and what you actually
   observe in the current code/config/live systems — call them out explicitly rather than
   silently trusting or silently overriding the docs.
6. Continue whatever task the user gives you without redoing the authentication, theming,
   calendar-views, templates-page, bug-fix, personality-system, notes/custom-image, or
   AI-provider-swap work already completed (see FEATURES.md and TASKS.md's "Recently
   completed" for what's already done) — unless the user is specifically asking you to change
   one of those.
7. Preserve the existing architecture (service-role client + manual userId filtering,
   magic-link-only auth, the semantic theme-token system, the shared-rules-plus-per-persona-
   voice prompt structure, the forward-only manual-migration workflow, the no-stored-edges
   dynamic wikilink resolution, the OpenAI-compatible `lib/ai-client.ts` pointed at the
   self-hosted platform) unless there's a strong, explicitly-discussed reason to change it —
   these are documented in DECISIONS.md along with why they were chosen.
8. Don't run `npm audit fix --force` or otherwise bump `next` past 16.2.11 without explicit
   discussion — see ISSUE-006 in CLAUDE.md.
9. After completing any meaningful work, update PROJECT_STATE.md, TASKS.md, and
   SESSION_LOG.md (append, don't overwrite), plus whichever feature/architecture/API/
   database/testing/deployment/security doc your change affects, per the "Permanent rules"
   section at the bottom of CLAUDE.md. Never commit or push without explicit instruction.
```
