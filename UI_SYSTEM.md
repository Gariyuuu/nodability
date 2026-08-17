# UI_SYSTEM.md

## Layout system

No CSS grid/flex framework beyond Tailwind utilities. `app/page.tsx` (main board) is a fixed
3-column desktop layout: `Sidebar` (fixed `w-48`) + `TaskBoard` (flexible, scrollable) +
`ChatPanel` (fixed `w-96`), inside a `flex h-screen flex-col` shell. Other pages
(`week`, `ideas`, `templates`, `changelog`, `login`) use a header + `flex-1 overflow-y-auto`
content area with a centered `max-w-*` container.

## Navigation

Plain `next/link` `<Link>` components in each page's header — no shared `<Nav>` component,
each page hand-codes its own header links. Current cross-links:
`app/page.tsx` → Ideas, Calendar (`/week`), What's new (`/changelog`), Templates, theme
toggle, sign out. `app/week/page.tsx` → Ideas, "Chat + full board" (`/`), theme toggle, plus
the Week/Month/Year tabs and group-filter chips (not links — local state toggles). `app/ideas/page.tsx`
→ "Chat + full board" (`/`), theme toggle. `app/templates/page.tsx` → "Back to board" (`/`).
`app/changelog/page.tsx` → "Back to board" (`/`).

## Page structure

- `app/layout.tsx` — root layout: Geist fonts, no-flash theme `<script>`, wraps `children` in
  `<ThemeProvider>`.
- Every page below it is `"use client"` and independently fetches its own data, **except
  `app/changelog/page.tsx`**, which is a plain Server Component rendering `lib/changelog.ts`'s
  static array with no fetch.

## Reusable components

| Component | File | Used by |
|---|---|---|
| `Sidebar` | `components/Sidebar.tsx` | `app/page.tsx` |
| `TaskBoard` | `components/TaskBoard.tsx` | `app/page.tsx` |
| `ChatPanel` | `components/ChatPanel.tsx` | `app/page.tsx` |
| `WeekView` | `components/calendar/WeekView.tsx` | `app/week/page.tsx` |
| `MonthView` | `components/calendar/MonthView.tsx` | `app/week/page.tsx` |
| `YearView` | `components/calendar/YearView.tsx` | `app/week/page.tsx` |
| `ThemeProvider` | `components/theme/ThemeProvider.tsx` | `app/layout.tsx` |
| `ThemeToggle` | `components/theme/ThemeToggle.tsx` | `app/page.tsx`, `app/week/page.tsx`, `app/ideas/page.tsx` |

There is **no shared component library** (no shadcn/ui, no Radix, no headless-UI primitives).
No `Button`/`Card`/`Modal` primitives exist — every button/card is a one-off `<button>`/`<div>`
with inline Tailwind classes.

## Component hierarchy (main board)

```
app/page.tsx
├── header (nav links, TemplatePicker→now a Link, ThemeToggle, sign-out form)
├── Sidebar (fetches /api/categories)
├── TaskBoard (fetches /api/tasks, receives filterCategory from page state)
└── ChatPanel (posts /api/chat, calls onTasksChanged→bumps page's refreshKey)
```

## Themes

- **Definition location:** `app/globals.css` — CSS custom properties scoped by
  `:root[data-palette="..."]` and `:root[data-palette="..."][data-theme="dark"]` selectors.
  Re-exposed as Tailwind v4 utilities via `@theme inline { --color-bg: var(--bg); ... }` — so
  `bg-bg`, `text-fg`, `bg-surface`, `border-border`, `text-muted`, `bg-accent`,
  `text-accent-fg` are all real Tailwind utility classes generated from these tokens, **not**
  arbitrary-value syntax.
- **No `tailwind.config.js`** — Tailwind v4's CSS-first `@theme` config is used exclusively
  (Verified: no config file exists in the repo).
- **State + persistence:** `components/theme/ThemeProvider.tsx` holds `mode` (`light | dark |
  system`) and `palette` (`slate | ocean | sunset | forest`) in React state, synced to
  `localStorage` (`lib/theme.ts` keys `nodability-theme` / `nodability-palette`), and sets
  `data-theme`/`data-palette` attributes on `document.documentElement`.
