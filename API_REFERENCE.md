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

## `POST /api/tasks` [added 2026-08-24]
- **Source file:** `app/api/tasks/route.ts`
- **Purpose:** Create a task **by hand** from the board, bypassing the chat/extraction flow.
- **Auth:** Required.
- **Request body:** `{ "title": "string", "categoryName": "string|null",
  "startDate": "YYYY-MM-DD|null", "endDate": "YYYY-MM-DD|null", "dueTime": "HH:MM|null" }`
- **Response 200:** `{ "task": { ...Task, "category_name": "string|null" } }`
- **Validation:** 400 `{"error":"title is required"}` if `title` is missing or blank.
- **Side effects/DB:** `getOrCreateCategory` (case-insensitive, may insert a new category row),
  then `insert into tasks`. `sort_order` is set to the bottom of the target box when the column
  exists (migration `008`) and omitted otherwise.

## `PATCH /api/tasks`
- **Source file:** `app/api/tasks/route.ts`
- **Purpose:** Edit a task. Originally status-only (the checkbox); since 2026-08-24 it accepts
  any subset of the editable fields, so the board's inline edit form uses the same route.
- **Auth:** Required.
- **Request body:** `{ "id": "uuid" }` plus **any subset** of `status` (`"open"|"done"`),
  `title` (non-empty string), `categoryName` (`string|null` — `null` means uncategorized),
  `startDate`, `endDate` (`"YYYY-MM-DD"|null`), `dueTime` (`"HH:MM"|null`). Only the keys
  actually present are written, so a title-only save can't blank the dates.
- **Response 200:** `{ "task": { ...Task, "category_name": "string|null" } }`
- **Validation:** 400 if `id` missing, if `status` is present but not `"open"`/`"done"`, if
  `title` is present but blank, or if no editable field was supplied at all.
- **Errors:** 401 unauthorized; 400 with the specific message.
- **Side effects/DB:** `update tasks ... where id = ... and user_id = ...`. A `categoryName`
  change runs `getOrCreateCategory` first and can create a category row. Unlike
  `DELETE /api/tasks`, moving the last task out of a category does **not** delete that
  category — an empty box is still a drop target on the board.

## `PATCH /api/tasks/reorder` [added 2026-08-24]
- **Source file:** `app/api/tasks/reorder/route.ts`
- **Purpose:** Persist a drag-and-drop on the board — re-parent the dragged task into its new
  list, then write the whole target list's top-to-bottom order.
- **Auth:** Required.
- **Request body:** `{ "categoryId": "uuid|null", "orderedIds": ["uuid", ...],
  "movedTaskId": "uuid|null" }` — `orderedIds` is the target box's **full** contents in their
  new order; `movedTaskId` is only set when the task changed boxes; `categoryId: null` means
  the Uncategorized box.
- **Response 200:** `{ "ordered": true|false }` — `false` means `tasks.sort_order`
  (migration `008`) doesn't exist yet, so the re-parenting was saved but the within-box
  position was not. The board surfaces that as a dismissible notice.
- **Validation:** 400 if `orderedIds` isn't an array of strings, `categoryId` isn't a string or
  `null`, or `movedTaskId` isn't a string when present.
- **Side effects/DB:** One `update` for the moved task's `category_id`, then one `update` per
  id in `orderedIds` setting `sort_order` to its index (skipped entirely when the column is
  missing). Every statement is scoped by `user_id`.

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

## `POST /api/categories` [added 2026-08-24]
- **Source file:** `app/api/categories/route.ts`
- **Purpose:** Create an empty list by hand, so there's a box to drag tasks into before any
  task belongs to it.
- **Auth:** Required.
- **Request body:** `{ "name": "string" }`
- **Response 200:** `{ "category": { "id", "name", "group_name" } }` — idempotent by
  case-insensitive name (`getOrCreateCategory`), so re-creating an existing list returns it.
- **Validation:** 400 `{"error":"name is required"}` if missing/blank.

## `DELETE /api/categories` [added 2026-08-24]
- **Source file:** `app/api/categories/route.ts`
- **Purpose:** Delete a list the user emptied out.
- **Auth:** Required.
- **Request body:** `{ "id": "uuid" }`
- **Response 200:** `{ "ok": true }`
- **Errors:** 401 unauthorized; 400 if `id` missing; **409**
  `{"error":"category still has tasks","taskCount":n}` — refused while tasks reference it
  (`categories.id` has no `ON DELETE` clause, so the DB would reject it anyway; see
  `DATABASE.md`). The board only shows the delete button on boxes that are already empty.

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

## `GET /api/notes`
- **Source file:** `app/api/notes/route.ts`
- **Purpose:** List the caller's notes, most recently updated first, each with its category
  name/group joined in.
- **Auth:** Required.
- **Response 200:** `{ "notes": [ { "id", "title", "content", "category_id",
  "category_name", "category_group", "created_at", "updated_at" } ] }`

