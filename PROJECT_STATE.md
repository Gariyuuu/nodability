# PROJECT_STATE.md

**This file describes the exact state of the repository at the moment of the last update. It
is meant to let a new session resume from precisely this point.**

- **Last updated:** 2026-08-06 — a feature session that added an Obsidian-style linked notes
  system (`/notes`) and custom theme background image uploads.
- **Current branch:** `main`
- **Latest commit:** `f8e46ef` — "Add Obsidian-style linked notes and custom theme background
  uploads". Previous commits: `49cd6e4` (docs), `eb3c34a` (10 themes/personalities/liveliness),
  `720e9a2` (docs), `18200e7` (bug/tech-debt fix pass), `d92a96b` (doc-sync), `071f6a3`
  (documentation/memory system), `6b55515` (calendar views, real photo backgrounds, templates
  page, chat suggestions).
- **Working tree: clean** (Verified via `git status` after the commit).
- **Pushed:** Everything through `720e9a2` was pushed earlier per explicit user instruction.
  **`eb3c34a`, `49cd6e4`, and `f8e46ef` have not been pushed** — ask before pushing. Verify
  current push status with `git status`/`git log` rather than trusting this note.
- **Deployed to production.** `vercel --prod --yes` was run after `f8e46ef`; live smoke tests
  confirm the deployment matches the commit (see "What currently works" below).
- **Uncommitted files:** None. **Untracked files:** None.
- **Database/infra state:** Migrations `006_notes.sql` and `007_theme_uploads_bucket.sql`
  have been run against production (Verified live: `notes` table queryable, `theme-uploads`
  Storage bucket exists with `public: true`).

## Active development objective

