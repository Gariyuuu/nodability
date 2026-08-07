import { NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/lib/auth";
import { createNote, deleteNote, listNotes, updateNote } from "@/lib/notes";

export async function GET() {
  try {
    const userId = await requireUserId();
    const notes = await listNotes(userId);
    return NextResponse.json({ notes });
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
    const { title, content, categoryId } = await req.json();
    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    const note = await createNote(userId, {
      title,
      content: typeof content === "string" ? content : "",
      categoryId: typeof categoryId === "string" ? categoryId : null,
    });
    return NextResponse.json({ note });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (err instanceof Object && "code" in err && err.code === "23505") {
      return NextResponse.json(
        { error: "you already have a note with that title" },
        { status: 409 },
      );
    }
    throw err;
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await requireUserId();
    const { id, title, content, categoryId } = await req.json();
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const note = await updateNote(userId, id, {
      title: typeof title === "string" ? title : undefined,
      content: typeof content === "string" ? content : undefined,
      categoryId: categoryId === null || typeof categoryId === "string" ? categoryId : undefined,
    });
    return NextResponse.json({ note });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (err instanceof Object && "code" in err && err.code === "23505") {
      return NextResponse.json(
        { error: "you already have a note with that title" },
        { status: 409 },
      );
    }
    throw err;
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await requireUserId();
    const { id } = await req.json();
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    await deleteNote(userId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    throw err;
  }
}
