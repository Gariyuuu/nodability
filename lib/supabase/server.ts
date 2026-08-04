import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Session-aware client (anon key + the signed-in user's cookies). Subject to
// RLS, unlike the service-role client in lib/supabase.ts — use this whenever
// you just need to know who's signed in.
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component render, not a Route Handler —
            // cookies can't be written here. proxy.ts refreshes the session
            // on the next request instead.
          }
        },
      },
    },
  );
}
