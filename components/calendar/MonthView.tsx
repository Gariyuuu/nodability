"use client";

import { getMonthGrid, getMonthLabel, addMonths, type CalendarTask } from "@/lib/calendar";
import { taskFallsOnDay } from "@/lib/week";
import { GROUP_COLORS } from "@/lib/groups";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_VISIBLE = 3;

export default function MonthView({
  monthDate,
  onMonthDateChange,
  tasks,
  onToggle,
}: {
  monthDate: Date;
  onMonthDateChange: (next: Date) => void;
  tasks: CalendarTask[];
  onToggle: (task: CalendarTask) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const weeks = getMonthGrid(monthDate);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => onMonthDateChange(addMonths(monthDate, -1))}
          className="rounded px-2 py-1 text-sm text-muted hover:bg-surface"
        >
          ← Prev
        </button>
        <h3 className="text-sm font-semibold">{getMonthLabel(monthDate)}</h3>
        <button
          onClick={() => onMonthDateChange(addMonths(monthDate, 1))}
          className="rounded px-2 py-1 text-sm text-muted hover:bg-surface"
        >
          Next →
        </button>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border text-center text-xs font-semibold text-muted">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="bg-surface py-1">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-b-lg border-x border-b border-border bg-border">
        {weeks.flat().map((day) => {
          const dayTasks = tasks.filter((t) => taskFallsOnDay(t, day.date));
          const visible = dayTasks.slice(0, MAX_VISIBLE);
          const overflow = dayTasks.length - visible.length;
          return (
            <div
              key={day.date}
              className={`min-h-[90px] bg-bg p-1 ${day.inMonth ? "" : "opacity-40"}`}
            >
              <p
                className={`mb-1 text-xs ${
                  day.date === today ? "font-semibold text-accent" : "text-muted"
                }`}
              >
                {Number(day.date.slice(-2))}
              </p>
              <ul className="space-y-0.5">
                {visible.map((task) => (
                  <li key={task.id} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={task.status === "done"}
                      onChange={() => onToggle(task)}
                      className="h-3 w-3 shrink-0"
                    />
                    {task.category_group ? (
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: GROUP_COLORS[task.category_group] }}
                      />
                    ) : null}
                    <span
                      className={`truncate text-[11px] ${
                        task.status === "done" ? "line-through text-muted" : "text-fg"
                      }`}
                      title={task.title}
                    >
                      {task.title}
                    </span>
                  </li>
                ))}
              </ul>
              {overflow > 0 ? (
                <p className="text-[10px] text-muted">+{overflow} more</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
