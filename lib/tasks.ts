import { supabase } from "./supabase";

export interface Category {
  id: string;
  name: string;
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

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getOrCreateCategory(name: string): Promise<Category> {
  const trimmed = name.trim();

  const { data: existing } = await supabase
    .from("categories")
    .select("id, name")
    .ilike("name", trimmed)
    .maybeSingle();
  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("categories")
    .insert({ name: trimmed })
    .select("id, name")
    .single();
  if (error) throw error;
  return created;
}

export async function insertTask(params: {
  title: string;
  categoryId: string;
  startDate: string | null;
  endDate: string | null;
  dueTime: string | null;
  sourceMessageId?: string;
}): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
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

export async function listTasks(): Promise<(Task & { category_name: string | null })[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, categories(name)")
    .order("start_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    category_name: row.categories?.name ?? null,
  }));
}

export async function toggleTaskStatus(id: string, status: "open" | "done"): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTask(id: string): Promise<void> {
  const { data: task } = await supabase
    .from("tasks")
    .select("category_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;

  if (task?.category_id) {
    await deleteCategoryIfEmpty(task.category_id);
  }
}

async function deleteCategoryIfEmpty(categoryId: string): Promise<void> {
  const { count, error: countError } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);
  if (countError) throw countError;

  if ((count ?? 0) === 0) {
    await supabase.from("categories").delete().eq("id", categoryId);
  }
}

export async function findTasksByCategoryName(name: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, categories!inner(name)")
    .ilike("categories.name", name);
  if (error) throw error;
  return data ?? [];
}

export async function deleteCategoryByName(
  name: string,
): Promise<{ found: boolean; categoryName: string; deletedTaskCount: number }> {
  const { data: category } = await supabase
    .from("categories")
    .select("id, name")
    .ilike("name", name.trim())
    .maybeSingle();

  if (!category) {
    return { found: false, categoryName: name, deletedTaskCount: 0 };
  }

  const { data: tasksToDelete } = await supabase
    .from("tasks")
    .select("id")
    .eq("category_id", category.id);

  const { error: deleteTasksError } = await supabase
    .from("tasks")
    .delete()
    .eq("category_id", category.id);
  if (deleteTasksError) throw deleteTasksError;

  const { error: deleteCategoryError } = await supabase
    .from("categories")
    .delete()
    .eq("id", category.id);
  if (deleteCategoryError) throw deleteCategoryError;

  return {
    found: true,
    categoryName: category.name,
    deletedTaskCount: tasksToDelete?.length ?? 0,
  };
}

export async function deleteTaskByTitle(
  title: string,
  categoryName: string | null,
): Promise<{ found: boolean; deletedTitles: string[] }> {
  let query = supabase
    .from("tasks")
    .select("id, title, category_id, categories(name)")
    .ilike("title", `%${title.trim()}%`);

  if (categoryName) {
    query = supabase
      .from("tasks")
      .select("id, title, category_id, categories!inner(name)")
      .ilike("title", `%${title.trim()}%`)
      .ilike("categories.name", categoryName.trim());
  }

  const { data: matches, error } = await query;
  if (error) throw error;
  if (!matches || matches.length === 0) {
    return { found: false, deletedTitles: [] };
  }

  const ids = matches.map((m: any) => m.id);
  const categoryIds = [...new Set(matches.map((m: any) => m.category_id).filter(Boolean))];

  const { error: deleteError } = await supabase.from("tasks").delete().in("id", ids);
  if (deleteError) throw deleteError;

  for (const categoryId of categoryIds) {
    await deleteCategoryIfEmpty(categoryId as string);
  }

  return {
    found: true,
    deletedTitles: matches.map((m: any) => m.title),
  };
}
