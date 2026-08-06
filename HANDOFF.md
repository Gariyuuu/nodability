# HANDOFF.md

Short, high-signal onboarding for a new Claude Code account with zero access to prior chat
history. Last updated 2026-08-06.

## Status: new features shipped, deployed, one commit not yet pushed

Latest work: 6 new theme palettes (10 total), a multi-personality AI chat system (Nodo is now
one of 5 selectable characters), and a liveliness/emoji pass — commit `eb3c34a`. Deployed to
production and verified live. **Everything through `720e9a2` is pushed; `eb3c34a` is not** —
ask the user before pushing it.

## What is this project?

Nodability — a chat-driven personal task organizer for 2 specific people (a couple), built
with Next.js 16 + Supabase + the Anthropic API. It's live at
**https://nodability.vercel.app**, in real daily use, with real data (19 tasks, 112 messages,
7 ideas, 3 categories as of the original audit).

## What should I read first?

In this order:
1. **`CLAUDE.md`** — the full operating manual. Read it completely before touching code.
2. **`PROJECT_STATE.md`** — exact stopping point, what works, what doesn't.
3. **`TASKS.md`** — the active queue (currently empty except one deliberately-deferred item).
4. Whichever of `ARCHITECTURE.md` / `FEATURES.md` / `DATABASE.md` / `API_REFERENCE.md` /
   `UI_SYSTEM.md` / `SECURITY.md` / `TESTING.md` / `DEPLOYMENT.md` is relevant to what you're
   about to do.

## What is the current task?

**None.** The most recent feature request (10 themes, custom AI personalities, liveliness
pass) is complete, deployed, and verified — commit `eb3c34a`. The only recorded open item is
`ISSUE-006` in `CLAUDE.md` (3 remaining `npm audit` advisories, deliberately deferred). Not
urgent, not a task to pick up unprompted.

## What was the previous agent doing?

A long handoff arc: (1) documentation audit → 17 memory files; (2) account-switch checkpoint;
(3) fixed every bug/tech-debt item found (`18200e7`), pushed everything through `720e9a2` per
explicit user instruction; (4) the user then asked to make the app "livelier," expand from 4
themes to 10, and add multiple selectable AI personalities (Nodo becomes just one of several).
Built and shipped all of that as commit `eb3c34a` — deployed to production, verified live, but
**not yet pushed to GitHub** (only a local commit was made; pushing wasn't part of this
request). See `SESSION_LOG.md` for full chronological detail.

## What works right now?

- Production deployment is live and correctly gated (verified via curl post-deploy: `/login`
  → 200, all 10 `/theme/*.jpg` paths → 200 `image/jpeg`, protected routes → 307/401 when
  logged out).
- Both real user accounts can sign in and see only their own data.
- `npm run build`, `npx tsc --noEmit`, `npm run lint` all pass cleanly (exit 0).
- The theme picker offers all 10 palettes; the chat panel offers all 5 personalities, with
  choice persisted to `localStorage` for both.

## What is broken?

Nothing known. The two issues flagged in the original audit (`/api/chat` error handling, lint
errors) were fixed in a prior session and remain fixed. This session's additions were verified
by passing checks + live smoke tests + Playwright screenshots of 3 of the 6 new palettes (not
all 6 individually screenshotted, since they follow an identical code path to the 3 that were
checked).

## What should I do next?

