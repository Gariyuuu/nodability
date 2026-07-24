function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function getCurrentWeekDays(): string[] {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diffToMonday);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    return toISODate(d);
  });
}

export function taskFallsOnDay(
  task: { start_date: string | null; end_date: string | null },
  isoDay: string,
): boolean {
  if (!task.start_date) return false;
  const end = task.end_date ?? task.start_date;
  return isoDay >= task.start_date && isoDay <= end;
}
