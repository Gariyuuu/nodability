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

interface Category {
  id: string;
  name: string;
}

/** Box key for tasks that belong to no category. Real boxes are keyed by category id. */
const NO_CATEGORY = "__none__";

interface Box {
  key: string;
  categoryId: string | null;
  name: string;
}

interface Draft {
  title: string;
  categoryName: string;
  startDate: string;
  endDate: string;
  dueTime: string;
}

const emptyDraft = (categoryName = ""): Draft => ({
  title: "",
  categoryName,
  startDate: "",
  endDate: "",
  dueTime: "",
});

const boxKeyOf = (task: Task) => task.category_id ?? NO_CATEGORY;

/** `<input type="time">` wants HH:MM; Postgres hands back HH:MM:SS. */
const toTimeInput = (value: string | null) => (value ? value.slice(0, 5) : "");

/**
 * Pure move: returns `tasks` with `dragId` re-parented into `boxKey` and positioned at
 * `index` within that box. `index` counts positions in the box *as rendered* (i.e. including
 * the dragged task itself when it's being reordered inside its own box).
 */
function moveTask(
  tasks: Task[],
  dragId: string,
  box: Box,
  index: number,
): Task[] {
  const dragged = tasks.find((t) => t.id === dragId);
  if (!dragged) return tasks;

  const renderedIndex = tasks.filter((t) => boxKeyOf(t) === box.key).findIndex((t) => t.id === dragId);
  const targetIndex = renderedIndex !== -1 && renderedIndex < index ? index - 1 : index;

  const without = tasks.filter((t) => t.id !== dragId);
  const boxItems = without.filter((t) => boxKeyOf(t) === box.key);
  const moved: Task = { ...dragged, category_id: box.categoryId, category_name: box.categoryId ? box.name : null };

  const anchor = boxItems[targetIndex];
  if (anchor) {
    const at = without.indexOf(anchor);
    return [...without.slice(0, at), moved, ...without.slice(at)];
  }

  const last = boxItems[boxItems.length - 1];
  if (!last) return [...without, moved];
  const at = without.indexOf(last) + 1;
  return [...without.slice(0, at), moved, ...without.slice(at)];
}

