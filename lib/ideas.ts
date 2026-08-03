import { supabase } from "./supabase";

export interface Idea {
  id: string;
  content: string;
  created_at: string;
}

export async function listIdeas(): Promise<Idea[]> {
  const { data, error } = await supabase
    .from("ideas")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertIdea(content: string): Promise<Idea> {
  const { data, error } = await supabase
    .from("ideas")
    .insert({ content: content.trim() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteIdea(id: string): Promise<void> {
  const { error } = await supabase.from("ideas").delete().eq("id", id);
  if (error) throw error;
}
