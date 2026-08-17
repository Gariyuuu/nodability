# DECISIONS.md

Architectural decision log. Decisions here are **Inferred** from code, commit messages, and
comments unless marked Verified (meaning an explicit comment/commit message states the
reasoning directly). No developer was interviewed to produce this file — do not treat
"Inferred" reasoning as confirmed fact.

---

### DEC-001 — Service-role client + manual `userId` filtering, not RLS-as-enforcement
- **Date:** Inferred ~2026-08-04 (commit `1d78489`)
- **Status:** Accepted, in effect
- **Context:** The app needed per-user data isolation retrofitted onto an originally
  single-tenant schema.
- **Decision:** All server-side DB access uses the service-role key (`lib/supabase.ts`), and
  every query function in `lib/tasks.ts`/`lib/ideas.ts`/`lib/messages.ts` takes `userId`
  explicitly and filters manually. RLS policies were still added (migration `004`) but are
  explicitly commented as "defense-in-depth only."
- **Reasoning (Verified — stated directly in `supabase/migrations/004_user_scoping.sql`
  comment):** "the app's API routes use the service-role key ... and enforce user_id
  filtering in application code ... which bypasses RLS. These policies matter if anything
  ever queries these tables with the anon key."
- **Alternatives considered:** Using the session-aware (anon-key) client everywhere and
  relying purely on RLS. Not chosen — Inferred reason: simpler to retrofit onto existing
  code that already used the service-role client throughout, without rewriting every query
  call site to be request-scoped.
- **Consequences:** A missed `.eq("user_id", userId)` in any new query function has no
  database-level backstop. See `CLAUDE.md` → "DO NOT CHANGE WITHOUT REVIEW."
- **Affected files:** `lib/supabase.ts`, `lib/tasks.ts`, `lib/ideas.ts`, `lib/messages.ts`,
  `supabase/migrations/004_user_scoping.sql`.
- **Verification status:** Verified (reasoning explicitly stated in the migration comment).

---

### DEC-002 — Magic-link, invite-only auth (`shouldCreateUser: false`), no passwords
- **Date:** Inferred ~2026-08-04
- **Status:** Accepted, in effect
- **Context:** The app has exactly 2 intended users (a couple); needed *some* real auth
  after being fully open.
- **Decision:** Passwordless magic-link sign-in; `shouldCreateUser: false` means only
  pre-existing Supabase Auth accounts (provisioned via `scripts/create-users.mjs`) can sign
  in — no self-serve signup exists.
- **Reasoning:** Inferred — simplest possible auth UX for exactly 2 known people, avoids
  building password reset/management UI entirely.
