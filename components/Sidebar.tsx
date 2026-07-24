"use client";

import { useEffect, useState } from "react";

interface Category {
  id: string;
  name: string;
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

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories ?? []));
  }, [refreshKey]);

  return (
    <nav className="w-48 shrink-0 border-r border-gray-200 pr-4">
      <h2 className="mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
        Categories
      </h2>
      <ul className="space-y-1">
        <li>
          <button
            onClick={() => onSelect(null)}
            className={`block w-full rounded px-2 py-1 text-left text-sm ${
              selected === null ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            All
          </button>
        </li>
        {categories.map((c) => (
          <li key={c.id}>
            <button
              onClick={() => onSelect(c.name)}
              className={`block w-full rounded px-2 py-1 text-left text-sm ${
                selected === c.name ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {c.name}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
