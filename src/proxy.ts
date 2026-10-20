import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
} from "@/infrastructure/supabase/env";

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/portal", "/billing"];

/**
 * Refreshes the Supabase session cookie on every request and redirects
 * unauthenticated visitors away from protected routes before any page renders.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet)
          request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet)
          response.cookies.set(name, value, options);
      },
    },
  });

  const user = await supabase.auth.getUser().then(
    ({ data }) => data.user,
    () => {
      // A stale/invalid refresh token cookie was rejected by Supabase; treat as signed out
      // and drop the cookie so it isn't resent on every subsequent request.
      for (const cookie of request.cookies.getAll())
        if (cookie.name.startsWith("sb-")) response.cookies.delete(cookie.name);
      return null;
    },
  );

  const isPublicPortalInvite = request.nextUrl.pathname === "/portal/accept";
  const isProtected =
    !isPublicPortalInvite &&
    PROTECTED_PREFIXES.some((prefix) =>
      request.nextUrl.pathname.startsWith(prefix),
    );
  if (isProtected && !user) {
    const redirectUrl = new URL("/log-in", request.url);
    redirectUrl.searchParams.set("next", request.nextUrl.pathname === "/billing"
      ? `${request.nextUrl.pathname}${request.nextUrl.search}` : request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/portal/:path*", "/billing/:path*"],
};
