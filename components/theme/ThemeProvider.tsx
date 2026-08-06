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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [palette, setPaletteState] = useState<Palette>("slate");

  // Sync React state from what the no-flash script already read/applied.
  useEffect(() => {
    const storedMode = (localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null) ?? "system";
    const storedPalette =
      (localStorage.getItem(PALETTE_STORAGE_KEY) as Palette | null) ?? "slate";
    setModeState(storedMode);
    setPaletteState(storedPalette);
  }, []);

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
