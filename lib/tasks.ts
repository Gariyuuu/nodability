import { supabase } from "./supabase";

export type CategoryGroup = "academic" | "personal" | "work" | "other";

export interface Category {
  id: string;
  name: string;
  group_name: CategoryGroup;
}

export interface Task {
  id: string;
  title: string;
  category_id: string | null;
  start_date: string | null;
  end_date: string | null;
  due_time: string | null;
  status: "open" | "done";
  sort_order: number | null;
  created_at: string;
}

export async function listCategories(userId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, group_name")
    .eq("user_id", userId)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function updateCategoryGroup(
  userId: string,
  categoryId: string,
  group: CategoryGroup,
): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .update({ group_name: group })
    .eq("id", categoryId)
    .eq("user_id", userId)
    .select("id, name, group_name")
    .single();
  if (error) throw error;
  return data;
}

export async function getOrCreateCategory(userId: string, name: string): Promise<Category> {
  const trimmed = name.trim();

  const { data: existing } = await supabase
    .from("categories")
    .select("id, name, group_name")
    .eq("user_id", userId)
    .ilike("name", trimmed)
    .maybeSingle();
  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("categories")
    .insert({ user_id: userId, name: trimmed })
    .select("id, name, group_name")
    .single();
  if (error) throw error;
  return created;
}

export async function insertTask(
  userId: string,
  params: {
    title: string;
    categoryId: string;
    startDate: string | null;
    endDate: string | null;
    dueTime: string | null;
    sourceMessageId?: string;
  },
): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      title: params.title,
      category_id: params.categoryId,
      start_date: params.startDate,
      end_date: params.endDate,
      due_time: params.dueTime,
      source_message_id: params.sourceMessageId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function taskExistsWithTitle(
  userId: string,
  categoryId: string,
  title: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("category_id", categoryId)
    .ilike("title", title.trim());
  if (error) throw error;
  return (count ?? 0) > 0;
}

interface TaskWithCategoryRow extends Task {
  categories: { name: string; group_name: CategoryGroup } | null;
}

export async function listTasks(
  userId: string,
): Promise<(Task & { category_name: string | null; category_group: CategoryGroup | null })[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, categories(name, group_name)")
    .eq("user_id", userId)
    .order("start_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  const rows = ((data ?? []) as TaskWithCategoryRow[]).map((row) => ({
    ...row,
    sort_order: row.sort_order ?? null,
    category_name: row.categories?.name ?? null,
    category_group: row.categories?.group_name ?? null,
  }));
  // Hand-dragged position wins over the date ordering above; tasks that have never been
  // dragged (sort_order null) keep their date order and sit after the arranged ones.
  // Sorted in JS rather than via `.order("sort_order")` so this still works when migration
  // 008 hasn't been run — see `hasSortOrderColumn`. Array.prototype.sort is stable, so ties
  // preserve the date ordering.
  return rows.sort(
    (a, b) => (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER),
  );
}

export async function toggleTaskStatus(
  userId: string,
  id: string,
  status: "open" | "done",
): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTask(userId: string, id: string): Promise<void> {
  const { data: task } = await supabase
    .from("tasks")
    .select("category_id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  const { error } = await supabase.from("tasks").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;

  if (task?.category_id) {
    await deleteCategoryIfEmpty(userId, task.category_id);
  }
}

async function deleteCategoryIfEmpty(userId: string, categoryId: string): Promise<void> {
  const { count, error: countError } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId)
    .eq("user_id", userId);
  if (countError) throw countError;

  if ((count ?? 0) === 0) {
    await supabase.from("categories").delete().eq("id", categoryId).eq("user_id", userId);
  }
}

export async function findTasksByCategoryName(userId: string, name: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, categories!inner(name)")
    .eq("user_id", userId)
    .ilike("categories.name", name);
  if (error) throw error;
  return data ?? [];
}

