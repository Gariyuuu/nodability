# DEPLOYMENT.md

## Hosting platform

Vercel. Project name `nodability`, ID `prj_r3qYTjvfmaAKbRsy4b6P87Rr5U1r`, team
`garywangsmes-8349's projects` (org ID `team_gofGt63nGGecSpDl9hBbsFWm`) — Verified via
`.vercel/project.json` and `vercel project inspect nodability`.

## Production URL

**https://nodability.vercel.app** (Verified live and responding correctly at audit time).

## Project configuration

- **Root directory:** `.` (single app, not a monorepo).
- **Framework preset:** Next.js (auto-detected).
- **Build command:** `npm run build` (or `next build`) — Vercel default.
- **Install command:** Vercel default (`npm install`, since `package-lock.json` is present).
- **Output directory:** Next.js default (no custom output dir configured).
- **Runtime:** Node.js 24.x (Verified via `vercel project inspect nodability`).
- **No `vercel.json`** exists in the repo — every setting above is either Vercel's
  auto-detected default or configured directly in the Vercel dashboard, not in-repo.

## Environment variables

Set in the Vercel dashboard for **both Production and Preview** scopes (Verified via
`vercel env ls`): `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_SUPABASE_URL`. `AI_PLATFORM_API_KEY` — the current AI-call credential, replacing
`ANTHROPIC_API_KEY` as of commit `b4fb289` (see `DECISIONS.md` DEC-013) — is set for
**Production only**; it is **missing from Preview** (Verified `vercel env ls preview` during
the 2026-08-07 checkpoint audit), so any Preview deployment's AI calls will fail until it's
added there too. The old `ANTHROPIC_API_KEY` is still present in both scopes but is dead/unused.
No Development-scope Vercel env vars exist — local development relies entirely on
`.env.local`. See `CLAUDE.md`'s Environment setup table for what each variable does.

## ⚠️ Preview deployments share the production database

There is **no separate staging/dev Supabase project**. Both Production and Preview Vercel
environments point at the exact same Supabase project (same env var values in both scopes).
This means **any Preview deployment (e.g. from a branch or PR) reads and writes the same live
data as production.** There is currently no isolation — a bug in a Preview deployment could
corrupt real data. Treat Preview deployments with the same care as Production until a
separate Supabase project is provisioned for non-production use.

## Domains

Single custom-ish domain: the default `*.vercel.app` alias, `nodability.vercel.app`
(Verified — this is what `vercel --prod --yes` aliases to). No custom domain (e.g. a
purchased domain name) is configured.

## Preview deployment flow

Standard Vercel preview-per-deployment behavior applies if triggered, but **auto-deploy from
GitHub pushes is not active for this project** (see below) — so in practice, previews are
only created if someone runs `vercel` (without `--prod`) manually from the CLI. This has not
been the actual workflow used; all deploys observed during this project's development were
direct-to-production via `vercel --prod --yes`.

## Production deployment — the actual, verified procedure

1. Commit and push to `main` on GitHub (`Gariyuuu/nodability`).
   **This does NOT trigger a deployment** — Verified empirically: pushing commits during this
   project's development did not produce a new entry in `vercel ls nodability` until a manual
   deploy was run. No `.github/workflows` exist, and the Vercel↔GitHub integration's
   auto-deploy is evidently not active for this project (possibly never completed the
   "Login Connection" linking step Vercel requires — a known gotcha with this account/team,
   independently observed on other projects too).
2. From the repo root, run: `vercel --prod --yes`
3. This builds and deploys directly to production, then aliases the new deployment to
   `nodability.vercel.app`.
4. **If the change depends on a new database column/table**, the corresponding
   `supabase/migrations/*.sql` file must be run in the Supabase SQL Editor
   (`https://supabase.com/dashboard/project/hwvqnenmnrzdncwznorv/sql/new`) **before** step 2,
   or every request touching that table will fail immediately after deploy. This exact
   sequencing was followed for migration `005` during this project's most recent feature
   pass — see `SESSION_LOG.md`.

