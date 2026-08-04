import { NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/lib/auth";
import { listCategories } from "@/lib/tasks";

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
