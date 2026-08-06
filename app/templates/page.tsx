"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { STARTER_TEMPLATES } from "@/lib/templates";

export default function TemplatesPage() {
  const router = useRouter();
  const [applying, setApplying] = useState<string | null>(null);

  const apply = async (templateId: string) => {
    setApplying(templateId);
    try {
      await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      router.push("/");
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="flex h-screen flex-col text-fg">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">🧩 Nodability — Templates</h1>
        <Link href="/" className="text-sm text-muted hover:text-fg">
          Back to board →
        </Link>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl">
          <p className="mb-6 text-sm text-muted">
            Pick a starting point — this adds the categories and a few example tasks to
            your board. Safe to apply more than one.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {STARTER_TEMPLATES.map((t) => (
              <div
                key={t.id}
                className="flex flex-col rounded-lg border border-border bg-surface p-4"
              >
                <h2 className="mb-1 text-sm font-semibold text-fg">
                  {t.emoji} {t.name}
                </h2>
                <p className="mb-3 text-xs text-muted">{t.description}</p>
                <ul className="mb-4 flex-1 space-y-1">
                  {t.tasks.map((task, i) => (
                    <li key={i} className="text-xs text-muted">
                      <span className="font-medium text-fg">{task.category}:</span> {task.title}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => apply(t.id)}
                  disabled={applying !== null}
                  className="w-full rounded bg-accent px-3 py-2 text-sm text-accent-fg disabled:opacity-50"
                >
                  {applying === t.id ? "Adding…" : `Use this template ${t.emoji}`}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
