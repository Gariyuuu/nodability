import { supabase } from "./supabase";

export interface Idea {
  id: string;
  content: string;
  created_at: string;
}

export async function listIdeas(userId: string): Promise<Idea[]> {
  const { data, error } = await supabase
    .from("ideas")
    .select("id, content, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertIdea(userId: string, content: string): Promise<Idea> {
  const { data, error } = await supabase
    .from("ideas")
    .insert({ user_id: userId, content: content.trim() })
    .select("id, content, created_at")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteIdea(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from("ideas").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}
