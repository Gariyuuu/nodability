"use client";

import { useEffect, useState } from "react";
import type { CategoryGroup } from "@/lib/tasks";
import { GROUP_COLORS, GROUP_LABELS, nextGroup } from "@/lib/groups";

interface Category {
  id: string;
  name: string;
  group_name: CategoryGroup;
}

export default function Sidebar({
  refreshKey,
  selected,
  onSelect,
}: {
  refreshKey: number;
  selected: string | null;
  onSelect: (name: string | null) => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);

  const load = () => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories ?? []));
  };

  useEffect(load, [refreshKey]);

  const cycleGroup = async (category: Category) => {
    const next = nextGroup(category.group_name);
    setCategories((prev) =>
      prev.map((c) => (c.id === category.id ? { ...c, group_name: next } : c)),
    );
    await fetch("/api/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: category.id, group: next }),
    });
  };

  return (
    <nav className="w-48 shrink-0 border-r border-border pr-4">
      <h2 className="mb-1 text-xs font-semibold text-muted uppercase tracking-wide">
        🏷️ Categories
      </h2>
      {categories.length > 0 ? (
        <p className="mb-3 text-[11px] leading-snug text-muted">
          Click the dot to tag a category Academic/Personal/Work/Other — used to color and
          filter the calendar.
        </p>
      ) : null}
      <ul className="space-y-1">
        <li>
          <button
            onClick={() => onSelect(null)}
            className={`block w-full rounded px-2 py-1 text-left text-sm ${
              selected === null ? "bg-accent text-accent-fg" : "text-fg hover:bg-surface"
            }`}
          >
            🗂️ All
          </button>
        </li>
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-1">
            <button
              onClick={() => onSelect(c.name)}
              className={`block flex-1 rounded px-2 py-1 text-left text-sm ${
                selected === c.name ? "bg-accent text-accent-fg" : "text-fg hover:bg-surface"
              }`}
            >
              {c.name}
            </button>
            <button
              onClick={() => cycleGroup(c)}
              title={`Group: ${GROUP_LABELS[c.group_name]} (click to change)`}
              aria-label={`Group: ${GROUP_LABELS[c.group_name]} (click to change)`}
              className="h-3.5 w-3.5 shrink-0 rounded-full border border-border hover:scale-110"
              style={{ backgroundColor: GROUP_COLORS[c.group_name] }}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}
