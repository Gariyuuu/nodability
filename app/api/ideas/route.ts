import { NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/lib/auth";
import { deleteIdea, insertIdea, listIdeas } from "@/lib/ideas";

export async function GET() {
  try {
    const userId = await requireUserId();
    const ideas = await listIdeas(userId);
    return NextResponse.json({ ideas });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    throw err;
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const { content } = await req.json();
    if (!content || !content.trim()) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }
    const idea = await insertIdea(userId, content);
    return NextResponse.json({ idea });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    throw err;
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await requireUserId();
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    await deleteIdea(userId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    throw err;
  }
}
