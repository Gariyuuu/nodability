# ROADMAP.md

No time estimates exist anywhere in this repository, so none are invented here. Priority,
difficulty, and risk are qualitative judgments made during this audit (Inferred), not
figures found in the repo.

## Current milestone

**Stabilization of the calendar/theming/templates feature pass.** The features themselves are
built and deployed; what remains is fixing the lint errors and the chat error-handling gap
surfaced during this audit.

- Objective: `npm run lint` passes; `/api/chat` fails gracefully.
- Priority: High
- Status: Not started
- Dependencies: None
- Difficulty: Low-medium
- Risk: Low
- Definition of done: `npm run lint` exits 0; a forced chat-route error produces a clean error
  response and a friendly UI message, verified manually.

## Next milestone

**Make life-area grouping actually useful, or retire the ambition.** The mechanism (DB column,
API, cycling dot, calendar filter/coloring) is fully built but unused in real data.

- Objective: Either redesign the group-setting UI to be discoverable enough that the two real
  users actually adopt it, or explicitly decide not to invest further here.
- Priority: Medium
- Status: Not started (needs a product decision first, not just code)
- Dependencies: None
- Difficulty: Low (if redesigning the UI) to N/A (if deprioritizing)
- Risk: Low
- Definition of done: Either (a) at least one real category has a non-`'other'` group set by
  an actual user within some observed period, or (b) an explicit `DECISIONS.md` entry records
  the choice to deprioritize.

## MVP completion

**Inferred as already reached** — the app has been in real daily use by 2 people with live
data (19 tasks, 112 messages, 7 ideas, 3 categories at audit time) since before this audit.
There is no repo-stated "MVP definition" to check against; this label reflects that the core
capture → organize → review loop (chat capture, task board, week/month/year views, ideas) is
fully functional end-to-end.

## Post-MVP (candidates, not commitments)

- Fix `/api/chat` error handling and lint errors (see Current milestone above).
- Add basic automated tests, starting with the manual smoke-test checklist in
  [TESTING.md](TESTING.md) converted into Playwright scripts.
- Add rate limiting to `/api/chat` to bound AI-platform cost exposure (formerly Anthropic;
  see `DECISIONS.md` DEC-013).
- Self-host the 4 theme background photos instead of hotlinking Unsplash (`TASKS.md` TODO-003).
- Make template application idempotent (`TASKS.md` TODO-002).
- Decide whether `is_recall_query` should drive different chat behavior or be removed
  (`TASKS.md` TODO-004).

## Long-term ideas (Inferred from architecture gaps, not stated anywhere in the repo)

- Real-time sync between the two users' sessions (currently: no live updates, no Supabase
  Realtime subscription — each user only sees fresh data on their own reload/refetch).
- An in-app way to invite a 3rd account, if the "exactly 2 people" scope ever changes
  (currently requires running `scripts/create-users.mjs` manually).
- Add/edit tasks directly from the Month/Year calendar grid (deferred — see `DECISIONS.md`
  DEC-004).
- A `profiles` table so preferences like theme could sync across a user's own devices instead
  of being per-browser `localStorage`.

## Optional improvements

- Delete the unused `public/*.svg` scaffold assets and `app/favicon.ico` (cosmetic cleanup,
  `TASKS.md` TODO-005/006).
- Add a formatter (Prettier or similar) — none is configured today.
- Mobile-responsive layout for the 3-column main board (`app/page.tsx`) — currently a fixed
  desktop layout.

## Out-of-scope (Inferred from the app's deliberate 2-person, invite-only design)

- Public signup / multi-tenant scale-out.
- Payments/billing (the app itself has none; only the underlying AI platform usage, and
  Supabase, incur any cost).
- Team/role-based permissions.
- Native mobile app.
