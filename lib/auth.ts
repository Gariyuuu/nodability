import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
  }
}

// Use at the top of every API route: resolves the signed-in user's id from
// their session cookie, or throws so the route can return a 401.
export async function requireUserId(): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError();
  return user.id;
}
