# SECURITY.md

Defensive security review, performed by static code inspection + live configuration checks
(no destructive testing, no unauthorized access attempted). Everything below is Verified from
source/config unless marked Inferred.

## Authentication boundaries

- Magic link only (Supabase Auth OTP, PKCE flow), `shouldCreateUser: false`
  (`app/login/page.tsx`) — the entire access-control mechanism is "only accounts that already
  exist in `auth.users` can request a sign-in link." No password exists to brute-force.
- Exactly 2 accounts exist, provisioned via `scripts/create-users.mjs` using the service-role
  admin API (`supabase.auth.admin.createUser`). There is no self-serve signup surface
  anywhere in the app.
- Session cookies managed by `@supabase/ssr`; refreshed on every request by `proxy.ts`.

## Authorization boundaries

- **Primary enforcement:** application-level `userId` filtering in every `lib/tasks.ts` /
  `lib/ideas.ts` / `lib/messages.ts` function, using the **service-role** client
  (`lib/supabase.ts`), which bypasses RLS. Every API route calls `requireUserId()`
  (`lib/auth.ts`) and passes the resolved ID into every downstream query.
- **Secondary enforcement:** RLS policies on all 4 tables (`user_id = auth.uid()`), added in
  migration `004`. These are explicitly commented in the migration file as defense-in-depth —
  they only matter if a future code path queries with the anon/session-aware client instead
  of the service-role client. **They do not currently protect anything in this app's actual
  request path.**
- **Gap:** there is no automated check (test, lint rule, or code-review checklist enforced by
  tooling) that a new `lib/*.ts` function actually filters by `user_id`. This is a manual
  discipline requirement, not a structural guarantee. A future function that forgets the
  filter would leak all users' rows to whoever calls it, with RLS providing no backstop
  (service-role bypasses it).

## Protected routes

Every route is protected by `proxy.ts` **except** `/login`, `/auth/callback`, `/icon`,
`/apple-icon` (see `proxy.ts`'s `PUBLIC_PATHS` array and `matcher` config). API routes are
additionally self-protected via `requireUserId()` independent of the proxy layer — this is
intentional double coverage, not redundant dead code (the proxy redirects HTML page loads;
API routes need to return JSON/text 401s instead of a redirect, since they're called via
`fetch()`).

## Secret handling

- `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` are the two high-sensitivity secrets.
  Both live only in `.env.local` (gitignored, confirmed via `.gitignore`) and the Vercel
  dashboard (Production + Preview scopes, confirmed via `vercel env ls`).
- `lib/supabase.ts` (the service-role client) is imported only by server-only files
  (`lib/tasks.ts`, `lib/ideas.ts`, `lib/messages.ts`, `scripts/create-users.mjs`) — **Verified
  via grep, no `"use client"` file imports it.**
- No secret values were ever printed, logged, or committed during this audit or (as far as
  static inspection can tell) during the app's development. Within the deployed app, the only
  `console.*` call is `app/auth/callback/route.ts:15`, which logs `error.message` (a Supabase
  error string, not a secret). `scripts/create-users.mjs` also logs to the terminal
  (email + new user ID on success, or an error message) when run locally by a developer —
  intentional CLI output, not a runtime logging path, and it never logs the service-role key
  itself even though it uses it.

## Client-exposed variables

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are intentionally
client-exposed (the `NEXT_PUBLIC_` prefix embeds them in the browser bundle). This is by
design — the anon key is meant to be public; RLS (even though not the app's primary
enforcement path today) is what would need to hold if this key were ever used more broadly.

## Input validation

Minimal, present at the boundary of every API route (see [API_REFERENCE.md](API_REFERENCE.md)
for exact checks): presence/type checks only (e.g. `status` must be `"open"`/`"done"`,
`group` must be one of 4 fixed strings, `content`/`message` must be non-empty strings). **No
length limits** on `message`, `content` (idea text), or `title` (task text) — a very long
string could be submitted to any of these fields with no server-side cap, which also directly
affects Anthropic API token cost on the chat path.

## Output encoding / XSS

React's default JSX escaping handles this throughout — no `dangerouslySetInnerHTML` is used
for user-generated content anywhere (the only use of `dangerouslySetInnerHTML` in the whole
app is `app/layout.tsx`'s no-flash theme script, which renders a fixed string from
`lib/theme.ts`, not user input). No raw HTML rendering of task titles, idea content, or chat
messages was found.

## SQL injection risk

Low — all database access goes through `supabase-js`'s query builder (`.eq()`, `.ilike()`,
`.select()`, etc.), which parameterizes values; no raw SQL string concatenation was found
anywhere in application code (only in the hand-written `.sql` migration files, which are
static, not built from user input).

## CSRF protections

