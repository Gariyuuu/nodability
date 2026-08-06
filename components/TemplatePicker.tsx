"use client";

import { useState } from "react";
import { STARTER_TEMPLATES } from "@/lib/templates";

export default function TemplatePicker({ onApplied }: { onApplied: () => void }) {
  const [open, setOpen] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);

  const apply = async (templateId: string) => {
    setApplying(templateId);
    try {
      await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      onApplied();
      setOpen(false);
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-sm text-muted hover:text-fg"
      >
        Templates
      </button>
      {open ? (
        <div className="absolute right-0 z-10 mt-2 w-64 rounded-lg border border-border bg-surface p-3 shadow-lg">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Quick start
          </p>
          <ul className="space-y-2">
            {STARTER_TEMPLATES.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => apply(t.id)}
                  disabled={applying !== null}
                  className="w-full rounded border border-border bg-bg px-3 py-2 text-left text-sm hover:border-accent disabled:opacity-50"
                >
                  <span className="font-medium text-fg">{t.name}</span>
                  <span className="block text-xs text-muted">{t.description}</span>
                  {applying === t.id ? (
                    <span className="block text-xs text-muted">Adding…</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
