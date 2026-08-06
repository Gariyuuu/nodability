"use client";

import { getMonthGrid, getMonthsOfYear, type CalendarTask } from "@/lib/calendar";
import { taskFallsOnDay } from "@/lib/week";
import { GROUP_COLORS } from "@/lib/groups";

export default function YearView({
  year,
  onYearChange,
  tasks,
  onSelectMonth,
}: {
  year: number;
  onYearChange: (next: number) => void;
  tasks: CalendarTask[];
  onSelectMonth: (monthDate: Date) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const months = getMonthsOfYear(year);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => onYearChange(year - 1)}
          className="rounded px-2 py-1 text-sm text-muted hover:bg-surface"
        >
          ← {year - 1}
        </button>
        <h3 className="text-sm font-semibold">{year}</h3>
        <button
          onClick={() => onYearChange(year + 1)}
          className="rounded px-2 py-1 text-sm text-muted hover:bg-surface"
        >
          {year + 1} →
        </button>
      </div>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {months.map((monthDate) => {
          const weeks = getMonthGrid(monthDate);
          return (
            <button
              key={monthDate.toISOString()}
              onClick={() => onSelectMonth(monthDate)}
              className="rounded-lg border border-border p-2 text-left hover:border-accent"
            >
              <p className="mb-1 text-center text-xs font-semibold text-fg">
                {monthDate.toLocaleDateString("en-US", { month: "long" })}
              </p>
              <div className="grid grid-cols-7 gap-0.5">
                {weeks.flat().map((day) => {
                  const hasTasks = tasks.some((t) => taskFallsOnDay(t, day.date));
                  const dominantGroup = tasks.find(
                    (t) => taskFallsOnDay(t, day.date) && t.category_group,
                  )?.category_group;
                  return (
                    <div
                      key={day.date}
                      className={`flex h-4 w-4 items-center justify-center rounded-sm text-[8px] ${
                        day.inMonth ? "text-muted" : "text-muted opacity-30"
                      } ${day.date === today ? "ring-1 ring-accent" : ""}`}
                    >
                      {hasTasks ? (
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            backgroundColor: dominantGroup
                              ? GROUP_COLORS[dominantGroup]
                              : "var(--muted)",
                          }}
                        />
                      ) : (
                        Number(day.date.slice(-2))
                      )}
                    </div>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