export async function deleteCategoryByName(
  userId: string,
  name: string,
): Promise<{ found: boolean; categoryName: string; deletedTaskCount: number }> {
  const { data: category } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", userId)
    .ilike("name", name.trim())
    .maybeSingle();

  if (!category) {
    return { found: false, categoryName: name, deletedTaskCount: 0 };
  }

  const { data: tasksToDelete } = await supabase
    .from("tasks")
    .select("id")
    .eq("category_id", category.id)
    .eq("user_id", userId);

  const { error: deleteTasksError } = await supabase
    .from("tasks")
    .delete()
    .eq("category_id", category.id)
    .eq("user_id", userId);
  if (deleteTasksError) throw deleteTasksError;

  const { error: deleteCategoryError } = await supabase
    .from("categories")
    .delete()
    .eq("id", category.id)
    .eq("user_id", userId);
  if (deleteCategoryError) throw deleteCategoryError;

  return {
    found: true,
    categoryName: category.name,
    deletedTaskCount: tasksToDelete?.length ?? 0,
  };
}

// Only the fields this function actually reads — `categories` is selected solely to support
// the `.ilike("categories.name", ...)` filter above and is never accessed here, so it's
// deliberately left out rather than modeled (Supabase's untyped client infers relation
// fields as arrays without a generated Database type, which isn't worth introducing here).
interface TaskDeletionMatchRow {
  id: string;
  title: string;
  category_id: string | null;
}

export async function deleteTaskByTitle(
  userId: string,
  title: string,
  categoryName: string | null,
): Promise<{ found: boolean; deletedTitles: string[] }> {
  let query = supabase
    .from("tasks")
    .select("id, title, category_id, categories(name)")
    .eq("user_id", userId)
    .ilike("title", `%${title.trim()}%`);

  if (categoryName) {
    query = supabase
      .from("tasks")
      .select("id, title, category_id, categories!inner(name)")
      .eq("user_id", userId)
      .ilike("title", `%${title.trim()}%`)
      .ilike("categories.name", categoryName.trim());
  }

  const { data, error } = await query;
  if (error) throw error;
  const matches = data as TaskDeletionMatchRow[] | null;
  if (!matches || matches.length === 0) {
    return { found: false, deletedTitles: [] };
  }

  const ids = matches.map((m) => m.id);
  const categoryIds = [...new Set(matches.map((m) => m.category_id).filter(Boolean))];

  const { error: deleteError } = await supabase
    .from("tasks")
    .delete()
    .in("id", ids)
    .eq("user_id", userId);
  if (deleteError) throw deleteError;

  for (const categoryId of categoryIds) {
    await deleteCategoryIfEmpty(userId, categoryId as string);
  }

  return {
    found: true,
    deletedTitles: matches.map((m) => m.title),
  };
}

// ---------------------------------------------------------------------------
// Manual editing + drag-and-drop ordering (the "do it myself, without asking
// Nodo" half of the board — see FEATURES.md).
// ---------------------------------------------------------------------------

/**
 * Whether `tasks.sort_order` (migration 008) exists in this database.
 *
 * Probed once per server process and cached, so the board's drag-and-drop works even if
 * migration 008 hasn't been pasted into the Supabase SQL Editor yet — writes simply drop the
 * column and only the position *within* a box is forgotten. A transient failure is not
 * cached, so a later request re-probes.
 */
let sortOrderSupport: Promise<boolean> | null = null;

export function hasSortOrderColumn(): Promise<boolean> {
  sortOrderSupport ??= probeSortOrderColumn();
  return sortOrderSupport;
}

async function probeSortOrderColumn(): Promise<boolean> {
  const { error } = await supabase.from("tasks").select("sort_order").limit(1);
  if (!error) return true;
  // 42703 = undefined_column. Anything else is transient (network/permissions) — forget the
  // cached answer so the next call probes again instead of permanently degrading.
  if (error.code !== "42703") sortOrderSupport = null;
  return false;
}

async function nextSortOrder(userId: string, categoryId: string | null): Promise<number | null> {
  if (!(await hasSortOrderColumn())) return null;

  let query = supabase
    .from("tasks")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false, nullsFirst: false })
    .limit(1);
  query = categoryId ? query.eq("category_id", categoryId) : query.is("category_id", null);

  const { data } = await query;
  const highest = (data?.[0] as { sort_order: number | null } | undefined)?.sort_order;
  return typeof highest === "number" ? highest + 1 : 0;
}

