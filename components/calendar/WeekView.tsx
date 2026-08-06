"use client";

import { formatTimeOnly, formatWeekdayLabel } from "@/lib/format";
import { getCurrentWeekDays, taskFallsOnDay } from "@/lib/week";
import { GROUP_COLORS } from "@/lib/groups";
import type { CalendarTask } from "@/lib/calendar";

function DayCard({
  day,
  tasks,
  isToday,
  onToggle,
  onRemove,
}: {
  day: string;
  tasks: CalendarTask[];
  isToday: boolean;
  onToggle: (task: CalendarTask) => void;
  onRemove: (task: CalendarTask) => void;
}) {
  return (
    <div className={`rounded-lg border p-3 ${isToday ? "border-accent" : "border-border"}`}>
      <h3 className="mb-2 text-sm font-semibold text-fg">{formatWeekdayLabel(day)}</h3>
      {tasks.length === 0 ? (
        <p className="text-xs text-muted">🌤️ Nothing scheduled</p>
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
              {task.category_group ? (
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: GROUP_COLORS[task.category_group] }}
                />
              ) : null}
              <span
                className={`flex-1 text-sm ${
                  task.status === "done" ? "line-through text-muted" : "text-fg"
                }`}
              >
                {task.title}
                {task.category_name ? (
                  <span className="ml-1 text-xs text-muted">({task.category_name})</span>
                ) : null}
                {task.due_time ? (
                  <span className="ml-1 text-xs text-muted">{formatTimeOnly(task.due_time)}</span>
                ) : null}
              </span>
              <button
                onClick={() => onRemove(task)}
                aria-label={`Delete ${task.title}`}
                title="Delete task"
                className="rounded px-2 py-1 text-sm font-medium text-muted hover:bg-red-50 hover:text-red-600"
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

export default function WeekView({
  tasks,
  onToggle,
  onRemove,
}: {
  tasks: CalendarTask[];
  onToggle: (task: CalendarTask) => void;
  onRemove: (task: CalendarTask) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const weekDays = getCurrentWeekDays();
  const leftDays = weekDays.slice(0, 4); // Mon-Thu
  const rightDays = weekDays.slice(4); // Fri-Sun

  return (
    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-4">
        {leftDays.map((day) => (
          <DayCard
            key={day}
            day={day}
            isToday={day === today}
            tasks={tasks.filter((t) => taskFallsOnDay(t, day))}
            onToggle={onToggle}
            onRemove={onRemove}
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
            onToggle={onToggle}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
}
