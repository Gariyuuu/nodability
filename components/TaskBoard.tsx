"use client";

import { useEffect, useState } from "react";
import { formatTaskWhen } from "@/lib/format";

interface Task {
  id: string;
  title: string;
  category_id: string | null;
  category_name: string | null;
  start_date: string | null;
  end_date: string | null;
  due_time: string | null;
  status: "open" | "done";
}

export default function TaskBoard({
  refreshKey,
  filterCategory,
}: {
  refreshKey: number;
  filterCategory: string | null;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(data.tasks ?? []);
    setLoading(false);
  };

  useEffect(() => {
    // Standard fetch-on-mount/refresh: setState happens after an await, not synchronously in
    // the effect body. See app/ideas/page.tsx for the same justification.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [refreshKey]);

  const toggle = async (task: Task) => {
    const nextStatus = task.status === "open" ? "done" : "open";
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)),
    );
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, status: nextStatus }),
    });
  };

  const remove = async (task: Task) => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    await fetch("/api/tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id }),
    });
  };

  if (loading) {
    return <p className="text-sm text-muted">⏳ Loading tasks…</p>;
  }

  const visibleTasks = filterCategory
    ? tasks.filter((t) => t.category_name === filterCategory)
    : tasks;

  const grouped = visibleTasks.reduce<Record<string, Task[]>>((acc, t) => {
    const key = t.category_name ?? "Uncategorized";
    (acc[key] ??= []).push(t);
    return acc;
  }, {});

  const categoryNames = Object.keys(grouped).sort();

  if (categoryNames.length === 0) {
    return (
      <p className="text-sm text-muted">
        ✨ No tasks yet — tell the chat what you have to do, or grab a template above, and
        it&apos;ll show up here.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {categoryNames.map((name) => (
        <div key={name}>
          <h3 className="mb-2 text-sm font-semibold text-muted uppercase tracking-wide">
            {name}
          </h3>
          <ul className="space-y-1">
            {grouped[name].map((task) => (
              <li key={task.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={task.status === "done"}
                  onChange={() => toggle(task)}
                  className="h-4 w-4"
                />
                <span
                  className={
                    task.status === "done"
                      ? "line-through text-muted"
                      : "text-fg"
                  }
                >
                  {task.status === "done" ? "🎉 " : ""}
                  {task.title}
                </span>
                {formatTaskWhen(task.start_date, task.end_date, task.due_time) && (
                  <span className="text-xs text-muted">
                    ({formatTaskWhen(task.start_date, task.end_date, task.due_time)})
                  </span>
                )}
                <button
                  onClick={() => remove(task)}
                  aria-label={`Delete ${task.title}`}
                  title="Delete task"
                  className="ml-auto rounded px-2 py-1 text-sm font-medium text-muted hover:bg-red-50 hover:text-red-600"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