None. The feature request ("add ability to add custom images to the system and an obsidian
system... connecting different notes to each other in a neural network for each class") is
complete:
- **Notes system:** `/notes` page — create/edit notes, optionally tag them to a category
  ("class"), link between them with `[[Wikilink]]` syntax (Obsidian's own mechanic), and view
  everything as a force-directed graph. New `notes` table (migration `006`); no stored edges
  table — links are resolved dynamically by title match at read time
  (`lib/notes.ts:buildNoteGraph`).
- **Custom theme images:** An 11th "Custom" palette slot in the theme picker. Upload your own
  photo via `POST /api/theme-image`, which stores it in a new public Supabase Storage bucket
  (`theme-uploads`, migration `007`) and applies it at runtime via an inline CSS property
  (since it's per-user data, unlike the 10 curated palettes' static `globals.css` rules).

## Last completed task

The notes/custom-images feature request above, commit `f8e46ef`. Key implementation details
for a future session:
- **This is the app's first file-upload feature and first new data table since the original
  schema** — both `app/api/theme-image/route.ts` (upload pattern) and
  `supabase/migrations/007_theme_uploads_bucket.sql` (bucket-creation-via-SQL pattern) are
  now the precedents to copy for any future upload feature or bucket.
- Notes deliberately have **no stored links/edges table** — `[[Wikilink]]` resolution happens
  live by case-insensitive title match among the same user's notes
  (`lib/notes.ts:extractWikilinkTitles`, `buildNoteGraph`). This means renaming a note breaks
  old links to its *previous* title (by design, not a bug — see `FEATURES.md` §11).
- The graph view uses a hand-rolled force-directed layout (`lib/graph-layout.ts`) — no new
  npm dependency was added for this, consistent with this app's general avoidance of heavy
  dependencies for small, contained problems.
- The 5 AI personalities and the notes system were both user-facing requests handled in
  back-to-back sessions; the personalities' names/voices were a creative default (see below),
  the notes/graph design followed 3 explicit scope-confirming answers from the user
  (Obsidian-style `[[wikilinks]]`, optional category tagging, theme-backgrounds-only for the
  image-upload scope).

All changes were verified: `npx tsc --noEmit`, `npm run lint`, `npm run build` all exit 0;
the storage upload path was tested end-to-end (a real image uploaded directly to
`theme-uploads`, confirmed publicly fetchable via its URL, then cleaned up); the notes table
was tested end-to-end (two notes inserted with a wikilink between them, the case-insensitive
unique-title constraint confirmed to correctly reject a duplicate with Postgres error
`23505`, then cleaned up); deployed via `vercel --prod --yes`; live route-gating confirmed via
curl (`/notes` → 307, `/api/notes` → 401, `/api/theme-image` POST → 401 when logged out).

## Current unfinished task

**None.**

## Files related to the unfinished task

N/A — no task is unfinished.

## What has already been attempted (this session, informational)

- Asked 3 clarifying questions before writing any code, since this request introduced real
  new infrastructure (a Storage bucket, a new table, a graph UI) rather than extending an
  established pattern: confirmed Obsidian-style `[[wikilinks]]` (not a manual link picker),
  categories as optional tags (not a hard per-class boundary), and custom images scoped to
  theme backgrounds only (not a general attachment system).
- Verified the new Storage upload path and the new `notes` table directly against the live
  database/bucket (not just via the HTTP API, which can't be exercised without a real
  browser session) — see "Last completed task" above for exactly what was tested.
- The graph's *visual* rendering (actual node/edge positions on screen) was **not**
  screenshot-verified the way theme palettes were in a prior session — only the underlying
  data logic (linking, layout algorithm producing coordinates) was confirmed. Worth a manual
  look once there are real notes to render.

## What currently works (Verified)

- Production deployment is live and correctly gated: `/notes` → 307, `/api/notes` → 401,
  `/api/theme-image` (POST) → 401, all when logged out.
- `npm run build`, `npx tsc --noEmit`, and `npm run lint` all pass cleanly (exit 0).
- The `notes` table and `theme-uploads` Storage bucket both exist in production and behave
  as expected (unique-title constraint, public-read bucket) — verified via direct
  service-role queries, not just "the migration ran without error."
- Two real Supabase Auth accounts exist and have been used to sign in successfully. Real
  email addresses are intentionally not recorded in this repo's docs (public GitHub remote).
- Live production data: 19 tasks, 112 chat messages, 7 ideas, 3 categories, 0 notes (brand
  new table, no real notes created yet) as of the original audit plus this session's checks.

## What currently fails / errors observed

Nothing application-level. `npm audit` still reports 3 high-severity advisories (deliberately
deferred, see `ISSUE-006` in `CLAUDE.md`) — unchanged by this session.

## Blockers

None.

## Assumptions currently in use (Inferred, not stated anywhere explicitly)

- Custom background image choice, like theme/palette/personality choice, is per-browser
  (`localStorage` holds the URL), not per-account — consistent with the existing pattern.
  The uploaded *file* itself lives server-side in Storage regardless, so it isn't lost if
  localStorage is cleared, just no longer referenced by the UI.
- Old custom-background uploads are never deleted (no cleanup on replace) — acceptable at
  2-user personal scale, would need addressing if storage costs or object count ever became
  a real concern. See `TASKS.md`.
- The "for each class" framing in the user's request was interpreted as "notes can optionally
  belong to a category" (matching an explicit answer to a clarifying question), not "notes
  must belong to exactly one category" — cross-category linking is allowed.

## Temporary decisions (things done for expedience, flagged as such at the time)

- `app/api/theme-image/route.ts` trusts the client-reported file MIME type rather than
  inspecting file bytes — acceptable given the 2-trusted-user threat model, flagged in
  `SECURITY.md` as a real gap if this app's audience/exposure ever changes.
- No cleanup of superseded custom background uploads (see Assumptions above).

## Next recommended actions

1. **Ask before pushing** `eb3c34a`, `49cd6e4`, and `f8e46ef` — 3 local commits, none pushed.
2. Try the notes/graph feature with real notes and eyeball the graph rendering — it was
   verified at the data-logic level but not visually.
3. Consider adding cleanup for superseded custom theme uploads (delete the old Storage object
   when a new one replaces it).
4. Longer-standing deferred items unchanged by this session: `ISSUE-006` (`npm audit
   fix --force`), a minimal test suite, and confirming whether the life-area-grouping
   discoverability fix changed real adoption.

## Verification required before continuing

- Run `git status` and `git log --oneline -3` at the start of any new session. Expect: clean
  tree, `HEAD` at `f8e46ef`, `main` ahead of `origin/main` by 3 commits (unless pushed since
  this was written — always verify directly).
- Re-run `npm run build`, `npx tsc --noEmit`, and `npm run lint` to confirm the "all pass"
  status in this file is still accurate.
- If resuming much later, re-verify Supabase migration state (`007` should be the latest
  applied) and re-check live row counts, since real usage continues independent of code
  changes.
