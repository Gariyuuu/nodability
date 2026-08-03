import { NextResponse } from "next/server";
import { deleteIdea, insertIdea, listIdeas } from "@/lib/ideas";

export async function GET() {
  const ideas = await listIdeas();
  return NextResponse.json({ ideas });
}

export async function POST(req: Request) {
  const { content } = await req.json();
  if (!content || !content.trim()) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }
  const idea = await insertIdea(content);
  return NextResponse.json({ idea });
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  await deleteIdea(id);
  return NextResponse.json({ ok: true });
}
