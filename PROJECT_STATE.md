# PROJECT_STATE.md

**This file describes the exact state of the repository at the moment of the last update. It
is meant to let a new session resume from precisely this point.**

## 2026-08-24 update [Verified] — read this block first; it supersedes everything below

Feature session, at the user's request: make the task board directly manipulable — drag tasks
around like boxes, and edit tasks by hand instead of always asking the chat assistant.

**Shipped in the working tree (NOT yet committed, NOT yet deployed as of this writing):**

- `components/TaskBoard.tsx` — rewritten. One bordered box per category (plus Uncategorized
  when non-empty); native HTML5 drag-and-drop between and within boxes with a drop-position
  indicator; inline edit form on click (title, list, from/to dates, time); `＋` per box to add
  a task; `＋ New list`; `🗑` on an empty box. Also fetches `/api/categories` now, so empty
  boxes exist as drop targets.
- `lib/tasks.ts` — new `createTask`, `updateTask`, `reorderTasks`, `createCategory`,
  `deleteCategoryById`, `hasSortOrderColumn`; `listTasks` now applies hand-dragged order in JS.
- `app/api/tasks/route.ts` — new `POST`; `PATCH` extended from status-only to any subset of
  editable fields. New `app/api/tasks/reorder/route.ts`. `app/api/categories/route.ts` — new
  `POST`/`DELETE`. `app/page.tsx` — passes `onDataChanged` so the sidebar resyncs.
- `supabase/migrations/008_task_sort_order.sql` — **new, not yet run against the database.**

**Verified this session:** `npx tsc --noEmit`, `npm run lint`, `npm run build` all exit 0; all
five new/changed endpoints return 401 logged out and `/` still 307s to `/login`; the board was
driven in a real Chromium browser (throwaway Playwright harness, stubbed API responses, no
production data touched) with **16/16** interaction checks passing — cross-list drag,
within-list reorder, exact reorder payloads, inline edit, re-listing via the dropdown,
hand-add, list creation, dropping into an empty list, delete-button visibility rule.

**Not verified (the honest gap):** the `sort_order` write path, because migration `008` has not
been applied — confirmed directly against the live database, which returns
`{"code":"42703","message":"column tasks.sort_order does not exist"}`. The code is written to
tolerate exactly this (see `DECISIONS.md` DEC-014), so the board is safe to deploy in either
order, but within-list ordering won't stick until a human runs the SQL. That's `T-002`.

**One pre-existing thing observed, not caused by this work:** `npm run dev` on this machine
initially failed to resolve `@swc/helpers` because Turbopack infers the workspace root as
`~/Projects` (two lockfiles). Working around it needs `turbopack: { root: __dirname }` in
`next.config.ts`; that workaround was used temporarily during testing and **reverted** —
`next.config.ts` is unchanged. `npm run build` is unaffected. Worth fixing properly some time.

## 2026-08-16 update [Verified] — read this block first, it supersedes the stale framing below

A documentation-sweep session (no feature work) re-verified everything against real repo
state and found three feature commits had landed since the 2026-08-07 checkpoint, all now
merged to `main` (branch is clean, single-branch — `chore/metadata-og` and `chore/polish`
both fully merged, nothing diverged):

