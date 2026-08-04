import { supabase } from "./supabase";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export async function listRecentMessages(userId: string, limit = 20): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, role, content, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).reverse();
}

export async function insertMessage(
  userId: string,
  role: "user" | "assistant",
  content: string,
): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .insert({ user_id: userId, role, content })
    .select()
    .single();
  if (error) throw error;
  return data;
}
