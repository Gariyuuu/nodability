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
  return ((data ?? []) as TaskWithCategoryRow[]).map((row) => ({
    ...row,
    category_name: row.categories?.name ?? null,
    category_group: row.categories?.group_name ?? null,
  }));
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