## `POST /api/notes`
- **Source file:** `app/api/notes/route.ts`
- **Purpose:** Create a note.
- **Auth:** Required.
- **Request body:** `{ "title": "string", "content"?: "string", "categoryId"?: "string" | null }`
- **Response 200:** `{ "note": { ...Note } }`
- **Validation:** 400 `{"error":"title is required"}` if `title` is missing/empty. 409
  `{"error":"you already have a note with that title"}` if the title collides case-
  insensitively with an existing note (DB unique constraint, Postgres code `23505`).

## `PATCH /api/notes`
- **Source file:** `app/api/notes/route.ts`
- **Purpose:** Update a note's title, content, and/or category. Partial updates supported —
  only fields present in the body are changed.
- **Auth:** Required.
- **Request body:** `{ "id": "string", "title"?: "string", "content"?: "string", "categoryId"?: "string" | null }`
- **Response 200:** `{ "note": { ...Note } }`
- **Validation:** 400 if `id` missing; 409 on title collision (same as POST).

## `DELETE /api/notes`
- **Source file:** `app/api/notes/route.ts`
- **Purpose:** Delete a note. (Does not affect other notes' `[[Wikilinks]]` pointing to it —
  those links simply stop resolving, same as Obsidian's own behavior for a deleted note.)
- **Auth:** Required.
- **Request body:** `{ "id": "string" }`
- **Response 200:** `{ "ok": true }`

---

## `POST /api/theme-image`
- **Source file:** `app/api/theme-image/route.ts`
- **Purpose:** Upload a custom theme background photo. Stores it in the `theme-uploads`
  Supabase Storage bucket and returns its public URL for the client to apply as the "Custom"
  palette's background.
- **Auth:** Required.
- **Request body:** `multipart/form-data` with a single field `image` (the file). **Not**
  JSON, unlike every other route in this app.
- **Response 200:** `{ "url": "https://<project>.supabase.co/storage/v1/object/public/theme-uploads/<userId>/<timestamp>.<ext>" }`
- **Validation:** 400 if no `image` field or it's not a file; 400 if content-type isn't one
  of `image/jpeg`, `image/png`, `image/webp`, `image/gif`; 400 if larger than 5MB.
- **Side effects:** Uploads to Storage under `<userId>/<timestamp>.<ext>` (service-role
  client, bypasses Storage RLS — no client-side write policy exists or is needed). **No
  cleanup of previously-uploaded images** — replacing your custom background doesn't delete
  the old file, it just stops being referenced (see `DATABASE.md`'s Storage buckets section).
- **Errors:** 401 unauthorized; 500 `{"error":"upload failed"}` on any Storage error
  (logged server-side via `console.error`, same pattern as `/api/chat`).

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
- **Request body:** `{ "message": "string", "personalityId"?: "string" }` — `personalityId`
  selects which AI character replies (see `lib/personalities.ts`: `"nodo"` (default) |
  `"rex"` | `"sage"` | `"turbo"` | `"prof"`). Optional — falls back to `"nodo"` if missing,
  not a string, or an unrecognized ID (`findPersonality` never rejects, just defaults).
- **Response 200:** `Content-Type: text/plain; charset=utf-8`, a streamed chunked response —
  the raw assistant reply text, not JSON, not SSE-framed.
- **Validation:** `new Response("message is required", { status: 400 })` (plain text, not
  JSON) if `message` is missing or not a string. Invalid JSON body → 400
  `"invalid JSON body"`.
- **Side effects/DB:**
  - Reads: `listCategories(userId)`, `listRecentMessages(userId, 20)`, `listTasks(userId)`.
  - Writes (per extracted task): `getOrCreateCategory` + `insertTask`.
  - Writes (per extracted deletion): `deleteCategoryByName` or `deleteTaskByTitle`.
  - Writes (on successful stream completion only): `insertMessage(userId, "user", message)`
    and `insertMessage(userId, "assistant", fullReply)`.
- **External call:** Two separate calls to the self-hosted AI platform per request (see
  `DECISIONS.md` DEC-013) — one non-streaming extraction call (`lib/categorize.ts:extractTasks`,
  forced tool-use, `EXTRACTION_MODEL`), one streaming chat-reply call (`CHAT_MODEL`). Both
  currently resolve to the same model, `"Yuu no Sekai"`.
- **Errors:** **No error handling exists past the initial auth check.** Any exception thrown
  by `extractTasks`, any Supabase write, or a mid-stream error from the AI platform results in
  either an unhandled 500 (framework default) or a stream that errors out client-side without
  persisting that turn. See `CLAUDE.md` ISSUE-002 for the full explanation and
  `TASKS.md` BUG-002 for the fix.
- **Rate limits:** None implemented by this app. Cost against the AI platform is incurred on
  every call with no throttling.
- **Example request:**
  ```
  POST /api/chat
  Content-Type: application/json

  { "message": "Chem lab report due Friday at 5pm", "personalityId": "rex" }
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
