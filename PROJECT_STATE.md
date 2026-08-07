# PROJECT_STATE.md

**This file describes the exact state of the repository at the moment of the last update. It
is meant to let a new session resume from precisely this point.**

- **Last updated:** 2026-08-06 (later the same day) — an AI-provider swap session: replaced
  the direct Anthropic API integration with a self-hosted, OpenAI-compatible platform. **Not
  committed, not pushed, not deployed** — per explicit task instructions, this session did not
  run `git commit`, `git push`, or `vercel --prod --yes`.
- **Current branch:** `main`
- **Latest commit:** `e91699f` — "Clean up superseded custom theme-background uploads on
  replace" (the last commit **before** this session's AI-provider-swap changes, which remain
  uncommitted — see below). Prior commits unchanged from before: `620fa67`, `f8e46ef`,
  `49cd6e4`, `eb3c34a`, `720e9a2`, `18200e7`, `d92a96b`, `071f6a3`, `6b55515`.
- **Working tree: NOT clean.** This session modified `CLAUDE.md`, `DECISIONS.md`,
  `app/api/chat/route.ts`, `lib/categorize.ts`, `package.json`, `package-lock.json`; deleted
  `lib/anthropic.ts`; added `lib/ai-client.ts` (untracked); modified `.env.local` and
  `.env.local.example` (both already gitignored by the `.env*` pattern in `.gitignore` — see
  "Assumptions currently in use" below, this predates this session). Run `git status` before
  continuing.
- **Pushed:** Everything through `e91699f` was pushed in a prior session. This session's
  changes are **not committed**, therefore not pushed.
- **Not deployed.** The live production app at nodability.vercel.app is still running the code
  as of `e91699f` — i.e. still calling the Anthropic API directly. This session's AI-provider
  swap has **not** gone live. Do not assume production behavior matches this repo's working
  tree until a deploy is explicitly requested and run.
- **Uncommitted files:** `CLAUDE.md`, `DECISIONS.md`, `app/api/chat/route.ts`,
  `lib/categorize.ts`, `package.json`, `package-lock.json` (modified); `lib/anthropic.ts`
  (deleted). **Untracked files:** `lib/ai-client.ts`.
- **Database/infra state:** Unchanged by this session — no schema/RLS/migration changes were
  made (out of scope per the task instructions). Migrations `006_notes.sql` and
  `007_theme_uploads_bucket.sql` remain the latest applied, as of the prior session's audit.

## Active development objective

None right now. This session's objective — "replace the two Anthropic call sites with a
self-hosted OpenAI-compatible platform so the user stops paying for direct Anthropic API
access" — is **code-complete and verified, but deliberately left uncommitted/undeployed** per
the task's explicit instructions (no commit, no push, no deploy unless separately asked).

## Last completed task

AI-provider swap: `lib/anthropic.ts` (Anthropic SDK client + `HAIKU_MODEL`/`SONNET_MODEL`
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

**None**, but the change is **uncommitted**. If a future session (or this one, later) is asked
to commit/push/deploy this work, do so deliberately — re-run the three verification commands
first, since time may have passed and `node_modules`/lockfile drift is possible.

## Files related to the current state

- `lib/ai-client.ts` (new) — the OpenAI client + model constants.
- `lib/anthropic.ts` — **deleted**.
- `lib/categorize.ts` — forced tool-use call, translated to OpenAI's tool-calling shape.
- `app/api/chat/route.ts` — streaming chat reply, translated to OpenAI's streaming shape.
- `package.json` / `package-lock.json` — dependency swap.
- `.env.local` / `.env.local.example` — env var rename.
- `CLAUDE.md`, `DECISIONS.md` — documentation of the swap (this file, `TASKS.md`, and
  `SESSION_LOG.md` are the other three, per the repo's permanent-rules checklist).

## What has already been attempted (this session, informational)

- Read `CLAUDE.md` in full, `PROJECT_STATE.md`, and `TASKS.md` before touching any code, per
  this repo's own working instructions.
- Read the actual current contents of `lib/anthropic.ts`, `lib/categorize.ts`, and
  `app/api/chat/route.ts` directly (not trusted from a doc summary) before changing them.
- Confirmed via `grep -rn` that exactly two files imported from `lib/anthropic.ts`
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

None. This work is complete and verified; it is simply not yet committed/deployed, by design.

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

1. **If satisfied with this session's verification, ask explicitly for a commit** — this
   session deliberately did not run `git commit`/`git push`/`vercel --prod --yes` per its
   instructions. `git status` will show the changes listed above as uncommitted/untracked.
2. Once committed and (if desired) deployed, do a **real** end-to-end smoke test through the
   live app (logged in as one of the 2 real accounts) — this session's verification exercised
   the exact underlying functions/request shapes but never the literal authenticated HTTP
   round-trip, since that would have written to production data without permission.
3. Consider whether `AI_PLATFORM_API_KEY` needs to be added to the Vercel dashboard
   (Production **and** Preview scopes) before any deploy — it does not exist there yet;
   `ANTHROPIC_API_KEY` is still the var currently set in Vercel.
4. Older, unrelated deferred items unchanged by this session: `ISSUE-006` (`npm audit
   fix --force`), a minimal test suite, notes/graph visual verification, and confirming
   whether the life-area-grouping discoverability fix changed real adoption.

## Verification required before continuing

- Run `git status` and `git log --oneline -3` at the start of any new session. Expect: `HEAD`
  at `e91699f`, but a **dirty working tree** (this session's uncommitted AI-provider-swap
  changes) — do not assume a clean tree without checking.
- Re-run `npm run build`, `npx tsc --noEmit`, and `npm run lint` to confirm the "all pass"
  status in this file is still accurate — especially if `npm install` has been re-run or time
  has passed, since the `openai` package is new to this repo and its own version may have
  moved.
- Before any deploy: confirm `AI_PLATFORM_API_KEY` (not `ANTHROPIC_API_KEY`) is set correctly
  in the Vercel dashboard for both Production and Preview, or every AI call will fail in
  production immediately after deploy.
- If resuming much later, re-verify Supabase migration state and live row counts as before —
  unaffected by this session, but drifts independently via real usage.
