# API_REFERENCE.md

Every internal API route in the app. No webhooks, no externally-callable RPC beyond these.
All routes are Next.js App Router Route Handlers under `app/api/*/route.ts` (plus the auth
callback at `app/auth/callback/route.ts`, documented last).

**Authentication:** every route below except the auth callback calls
`requireUserId()` (`lib/auth.ts`) at the start. On failure, most return
`{"error": "unauthorized"}` as JSON with status 401 — **except `/api/chat`, which returns the
plain text string `"unauthorized"` (not JSON) with status 401** (Verified —
`app/api/chat/route.ts:21`: `new Response("unauthorized", { status: 401 })`). This
inconsistency is worth normalizing if you touch this route.

---

## `GET /api/tasks`
- **Source file:** `app/api/tasks/route.ts`
- **Purpose:** List all of the caller's tasks, each with its category name/group joined in.
- **Auth:** Required.
- **Params/body:** None.
- **Response 200:**
  ```json
  { "tasks": [ { "id": "uuid", "title": "string", "category_id": "uuid|null",
      "start_date": "YYYY-MM-DD|null", "end_date": "YYYY-MM-DD|null",
      "due_time": "HH:MM|null", "status": "open|done", "created_at": "timestamptz",
      "category_name": "string|null", "category_group": "academic|personal|work|other|null" } ] }
  ```
- **Errors:** 401 `{"error":"unauthorized"}`.
- **Side effects/DB:** `select` on `tasks` joined to `categories(name, group_name)`, filtered
  by `user_id`.
- **Known issues:** No pagination.

## `PATCH /api/tasks`
- **Source file:** `app/api/tasks/route.ts`
- **Purpose:** Toggle a task's status.
- **Auth:** Required.
- **Request body:** `{ "id": "uuid", "status": "open" | "done" }`
- **Response 200:** `{ "task": { ...Task } }`
- **Validation:** 400 if `id` missing or `status` is not exactly `"open"`/`"done"`.
- **Errors:** 401 unauthorized; 400 `{"error":"id and valid status are required"}`.
- **Side effects/DB:** `update tasks set status = ... where id = ... and user_id = ...`.

## `DELETE /api/tasks`
- **Source file:** `app/api/tasks/route.ts`
- **Purpose:** Delete a task; also deletes its category if that was the category's last task.
- **Auth:** Required.
- **Request body:** `{ "id": "uuid" }`
- **Response 200:** `{ "ok": true }`
- **Validation:** 400 if `id` missing.
- **Side effects/DB:** `delete from tasks where id = ... and user_id = ...`; then
  `lib/tasks.ts:deleteCategoryIfEmpty` checks the task's former category and deletes it if
  its task count is now 0.

---

## `GET /api/categories`
- **Source file:** `app/api/categories/route.ts`
- **Purpose:** List the caller's categories.
- **Auth:** Required.
- **Response 200:** `{ "categories": [ { "id", "name", "group_name" } ] }`
- **Errors:** 401 unauthorized.

## `PATCH /api/categories`
- **Source file:** `app/api/categories/route.ts`
- **Purpose:** Set a category's life-area group.
- **Auth:** Required.
- **Request body:** `{ "id": "uuid", "group": "academic" | "personal" | "work" | "other" }`
- **Response 200:** `{ "category": { "id", "name", "group_name" } }`
- **Validation:** 400 if `id` missing or `group` not in the fixed allow-list
  (`VALID_GROUPS` in the route file, kept in sync with the DB CHECK constraint in migration
  `005`).
- **Errors:** 401 unauthorized; 400 `{"error":"id and valid group are required"}`.

---

## `GET /api/ideas`
- **Source file:** `app/api/ideas/route.ts`
- **Purpose:** List the caller's ideas, newest first.
- **Auth:** Required.
- **Response 200:** `{ "ideas": [ { "id", "content", "created_at" } ] }`

## `POST /api/ideas`
- **Source file:** `app/api/ideas/route.ts`
- **Purpose:** Save a new idea.
- **Auth:** Required.
- **Request body:** `{ "content": "string" }`
- **Response 200:** `{ "idea": { "id", "content", "created_at" } }`
- **Validation:** 400 if `content` missing or empty after trim.

