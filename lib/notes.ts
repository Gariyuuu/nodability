import { supabase } from "./supabase";
import type { CategoryGroup } from "./tasks";

export interface Note {
  id: string;
  title: string;
  content: string;
  category_id: string | null;
  created_at: string;
  updated_at: string;
}

interface NoteRow extends Note {
  categories: { name: string; group_name: CategoryGroup } | null;
}

export interface NoteWithCategory extends Note {
  category_name: string | null;
  category_group: CategoryGroup | null;
}

const WIKILINK_PATTERN = /\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]/g;

// Extracts the titles referenced by [[Wikilink]] syntax in a note's content.
// Supports [[Title|display text]] the way Obsidian does, ignoring the alias.
export function extractWikilinkTitles(content: string): string[] {
  const titles = new Set<string>();
  for (const match of content.matchAll(WIKILINK_PATTERN)) {
    const title = match[1].trim();
    if (title) titles.add(title);
  }
  return [...titles];
}

export async function listNotes(userId: string): Promise<NoteWithCategory[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("*, categories(name, group_name)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as NoteRow[]).map((row) => ({
    ...row,
    category_name: row.categories?.name ?? null,
    category_group: row.categories?.group_name ?? null,
  }));
}

export async function createNote(
  userId: string,
  params: { title: string; content: string; categoryId: string | null },
): Promise<Note> {
  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: userId,
      title: params.title.trim(),
      content: params.content,
      category_id: params.categoryId,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateNote(
  userId: string,
  id: string,
  params: { title?: string; content?: string; categoryId?: string | null },
): Promise<Note> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (params.title !== undefined) patch.title = params.title.trim();
  if (params.content !== undefined) patch.content = params.content;
  if (params.categoryId !== undefined) patch.category_id = params.categoryId;

  const { data, error } = await supabase
    .from("notes")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteNote(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from("notes").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export interface GraphNode {
  id: string;
  title: string;
  categoryName: string | null;
  categoryGroup: CategoryGroup | null;
}

export interface GraphEdge {
  source: string;
  target: string;
}

// Resolves [[Wikilink]] titles to note IDs by case-insensitive exact match
// among the same user's notes. Unresolved links (typos, not-yet-created
// notes) are simply omitted — Obsidian shows these as "unlinked" too, but
// there's no separate placeholder-node concept here to keep this simple.
export function buildNoteGraph(notes: NoteWithCategory[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const byTitle = new Map(notes.map((n) => [n.title.toLowerCase(), n]));
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();

  for (const note of notes) {
    for (const linkedTitle of extractWikilinkTitles(note.content)) {
      const target = byTitle.get(linkedTitle.toLowerCase());
      if (!target || target.id === note.id) continue;
      const key = [note.id, target.id].sort().join("::");
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ source: note.id, target: target.id });
    }
  }

  const nodes: GraphNode[] = notes.map((n) => ({
    id: n.id,
    title: n.title,
    categoryName: n.category_name,
    categoryGroup: n.category_group,
  }));

  return { nodes, edges };
}
