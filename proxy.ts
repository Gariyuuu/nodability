import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

// Refreshes the Supabase session cookie on every request and gates
// authenticated-only routes. This is a UX convenience, not the security
// boundary — every API route re-checks auth itself via lib/auth.ts.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // API routes return their own 401 JSON via lib/auth.ts — redirecting them
  // to /login would hand a fetch() caller an HTML page instead of JSON.
  if (!user && !isPublicPath(pathname) && !pathname.startsWith("/api/")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

// Excludes Next internals, the generated icon/OG-image routes, and any request for a static
// file under public/ (matched by extension) — anything in public/ must stay reachable by
// logged-out visitors (e.g. /theme/*.jpg, referenced from CSS on the public /login page) or
// it'll silently 307-redirect to /login instead of serving the asset, exactly like the /icon
// bug this same exclusion list already had to fix once. opengraph-image joins icon/apple-icon
// here for the same reason: it's a next/og-generated PNG with no file extension in its URL,
// so the extension-based exclusion below doesn't catch it — without this, link-preview bots
// (which never have a session cookie) get redirected to /login instead of the image.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|txt|md)$).*)",
  ],
};
