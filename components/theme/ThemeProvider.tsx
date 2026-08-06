"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  PALETTE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  type Palette,
  type ThemeMode,
} from "@/lib/theme";

interface ThemeContextValue {
  mode: ThemeMode;
  palette: Palette;
  setMode: (mode: ThemeMode) => void;
  setPalette: (palette: Palette) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(mode: ThemeMode, palette: Palette) {
  const resolved =
    mode === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : mode;
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.setAttribute("data-palette", palette);
}

// `typeof window === "undefined"` during SSR (localStorage doesn't exist in Node) — falls
// back to the same defaults the server rendered, then reads the real value synchronously on
// the client's first render. No hydration mismatch: mode/palette never affect visible DOM
// while the theme popover is closed, and this avoids an extra post-mount re-render entirely
// (no setState-in-effect needed for hydration).
function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null) ?? "system";
}
function readStoredPalette(): Palette {
  if (typeof window === "undefined") return "slate";
  return (localStorage.getItem(PALETTE_STORAGE_KEY) as Palette | null) ?? "slate";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);
  const [palette, setPaletteState] = useState<Palette>(readStoredPalette);

  useEffect(() => {
    applyTheme(mode, palette);
    if (mode !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => applyTheme(mode, palette);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, [mode, palette]);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
  };
  const setPalette = (next: Palette) => {
    setPaletteState(next);
    localStorage.setItem(PALETTE_STORAGE_KEY, next);
  };

  return (
    <ThemeContext.Provider value={{ mode, palette, setMode, setPalette }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
