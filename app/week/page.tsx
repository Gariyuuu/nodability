"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ThemeToggle from "@/components/theme/ThemeToggle";
import WeekView from "@/components/calendar/WeekView";
import MonthView from "@/components/calendar/MonthView";
import YearView from "@/components/calendar/YearView";
import { GROUP_LABELS, GROUP_ORDER } from "@/lib/groups";
import type { CalendarTask } from "@/lib/calendar";
import type { CategoryGroup } from "@/lib/tasks";

type ViewMode = "week" | "month" | "year";
type GroupFilter = "all" | CategoryGroup;

export default function CalendarPage() {
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("week");
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("all");
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [year, setYear] = useState(() => new Date().getFullYear());

  const load = async () => {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(data.tasks ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const visibleTasks = useMemo(
    () =>
      groupFilter === "all"
        ? tasks
        : tasks.filter((t) => t.category_group === groupFilter),
    [tasks, groupFilter],
  );

  const toggle = async (task: CalendarTask) => {
    const nextStatus = task.status === "open" ? "done" : "open";
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, status: nextStatus }),
    });
  };

  const remove = async (task: CalendarTask) => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    await fetch("/api/tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id }),
    });
  };

  return (
    <div className="flex h-screen flex-col text-fg">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">Nodability — Calendar</h1>
        <div className="flex items-center gap-4">
          <Link href="/ideas" className="text-sm text-muted hover:text-fg">
            Ideas
          </Link>
          <Link href="/" className="text-sm text-muted hover:text-fg">
            Chat + full board →
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex gap-1">
          {(["week", "month", "year"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded px-3 py-1 text-sm capitalize ${
                view === v ? "bg-accent text-accent-fg" : "text-muted hover:bg-surface"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setGroupFilter("all")}
            className={`rounded px-2 py-1 text-xs ${
              groupFilter === "all" ? "bg-accent text-accent-fg" : "text-muted hover:bg-surface"
            }`}
          >
            All
          </button>
          {GROUP_ORDER.map((g) => (
            <button
              key={g}
              onClick={() => setGroupFilter(g)}
              className={`rounded px-2 py-1 text-xs ${
                groupFilter === g ? "bg-accent text-accent-fg" : "text-muted hover:bg-surface"
              }`}
            >
              {GROUP_LABELS[g]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : view === "week" ? (
          <WeekView tasks={visibleTasks} onToggle={toggle} onRemove={remove} />
        ) : view === "month" ? (
          <MonthView
            monthDate={monthDate}
            onMonthDateChange={setMonthDate}
            tasks={visibleTasks}
            onToggle={toggle}
          />
        ) : (
          <YearView
            year={year}
            onYearChange={setYear}
            tasks={visibleTasks}
            onSelectMonth={(d) => {
              setMonthDate(d);
              setView("month");
            }}
          />
        )}
      </div>
    </div>
  );
}