- `fff3db2`/`b9ca352` (2026-08-13/14) — added `app/opengraph-image.tsx` (next/og-generated OG
  card) and `app/robots.ts`, and allowlisted `opengraph-image` in `proxy.ts`'s matcher (it has
  no file extension, so the existing extension-based static-asset exclusion didn't already
  cover it — same bug class as the `/icon` and `/theme/*.jpg` issues documented in
  [Known issues](CLAUDE.md#known-issues)).
- `217373b`/`28f4fbb` (2026-08-15/16) — `components/ChatPanel.tsx` now shows an animated
  `ThinkingOrb` (new dependency: `thinking-orbs`) next to the "Thinking…" text while the
  assistant is composing a reply, replacing the old plain-text `"{emoji} …"` placeholder.

Current branch `main`, HEAD `28f4fbb`, working tree clean, nothing uncommitted. `robots.txt`
and `/opengraph-image` were live-checked directly against production during this sweep
(`curl https://nodability.vercel.app/robots.txt` → 200, `Allow: /login` / `Disallow: /`;
`curl -I .../opengraph-image` → 200 `image/png`) — both confirmed working. The `ThinkingOrb`
chat indicator was **not** live-checked (requires an authenticated chat session) — current
task `T-001` (see `TASKS.md`): log in and send a chat message to confirm it actually renders
during the "assistant is composing" state, since no verification detail was recorded in
`217373b`/`28f4fbb`'s commit messages either way.

The rest of this file (written 2026-08-07) is preserved below as history.

- **Last updated:** 2026-08-07 — a final-transfer-checkpoint audit session. **Correction to
  this file's own prior entry below:** the AI-provider-swap session (2026-08-06, later the same
  day) documented itself here as "not committed, not pushed, not deployed" — that was true at
  the moment it wrote this file, but the changes were in fact committed immediately afterward as
  `b4fb289` and are now pushed and (per the evidence below) live in production. This file was
  simply never updated to reflect that follow-through. Treat everything below this paragraph,
  up to "Active development objective," as the corrected current state; the rest of this file's
  narrative sections (written from the swap session's perspective) are still accurate as
  history, just stale on the "not committed" framing specifically.
- **Current branch:** `main`
- **Latest commit:** `b4fb289` — "Switch chat + task extraction from Anthropic to self-hosted
  goat-ai-platform." Prior commits: `e91699f`, `620fa67`, `f8e46ef`, `49cd6e4`, `eb3c34a`,
  `720e9a2`, `18200e7`, `d92a96b`, `071f6a3`, `6b55515`.
- **Working tree: clean.** `git status` shows nothing to commit as of this audit.
- **Pushed:** Everything through `b4fb289` is on `origin/main` (Verified: `git fetch origin`
  returned nothing new; `git log origin/main --oneline -1` matches local `HEAD`).
- **Deployed.** Verified via `vercel env ls production` (`AI_PLATFORM_API_KEY` is present,
  Encrypted, added ~9h before this audit) and `vercel ls nodability` / `vercel inspect` (the
  newest Production deployment, aliased to `nodability.vercel.app`, was created ~7h before this
  audit — chronologically after the `b4fb289` commit). The AI-provider swap is live in
  production. `ANTHROPIC_API_KEY` is still also present in the Vercel dashboard (unused now,
  legacy — safe to remove in a future cleanup pass but not urgent).
- **Uncommitted files:** none.
- **Database/infra state:** Unchanged by the swap — no schema/RLS/migration changes were part
  of it. Migrations `supabase/migrations/006_notes.sql` and `supabase/migrations/007_theme_uploads_bucket.sql` remain the latest
  applied, unverified against live Supabase in this audit (no DB access available; take on
  faith from the prior session's audit unless a session with DB access re-confirms).

## Active development objective

None. The AI-provider swap's objective — "replace the two Anthropic call sites with a
self-hosted OpenAI-compatible platform so the user stops paying for direct Anthropic API
access" — is code-complete, verified, **committed (`b4fb289`), pushed, and deployed to
production** (see the corrected status block above).

## Last completed task

AI-provider swap: lib/anthropic.ts (Anthropic SDK client + `HAIKU_MODEL`/`SONNET_MODEL`
constants) replaced by `lib/ai-client.ts` (`openai` npm package client pointed at
`https://api.gariyuuu.com/v1`, `EXTRACTION_MODEL`/`CHAT_MODEL` constants both currently
`"Yuu no Sekai"`, the platform's one exposed model). `lib/categorize.ts`'s forced tool-use
extraction and `app/api/chat/route.ts`'s streaming chat reply were both translated from
Anthropic's Messages API shape to OpenAI's Chat Completions shape. Full reasoning and the
exact before/after shapes are in `DECISIONS.md` → DEC-013 — read that before touching
`lib/ai-client.ts`, `lib/categorize.ts`, or the AI-call section of `app/api/chat/route.ts`
again.
- **Env var renamed:** `ANTHROPIC_API_KEY` → `AI_PLATFORM_API_KEY`, updated in `.env.local`,
  `.env.local.example`, and `CLAUDE.md`'s env var table/tech-stack line. Note:
  `.env.local.example` is (pre-existing, not caused by this session) unintentionally matched
  by the `.env*` glob in `.gitignore` and was **never actually tracked in git** — `git ls-files
  | grep env` returns nothing. This session's edit to it is real on disk but git-invisible;
  flagging so a future session doesn't assume `git diff` will show it.
- **Package swap:** `package.json`/`package-lock.json` — `@anthropic-ai/sdk` removed, `openai`
  (`^7.4.0`) added. `npm install` was run; `node_modules` reflects the new dependency tree.
- Untouched, on purpose: authentication, database schema/RLS, `proxy.ts`, and all production
  data — none of these were part of the requested swap.

All changes were verified: `npx tsc --noEmit`, `npm run lint`, `npm run build` all exit 0 (see
exact commands/output in `SESSION_LOG.md`). The forced tool-use extraction path was the
highest-risk part (core to the app's daily function) and was tested directly — see "What
currently works" below and `SESSION_LOG.md` for full detail, including why the test bypassed
the live HTTP endpoint (this app has no separate dev database; hitting `/api/chat` for real
would write to the 2 real users' production Supabase data).

## Current unfinished task

**None.** The change is committed, pushed, and deployed (see above). One genuinely open item:
a real, logged-in end-to-end smoke test of `/api/chat` against production has still never been
done (the swap session deliberately avoided this to not write to real user data without
permission) — worth doing once someone can sign in as one of the 2 real accounts.

## Files related to the current state

- `lib/ai-client.ts` (new) — the OpenAI client + model constants.
- lib/anthropic.ts — **deleted**.
- `lib/categorize.ts` — forced tool-use call, translated to OpenAI's tool-calling shape.
- `app/api/chat/route.ts` — streaming chat reply, translated to OpenAI's streaming shape.
- `package.json` / `package-lock.json` — dependency swap.
- `.env.local` / `.env.local.example` — env var rename.
- `CLAUDE.md`, `DECISIONS.md` — documentation of the swap (this file, `TASKS.md`, and
  `SESSION_LOG.md` are the other three, per the repo's permanent-rules checklist).

## What has already been attempted (this session, informational)

- Read `CLAUDE.md` in full, `PROJECT_STATE.md`, and `TASKS.md` before touching any code, per
  this repo's own working instructions.
- Read the actual current contents of lib/anthropic.ts, `lib/categorize.ts`, and
  `app/api/chat/route.ts` directly (not trusted from a doc summary) before changing them.
- Confirmed via `grep -rn` that exactly two files imported from lib/anthropic.ts
  (`lib/categorize.ts`, `app/api/chat/route.ts`) before renaming it, so the rename didn't
  silently break an unnoticed third call site.

## What currently works (Verified this session)

- `npx tsc --noEmit`, `npm run lint`, `npm run build` all exit 0 on the new code.
- `npm run dev` starts cleanly on the new dependency tree; `/login` returns 200; unauthenticated
  `POST /api/chat` still correctly returns 401 (route-gating unaffected by the provider swap).
- **The forced tool-use extraction path** (`lib/categorize.ts:extractTasks`, the actual
  production function, not a mock) was called directly with 5 varied real messages, including
  the task's example "remind me to buy milk tomorrow": all 5 returned correctly-shaped,
  correctly-parsed `{tasks, delete_categories, delete_tasks}` JSON with plausible field values
  (right title, right category matched from known categories, correct relative-date math, and
  a non-task chit-chat message correctly returning all-empty arrays). 5/5 — see
  `SESSION_LOG.md` for the full transcript.
- **The streaming chat-reply path** was verified using the exact same request shape as
  `app/api/chat/route.ts` (same model, same `reasoning: {enabled: false}`, same message
  structure): received an 11-chunk streamed reply, correctly grounded in the injected
  "current open tasks" context block.
- This was done **without** touching production Supabase data — `extractTasks` and the raw
  streaming call don't write to the database; only `app/api/chat/route.ts`'s surrounding code
  (unchanged by this session, still calls `requireUserId()`/`insertMessage()`/etc.) does that,
  and that surrounding code was not exercised live in this session for exactly that reason.

## What currently fails / errors observed

Nothing from this session's changes. Pre-existing, unrelated: `npm audit` still reports
findings tracked as `ISSUE-006` in `CLAUDE.md` (deliberately deferred, `next` version bump).

## Blockers

None. This work is complete, verified, committed, pushed, and deployed.

## Assumptions currently in use (Inferred, not stated anywhere explicitly)

- The platform's `/v1/chat/completions` endpoint is assumed stable/available at
  `https://api.gariyuuu.com/v1` for as long as this integration is in use — no fallback to the
  Anthropic API was implemented if the self-hosted platform becomes unreachable.
- `EXTRACTION_MODEL` and `CHAT_MODEL` are currently identical strings by design (see DEC-013)
  — a future session adding a second model to the platform should NOT assume changing one
  constant is a no-op elsewhere; check both call sites' token/latency budgets independently.

## Temporary decisions (things done for expedience, flagged as such at the time)

- The `reasoning: { enabled: false }` field is added via an `as any as
  ChatCompletionCreateParams{Non,}Streaming` double-cast in both `lib/categorize.ts` and
  `app/api/chat/route.ts`, since it's a platform-specific extension the `openai` npm package's
  TS types don't declare. If the `openai` package ever adds first-class support for this field
  (or the platform's protocol changes), replace the cast with a proper typed field instead of
  copy-pasting the workaround further.

## Next recommended actions

1. Do a **real** end-to-end smoke test through the live app (logged in as one of the 2 real
   accounts) — the swap session's verification exercised the exact underlying functions/request
   shapes but never the literal authenticated HTTP round-trip through production, and this still
   hasn't happened since.
2. Consider removing the now-unused `ANTHROPIC_API_KEY` from the Vercel dashboard (Production +
   Preview) — not urgent, just dead config.
3. Older, unrelated deferred items: `ISSUE-006` (`npm audit fix --force`), a minimal test suite,
   notes/graph visual verification, and confirming whether the life-area-grouping
   discoverability fix changed real adoption.

## Verification required before continuing

- Run `git status` and `git log --oneline -3` at the start of any new session. Expect: `HEAD`
  at `b4fb289`, clean working tree, `main` up to date with `origin/main` — this was re-verified
  during the 2026-08-07 checkpoint audit. Do not assume this is still true without checking;
  it's exactly the kind of thing that drifts between sessions.
- Re-run `npm run build`, `npx tsc --noEmit`, and `npm run lint` to confirm the "all pass"
  status in this file is still accurate (re-verified clean, exit 0 on all three, during the
  2026-08-07 audit).
- `AI_PLATFORM_API_KEY` is confirmed present in the Vercel dashboard for **Production only**
  (Verified `vercel env ls production` / `vercel env ls preview` during the 2026-08-07 audit).
  **Preview does not have it** — only the now-unused `ANTHROPIC_API_KEY` is set there. Any
  Preview deployment's `/api/chat` will fail on every message until `AI_PLATFORM_API_KEY` is
  added to the Preview scope too. Low urgency in practice (Preview deploys aren't part of the
  actual workflow — see `DEPLOYMENT.md`), but a real gap if one is ever created.
- If resuming much later, re-verify Supabase migration state and live row counts — this was
  not re-checked in the 2026-08-07 audit (no DB access available then either).