- **No-flash script:** `lib/theme.ts:NO_FLASH_SCRIPT`, inlined via `<script
  dangerouslySetInnerHTML>` in `app/layout.tsx`'s `<head>`, runs before first paint to read
  `localStorage` and set the DOM attributes synchronously — without this, every load would
  flash the default (Slate/light) theme before correcting.
- **Picker UI:** `components/theme/ThemeToggle.tsx` — a 🎨 button opening a small popover with
  3 mode buttons and a 2×2 grid of palette preview swatches (each a small gradient rectangle
  matching that palette's actual background photo mood, defined in `lib/theme.ts:PALETTES`).

## Light mode / dark mode behavior

Each of the 4 palettes defines a complete light and dark variant (8 variable blocks total in
`app/globals.css`). "System" mode resolves via `window.matchMedia("(prefers-color-scheme:
dark)")` and re-resolves live if the OS setting changes while the app is open (a
`matchMedia` change listener in `components/theme/ThemeProvider.tsx`).

## Colors

7 semantic tokens per palette/mode combination: `bg`, `fg`, `surface`, `border`, `muted`,
`accent`, `accent-fg`. Exact hex values are in `app/globals.css` — not duplicated here to
avoid drift; that file is the single source of truth. **Do not use raw Tailwind palette
classes** (`bg-gray-100`, `text-blue-600`, etc.) anywhere in this app except for the
intentionally palette-independent destructive-action hover state (`hover:bg-red-50
hover:text-red-600` on delete buttons, used consistently across `components/TaskBoard.tsx`,
`components/calendar/WeekView.tsx`, `app/ideas/page.tsx`) and the 4 fixed life-area group
colors in `lib/groups.ts` (`GROUP_COLORS` — these are deliberately palette-independent so
group coloring stays legible/distinct across every theme).

## Background artwork

`app/globals.css`'s `--bg-art` CSS variable (one value per palette/mode block) is a
`linear-gradient(scrim), url(unsplash-photo)` stack, applied via a `body::before` pseudo-
element (`position: fixed; inset: 0; z-index: -1; background-size: cover; background-position:
center;`). Page-level wrapper `<div>`s deliberately do **not** set an opaque background color
(they were changed from `bg-bg` to no background class during the photo-backgrounds pass) so
this artwork shows through the app chrome. Cards/panels (`bg-surface`, or the `bg-bg` used on
inputs) remain fully opaque so text stays legible.

## Typography

Geist Sans / Geist Mono via `next/font/google`, loaded in `app/layout.tsx` and exposed as CSS
variables (`--font-geist-sans`, `--font-geist-mono`) → re-exposed as `--font-sans`/`--font-mono`
in the `@theme inline` block. `app/globals.css`'s `body` rule still falls back to
`font-family: Arial, Helvetica, sans-serif` as a literal CSS property (not a Tailwind class) —
Inferred leftover from the original Create-Next-App scaffold, likely superseded in practice by
the Geist variable but not cleaned up.

## Spacing, border radius, shadows

No custom spacing/radius scale — plain Tailwind defaults (`p-6`, `rounded`, `rounded-lg`,
`shadow-lg` on the theme-picker popover) used directly, no design-token abstraction for these.

## Breakpoints

Tailwind defaults only (`sm:`, `lg:` used sparingly — e.g. `app/templates/page.tsx`'s
`sm:grid-cols-3`, `components/calendar/YearView.tsx`'s `sm:grid-cols-3 lg:grid-cols-4`). The
main board (`app/page.tsx`) has **no responsive breakpoints at all** — it's a fixed desktop
3-column layout. **Inferred gap**, not manually verified on a real mobile device/viewport.

## Animations

None beyond native browser transitions (e.g. `hover:` color changes via Tailwind's implicit
transition-less color swap — no `transition` utility classes are used anywhere, so hover state
changes are instant, not animated).

## Icon system

- **Favicon/app icon:** `app/icon.tsx` (32×32) and `app/apple-icon.tsx` (180×180), both
  generated at build time via `next/og`'s `ImageResponse` — a gradient rounded square with a
  lowercase "n". No traditional `.ico`/`.png` asset editing required to change this; edit the
  JSX/styles in these two files.
- **In-UI icons:** plain Unicode/emoji characters used inline — 🎨 (theme toggle), 🌱 (chat
  avatar), ✕ (delete buttons), → (nav arrows), arrows built from `←`/`→` text in calendar nav.
  No icon font or SVG icon library (e.g. no lucide-react, no heroicons) is installed or used.
- **Old default favicon:** `app/favicon.ico` (Create-Next-App's original placeholder) still
  exists but is superseded by `app/icon.tsx` for modern browsers.

## Image asset conventions

The 10 curated theme background photos are self-hosted at a chosen `public/theme/*.jpg` filename
(originally the first 4 were hotlinked from `images.unsplash.com`, downloaded for
durability — see `public/theme/SOURCES.md` for provenance), referenced via plain CSS `url()`
in `app/globals.css`. **User-uploaded custom backgrounds are different**: they live in
Supabase Storage (bucket `theme-uploads`, not `public/`), applied via an inline CSS custom
property set by JavaScript (`components/theme/ThemeProvider.tsx`) rather than a static stylesheet rule, since
the URL is per-user data unknown at build time. There is no `next/image` usage anywhere in
this app, for either kind of image. The unused Create-Next-App scaffold SVGs that used to
live in `public/` have been deleted.

## Accessibility

Minimal but present: `aria-label`/`title` attributes on icon-only buttons (delete buttons in
`components/TaskBoard.tsx`/`components/calendar/WeekView.tsx`/`app/ideas/page.tsx`, the group-cycling dot in `components/Sidebar.tsx`,
the theme-toggle button). No systematic audit has been performed — no confirmed keyboard-nav
testing, no confirmed screen-reader testing, no `prefers-reduced-motion` handling (moot today
since there are no animations).

## Responsive design rules

See Breakpoints above — inconsistent across pages. `app/templates/page.tsx` and
`components/calendar/YearView.tsx` have real breakpoint-based grid changes; `app/page.tsx`
does not reflow at all on narrow viewports.

## Modals

No true modal/dialog component exists. The closest equivalent is the absolutely-positioned
popover pattern used by `ThemeToggle` and (in the previous, now-deleted, `TemplatePicker`) —
a `<div className="absolute ...">` toggled by local `open` state, no focus trap, no
`Escape`-to-close, no backdrop click-to-close.

## Notifications / toasts

None exist anywhere in the app — all feedback is inline (e.g. the chat's own bubbles, the
login page's "Check your email" text, error text rendered directly under a button).

## Forms

No form library (no react-hook-form, no Zod-based form validation on the client). Every form
is plain controlled `<input>`/`<textarea>` + `useState`, submitted via a button `onClick` or
`onKeyDown` Enter-key handler. The one Server Action form (`signOutAction` in `app/page.tsx`)
is a plain `<form action={signOutAction}>` with no client-side JS.

## Loading / empty / error states

Present per-page, hand-written each time (no shared `<Loading>`/`<Empty>`/`<ErrorState>`
component) — see each feature's entry in [FEATURES.md](FEATURES.md) for the exact copy used.

## Browser support

Not explicitly targeted or tested — Inferred to be "whatever the two real users' own
browsers are" (unknown from the repo). No polyfills, no explicit `browserslist` config beyond
Next.js's own defaults.

## Known visual inconsistencies

- `app/page.tsx`'s 3-column layout has no mobile breakpoint (see Breakpoints above).
- The theme-picker and (formerly) templates popovers use ad hoc absolute positioning with no
  shared "popover" abstraction — if a 3rd popover is added, consider extracting a shared
  component rather than copying the pattern a 3rd time.
- `app/globals.css`'s literal `font-family: Arial, Helvetica, sans-serif` on `body` looks like an
  unintentional leftover from the original scaffold given Geist fonts are loaded and wired via
  CSS variables elsewhere in the same file.
