import { NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/lib/auth";
import { listCategories, updateCategoryGroup, type CategoryGroup } from "@/lib/tasks";

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
