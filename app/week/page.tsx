"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatTimeOnly, formatWeekdayLabel } from "@/lib/format";
import { getCurrentWeekDays, taskFallsOnDay } from "@/lib/week";

interface Task {
  id: string;
  title: string;
  category_name: string | null;
  start_date: string | null;
  end_date: string | null;
  due_time: string | null;
  status: "open" | "done";
}

function DayCard({
  day,
  tasks,
  isToday,
  onToggle,
  onRemove,
}: {
  day: string;
  tasks: Task[];
  isToday: boolean;
  onToggle: (task: Task) => void;
  onRemove: (task: Task) => void;
}) {
  return (
    <div className={`rounded-lg border p-3 ${isToday ? "border-gray-900" : "border-gray-200"}`}>
      <h3 className="mb-2 text-sm font-semibold text-gray-700">{formatWeekdayLabel(day)}</h3>
      {tasks.length === 0 ? (
        <p className="text-xs text-gray-300">Nothing scheduled</p>
      ) : (
        <ul className="space-y-1">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={task.status === "done"}
                onChange={() => onToggle(task)}
                className="h-4 w-4"
              />
              <span
                className={`flex-1 text-sm ${
                  task.status === "done" ? "line-through text-gray-400" : "text-gray-800"
                }`}
              >
                {task.title}
                {task.category_name ? (
                  <span className="ml-1 text-xs text-gray-400">({task.category_name})</span>
                ) : null}
                {task.due_time ? (
                  <span className="ml-1 text-xs text-gray-400">{formatTimeOnly(task.due_time)}</span>
                ) : null}
              </span>
              <button
                onClick={() => onRemove(task)}
                aria-label={`Delete ${task.title}`}
                title="Delete task"
                className="rounded px-2 py-1 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function WeekPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [weekDays] = useState(() => getCurrentWeekDays());

  const load = async () => {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(data.tasks ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

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
  };

  const leftDays = weekDays.slice(0, 4); // Mon-Thu
  const rightDays = weekDays.slice(4); // Fri-Sun

  return (
    <div className="flex h-screen flex-col bg-white text-gray-900">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h1 className="text-lg font-semibold">Nodability — This Week</h1>
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">
          Chat + full board →
        </Link>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : (
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-4">
              {leftDays.map((day) => (
                <DayCard
                  key={day}
                  day={day}
                  isToday={day === today}
                  tasks={tasks.filter((t) => taskFallsOnDay(t, day))}
                  onToggle={toggle}
                  onRemove={remove}
                />
              ))}
            </div>
            <div className="space-y-4">
              {rightDays.map((day) => (
                <DayCard
                  key={day}
                  day={day}
                  isToday={day === today}
                  tasks={tasks.filter((t) => taskFallsOnDay(t, day))}
                  onToggle={toggle}
                  onRemove={remove}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