## Database deployment / migration order

No automated migration runner — see [DATABASE.md](DATABASE.md) for the full migration list
and the known `schema.sql`-vs-`002` replay inconsistency. The operational rule that has
actually been followed: **schema changes are applied to Supabase manually, before the
corresponding app code is deployed**, never after.

## Storage setup

N/A — no Supabase Storage buckets or other object storage are used.

## External service setup

- **Supabase project** `hwvqnenmnrzdncwznorv` — already provisioned; Auth configured for
  magic-link sign-in with a custom Site URL and Redirect URL allowlist
  (`https://nodability.vercel.app` / `https://nodability.vercel.app/**`) — this had to be
  manually configured in the Supabase dashboard (Authentication → URL Configuration) during
  development, since the default Site URL was `http://localhost:3000` and caused real
  magic-link failures until corrected (see `SESSION_LOG.md`).
- **Self-hosted AI platform** (`https://api.gariyuuu.com/v1`) — a personal OpenAI-compatible
  platform the user built, authenticated via `AI_PLATFORM_API_KEY`. Replaced a standard
  pay-per-token Anthropic API key as of commit `b4fb289` (see `DECISIONS.md` DEC-013); no
  sandbox/test mode used for either.

## Scheduled jobs / webhooks

None exist.

## Build failures

None encountered/documented as an ongoing issue — `npm run build` currently succeeds cleanly
(Verified, exit 0, all 15 routes generated). If a future build fails, check
`npx tsc --noEmit` first (Next.js's build-time type-check is stricter about some things than
a bare `tsc` run in some configurations — though at audit time both passed identically).

## Runtime limitations

- Vercel's standard serverless function limits apply to API routes (execution time, payload
  size) — not specifically tuned or tested against for this app's routes; the streaming chat
  route (`/api/chat`) is the most likely candidate to eventually hit a duration limit on a
  very long conversation, though not observed as an actual incident.
- No specific memory/concurrency configuration has been set for any route.

## Rollback procedure

Not automated. Vercel retains prior deployments (`vercel ls nodability` lists them) — rollback
would mean re-promoting a prior deployment via `vercel promote <deployment-url>` or
re-deploying from an earlier git commit with `vercel --prod --yes`. **Database rollback is
harder:** since migrations are forward-only with no `down` scripts, rolling back app code that
depended on a schema change (e.g. `group_name`) while leaving the schema change in place is
generally safe (old code just ignores the new column), but rolling back a schema change itself
would require hand-writing a reverse migration — none exist today.

## Health checks

None configured (no uptime monitoring, no Vercel health-check endpoint). The closest
equivalent used during development was manual `curl` status-code checks against key routes
(see `TESTING.md`).

## Deployment checklist (recommended, synthesized from actual practice this project has
followed — not a pre-existing documented policy)

1. `npx tsc --noEmit` passes.
2. `npm run build` passes.
3. If schema changed: migration already applied to the (shared) Supabase project.
4. `git add`/`commit`/`push` (for history — remember this alone does **not** deploy).
5. `vercel --prod --yes`.
6. Post-deploy verification (see below).

## Post-deployment verification (the actual steps used after every deploy this session)

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://nodability.vercel.app/login      # expect 200
curl -s -o /dev/null -w "%{http_code}\n" https://nodability.vercel.app/icon       # expect 200
curl -s -o /dev/null -w "%{http_code}\n" https://nodability.vercel.app/           # expect 307 (redirect to /login) when logged out
curl -s -o /dev/null -w "%{http_code}\n" https://nodability.vercel.app/api/tasks  # expect 401
```
Then manually sign in as one of the 2 real accounts and spot-check whatever the deploy
actually changed (see `TESTING.md`'s manual smoke-test checklist for the full list).
