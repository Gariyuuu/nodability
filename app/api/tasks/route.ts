import { NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/lib/auth";
import { createTask, deleteTask, listTasks, updateTask, type TaskEdit } from "@/lib/tasks";

export async function GET() {
  try {
    const userId = await requireUserId();
    const tasks = await listTasks(userId);
    return NextResponse.json({ tasks });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    throw err;
  }
}

/** Create a task by hand from the board, without going through the chat. */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    const task = await createTask(userId, {
      title,
      categoryName: typeof body.categoryName === "string" ? body.categoryName : null,
      startDate: body.startDate || null,
      endDate: body.endDate || null,
      dueTime: body.dueTime || null,
    });
    return NextResponse.json({ task });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    throw err;
  }
}

/**
 * Edit a task. Historically this only accepted `{ id, status }` (the checkbox); it now takes
 * any subset of the editable fields, and only the keys actually present are written.
 */
export async function PATCH(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const edit: TaskEdit = {};
    if (body.status !== undefined) {
      if (body.status !== "open" && body.status !== "done") {
        return NextResponse.json({ error: "status must be open or done" }, { status: 400 });
      }
      edit.status = body.status;
    }
    if (body.title !== undefined) {
      if (typeof body.title !== "string" || !body.title.trim()) {
        return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
      }
      edit.title = body.title;
    }
    if (body.categoryName !== undefined) edit.categoryName = body.categoryName;
    if (body.startDate !== undefined) edit.startDate = body.startDate;
    if (body.endDate !== undefined) edit.endDate = body.endDate;
    if (body.dueTime !== undefined) edit.dueTime = body.dueTime;

    if (Object.keys(edit).length === 0) {
      return NextResponse.json({ error: "no editable fields provided" }, { status: 400 });
    }

    const task = await updateTask(userId, id, edit);
    return NextResponse.json({ task });
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
    await deleteTask(userId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    throw err;
  }
}
