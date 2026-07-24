import { supabase } from "./supabase";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export async function listRecentMessages(limit = 20): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, role, content, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).reverse();
}

export async function insertMessage(role: "user" | "assistant", content: string): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .insert({ role, content })
    .select()
    .single();
  if (error) throw error;
  return data;
}