No explicit CSRF token mechanism. Risk is limited because: (a) all state-changing API routes
require a valid session cookie plus are same-site fetches from the app's own pages (no
cross-origin form posts are exposed), and (b) the one Server Action (`signOutAction`) is
sign-out only — not a sensitive-enough action to be a meaningful CSRF target. **Not formally
verified against Next.js's built-in Server Action CSRF protections** (Next.js does apply
some origin-checking to Server Actions by default) — Inferred acceptable given the low blast
radius, not independently confirmed.

## File upload risks

None — no file upload feature exists anywhere in the app.

## Webhook verification

N/A — no webhooks are received by this app.

## Rate limiting

**None implemented anywhere in application code.** Two distinct exposures:
1. `/api/chat` has no per-user or per-IP throttling — a scripted client with a valid session
   could run up real Anthropic API cost quickly (see `CLAUDE.md`'s Anthropic billing note:
   this is plain pay-per-token billing, not covered by any subscription).
2. Supabase's own built-in auth-email rate limit applies to magic-link requests
   (`signInWithOtp`) — this is Supabase's limit, not something this app configured, and it
   was actually hit during development (see `SESSION_LOG.md`).

## Admin access

No admin role or admin UI exists. The closest equivalent to "admin" capability is possessing
`SUPABASE_SERVICE_ROLE_KEY` locally (used only for the one-off `scripts/create-users.mjs`
script) — this is a developer/operator credential, not an in-app role.

## Database policies

See [DATABASE.md](DATABASE.md) for full detail. RLS is enabled with owner-only policies on
all 4 tables, but is not the app's active enforcement path (see Authorization boundaries
above).

## Logging of sensitive data

No structured logging exists to audit. The single `console.error` call
(`app/auth/callback/route.ts:15`) logs a Supabase-provided error message string, which could
in theory include the attempted email in some Supabase error formats — not confirmed either
way from this repo alone, and low severity given it's a server-side log only (visible in the
Vercel function log, not returned to the client beyond being urlencoded into the redirect
URL's `error` query param, which **is** visible in the browser's address bar and history).
**Minor finding:** surfacing the raw Supabase error message in the URL (`/login?error=<message>`)
could leak internal error detail to anyone with browser history/network log access on that
device — low risk given the 2-person, personal-device context, but worth normalizing to a
generic message if this app's threat model ever changes.

## Dependency concerns

- No automated dependency scanning (no Dependabot config found, no `npm audit` run as part of
  any script). `npm audit` originally found **4 high-severity advisories**; `npm audit fix`
  (no `--force`) was run in a follow-up session, resolving 1 of them. **3 remain, all
  transitive, all build-tooling-related rather than runtime-request-path code:**
  1. ~~`brace-expansion`~~ — **Resolved** via `npm audit fix`.
  2. `postcss` (≤8.5.22, via `next`'s own bundled copy) — XSS in CSS stringify output +
     source-map path-traversal/arbitrary-file-read advisories. This app doesn't accept
     user-controlled CSS or source maps at runtime, so exposure is low, but it's still a real
     advisory in the dependency tree.
  3. `sharp` (<0.35.0, via `next`) — inherited `libvips` CVEs. This app does **not** use
     `next/image` (Verified: no `next/image` import anywhere in `app/`/`components/`), so
     `sharp`'s image-processing code path is not reachable at runtime — exposure is
     effectively build-time/dev-tooling only.
  - **Resolving `postcss`/`sharp` requires `npm audit fix --force`, which would upgrade
    `next` to 16.3.0** — outside the currently pinned `16.2.11`. Per this project's "do not
    upgrade dependencies without review" rule, this was **not** applied; tracked as
    `ISSUE-006` in `CLAUDE.md` / deferred in `TASKS.md` for a future session to address
    deliberately, ideally after a test suite exists to verify the upgrade doesn't regress
    anything.
- No lockfile-integrity CI check exists.

## Production security gaps (summary)

1. No rate limiting (`/api/chat` cost exposure, auth email rate limit is Supabase's own).
2. No automated dependency vulnerability scanning; 3 `npm audit` advisories remain
   (deliberately deferred — see Dependency concerns above / `ISSUE-006` in `CLAUDE.md`).
3. No length caps on user-submitted text fields.
4. Single point-of-failure authorization model (service-role + manual filtering, no automated
   check) — see Authorization boundaries above.
5. No staging/dev database separation — Preview deployments on Vercel point at the same
   production Supabase project (see `DEPLOYMENT.md`).

`/api/chat`'s missing error handling (previously gap #1 in this list) was **fixed** — the
route now wraps its body in try/catch and returns a clean error response instead of an
unhandled 500 (closes the minor information-disclosure-via-error-text surface too).

## Recommended fixes (priority order, Inferred — not requested by the user, offered as
professional judgment)

1. Add basic rate limiting to `/api/chat` (even a simple in-memory or Vercel KV-based
   per-user throttle would materially reduce cost-exposure risk).
2. When there's time for a dedicated review pass, address the 3 remaining `npm audit`
   advisories (`ISSUE-006` — requires a `next` version bump, test thoroughly first).
3. Add server-side length caps on `message`/`content`/`title` fields.
