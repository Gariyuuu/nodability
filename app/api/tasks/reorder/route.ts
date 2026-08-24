import { NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/lib/auth";
import { reorderTasks } from "@/lib/tasks";

/**
 * Persist a drag-and-drop on the board: the dropped task (if it changed boxes) is re-parented
 * into `categoryId`, then every id in `orderedIds` gets its position within that box.
 *
 * `ordered: false` in the response means `tasks.sort_order` (migration 008) doesn't exist yet,
 * so the move was saved but the within-box position wasn't — the board surfaces that.
 */
export async function PATCH(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const { categoryId, orderedIds, movedTaskId } = body;

    if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== "string")) {
      return NextResponse.json({ error: "orderedIds must be an array of ids" }, { status: 400 });
    }
    if (categoryId !== null && typeof categoryId !== "string") {
      return NextResponse.json({ error: "categoryId must be a string or null" }, { status: 400 });
    }
    if (movedTaskId != null && typeof movedTaskId !== "string") {
      return NextResponse.json({ error: "movedTaskId must be a string" }, { status: 400 });
    }

    const result = await reorderTasks(userId, {
      categoryId: categoryId ?? null,
      orderedIds,
      movedTaskId: movedTaskId ?? null,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    throw err;
  }
}
