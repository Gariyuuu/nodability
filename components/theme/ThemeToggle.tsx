"use client";

import { useState } from "react";
import { PALETTES } from "@/lib/theme";
import { useTheme } from "./ThemeProvider";

const MODES = [
  { id: "light" as const, label: "Light" },
  { id: "dark" as const, label: "Dark" },
  { id: "system" as const, label: "System" },
];

export default function ThemeToggle() {
  const { mode, palette, setMode, setPalette } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Theme settings"
        title="Theme settings"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-sm text-muted hover:text-fg"
      >
        🎨
      </button>
      {open ? (
        <div className="absolute right-0 z-10 mt-2 w-48 rounded-lg border border-border bg-surface p-3 shadow-lg">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Mode</p>
          <div className="mb-3 flex gap-1">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`flex-1 rounded px-2 py-1 text-xs ${
                  mode === m.id ? "bg-accent text-accent-fg" : "text-fg hover:bg-bg"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Palette</p>
          <div className="flex gap-2">
            {PALETTES.map((p) => (
              <button
                key={p.id}
                onClick={() => setPalette(p.id)}
                aria-label={p.label}
                title={p.label}
                className={`h-6 w-6 rounded-full border-2 ${
                  palette === p.id ? "border-fg" : "border-transparent"
                }`}
                style={{ backgroundColor: p.swatch }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
