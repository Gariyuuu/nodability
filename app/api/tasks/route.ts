import { NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/lib/auth";
import { deleteTask, listTasks, toggleTaskStatus } from "@/lib/tasks";

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

export async function PATCH(req: Request) {
  try {
    const userId = await requireUserId();
    const { id, status } = await req.json();
    if (!id || (status !== "open" && status !== "done")) {
      return NextResponse.json({ error: "id and valid status are required" }, { status: 400 });
    }
    const task = await toggleTaskStatus(userId, id, status);
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
