"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  CUSTOM_BG_STORAGE_KEY,
  PALETTE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  customBgArt,
  type Palette,
  type ThemeMode,
} from "@/lib/theme";

interface ThemeContextValue {
  mode: ThemeMode;
  palette: Palette;
  customBgUrl: string | null;
  setMode: (mode: ThemeMode) => void;
  setPalette: (palette: Palette) => void;
  setCustomBgUrl: (url: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(mode: ThemeMode, palette: Palette, customBgUrl: string | null) {
  const resolved =
    mode === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : mode;
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.setAttribute("data-palette", palette);
  if (palette === "custom" && customBgUrl) {
    document.documentElement.style.setProperty("--bg-art", customBgArt(customBgUrl, resolved));
  } else {
    document.documentElement.style.removeProperty("--bg-art");
  }
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
function readStoredCustomBgUrl(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CUSTOM_BG_STORAGE_KEY);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);
  const [palette, setPaletteState] = useState<Palette>(readStoredPalette);
  const [customBgUrl, setCustomBgUrlState] = useState<string | null>(readStoredCustomBgUrl);

  useEffect(() => {
    applyTheme(mode, palette, customBgUrl);
    if (mode !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => applyTheme(mode, palette, customBgUrl);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, [mode, palette, customBgUrl]);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
  };
  const setPalette = (next: Palette) => {
    setPaletteState(next);
    localStorage.setItem(PALETTE_STORAGE_KEY, next);
  };
  const setCustomBgUrl = (url: string) => {
    setCustomBgUrlState(url);
    localStorage.setItem(CUSTOM_BG_STORAGE_KEY, url);
    setPalette("custom");
  };

  return (
    <ThemeContext.Provider
      value={{ mode, palette, customBgUrl, setMode, setPalette, setCustomBgUrl }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
