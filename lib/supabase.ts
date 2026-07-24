import { createClient } from "@supabase/supabase-js";

// Server-only client using the service role key. Never import this from a
// "use client" component — it bypasses row-level security entirely.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