export default function TaskBoard({
  refreshKey,
  filterCategory,
  onDataChanged,
}: {
  refreshKey: number;
  filterCategory: string | null;
  onDataChanged?: () => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft());
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addDraft, setAddDraft] = useState<Draft>(emptyDraft());
  const [newCategory, setNewCategory] = useState<string | null>(null);

  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ box: string; index: number } | null>(null);

  const load = async () => {
    const [taskRes, categoryRes] = await Promise.all([
      fetch("/api/tasks"),
      fetch("/api/categories"),
    ]);
    const [taskData, categoryData] = await Promise.all([taskRes.json(), categoryRes.json()]);
    setTasks(taskData.tasks ?? []);
    setCategories(categoryData.categories ?? []);
    setLoading(false);
  };

  useEffect(() => {
    // Standard fetch-on-mount/refresh: setState happens after an await, not synchronously in
    // the effect body. See app/ideas/page.tsx for the same justification.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [refreshKey]);

  // --- task mutations -------------------------------------------------------

  const toggle = async (task: Task) => {
    const nextStatus = task.status === "open" ? "done" : "open";
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
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
    // Emptying a category deletes it server-side (deleteCategoryIfEmpty), so resync the
    // sidebar and the box list.
    onDataChanged?.();
  };

  const startEdit = (task: Task) => {
    setAddingTo(null);
    setEditingId(task.id);
    setEditDraft({
      title: task.title,
      categoryName: task.category_name ?? "",
      startDate: task.start_date ?? "",
      endDate: task.end_date ?? "",
      dueTime: toTimeInput(task.due_time),
    });
  };

  const saveEdit = async () => {
    if (!editingId || !editDraft.title.trim()) return;
    const id = editingId;
    setEditingId(null);

    const res = await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        title: editDraft.title.trim(),
        categoryName: editDraft.categoryName.trim() || null,
        startDate: editDraft.startDate || null,
        endDate: editDraft.endDate || null,
        dueTime: editDraft.dueTime || null,
      }),
    });
    const data = await res.json();
    if (data.task) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...data.task } : t)));
      onDataChanged?.();
    } else {
      setNotice("😕 Couldn't save that edit — try again.");
    }
  };

  const addTask = async (box: Box) => {
    const title = addDraft.title.trim();
    if (!title) return;
    setAddDraft(emptyDraft(addDraft.categoryName));

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        categoryName: box.categoryId ? box.name : null,
        startDate: addDraft.startDate || null,
        endDate: addDraft.endDate || null,
        dueTime: addDraft.dueTime || null,
      }),
    });
    const data = await res.json();
    if (data.task) {
      setTasks((prev) => [...prev, data.task]);
    } else {
      setNotice("😕 Couldn't add that task — try again.");
    }
  };

  // --- category mutations ---------------------------------------------------

  const addCategory = async () => {
    const name = (newCategory ?? "").trim();
    if (!name) return;
    setNewCategory(null);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.category) {
      setCategories((prev) =>
        prev.some((c) => c.id === data.category.id)
          ? prev
          : [...prev, data.category].sort((a, b) => a.name.localeCompare(b.name)),
      );
      onDataChanged?.();
    }
  };

  const removeCategory = async (box: Box) => {
    if (!box.categoryId) return;
    const res = await fetch("/api/categories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: box.categoryId }),
    });
    if (res.ok) {
      setCategories((prev) => prev.filter((c) => c.id !== box.categoryId));
      onDataChanged?.();
    } else {
      setNotice("😕 That list still has tasks in it.");
    }
  };

  // --- drag and drop --------------------------------------------------------

  const handleDrop = async (box: Box) => {
    const id = dragId;
    setDragId(null);
    setDropTarget(null);
    if (!id) return;

    const rendered = tasks.filter((t) => boxKeyOf(t) === box.key);
    const index = dropTarget?.box === box.key ? dropTarget.index : rendered.length;

    const next = moveTask(tasks, id, box, index);
    if (next === tasks) return;
    setTasks(next);

    const orderedIds = next.filter((t) => boxKeyOf(t) === box.key).map((t) => t.id);
    const res = await fetch("/api/tasks/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: box.categoryId, orderedIds, movedTaskId: id }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setNotice("😕 Couldn't save that move — refresh to see the real order.");
    } else if (data && data.ordered === false) {
      setNotice(
        "ℹ️ Moved between lists, but the position within a list won't stick until migration " +
          "008 (supabase/migrations/008_task_sort_order.sql) is run.",
      );
    }
  };

  // --- render ---------------------------------------------------------------

  if (loading) {
    return <p className="text-sm text-muted">⏳ Loading tasks…</p>;
  }

  const hasUncategorized = tasks.some((t) => t.category_id === null);
  const allBoxes: Box[] = [
    ...categories.map((c) => ({ key: c.id, categoryId: c.id, name: c.name })),
    ...(hasUncategorized ? [{ key: NO_CATEGORY, categoryId: null, name: "Uncategorized" }] : []),
  ];
  const boxes = filterCategory ? allBoxes.filter((b) => b.name === filterCategory) : allBoxes;

  const categoryNames = categories.map((c) => c.name);

  // The three date/time inputs shared by the add and edit forms. All optional — a task with
  // no dates is fine, and `end` only matters for multi-day things (see lib/format.ts).
  const draftFields = (draft: Draft, setDraft: (d: Draft) => void) => (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
      <label className="flex items-center gap-1">
        from
        <input
          type="date"
          value={draft.startDate}
          onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
          aria-label="Start date"
          className="rounded border border-border bg-bg px-2 py-1 text-xs text-fg"
        />
      </label>
      <label className="flex items-center gap-1">
        to
        <input
          type="date"
          value={draft.endDate}
          onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
          aria-label="End date (for multi-day things)"
          className="rounded border border-border bg-bg px-2 py-1 text-xs text-fg"
        />
      </label>
      <label className="flex items-center gap-1">
        at
        <input
          type="time"
          value={draft.dueTime}
          onChange={(e) => setDraft({ ...draft, dueTime: e.target.value })}
          aria-label="Time"
          className="rounded border border-border bg-bg px-2 py-1 text-xs text-fg"
        />
      </label>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {newCategory === null ? (
          <button
            onClick={() => setNewCategory("")}
            className="rounded border border-border px-2 py-1 text-xs text-muted hover:bg-surface hover:text-fg"
          >
            ＋ New list
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addCategory();
            }}
            className="flex items-center gap-2"
          >
            <input
              autoFocus
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setNewCategory(null)}
              placeholder="List name…"
              aria-label="New list name"
              className="rounded border border-border bg-bg px-2 py-1 text-xs text-fg"
            />
            <button
              type="submit"
              className="rounded bg-accent px-2 py-1 text-xs text-accent-fg hover:opacity-90"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setNewCategory(null)}
              className="text-xs text-muted hover:text-fg"
            >
              Cancel
            </button>
          </form>
        )}
        <p className="text-[11px] text-muted">
          Drag a task to reorder it or drop it into another list. Click a task to edit it
          yourself — no need to ask Nodo.
        </p>
      </div>

      {notice && (
        <div className="flex items-start gap-2 rounded border border-border bg-surface px-3 py-2 text-xs text-muted">
          <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss" className="hover:text-fg">
            ✕
          </button>
        </div>
      )}

      {boxes.length === 0 ? (
        <p className="text-sm text-muted">
          ✨ No tasks yet — tell the chat what you have to do, grab a template above, or make a
          list and add them yourself.
        </p>
      ) : null}

      {boxes.map((box) => {
        const items = tasks.filter((t) => boxKeyOf(t) === box.key);
        const isDropBox = dragId !== null;
        return (
          <section
            key={box.key}
            onDragOver={(e) => {
              if (!dragId) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setDropTarget({ box: box.key, index: items.length });
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(box);
            }}
            className={`rounded-lg border p-3 transition-colors ${
              dropTarget?.box === box.key
                ? "border-accent bg-surface"
                : isDropBox
                  ? "border-dashed border-border"
                  : "border-border"
            }`}
          >
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide">
                {box.name}
              </h3>
              <span className="text-[11px] text-muted">{items.length}</span>
              <button
                onClick={() => {
                  setEditingId(null);
                  setAddDraft(emptyDraft());
                  setAddingTo(addingTo === box.key ? null : box.key);
                }}
                aria-label={`Add a task to ${box.name}`}
                title="Add a task"
                className="ml-auto rounded px-2 py-0.5 text-xs text-muted hover:bg-surface hover:text-fg"
              >
                ＋
              </button>
              {box.categoryId && items.length === 0 && (
                <button
                  onClick={() => removeCategory(box)}
                  aria-label={`Delete the ${box.name} list`}
                  title="Delete this empty list"
                  className="rounded px-2 py-0.5 text-xs text-muted hover:bg-surface hover:text-fg"
                >
                  🗑
                </button>
              )}
            </div>

            <ul className="space-y-1">
              {items.length === 0 && addingTo !== box.key && (
                <li className="py-2 text-xs text-muted">Drop tasks here.</li>
              )}

              {items.map((task, index) => (
                <li key={task.id}>
                  {dropTarget?.box === box.key && dropTarget.index === index && (
                    <div className="mb-1 h-0.5 rounded bg-accent" aria-hidden />
                  )}
                  {editingId === task.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveEdit();
                      }}
                      className="space-y-2 rounded border border-accent p-2"
                    >
                      <input
                        autoFocus
                        value={editDraft.title}
                        onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
                        onKeyDown={(e) => e.key === "Escape" && setEditingId(null)}
                        aria-label="Task title"
                        className="w-full rounded border border-border bg-bg px-2 py-1 text-sm text-fg"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={editDraft.categoryName}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, categoryName: e.target.value })
                          }
                          aria-label="List"
                          className="rounded border border-border bg-bg px-2 py-1 text-xs text-fg"
                        >
                          <option value="">Uncategorized</option>
                          {categoryNames.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                        {draftFields(editDraft, setEditDraft)}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          className="rounded bg-accent px-2 py-1 text-xs text-accent-fg hover:opacity-90"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="text-xs text-muted hover:text-fg"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", task.id);
                        setDragId(task.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setDropTarget(null);
                      }}
                      onDragOver={(e) => {
                        if (!dragId) return;
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = "move";
                        const rect = e.currentTarget.getBoundingClientRect();
                        const after = e.clientY > rect.top + rect.height / 2;
                        setDropTarget({ box: box.key, index: index + (after ? 1 : 0) });
                      }}
                      className={`flex items-center gap-2 rounded px-1 py-0.5 ${
                        dragId === task.id ? "opacity-40" : "hover:bg-surface"
                      }`}
                    >
                      <span
                        aria-hidden
                        title="Drag to reorder or move to another list"
                        className="cursor-grab select-none text-xs text-muted active:cursor-grabbing"
                      >
                        ⠿
                      </span>
                      <input
                        type="checkbox"
                        checked={task.status === "done"}
                        onChange={() => toggle(task)}
                        aria-label={`Mark ${task.title} ${
                          task.status === "done" ? "not done" : "done"
                        }`}
                        className="h-4 w-4"
                      />
                      <button
                        onClick={() => startEdit(task)}
                        title="Edit this task"
                        className={`text-left ${
                          task.status === "done" ? "line-through text-muted" : "text-fg"
                        }`}
                      >
                        {task.status === "done" ? "🎉 " : ""}
                        {task.title}
                      </button>
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
                    </div>
                  )}
                  {dropTarget?.box === box.key &&
                    dropTarget.index === index + 1 &&
                    index === items.length - 1 && (
                      <div className="mt-1 h-0.5 rounded bg-accent" aria-hidden />
                    )}
                </li>
              ))}

              {addingTo === box.key && (
                <li>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      addTask(box);
                    }}
                    className="space-y-2 rounded border border-border p-2"
                  >
                    <input
                      autoFocus
                      value={addDraft.title}
                      onChange={(e) => setAddDraft({ ...addDraft, title: e.target.value })}
                      onKeyDown={(e) => e.key === "Escape" && setAddingTo(null)}
                      placeholder={`New task in ${box.name}…`}
                      aria-label="New task title"
                      className="w-full rounded border border-border bg-bg px-2 py-1 text-sm text-fg"
                    />
                    {draftFields(addDraft, setAddDraft)}
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        className="rounded bg-accent px-2 py-1 text-xs text-accent-fg hover:opacity-90"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddingTo(null)}
                        className="text-xs text-muted hover:text-fg"
                      >
                        Done adding
                      </button>
                    </div>
                  </form>
                </li>
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