- **Alternatives considered:** Email+password (used by a sibling project,
  `together-wellness`, per that project's more elaborate auth system) — not chosen here,
  Inferred reason: unnecessary complexity for a 2-person app.
- **Consequences:** Adding a 3rd user requires manually running a script with service-role
  credentials; there's no in-app invite flow.
- **Affected files:** `app/login/page.tsx`, `scripts/create-users.mjs`.
- **Verification status:** Inferred.

---

### DEC-003 — Manual (not automatic/keyword-based) life-area grouping
- **Date:** Inferred ~2026-08-06 (commit `6b55515`)
- **Status:** Accepted, in effect — but see `CLAUDE.md` ISSUE-003 for a real-world adoption
  problem this may need revisiting for.
- **Context:** Wanted an "Academic vs Personal vs Work" split view for the calendar.
- **Decision:** Add a `group_name` column to `categories`, set manually by the user via a
  cycling colored dot in the sidebar, rather than guessing the group from the category name.
- **Reasoning:** Explicit tradeoff surfaced to the user at decision time: automatic
  keyword-guessing would misclassify anything not obviously academic/personal; manual tagging
  is more predictable even though it requires user action.
- **Alternatives considered:** Automatic keyword-based guessing (e.g. "Chemistry" →
  Academic). Rejected for the reason above.
- **Consequences:** As of this audit, the manual step has not actually been taken by either
  real user — all 3 live categories remain `group_name = 'other'`. This is a live signal that
  the UX for setting the group may be too low-visibility (a small dot with only a hover
  tooltip).
- **Affected files:** `supabase/migrations/005_category_group.sql`, `components/Sidebar.tsx`,
  `lib/groups.ts`.
- **Verification status:** Inferred (the tradeoff was surfaced and chosen during the
  conversation that produced this feature, not found as a comment in code).

---

### DEC-004 — Month/Year calendar views are display + toggle-done only, no add/edit from grid
- **Date:** Inferred ~2026-08-06 (commit `6b55515`)
- **Status:** Accepted, in effect
- **Context:** Building Google-Calendar-style Month/Year views raised the question of how
  interactive they should be.
- **Decision:** Views support viewing tasks and toggling done/open status, but not creating
  or editing tasks directly from a day cell — task creation remains chat-driven (or via the
  main board).
- **Reasoning:** Explicit scope-control tradeoff — avoids building a full task-creation
  form/modal as part of the calendar feature.
- **Alternatives considered:** Click-to-add-task on any day cell. Deferred, not rejected —
  see `ROADMAP.md` Long-term ideas.
- **Consequences:** Users must still go through chat or the main board to add tasks; the
  calendar is read/review-oriented.
- **Affected files:** `components/calendar/MonthView.tsx`, `components/calendar/YearView.tsx`.
- **Verification status:** Inferred.

---

### DEC-005 — Year view shows density dots only, no task text
- **Date:** Inferred ~2026-08-06 (commit `6b55515`)
- **Status:** Accepted, in effect
- **Context:** A 12-mini-month year grid has far too little space per day cell for task text
  or checkboxes.
- **Decision:** Each day cell shows either a plain day number (no tasks) or a single colored
  dot (has tasks, colored by the first matching task's group) — matching how Google
  Calendar's own year view behaves.
- **Reasoning:** Verified — directly stated as the design rationale during the session that
  built this feature ("too dense for text at that zoom, consistent with Google Calendar's own
  year view").
- **Consequences:** `dominantGroup` picks the *first* task found, not a true majority/mode —
  a minor naming/behavior mismatch (see `TASKS.md` technical debt).
- **Affected files:** `components/calendar/YearView.tsx`.
- **Verification status:** Verified (reasoning captured directly, not just inferred from
  code shape).

---

### DEC-006 — Theme backgrounds are hotlinked Unsplash photos, not uploaded custom images
- **Date:** Inferred ~2026-08-06 (commit `6b55515`)
- **Status:** Accepted, in effect — flagged as a risk in `CLAUDE.md` ISSUE-004
- **Context:** The user initially asked for "real backgrounds with real PNG images from
  Google." Pulling arbitrary Google Images results was rejected on copyright/hotlink-risk
  grounds.
- **Decision:** Use specific, verified-live Unsplash photo URLs (one per palette), hotlinked
  directly in CSS via `url(...)`, layered under a light/dark scrim gradient for legibility —
  rather than building an upload feature or self-hosting the images.
- **Reasoning:** Verified — explicit tradeoff surfaced and chosen during the session: "real
  quick" delivery, Unsplash License permits this use without an API key or account, avoids
  building image-storage infrastructure.
- **Alternatives considered:** (a) Building an upload feature with Supabase Storage — more
  engineering, rejected for scope. (b) Self-hosting the same 4 chosen photos in `public/` —
  not rejected, just deferred (see `TASKS.md` TODO-003).
- **Consequences:** External dependency on specific Unsplash CDN URLs staying live
  indefinitely; no fallback if they go away.
- **Affected files:** `app/globals.css`.
- **Verification status:** Verified (the tradeoff and reasoning were explicit at decision
  time).

---

### DEC-007 — Templates replaced a header popover with a full `/templates` page
- **Date:** Inferred ~2026-08-06 (commit `6b55515`)
- **Status:** Accepted, in effect
- **Context:** An earlier iteration (commit `739a283`) added templates as a small popover in
  the main board's header.
- **Decision:** Replace the popover entirely with a dedicated `/templates` page showing full
  per-template task previews, rather than keeping both.
- **Reasoning:** Verified — explicit choice at decision time: the popover was "lackluster"
  (too cramped to show what a template actually adds); a full page gives room for real
  previews.
- **Consequences:** `components/TemplatePicker.tsx` (the old popover) was deleted entirely,
  not kept as a secondary shortcut.
- **Affected files:** `app/templates/page.tsx` (new), `components/TemplatePicker.tsx`
  (deleted), `app/page.tsx` (nav link changed from a popover trigger to a plain `Link`).
- **Verification status:** Verified.

---

### DEC-008 — No test framework has been added
- **Date:** Ongoing, since project inception (commit `4bd02bc`, initial Create-Next-App
  scaffold, through the current `HEAD`)
- **Status:** Accepted by omission — no decision record exists stating *why* tests were never
  added; this entry exists so future sessions know it was noticed, not overlooked.
- **Context:** A personal 2-user app built and iterated on quickly across many feature passes,
  each verified via manual curl/browser checks rather than automated tests.
- **Decision (by omission):** Ship without any automated test suite.
- **Reasoning:** **Unknown** — no comment, commit message, or discussion artifact in the repo
  states this was a deliberate choice vs. simply not gotten to yet. Do not assume it's
  permanent policy.
- **Consequences:** Every verification is manual and must be repeated by hand after changes;
  regressions in untouched code paths can go unnoticed. See `TESTING.md`.
- **Affected files:** Entire repo (absence of `*.test.*` files, no test script in
  `package.json`).
- **Verification status:** Inferred (the absence is Verified; the reasoning is Unknown).

---

### DEC-009 — Personality system: shared behavioral rules, per-persona voice only
- **Date:** 2026-08-06 (commit `eb3c34a`)
- **Status:** Accepted, in effect
- **Context:** The user asked for multiple selectable AI chat personalities (Nodo becomes
  just one of several), not a single fixed assistant.
- **Decision:** `lib/prompts.ts` keeps one shared `CORE_RULES` block (grounding, date
  reasoning, "Actions just taken" trust, etc.) and merges each personality's short `voice`
  string from `lib/personalities.ts` into a single template (`buildSystemPrompt`), rather
  than writing 5 fully independent system prompts.
- **Reasoning:** Verified — explicit design goal during implementation: extraction accuracy
  and confirmation correctness must not vary by which character is selected, only tone
  should. Independent per-personality prompts would risk the grounding rules drifting out of
  sync as more personalities are added later.
- **Alternatives considered:** Fully independent prompt per personality (more creative
  flexibility per character, but risks behavioral drift and duplicated maintenance across 5+
  prompts). Rejected in favor of the shared-rules approach.
- **Consequences:** Adding a 6th personality only requires a `voice` string + metadata in
  `lib/personalities.ts` — the behavioral contract is inherited automatically. A downside:
  personality voice is necessarily lighter-touch (one paragraph of flavor) rather than a
  deeply distinct prompt structure per character.
- **Affected files:** `lib/prompts.ts`, `lib/personalities.ts`, `app/api/chat/route.ts`.
- **Verification status:** Verified.

---

### DEC-010 — Personality and theme choice both live in `localStorage`, not per-account
- **Date:** 2026-08-06 (commit `eb3c34a`)
- **Status:** Accepted, in effect
- **Context:** Needed somewhere to persist which AI personality a user picked, across page
  reloads.
- **Decision:** Reuse the exact pattern already established for theme choice — a
  `localStorage` key (`nodability-personality`) read via component state, no database
  column, no `profiles` table involved.
- **Reasoning:** Inferred — consistency with the existing theme-storage pattern was
  preferred over introducing a new persistence mechanism (a `profiles` table) for a second,
  similarly low-stakes preference.
- **Consequences:** Personality choice, like theme, is per-browser — switching devices
  resets it to the default (Nodo). If this app ever gains a `profiles` table for other
  reasons, both settings would be reasonable candidates to migrate there together.
- **Affected files:** `components/ChatPanel.tsx`.
- **Verification status:** Inferred.

---

### DEC-011 — Notes have no stored links/edges table; `[[Wikilink]]`s resolve dynamically
- **Date:** 2026-08-06 (commit `f8e46ef`)
- **Status:** Accepted, in effect
- **Context:** The user asked for an Obsidian-style "neural network" of connected notes.
  Obsidian itself resolves `[[Wikilink]]`s dynamically against note titles rather than
  storing a separate graph-edges table, and this app's scale (one person's personal notes,
  likely dozens not thousands) doesn't need the query performance a stored-edges table would
  buy.
- **Decision:** `lib/notes.ts:extractWikilinkTitles` regex-parses `[[Title]]`/`[[Title|alias]]`
  syntax out of note content at read time; `buildNoteGraph` resolves those titles against the
  same user's other notes by case-insensitive match to build the graph shown in the UI. No
  migration adds an edges/links table.
- **Reasoning:** Simpler schema (one new table instead of two), matches Obsidian's own actual
  behavior (so the "connects like Obsidian" framing in the user's request is literally true,
  not just visually similar), and avoids a write-time sync problem (keeping a stored edges
  table consistent with edits to note content).
- **Alternatives considered:** A `note_links` join table populated on every note save.
  Rejected — more moving parts, and would need a backfill/repair step any time regex parsing
  logic changes.
- **Consequences:** Renaming a note breaks every existing `[[link]]` that pointed at its old
  title (they simply stop resolving, rather than being migrated) — this is a deliberate
  tradeoff, not a bug, and matches Obsidian's own default behavior without its "update links
  on rename" feature. See `FEATURES.md` §11 and `TASKS.md` technical debt.
- **Affected files:** `lib/notes.ts`, `supabase/migrations/006_notes.sql`,
  `components/notes/NoteGraph.tsx`.
- **Verification status:** Verified (explicit design goal during implementation).

---

### DEC-012 — Custom theme background applies `--bg-art` via inline JS style, not static CSS
- **Date:** 2026-08-06 (commit `f8e46ef`)
- **Status:** Accepted, in effect
- **Context:** The existing 10 curated palettes each define `--bg-art` as a static rule in
  `app/globals.css`, known at build time. A user-uploaded custom background is per-user data
  (a Storage URL) that doesn't exist at build time and can't be baked into a stylesheet rule.
- **Decision:** Treat `"custom"` as an 11th palette value. Its light/dark token blocks in
  `app/globals.css` define every variable except `--bg-art`; that one property is set directly on
  `document.documentElement.style` at runtime by `components/theme/ThemeProvider.tsx` (and replicated in
  `NO_FLASH_SCRIPT` so there's no flash-of-missing-background before React hydrates).
- **Reasoning:** Reuses 100% of the existing `data-palette`/`data-theme` mechanism and every
  component's existing `bg-bg`/`text-fg`/etc. Tailwind classes — no parallel styling system
  needed for the one palette whose background isn't known ahead of time.
- **Alternatives considered:** A separate React-rendered `<div>` with an inline
  `backgroundImage` style, bypassing the CSS-variable system entirely. Rejected — would
  duplicate the scrim-gradient-over-photo logic already expressed once in
  `lib/theme.ts:customBgArt` and once per palette in `app/globals.css`, and would need its own
  z-index/positioning instead of reusing the existing `body::before` rule.
- **Consequences:** The no-flash script (`NO_FLASH_SCRIPT`) now has to duplicate this
  runtime-style-setting logic, not just attribute-setting — a second place to keep in sync if
  the custom-background logic ever changes.
- **Affected files:** `lib/theme.ts`, `components/theme/ThemeProvider.tsx`, `app/globals.css`.
- **Verification status:** Verified (explicit design goal during implementation).

---

### DEC-013 — Swapped the Anthropic Claude API for a self-hosted OpenAI-compatible platform
- **Date:** 2026-08-06 (this session)
- **Status:** Accepted, in effect
- **Context:** The app previously called the Anthropic API directly (`@anthropic-ai/sdk`) for
  both the Haiku extraction call and the Sonnet chat reply, incurring pay-per-token Anthropic
  billing on every message. The user built a self-hosted, OpenAI-compatible model platform
  (`https://api.gariyuuu.com/v1`, one exposed model, `"Yuu no Sekai"`, backed by Qwen3-8B) and
  wanted both call sites pointed at it instead, to stop paying for direct Anthropic API access.
- **Decision:** Replace `@anthropic-ai/sdk` with the `openai` npm package throughout. New file
  `lib/ai-client.ts` (replaces lib/anthropic.ts) exports an `OpenAI` client constructed with
  `baseURL: "https://api.gariyuuu.com/v1"` and two model-name constants, `EXTRACTION_MODEL` and
  `CHAT_MODEL`, both currently the string `"Yuu no Sekai"` — kept as two separate constants
  (not collapsed to one) so the two call sites stay conceptually distinct in code in case a
  second model is added to the platform later. `lib/categorize.ts`'s forced tool-use call was
  translated from Anthropic's `tools`/`input_schema`/`tool_choice: {type:"tool", name}` shape to
  OpenAI's `tools: [{type:"function", function:{name, description, parameters}}]` /
  `tool_choice: {type:"function", function:{name}}` shape; the extracted result now comes from
  `response.choices[0].message.tool_calls[0].function.arguments` (a JSON string, parsed with
  `JSON.parse`) instead of Anthropic's `content` array `tool_use` block. `app/api/chat/route.ts`
  was translated from `anthropic.messages.stream(...)` + `.on("text", ...)` to
  `aiClient.chat.completions.create({stream: true, ...})` + `for await (const chunk of stream)`
  reading `chunk.choices[0]?.delta?.content`. Every request also sends
  `reasoning: { enabled: false }` (a platform-specific extension not in the `openai` npm
  package's TS types — the whole params object is cast via `as any as
  ChatCompletionCreateParams{Non,}Streaming` to allow it) to keep Qwen3 out of its default
  "thinking mode," which the user reported burns ~10x more output tokens otherwise.
- **Reasoning:** Directly requested — the user built and wanted to switch to their own
  platform to stop paying Anthropic. Kept the same two-call-site shape (cheap
  extraction/categorization call + capable streaming chat-reply call) since the platform
  currently exposes only one model; the constant split exists purely for future-proofing.
- **Alternatives considered:** Pointing `@anthropic-ai/sdk`'s client at the new `baseURL`
  directly (Anthropic SDK supports a `baseURL` override). Rejected — the new platform speaks
  the OpenAI-compatible protocol (`/v1/chat/completions`, OpenAI tool-calling schema), not
  Anthropic's `/v1/messages` wire format; the Anthropic SDK would send the wrong request shape.
- **Consequences:** The two tool-use response shapes differ meaningfully (Anthropic:
  `content[].type === "tool_use"` blocks with a pre-parsed `.input` object; OpenAI:
  `message.tool_calls[].function.arguments` as a raw JSON string requiring `JSON.parse`) — any
  future edit to the tool schema or response handling in `lib/categorize.ts` must use the
  OpenAI shape, not the old Anthropic one. Model selection is currently a no-op (both constants
  point at the same string) until the platform exposes a second model.
- **Affected files:** `package.json` (removed `@anthropic-ai/sdk`, added `openai`),
  `lib/ai-client.ts` (new, replaces deleted lib/anthropic.ts), `lib/categorize.ts`,
  `app/api/chat/route.ts`, `.env.local.example`/`.env.local` (`ANTHROPIC_API_KEY` renamed to
  `AI_PLATFORM_API_KEY`), `CLAUDE.md` (tech-stack line, env var table).
- **Verification status:** Verified — `npx tsc --noEmit`, `npm run lint`, `npm run build` all
  exit 0; the forced tool-use extraction path (`extractTasks`) was called directly (not through
  a live HTTP session, to avoid touching production Supabase data — see `SESSION_LOG.md`) with
  5 varied real messages including "remind me to buy milk tomorrow" and returned correctly
  shaped, correctly parsed structured output on every call; the streaming chat-reply path was
  verified with the same request shape used in `app/api/chat/route.ts`, returning an 11-chunk
  streamed reply grounded in injected task context.
