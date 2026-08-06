export type ThemeMode = "light" | "dark" | "system";
export type Palette = "slate" | "ocean" | "sunset" | "forest";

export const THEME_STORAGE_KEY = "nodability-theme";
export const PALETTE_STORAGE_KEY = "nodability-palette";

export const PALETTES: { id: Palette; label: string; swatch: string }[] = [
  { id: "slate", label: "Slate", swatch: "#111827" },
  { id: "ocean", label: "Ocean", swatch: "#0f7ea3" },
  { id: "sunset", label: "Sunset", swatch: "#e2683b" },
  { id: "forest", label: "Forest", swatch: "#2f7d4f" },
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
  } catch (e) {}
})();
`;
