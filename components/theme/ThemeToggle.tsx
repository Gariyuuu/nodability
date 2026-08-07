"use client";

import { useRef, useState } from "react";
import { PALETTES } from "@/lib/theme";
import { useTheme } from "./ThemeProvider";

const MODES = [
  { id: "light" as const, label: "Light" },
  { id: "dark" as const, label: "Dark" },
  { id: "system" as const, label: "System" },
];

export default function ThemeToggle() {
  const { mode, palette, customBgUrl, setMode, setPalette, setCustomBgUrl } = useTheme();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/theme-image", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "Upload failed");
        return;
      }
      setCustomBgUrl(data.url);
    } catch {
      setUploadError("Upload failed — check your connection and try again.");
    } finally {
      setUploading(false);
    }
  };

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
        <div className="absolute right-0 z-10 mt-2 w-72 rounded-lg border border-border bg-surface p-3 shadow-lg">
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
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
            Palette ({PALETTES.length})
          </p>
          <div className="mb-3 grid grid-cols-3 gap-2">
            {PALETTES.map((p) => (
              <button
                key={p.id}
                onClick={() => setPalette(p.id)}
                title={p.label}
                className={`flex flex-col items-center gap-1 rounded-md border-2 p-1 ${
                  palette === p.id ? "border-fg" : "border-transparent"
                }`}
              >
                <span
                  className="h-8 w-full rounded"
                  style={{ backgroundImage: p.preview }}
                />
                <span className="text-[10px] text-fg">{p.label}</span>
              </button>
            ))}
            <button
              onClick={() =>
                customBgUrl ? setPalette("custom") : fileInputRef.current?.click()
              }
              title="Custom background"
              className={`flex flex-col items-center gap-1 rounded-md border-2 p-1 ${
                palette === "custom" ? "border-fg" : "border-transparent"
              }`}
            >
              {customBgUrl ? (
                <span
                  className="h-8 w-full rounded bg-cover bg-center"
                  style={{ backgroundImage: `url("${customBgUrl}")` }}
                />
              ) : (
                <span className="flex h-8 w-full items-center justify-center rounded border border-dashed border-border text-xs text-muted">
                  📷 +
                </span>
              )}
              <span className="text-[10px] text-fg">Custom</span>
            </button>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full rounded border border-border px-2 py-1.5 text-xs text-muted hover:border-accent hover:text-fg disabled:opacity-50"
          >
            {uploading ? "Uploading…" : customBgUrl ? "📷 Replace your photo" : "📷 Upload your own background"}
          </button>
          {uploadError ? <p className="mt-1 text-[11px] text-red-600">{uploadError}</p> : null}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = "";
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
