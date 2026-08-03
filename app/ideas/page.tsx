"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Idea {
  id: string;
  content: string;
  created_at: string;
}

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch("/api/ideas");
    const data = await res.json();
    setIdeas(data.ideas ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    const content = input.trim();
    if (!content || saving) return;

    setSaving(true);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (data.idea) {
        setIdeas((prev) => [data.idea, ...prev]);
        setInput("");
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (idea: Idea) => {
    setIdeas((prev) => prev.filter((i) => i.id !== idea.id));
    await fetch("/api/ideas", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: idea.id }),
    });
  };

  return (
    <div className="flex h-screen flex-col bg-white text-gray-900">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h1 className="text-lg font-semibold">Nodability — Ideas</h1>
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">
          Chat + full board →
        </Link>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  save();
                }
              }}
              placeholder="Jot down an idea…"
              rows={2}
              className="flex-1 resize-none rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
            <button
              onClick={save}
              disabled={saving || !input.trim()}
              className="self-end rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Save
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : ideas.length === 0 ? (
            <p className="text-sm text-gray-400">No ideas yet — jot one down above.</p>
          ) : (
            <ul className="space-y-2">
              {ideas.map((idea) => (
                <li
                  key={idea.id}
                  className="flex items-start gap-2 rounded-lg border border-gray-200 px-3 py-2"
                >
                  <span className="flex-1 text-sm whitespace-pre-wrap text-gray-800">
                    {idea.content}
                  </span>
                  <button
                    onClick={() => remove(idea)}
                    aria-label="Delete idea"
                    title="Delete idea"
                    className="rounded px-2 py-1 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
