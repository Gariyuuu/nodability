export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  notes: string[];
}

// Hand-maintained — add a new entry here whenever you ship something worth
// mentioning. Newest first.
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.8",
    date: "2026-08-06",
    title: "Linked notes and custom backgrounds",
    notes: [
      "New Notes page — take notes per class, link them together with [[double brackets]] like Obsidian, and view your whole web of ideas as a graph",
      "Upload your own photo as a theme background instead of picking from the built-in palettes",
    ],
  },
  {
    version: "0.7",
    date: "2026-08-06",
    title: "10 themes, custom AI personalities, and a livelier look",
    notes: [
      "6 new color palettes — Rose, Mint, Lavender, Amber, Midnight, and Coral join the original 4, for 10 total",
      "Meet the crew: pick who you chat with — Nodo 🌱, Rex 🐺, Sage 🧘, Turbo ⚡, or Professor Hoot 🦦 — each with a different personality",
      "More emoji and personality sprinkled throughout the app so it feels less like a spreadsheet",
    ],
  },
  {
    version: "0.6",
    date: "2026-08-06",
    title: "Real photo backgrounds, calendar views, and quick-start templates",
    notes: [
      "Theme backgrounds are now real photography instead of flat gradients",
      "New Month and Year calendar views alongside the original Week view",
      "Tag categories as Academic, Personal, Work, or Other to color-code and filter your calendar",
      "Templates moved to their own page with a full preview of what each one adds",
      "The chat now suggests a few starter questions instead of a blank box",
    ],
  },
  {
    version: "0.5",
    date: "2026-08-05",
    title: "Themes, templates, and a friendlier chat",
    notes: [
      "Light/dark mode plus four color palettes (Slate, Ocean, Sunset, Forest)",
      "Quick-start templates to seed categories for Student, Work, or Home & Life",
      "The chat assistant now has a name and a bit more personality",
      "A real app icon instead of the default Next.js favicon",
      "This page — patch notes for what's changed",
    ],
  },
  {
    version: "0.4",
    date: "2026-08-04",
    title: "Private accounts",
    notes: [
      "Real sign-in (magic link) — your tasks, ideas, and chat history are now private to your account",
      "Fixed the chat assistant treating checked-off tasks as still due",
    ],
  },
  {
    version: "0.3",
    date: "2026-08-03",
    title: "Idea box",
    notes: ["A lightweight place to jot down ideas before they become tasks"],
  },
  {
    version: "0.2",
    date: "2026-07-24",
    title: "Task board and chat",
    notes: [
      "Chat with the assistant to add and organize tasks by category",
      "Task board grouped by category, plus a week view",
    ],
  },
  {
    version: "0.1",
    date: "2026-07-22",
    title: "Initial setup",
    notes: ["Project created"],
  },
];
