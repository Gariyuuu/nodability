# HANDOFF.md

Short, high-signal onboarding for a new Claude Code account with zero access to prior chat
history. Last updated 2026-08-06.

## Documentation and fix status: all committed, deployed, and verified

The 17-file documentation/memory system was committed (`071f6a3`, `d92a96b`), and a follow-up
session fixed every bug/tech-debt item it found (`18200e7`) — all 9 lint errors, `/api/chat`
error handling, template idempotency, an unused field, unused assets, self-hosted theme
photos, life-area-grouping discoverability, and the safe half of `npm audit`. Deployed to
production and smoke-tested live. **Not pushed** — `main` is 3 commits ahead of
`origin/main`; push only if the user asks.

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

**None.** Every previously-tracked task (`DOC-001`, `BUG-001`, `BUG-002`, `TODO-001` through
`TODO-007`) is complete. The only recorded open item is `ISSUE-006` in `CLAUDE.md` — 3
remaining `npm audit` advisories, deliberately deferred pending a dedicated review (fixing
them bumps `next` past the pinned version). This is not "the next task to do," it's an
intentional deferral — don't fix it without the user asking, and don't treat it as urgent.

## What was the previous agent doing?

A multi-session arc, all in one continuous handoff process: (1) a full documentation audit
producing 17 memory files; (2) an account-switch checkpoint that tightened them and redacted
two real email addresses that shouldn't have been in a public repo; (3) committing that
documentation set per explicit user instruction; (4) the user then said "finish all of the
work every single task including bug[s], next part, until everything i asked for is done" —
so every open bug and TODO item from the documentation audit was fixed, verified, committed
(`18200e7`), and deployed to production in one pass. See `SESSION_LOG.md` for the full
chronological history, including a bug that was introduced and caught within that same
session (the new self-hosted theme images were initially blocked by the auth gate, same class
of issue as an earlier `/icon` bug).

## What works right now?

- Production deployment is live and correctly gated (verified via curl post-deploy: `/login`
  → 200, `/icon`/`/apple-icon`/all 4 `/theme/*.jpg` → 200 with correct content types,
  protected routes → 307/401 when logged out).
- Both real user accounts can sign in and see only their own data.
- `npm run build`, `npx tsc --noEmit`, **and now `npm run lint`** all pass cleanly (exit 0) —
  this is a change from the original audit, where lint failed with 9 errors.
- Every feature listed in `FEATURES.md` as "Verified complete" has been traced end-to-end
  (UI → API → DB), not just confirmed to have files.

## What is broken?

Nothing known. Both issues flagged in the original audit (`/api/chat` error handling, the
9 lint errors) are fixed. The `/api/chat` fix was verified by code review and passing
`tsc`/`lint`/`build`, but not by forcing an actual live failure end-to-end — if you want full
confidence, temporarily break something (e.g. an invalid `ANTHROPIC_API_KEY` locally) and
confirm the chat UI shows the friendly error message rather than garbled text.

## What should I do next?

Nothing is queued. Good next steps, in rough priority order: (1) decide whether to `git push`
the 3 local commits; (2) consider adding a minimal test suite (see `TESTING.md`) — several of
this session's fixes were judgment calls that would benefit from regression coverage; (3)
check back on `categories.group_name` values in a future session to see if the life-area
grouping discoverability fix actually got real users to adopt it; (4) when there's time for a
dedicated review, evaluate `npm audit fix --force` (the `next` version bump) per `ISSUE-006`.

## Which files are most important?

- `proxy.ts` — the entire auth gate. Its matcher now excludes static-asset file extensions
  broadly (not just enumerated paths) after a bug where new `/theme/*.jpg` images were being
  blocked — see the comment in the file and `CLAUDE.md` ISSUE-004 for the story.
- `lib/auth.ts` — the API-route auth check every route depends on.
- `lib/supabase.ts` — the service-role client; never expose it to the client bundle.
- `lib/tasks.ts` / `lib/ideas.ts` / `lib/messages.ts` — the actual authorization boundary
  (manual `userId` filtering).
- `app/globals.css` — every theme token; background photos are now local
  (`/theme/*.jpg` → `public/theme/`), not hotlinked.
- `supabase/migrations/*.sql` — the schema history; forward-only, apply manually in order.

Full detail in `FILE_MAP.md`.

## Which areas are dangerous to modify?

See `CLAUDE.md`'s "DO NOT CHANGE WITHOUT REVIEW" section in full. Short version: `proxy.ts`,
`lib/supabase.ts`, any already-applied migration file, the auth pattern in every API route,
and anything involving the live production Supabase data (there is no separate staging
database — Preview deployments share the same production database, see `DEPLOYMENT.md`).
Also: don't run `npm audit fix --force` casually — it bumps `next` past the pinned version
(see `ISSUE-006`).

## Which commands should I run first?

```bash
git status                # expect: clean, HEAD at 18200e7
npx tsc --noEmit          # should pass
npm run build             # should pass
npm run lint              # should now pass too (exit 0) — this changed from the original audit
```

## How do I verify the app still works?

Use `TESTING.md`'s manual smoke-test checklist — there is no automated test suite. At
minimum: sign in with a real account, confirm the board/calendar/ideas pages load your own
data, send a chat message and confirm a task appears, toggle theme/palette and confirm
legibility (backgrounds now load from `/theme/*.jpg`, not Unsplash). Do not run destructive
database operations against production — there is no separate dev database to fall back to.

---

## Prompt for the next Claude Code account

```
Read CLAUDE.md, PROJECT_STATE.md, TASKS.md, and HANDOFF.md in full before doing anything else.

Then:
1. Run `git status` and `git log --oneline -10`. Expect: a clean working tree, HEAD at
   18200e7 ("Fix all tracked bugs/tech-debt: lint errors, chat error handling, and more"). If
   you see anything else (uncommitted files, a different HEAD), stop and reconcile before
   proceeding — the docs may be describing a state that has since changed.
2. Run `npx tsc --noEmit`, `npm run build`, and `npm run lint` — all three should pass (exit
   0). If lint fails, something regressed since this handoff; investigate before assuming the
   docs are simply stale.
3. Summarize your understanding of the project back to the user in a few sentences before
   editing anything, so any misunderstanding surfaces immediately.
4. Identify any contradictions between what these memory files claim and what you actually
   observe in the current code/config/live systems — call them out explicitly rather than
   silently trusting or silently overriding the docs.
5. Continue whatever task the user gives you without redoing the authentication, theming,
   calendar-views, templates-page, or bug-fix work already completed (see FEATURES.md and
   TASKS.md's "Recently completed" for what's already done) — unless the user is specifically
   asking you to change one of those.
6. Preserve the existing architecture (service-role client + manual userId filtering,
   magic-link-only auth, the semantic theme-token system, the forward-only manual-migration
   workflow) unless there's a strong, explicitly-discussed reason to change it — these are
   documented in DECISIONS.md along with why they were chosen.
7. Don't run `npm audit fix --force` or otherwise bump `next` past 16.2.11 without explicit
   discussion — see ISSUE-006 in CLAUDE.md.
8. After completing any meaningful work, update PROJECT_STATE.md, TASKS.md, and
   SESSION_LOG.md (append, don't overwrite), plus whichever feature/architecture/API/
   database/testing/deployment/security doc your change affects, per the "Permanent rules"
   section at the bottom of CLAUDE.md. Never commit or push without explicit instruction.
```
