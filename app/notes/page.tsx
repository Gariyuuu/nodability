"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ThemeToggle from "@/components/theme/ThemeToggle";
import NoteGraph from "@/components/notes/NoteGraph";
import { buildNoteGraph, extractWikilinkTitles, type NoteWithCategory } from "@/lib/notes";

interface Category {
  id: string;
  name: string;
}

type ViewMode = "editor" | "graph";

export default function NotesPage() {
  const [notes, setNotes] = useState<NoteWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("editor");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftCategoryId, setDraftCategoryId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = async () => {
    const [notesRes, categoriesRes] = await Promise.all([
      fetch("/api/notes"),
      fetch("/api/categories"),
    ]);
    const notesData = await notesRes.json();
    const categoriesData = await categoriesRes.json();
    setNotes(notesData.notes ?? []);
    setCategories(categoriesData.categories ?? []);
    setLoading(false);
  };

  useEffect(() => {
    // Standard fetch-on-mount: setState happens after an await, not synchronously in the
    // effect body. See app/ideas/page.tsx for the same justification.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const selectNote = (id: string | null) => {
    setSelectedId(id);
    setSaveError(null);
    setView("editor");
    const note = notes.find((n) => n.id === id);
    setDraftTitle(note?.title ?? "");
    setDraftContent(note?.content ?? "");
    setDraftCategoryId(note?.category_id ?? "");
  };

  const startNewNote = () => {
    setSelectedId(null);
    setSaveError(null);
    setView("editor");
    setDraftTitle("");
    setDraftContent("");
    setDraftCategoryId("");
  };

  const save = async () => {
    if (!draftTitle.trim() || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const body = {
        title: draftTitle,
        content: draftContent,
        categoryId: draftCategoryId || null,
      };
      const res = await fetch("/api/notes", {
        method: selectedId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedId ? { id: selectedId, ...body } : body),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error ?? "Couldn't save that note.");
        return;
      }
      await load();
      setSelectedId(data.note.id);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    await fetch("/api/notes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (selectedId === id) startNewNote();
    await load();
  };

  const grouped = notes.reduce<Record<string, NoteWithCategory[]>>((acc, n) => {
    const key = n.category_name ?? "Uncategorized";
    (acc[key] ??= []).push(n);
    return acc;
  }, {});
  const groupNames = Object.keys(grouped).sort();

  const graph = useMemo(() => buildNoteGraph(notes), [notes]);
  const outgoingLinks = extractWikilinkTitles(draftContent);
  const incomingLinks = notes.filter(
    (n) => n.id !== selectedId && extractWikilinkTitles(n.content).some(
      (t) => t.toLowerCase() === draftTitle.trim().toLowerCase(),
    ),
  );

  return (
    <div className="flex h-screen flex-col text-fg">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">🧠 Nodability — Notes</h1>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-muted hover:text-fg">
            Chat + full board →
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex gap-1">
          {(["editor", "graph"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded px-3 py-1 text-sm capitalize ${
                view === v ? "bg-accent text-accent-fg" : "text-muted hover:bg-surface"
              }`}
            >
              {v === "editor" ? "✏️ Editor" : "🕸️ Graph"}
            </button>
          ))}
        </div>
        <button
          onClick={startNewNote}
          className="rounded bg-accent px-3 py-1 text-sm text-accent-fg"
        >
          + New note
        </button>
      </div>
      {loading ? (
        <p className="p-6 text-sm text-muted">⏳ Loading…</p>
      ) : view === "graph" ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl">
            <p className="mb-3 text-sm text-muted">
              Every note is a node; every <code>[[Wikilink]]</code> is a connection. Click a
              node to open it.
            </p>
            <NoteGraph
              nodes={graph.nodes}
              edges={graph.edges}
              onSelectNote={(id) => selectNote(id)}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <nav className="w-56 shrink-0 overflow-y-auto border-r border-border p-4">
            {notes.length === 0 ? (
              <p className="text-xs text-muted">No notes yet.</p>
            ) : (
              groupNames.map((name) => (
                <div key={name} className="mb-4">
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                    {name}
                  </h3>
                  <ul className="space-y-0.5">
                    {grouped[name].map((n) => (
                      <li key={n.id}>
                        <button
                          onClick={() => selectNote(n.id)}
                          className={`block w-full truncate rounded px-2 py-1 text-left text-sm ${
                            selectedId === n.id
                              ? "bg-accent text-accent-fg"
                              : "text-fg hover:bg-surface"
                          }`}
                        >
                          📝 {n.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </nav>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-2xl space-y-3">
              <input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Note title"
                className="w-full rounded border border-border bg-bg px-3 py-2 text-sm font-semibold outline-none focus:border-accent"
              />
              <select
                value={draftCategoryId}
                onChange={(e) => setDraftCategoryId(e.target.value)}
                className="w-full rounded border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="">No class / uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <textarea
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                placeholder="Write your note. Link to another note with [[Note Title]]."
                rows={14}
                className="w-full resize-none rounded border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
              />
              {outgoingLinks.length > 0 && (
                <div className="text-xs text-muted">
                  🔗 Links to: {outgoingLinks.join(", ")}
                </div>
              )}
              {incomingLinks.length > 0 && (
                <div className="text-xs text-muted">
                  ⬅️ Linked from: {incomingLinks.map((n) => n.title).join(", ")}
                </div>
              )}
              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={save}
                  disabled={saving || !draftTitle.trim()}
                  className="rounded bg-accent px-4 py-2 text-sm text-accent-fg disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save 💾"}
                </button>
                {selectedId && (
                  <button
                    onClick={() => remove(selectedId)}
                    className="rounded border border-border px-4 py-2 text-sm text-muted hover:bg-red-50 hover:text-red-600"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
