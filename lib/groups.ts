import type { CategoryGroup } from "./tasks";

export const GROUP_ORDER: CategoryGroup[] = ["academic", "personal", "work", "other"];

export const GROUP_LABELS: Record<CategoryGroup, string> = {
  academic: "Academic",
  personal: "Personal",
  work: "Work",
  other: "Other",
};

export const GROUP_COLORS: Record<CategoryGroup, string> = {
  academic: "#3b82f6",
  personal: "#a855f7",
  work: "#f59e0b",
  other: "#9ca3af",
};

export function nextGroup(group: CategoryGroup): CategoryGroup {
  const idx = GROUP_ORDER.indexOf(group);
  return GROUP_ORDER[(idx + 1) % GROUP_ORDER.length];
}
