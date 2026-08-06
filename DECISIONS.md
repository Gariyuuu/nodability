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