/**
 * Create a task by hand (the board's "+ Add task"), as opposed to `insertTask`, which is the
 * chat-extraction path. Resolves/creates the category by name and appends the task to the
 * bottom of that box.
 */
export async function createTask(
  userId: string,
  params: {
    title: string;
    categoryName: string | null;
    startDate: string | null;
    endDate: string | null;
    dueTime: string | null;
  },
): Promise<Task & { category_name: string | null }> {
  const category = params.categoryName?.trim()
    ? await getOrCreateCategory(userId, params.categoryName)
    : null;

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      title: params.title.trim(),
      category_id: category?.id ?? null,
      start_date: params.startDate,
      end_date: params.endDate,
      due_time: params.dueTime,
      ...((await hasSortOrderColumn())
        ? { sort_order: await nextSortOrder(userId, category?.id ?? null) }
        : {}),
    })
    .select()
    .single();
  if (error) throw error;
  return { ...(data as Task), category_name: category?.name ?? null };
}

export interface TaskEdit {
  title?: string;
  status?: "open" | "done";
  categoryName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  dueTime?: string | null;
}

/**
 * Edit any field of a task by hand. Only the keys actually present in `edit` are written, so
 * a title-only save can't blank out the dates. Moving a task out of a category deliberately
 * leaves the old category behind even if it's now empty (unlike `deleteTask`) — an empty box
 * is still a useful drop target, and the board offers an explicit delete for it.
 */
export async function updateTask(
  userId: string,
  id: string,
  edit: TaskEdit,
): Promise<Task & { category_name: string | null }> {
  const patch: Record<string, unknown> = {};
  if (edit.title !== undefined) patch.title = edit.title.trim();
  if (edit.status !== undefined) patch.status = edit.status;
  if (edit.startDate !== undefined) patch.start_date = edit.startDate || null;
  if (edit.endDate !== undefined) patch.end_date = edit.endDate || null;
  if (edit.dueTime !== undefined) patch.due_time = edit.dueTime || null;

  let categoryName: string | null | undefined = undefined;
  if (edit.categoryName !== undefined) {
    const category = edit.categoryName?.trim()
      ? await getOrCreateCategory(userId, edit.categoryName)
      : null;
    patch.category_id = category?.id ?? null;
    categoryName = category?.name ?? null;
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*, categories(name)")
    .single();
  if (error) throw error;

  const row = data as Task & { categories: { name: string } | null };
  return {
    ...row,
    category_name: categoryName !== undefined ? categoryName : (row.categories?.name ?? null),
  };
}

/**
 * Persist a drag-and-drop: `orderedIds` is the target box's full contents in their new order,
 * top to bottom. `movedTaskId`, when given, is re-parented into `categoryId` first (that's the
 * "dropped into a different box" case). Ordering is skipped when migration 008 is missing.
 */
export async function reorderTasks(
  userId: string,
  params: { categoryId: string | null; orderedIds: string[]; movedTaskId: string | null },
): Promise<{ ordered: boolean }> {
  if (params.movedTaskId) {
    const { error } = await supabase
      .from("tasks")
      .update({ category_id: params.categoryId })
      .eq("id", params.movedTaskId)
      .eq("user_id", userId);
    if (error) throw error;
  }

  if (!(await hasSortOrderColumn())) return { ordered: false };

  // One statement per task: the board holds a couple of dozen tasks at most, so a bulk upsert
  // (which would need every not-null column restated) isn't worth the risk here.
  for (const [index, id] of params.orderedIds.entries()) {
    const { error } = await supabase
      .from("tasks")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  }

  return { ordered: true };
}

export async function createCategory(userId: string, name: string): Promise<Category> {
  return getOrCreateCategory(userId, name);
}

/**
 * Delete a category the user emptied out. Refuses while tasks still reference it — the FK has
 * no ON DELETE clause, so the DB would reject it anyway (see DATABASE.md).
 */
export async function deleteCategoryById(
  userId: string,
  id: string,
): Promise<{ deleted: boolean; taskCount: number }> {
  const { count, error: countError } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id)
    .eq("user_id", userId);
  if (countError) throw countError;
  if ((count ?? 0) > 0) return { deleted: false, taskCount: count ?? 0 };

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  return { deleted: true, taskCount: 0 };
}
