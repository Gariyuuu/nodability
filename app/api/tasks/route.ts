import { NextResponse } from "next/server";
import { deleteTask, listTasks, toggleTaskStatus } from "@/lib/tasks";

export async function GET() {
  const tasks = await listTasks();
  return NextResponse.json({ tasks });
}

export async function PATCH(req: Request) {
  const { id, status } = await req.json();
  if (!id || (status !== "open" && status !== "done")) {
    return NextResponse.json({ error: "id and valid status are required" }, { status: 400 });
  }
  const task = await toggleTaskStatus(id, status);
  return NextResponse.json({ task });
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  await deleteTask(id);
  return NextResponse.json({ ok: true });
}
