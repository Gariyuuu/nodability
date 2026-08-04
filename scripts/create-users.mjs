// One-off setup script: pre-creates the Supabase Auth accounts for the two
// people allowed to use this app. Run locally, once, with real emails:
//
//   node --env-file=.env.local scripts/create-users.mjs you@example.com partner@example.com
//
// Uses the service-role key already in .env.local. Does not send any email
// or set a password — accounts sign in via magic link (see app/login).
import { createClient } from "@supabase/supabase-js";

const emails = process.argv.slice(2);
if (emails.length === 0) {
  console.error("Usage: node --env-file=.env.local scripts/create-users.mjs <email> [email...]");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

for (const email of emails) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (error) {
    console.error(`✗ ${email}: ${error.message}`);
    continue;
  }
  console.log(`✓ ${email} -> ${data.user.id}`);
}