Nothing is queued. If picking up fresh work: (1) ask whether to push `eb3c34a`; (2) consider
whether the 5 AI personalities (names/voices/count) match what the user actually wants — they
were a creative default, not a user-specified exact list, since the request just said "add
custom ai personalities, nodo is just one of them" without naming the others; (3) the
longer-standing deferred items (`ISSUE-006`'s `npm audit` advisories, a minimal test suite)
are still open from before this session.

## Which files are most important?

- `proxy.ts` — the entire auth gate. Its matcher excludes static-asset file extensions
  broadly, which is why the 6 new `/theme/*.jpg` files worked immediately with no proxy
  changes needed this session (a prior session had to add this after a bug with `/icon`).
- `lib/personalities.ts` — the 5 AI character definitions (new this session).
- `lib/prompts.ts` — `buildSystemPrompt(personality)` merges a personality's voice into the
  shared behavioral rules; edit the shared rules here, edit voice/tone in
  `lib/personalities.ts`.
- `lib/auth.ts` — the API-route auth check every route depends on.
- `lib/supabase.ts` — the service-role client; never expose it to the client bundle.
- `lib/tasks.ts` / `lib/ideas.ts` / `lib/messages.ts` — the actual authorization boundary
  (manual `userId` filtering).
- `app/globals.css` — all 10 theme tokens; every background photo is local
  (`/theme/*.jpg` → `public/theme/`), not hotlinked.
- `supabase/migrations/*.sql` — the schema history; forward-only, apply manually in order.

Full detail in `FILE_MAP.md`.

## Which areas are dangerous to modify?

See `CLAUDE.md`'s "DO NOT CHANGE WITHOUT REVIEW" section in full. Short version: `proxy.ts`,
`lib/supabase.ts`, any already-applied migration file, the auth pattern in every API route,
and anything involving the live production Supabase data (there is no separate staging
database — Preview deployments share the same production database, see `DEPLOYMENT.md`).
Also: don't run `npm audit fix --force` casually (see `ISSUE-006`), and don't change
`lib/prompts.ts`'s shared `CORE_RULES` block without checking it against all 5 personalities
— that block is what keeps extraction/confirmation accuracy consistent regardless of which
character is chosen.

## Which commands should I run first?

```bash
git status                # expect: clean, HEAD at eb3c34a, main ahead of origin/main by 1
npx tsc --noEmit          # should pass
npm run build             # should pass
npm run lint              # should pass (exit 0)
```

## How do I verify the app still works?

Use `TESTING.md`'s manual smoke-test checklist — there is no automated test suite. At
minimum: sign in with a real account, confirm the board/calendar/ideas pages load your own
data, send a chat message (try switching the AI personality first) and confirm a task
appears, cycle through a few of the 10 theme palettes and confirm legibility. Do not run
destructive database operations against production — there is no separate dev database to
fall back to.

---

## Prompt for the next Claude Code account

```
Read CLAUDE.md, PROJECT_STATE.md, TASKS.md, and HANDOFF.md in full before doing anything else.

Then:
1. Run `git status` and `git log --oneline -10`. Expect: a clean working tree, HEAD at
   eb3c34a ("Add 10 themes total, custom AI personalities, and a livelier UI"), main ahead of
   origin/main by 1 commit (this commit hasn't been pushed). If you see anything else
   (uncommitted files, a different HEAD), stop and reconcile before proceeding.
2. Run `npx tsc --noEmit`, `npm run build`, and `npm run lint` — all three should pass (exit
   0). If any fail, something regressed since this handoff; investigate before assuming the
   docs are simply stale.
3. Summarize your understanding of the project back to the user in a few sentences before
   editing anything, so any misunderstanding surfaces immediately.
4. Identify any contradictions between what these memory files claim and what you actually
   observe in the current code/config/live systems — call them out explicitly rather than
   silently trusting or silently overriding the docs.
5. Continue whatever task the user gives you without redoing the authentication, theming,
   calendar-views, templates-page, bug-fix, or personality-system work already completed (see
   FEATURES.md and TASKS.md's "Recently completed" for what's already done) — unless the user
   is specifically asking you to change one of those.
6. Preserve the existing architecture (service-role client + manual userId filtering,
   magic-link-only auth, the semantic theme-token system, the shared-rules-plus-per-persona-
   voice prompt structure, the forward-only manual-migration workflow) unless there's a
   strong, explicitly-discussed reason to change it — these are documented in DECISIONS.md
   along with why they were chosen.
7. Don't run `npm audit fix --force` or otherwise bump `next` past 16.2.11 without explicit
   discussion — see ISSUE-006 in CLAUDE.md.
8. After completing any meaningful work, update PROJECT_STATE.md, TASKS.md, and
   SESSION_LOG.md (append, don't overwrite), plus whichever feature/architecture/API/
   database/testing/deployment/security doc your change affects, per the "Permanent rules"
   section at the bottom of CLAUDE.md. Never commit or push without explicit instruction.
```
