import { NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/lib/auth";
import { getOrCreateCategory, insertTask } from "@/lib/tasks";
import { findTemplate } from "@/lib/templates";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const { templateId } = await req.json();
    const template = findTemplate(templateId);
    if (!template) {
      return NextResponse.json({ error: "unknown template" }, { status: 400 });
    }

    for (const task of template.tasks) {
      const category = await getOrCreateCategory(userId, task.category);
      await insertTask(userId, {
        title: task.title,
        categoryId: category.id,
        startDate: null,
        endDate: null,
        dueTime: null,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    throw err;
  }
}
