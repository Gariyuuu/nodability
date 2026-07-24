function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatWeekdayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  return `${weekday}, ${formatDate(iso)}`;
}

export function formatTimeOnly(time: string): string {
  return formatTime(time);
}

function formatTime(time: string): string {
  const [h, min] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(min).padStart(2, "0")} ${period}`;
}

export function formatTaskWhen(
  startDate: string | null,
  endDate: string | null,
  dueTime: string | null,
): string | null {
  if (!startDate) return null;

  if (endDate && endDate !== startDate) {
    return `${formatDate(startDate)} – ${formatDate(endDate)}`;
  }

  return dueTime ? `${formatDate(startDate)}, ${formatTime(dueTime)}` : formatDate(startDate);
}
