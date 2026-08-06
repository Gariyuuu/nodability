import type { CategoryGroup } from "./tasks";

export interface CalendarTask {
  id: string;
  title: string;
  category_name: string | null;
  category_group: CategoryGroup | null;
  start_date: string | null;
  end_date: string | null;
  due_time: string | null;
  status: "open" | "done";
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface CalendarDay {
  date: string;
  inMonth: boolean;
}

// A 6x7 grid (Monday-first) covering the given month, padded with
// leading/trailing days from adjacent months — same shape as Google
// Calendar's month view.
export function getMonthGrid(monthDate: Date): CalendarDay[][] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = firstOfMonth.getDay(); // 0 = Sun
  const daysBeforeMonday = firstWeekday === 0 ? 6 : firstWeekday - 1;

  const gridStart = new Date(year, month, 1 - daysBeforeMonday);

  const days: CalendarDay[] = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    return { date: toISODate(d), inMonth: d.getMonth() === month };
  });

  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < 42; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

export function getMonthLabel(monthDate: Date): string {
  return monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function addMonths(monthDate: Date, delta: number): Date {
  return new Date(monthDate.getFullYear(), monthDate.getMonth() + delta, 1);
}

export function getMonthsOfYear(year: number): Date[] {
  return Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
}