## `DELETE /api/ideas`
- **Source file:** `app/api/ideas/route.ts`
- **Purpose:** Delete an idea.
- **Auth:** Required.
- **Request body:** `{ "id": "uuid" }`
- **Response 200:** `{ "ok": true }`
- **Validation:** 400 if `id` missing.

---

## `POST /api/templates`
- **Source file:** `app/api/templates/route.ts`
- **Purpose:** Apply a starter template — creates its categories (if not already present) and
  example tasks.
- **Auth:** Required.
- **Request body:** `{ "templateId": "student" | "work" | "home" }` (IDs defined in
  `lib/templates.ts:STARTER_TEMPLATES`)
- **Response 200:** `{ "ok": true }`
- **Validation:** 400 `{"error":"unknown template"}` if `templateId` doesn't match a known
  template.
- **Side effects/DB:** For each task in the template: `getOrCreateCategory` then `insertTask`.
  **Not idempotent** — calling this twice with the same `templateId` duplicates the example
  tasks (see `CLAUDE.md` ISSUE-005).

---

## `POST /api/chat`
- **Source file:** `app/api/chat/route.ts`
- **Purpose:** The core chat flow — extracts structured tasks/deletions from a free-form
  message via Haiku, applies them, then streams a Sonnet-generated reply.
- **Auth:** Required (401 returns **plain text** `"unauthorized"`, not JSON — see the note at
  the top of this file).
- **Request body:** `{ "message": "string" }`
- **Response 200:** `Content-Type: text/plain; charset=utf-8`, a streamed chunked response —
  the raw assistant reply text, not JSON, not SSE-framed.
- **Validation:** `new Response("message is required", { status: 400 })` (plain text, not
  JSON) if `message` is missing or not a string.
- **Side effects/DB:**
  - Reads: `listCategories(userId)`, `listRecentMessages(userId, 20)`, `listTasks(userId)`.
  - Writes (per extracted task): `getOrCreateCategory` + `insertTask`.
  - Writes (per extracted deletion): `deleteCategoryByName` or `deleteTaskByTitle`.
  - Writes (on successful stream completion only): `insertMessage(userId, "user", message)`
    and `insertMessage(userId, "assistant", fullReply)`.
- **External call:** Two separate Anthropic API calls per request — one non-streaming Haiku
  call (`lib/categorize.ts:extractTasks`, forced tool-use), one streaming Sonnet call.
- **Errors:** **No error handling exists past the initial auth check.** Any exception thrown
  by `extractTasks`, any Supabase write, or a mid-stream Anthropic error results in either an
  unhandled 500 (framework default) or a stream that errors out client-side without
  persisting that turn. See `CLAUDE.md` ISSUE-002 for the full explanation and
  `TASKS.md` BUG-002 for the fix.
- **Rate limits:** None implemented by this app. Real Anthropic API cost is incurred on every
  call with no throttling.
- **Example request:**
  ```
  POST /api/chat
  Content-Type: application/json

  { "message": "Chem lab report due Friday at 5pm" }
  ```
- **Example response (streamed plain text, illustrative only):**
  ```
  Added the lab report to Chemistry, due Friday at 5pm. Anything else on your plate?
  ```

---

## `GET /auth/callback`
- **Source file:** `app/auth/callback/route.ts`
- **Purpose:** Exchanges a magic-link PKCE authorization code for a session.
- **Auth:** N/A — this route establishes the session; it's in `proxy.ts`'s `PUBLIC_PATHS`.
- **Query params:** `code` (string, from the Supabase magic-link redirect), optionally
  `error`/other Supabase-added params on failure redirects.
- **Response:** Always a redirect (`NextResponse.redirect`):
  - No `code` present → `${origin}/login?error=missing_code`
  - `exchangeCodeForSession` fails → `${origin}/login?error=<urlencoded message>` (also
    `console.error`s the failure server-side)
  - Success → `${origin}/`
- **Known failure modes actually encountered during development** (see `SESSION_LOG.md` for
  the full story): requesting the link from `localhost` instead of the production domain;
  Supabase's Site URL/Redirect URL allowlist not including the production domain; forwarding
  a magic link to a different browser/device than the one that requested it (breaks the PKCE
  code-verifier cookie match); hitting Supabase's built-in email rate limit during repeated
  testing.
