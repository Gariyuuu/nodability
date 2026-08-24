import { NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/lib/auth";
import {
  createCategory,
  deleteCategoryById,
  listCategories,
  updateCategoryGroup,
  type CategoryGroup,
} from "@/lib/tasks";

const VALID_GROUPS: CategoryGroup[] = ["academic", "personal", "work", "other"];

export async function GET() {
  try {
    const userId = await requireUserId();
    const categories = await listCategories(userId);
    return NextResponse.json({ categories });
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
    const { id, group } = await req.json();
    if (!id || !VALID_GROUPS.includes(group)) {
      return NextResponse.json({ error: "id and valid group are required" }, { status: 400 });
    }
    const category = await updateCategoryGroup(userId, id, group);
    return NextResponse.json({ category });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    throw err;
  }
}

/** Create an empty category by hand, so there's a box to drag tasks into. */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const { name } = await req.json();
    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const category = await createCategory(userId, name);
    return NextResponse.json({ category });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    throw err;
  }
}

/** Delete an empty category. Refuses (409) while it still holds tasks. */
export async function DELETE(req: Request) {
  try {
    const userId = await requireUserId();
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const result = await deleteCategoryById(userId, id);
    if (!result.deleted) {
      return NextResponse.json(
        { error: "category still has tasks", taskCount: result.taskCount },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    throw err;
  }
}
