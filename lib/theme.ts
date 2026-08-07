export type ThemeMode = "light" | "dark" | "system";
export type Palette =
  | "slate"
  | "ocean"
  | "sunset"
  | "forest"
  | "rose"
  | "mint"
  | "lavender"
  | "amber"
  | "midnight"
  | "coral"
  | "custom";

export const THEME_STORAGE_KEY = "nodability-theme";
export const PALETTE_STORAGE_KEY = "nodability-palette";
// Stores the uploaded image URL itself (not just a flag) — the "custom"
// palette in globals.css has no --bg-art of its own; it's applied inline via
// ThemeProvider/the no-flash script using this value.
export const CUSTOM_BG_STORAGE_KEY = "nodability-custom-bg";

// Builds the --bg-art value for an uploaded custom photo, matching the same
// light/dark scrim approach as the 10 curated palettes (a flat semi-opaque
// wash so the photo reads as a subtle background rather than full-bleed).
export function customBgArt(url: string, resolvedMode: "light" | "dark"): string {
  const scrim =
    resolvedMode === "dark" ? "rgba(10, 10, 10, 0.82)" : "rgba(255, 255, 255, 0.78)";
  return `linear-gradient(${scrim}, ${scrim}), url("${url}")`;
}

export const PALETTES: { id: Palette; label: string; preview: string }[] = [
  {
    id: "slate",
    label: "Slate",
    preview: "linear-gradient(135deg, #64748b, #1e293b)",
  },
  {
    id: "ocean",
    label: "Ocean",
    preview: "linear-gradient(135deg, #37b6dd, #0f7ea3)",
  },
  {
    id: "sunset",
    label: "Sunset",
    preview: "linear-gradient(135deg, #ff8a5c, #c75a8c)",
  },
  {
    id: "forest",
    label: "Forest",
    preview: "linear-gradient(135deg, #4fae76, #2f7d4f)",
  },
  {
    id: "rose",
    label: "Rose",
    preview: "linear-gradient(135deg, #ff8fab, #e0527a)",
  },
  {
    id: "mint",
    label: "Mint",
    preview: "linear-gradient(135deg, #2fd9ac, #14b892)",
  },
  {
    id: "lavender",
    label: "Lavender",
    preview: "linear-gradient(135deg, #a17ef0, #7c5cd6)",
  },
  {
    id: "amber",
    label: "Amber",
    preview: "linear-gradient(135deg, #e0a83a, #c98a1c)",
  },
  {
    id: "midnight",
    label: "Midnight",
    preview: "linear-gradient(135deg, #5b69c9, #2c3577)",
  },
  {
    id: "coral",
    label: "Coral",
    preview: "linear-gradient(135deg, #ff7a45, #e8582a)",
  },
];

// Inlined into a <script> in the <head> so the right theme applies before
// first paint — without this, every load would flash the default palette.
export const NO_FLASH_SCRIPT = `
(function() {
  try {
    var mode = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}) || "system";
    var palette = localStorage.getItem(${JSON.stringify(PALETTE_STORAGE_KEY)}) || "slate";
    var resolved = mode === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : mode;
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.setAttribute("data-palette", palette);
    if (palette === "custom") {
      var customUrl = localStorage.getItem(${JSON.stringify(CUSTOM_BG_STORAGE_KEY)});
      if (customUrl) {
        var scrim = resolved === "dark" ? "rgba(10, 10, 10, 0.82)" : "rgba(255, 255, 255, 0.78)";
        document.documentElement.style.setProperty(
          "--bg-art",
          "linear-gradient(" + scrim + ", " + scrim + "), url(\\"" + customUrl + "\\")"
        );
      }
    }
  } catch (e) {}
})();
`;
