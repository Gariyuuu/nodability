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
