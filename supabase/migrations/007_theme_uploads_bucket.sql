-- Creates a public Supabase Storage bucket for user-uploaded custom theme
-- background photos. Public read (images aren't sensitive, and CSS
-- background-image: url(...) needs an unauthenticated URL). All writes go
-- through app/api/theme-image/route.ts using the service-role key, which
-- bypasses Storage RLS entirely — no client-side write policy is needed.

insert into storage.buckets (id, name, public)
values ('theme-uploads', 'theme-uploads', true)
on conflict (id) do nothing;
