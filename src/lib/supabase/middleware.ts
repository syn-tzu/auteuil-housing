import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Refreshes the auth session cookie and redirects signed-out visitors to /login. */
export async function updateSession(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // A Supabase email link that lands on the home page with "?code=…" needs the callback route.
  if (path === "/" && request.nextUrl.searchParams.get("code")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    url.searchParams.set("next", "/auth/reset-password");
    return NextResponse.redirect(url);
  }
  const isPublic =
    path.startsWith("/login") ||
    path.startsWith("/api/cron") ||
    path.startsWith("/auth") ||
    path === "/capture/receive" || // popup shell; the API call it makes still requires sign-in
    path === "/manifest.webmanifest" ||
    path === "/icon.svg" ||
    (process.env.NODE_ENV !== "production" && path.startsWith("/preview"));

  if (!user && !isPublic) {
    // API calls get a clear 401 instead of a redirect to an HTML page.
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "not signed in" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return response;
}
