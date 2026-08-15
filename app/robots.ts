import type { MetadataRoute } from "next";

// The entire app (proxy.ts) redirects to /login except /login and /auth/callback —
// there's no public marketing surface beyond the login page itself. No sitemap.ts:
// a 1-entry sitemap for a login page has no real value.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/login",
      disallow: "/",
    },
  };
}
