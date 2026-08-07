# HANDOFF.md

Short, high-signal onboarding for a new Claude Code account with zero access to prior chat
history. Last updated 2026-08-06.

## Status: new features shipped, deployed, three commits not yet pushed

Latest work: an Obsidian-style linked notes system (`/notes`) and custom theme background
image uploads — commit `f8e46ef`. Deployed to production and verified live. **Everything
through `720e9a2` is pushed; `eb3c34a`, `49cd6e4`, and `f8e46ef` are not** — ask the user
before pushing them.

## What is this project?

Nodability — a chat-driven personal task organizer for 2 specific people (a couple), built
with Next.js 16 + Supabase + the Anthropic API. It's live at
**https://nodability.vercel.app**, in real daily use, with real data (19 tasks, 112 messages,
7 ideas, 3 categories, 0 notes as of the original audit plus this session's additions).

## What should I read first?

In this order:
1. **`CLAUDE.md`** — the full operating manual. Read it completely before touching code.
2. **`PROJECT_STATE.md`** — exact stopping point, what works, what doesn't.
3. **`TASKS.md`** — the active queue (currently empty except one deliberately-deferred item).
4. Whichever of `ARCHITECTURE.md` / `FEATURES.md` / `DATABASE.md` / `API_REFERENCE.md` /
   `UI_SYSTEM.md` / `SECURITY.md` / `TESTING.md` / `DEPLOYMENT.md` is relevant to what you're
   about to do.

## What is the current task?

**None.** The most recent feature request (Obsidian-style notes + custom theme background
uploads) is complete, deployed, and verified — commit `f8e46ef`. The only recorded open item
is `ISSUE-006` in `CLAUDE.md` (3 remaining `npm audit` advisories, deliberately deferred). Not
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
as commit `f8e46ef` — verified live, but **not yet pushed to GitHub** (along with the two
prior local commits `eb3c34a`/`49cd6e4`). See `SESSION_LOG.md` for full chronological detail.

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

Nothing is queued. If picking up fresh work: (1) ask whether to push `eb3c34a`, `49cd6e4`, and
`f8e46ef`; (2) try the notes/graph feature with real notes and eyeball the visual layout;
(3) consider adding cleanup for superseded custom theme uploads (old Storage objects are never
deleted when replaced — see `TASKS.md` technical debt); (4) the longer-standing deferred items
(`ISSUE-006`'s `npm audit` advisories, a minimal test suite) are still open from before this
session.

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
  palettes' static `globals.css` rules. See `DECISIONS.md` DEC-012.
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
git status                # expect: clean, HEAD at f8e46ef, main ahead of origin/main by 3
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
   f8e46ef ("Add Obsidian-style linked notes and custom theme background uploads"), main
   ahead of origin/main by 3 commits (none of eb3c34a/49cd6e4/f8e46ef have been pushed). If
   you see anything else (uncommitted files, a different HEAD), stop and reconcile before
   proceeding.
2. Run `npx tsc --noEmit`, `npm run build`, and `npm run lint` — all three should pass (exit
   0). If any fail, something regressed since this handoff; investigate before assuming the
   docs are simply stale.
3. Summarize your understanding of the project back to the user in a few sentences before
   editing anything, so any misunderstanding surfaces immediately.
4. Identify any contradictions between what these memory files claim and what you actually
   observe in the current code/config/live systems — call them out explicitly rather than
   silently trusting or silently overriding the docs.
5. Continue whatever task the user gives you without redoing the authentication, theming,
   calendar-views, templates-page, bug-fix, personality-system, or notes/custom-image work
   already completed (see FEATURES.md and TASKS.md's "Recently completed" for what's already
   done) — unless the user is specifically asking you to change one of those.
6. Preserve the existing architecture (service-role client + manual userId filtering,
   magic-link-only auth, the semantic theme-token system, the shared-rules-plus-per-persona-
   voice prompt structure, the forward-only manual-migration workflow, the no-stored-edges
   dynamic wikilink resolution) unless there's a strong, explicitly-discussed reason to change
   it — these are documented in DECISIONS.md along with why they were chosen.
7. Don't run `npm audit fix --force` or otherwise bump `next` past 16.2.11 without explicit
   discussion — see ISSUE-006 in CLAUDE.md.
8. After completing any meaningful work, update PROJECT_STATE.md, TASKS.md, and
   SESSION_LOG.md (append, don't overwrite), plus whichever feature/architecture/API/
   database/testing/deployment/security doc your change affects, per the "Permanent rules"
   section at the bottom of CLAUDE.md. Never commit or push without explicit instruction.
```
