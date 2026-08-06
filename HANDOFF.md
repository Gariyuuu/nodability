# HANDOFF.md

Short, high-signal onboarding for a new Claude Code account with zero access to prior chat
history. This audit was performed 2026-08-06, and reconfirmed by a follow-up account-switch
checkpoint the same day (no code changes in between — the checkpoint only tightened and
re-verified the documentation itself).

## Documentation set status: committed

The 17-file documentation/memory system (this file included) was committed as `071f6a3` —
"Add permanent documentation/memory system for account-switch handoff" — per the user's
explicit instruction ("commit them all"). The working tree should be clean. **Not pushed** —
`main` is ahead of `origin/main` by 1 commit; push only if the user separately asks for it.

## What is this project?

Nodability — a chat-driven personal task organizer for 2 specific people (a couple), built
with Next.js 16 + Supabase + the Anthropic API. It's live at
**https://nodability.vercel.app**, in real daily use, with real data (19 tasks, 112 messages,
7 ideas, 3 categories as of this audit).

## What should I read first?

In this order:
1. **`CLAUDE.md`** — the full operating manual. Read it completely before touching code.
2. **`PROJECT_STATE.md`** — exact stopping point, what works, what doesn't.
3. **`TASKS.md`** — the active queue. `BUG-001` and `BUG-002` are the top two items.
4. Whichever of `ARCHITECTURE.md` / `FEATURES.md` / `DATABASE.md` / `API_REFERENCE.md` /
   `UI_SYSTEM.md` / `SECURITY.md` / `TESTING.md` / `DEPLOYMENT.md` is relevant to what you're
   about to do.

## What is the current task?

**None.** `DOC-001` (see `TASKS.md`) is complete and committed. No product/feature task is in
progress. The next recommended task is `BUG-001` (fix 9 `npm run lint` errors) or `BUG-002`
(harden `/api/chat`'s error handling) — see `TASKS.md`.

## What was the previous agent doing?

Three back-to-back documentation-only sessions, no application code changes in any of them:
(1) the original documentation-handoff audit — created all 17 memory files listed in
`CLAUDE.md`'s header; (2) a follow-up account-switch checkpoint (same day) that re-verified
git state, fixed two inaccuracies caught during self-review (an overclaim that every page is
a Client Component, and an incomplete claim about `console.*` usage), and found/redacted two
real personal email addresses that had been written into `DATABASE.md`/`PROJECT_STATE.md`
(this repo pushes to a public GitHub remote, so real third-party emails shouldn't sit in it);
(3) committing all 17 files as `071f6a3` per the user's explicit "commit them all" instruction,
followed by updating the docs' own "current task" language to reflect that completion. Before
any of those, the previous *coding* session added real Unsplash photo theme backgrounds,
Week/Month/Year calendar views, life-area grouping, a `/templates` page, and chat suggestion
chips (commit `6b55515`). See `SESSION_LOG.md` for the full chronological history.

## What works right now?

- Production deployment is live and correctly gated (verified via curl: `/login` → 200,
  protected routes → 307/401 when logged out).
- Both real user accounts can sign in and see only their own data.
- `npm run build` and `npx tsc --noEmit` both pass cleanly.
- Every feature listed in `FEATURES.md` as "Verified complete" has been traced end-to-end
  (UI → API → DB) during this audit, not just confirmed to have files.

## What is broken?

Nothing is confirmed broken in production use. Two things are **logically certain but not yet
observed as an actual incident:**
1. `app/api/chat/route.ts` has no error handling past its auth check — a Haiku extraction
   failure or Supabase write error would surface as garbled text in the chat UI instead of a
   clean error message (`CLAUDE.md` ISSUE-002).
2. `npm run lint` fails with 9 pre-existing errors (`CLAUDE.md` ISSUE-001) — doesn't affect
   runtime behavior, but it's the only "red" signal in the repo.

## What should I do next?

Per `PROJECT_STATE.md`'s recommended next actions: fix `BUG-001` and `BUG-002` first (both in
`TASKS.md`). After that, `TASKS.md`'s Medium/Low priority sections have several small,
well-scoped items (template idempotency, self-hosting theme images, deciding the fate of
life-area grouping).

## Which files are most important?

- `proxy.ts` — the entire auth gate.
- `lib/auth.ts` — the API-route auth check every route depends on.
- `lib/supabase.ts` — the service-role client; never expose it to the client bundle.
- `lib/tasks.ts` / `lib/ideas.ts` / `lib/messages.ts` — the actual authorization boundary
  (manual `userId` filtering).
- `app/globals.css` — every theme token and the real photo background URLs.
- `supabase/migrations/*.sql` — the schema history; forward-only, apply manually in order.

Full detail in `FILE_MAP.md`.

## Which areas are dangerous to modify?

See `CLAUDE.md`'s "DO NOT CHANGE WITHOUT REVIEW" section in full. Short version: `proxy.ts`,
`lib/supabase.ts`, any already-applied migration file, the auth pattern in every API route,
and anything involving the live production Supabase data (there is no separate staging
database — Preview deployments share the same production database, see `DEPLOYMENT.md`).

## Which commands should I run first?

```bash
git status                # expect: clean, HEAD at 071f6a3
npx tsc --noEmit          # should pass
npm run build             # should pass
npm run lint              # currently fails with 9 known errors — confirm you haven't added new ones
```

## How do I verify the app still works?

Use `TESTING.md`'s manual smoke-test checklist — there is no automated test suite. At
minimum: sign in with a real account, confirm the board/calendar/ideas pages load your own
data, send a chat message and confirm a task appears, toggle theme/palette and confirm
legibility. Do not run destructive database operations against production — there is no
separate dev database to fall back to.

---

## Prompt for the next Claude Code account

```
Read CLAUDE.md, PROJECT_STATE.md, TASKS.md, and HANDOFF.md in full before doing anything else.

Then:
1. Run `git status` and `git log --oneline -10`. Expect: a clean working tree, HEAD at
   071f6a3 ("Add permanent documentation/memory system for account-switch handoff"). If you
   see anything else (uncommitted files, a different HEAD), stop and reconcile before
   proceeding — the docs may be describing a state that has since changed.
2. Run `npx tsc --noEmit`, `npm run build`, and `npm run lint` to verify the documented
   pass/fail state is still accurate (build and type-check should pass; lint should fail
   with exactly the 9 errors described in CLAUDE.md's Known Issues section — if the count or
   nature of lint errors has changed, note that as stale documentation to fix).
3. Summarize your understanding of the project back to the user in a few sentences before
   editing anything, so any misunderstanding surfaces immediately.
4. Identify any contradictions between what these memory files claim and what you actually
   observe in the current code/config/live systems — call them out explicitly rather than
   silently trusting or silently overriding the docs.
5. Continue whatever task the user gives you without redoing the authentication, theming,
   calendar-views, or templates-page work already completed (see FEATURES.md for what's
   already done) — unless the user is specifically asking you to change one of those.
6. Preserve the existing architecture (service-role client + manual userId filtering,
   magic-link-only auth, the semantic theme-token system, the forward-only manual-migration
   workflow) unless there's a strong, explicitly-discussed reason to change it — these are
   documented in DECISIONS.md along with why they were chosen.
7. After completing any meaningful work, update PROJECT_STATE.md, TASKS.md, and
   SESSION_LOG.md (append, don't overwrite), plus whichever feature/architecture/API/
   database/testing/deployment/security doc your change affects, per the "Permanent rules"
   section at the bottom of CLAUDE.md. Never commit or push without explicit instruction.
```
