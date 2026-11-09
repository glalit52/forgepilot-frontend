import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/domain/permissions";

/**
 * Optimistic route guard for the mock session. The mock API still checks the
 * user and workspace on every call; this only avoids rendering the app shell
 * for signed-out visitors.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session && (pathname.startsWith("/app") || pathname.startsWith("/onboarding"))) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (session && (pathname === "/login" || pathname === "/signup") && !request.nextUrl.searchParams.has("switch")) {
    return NextResponse.redirect(new URL("/app", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*", "/onboarding/:path*", "/onboarding", "/login", "/signup"] };
