import { NextResponse, type NextRequest } from "next/server";
import { canAccessPath, homeForRole, SESSION_COOKIE } from "@/lib/domain/roles";
import { RoleSchema } from "@/lib/schemas/enums";

/**
 * Optimistic route guard for the mock session. The fp_role cookie is a UI
 * hint set alongside fp_session; the mock API still checks the real user on
 * every call. Unauthorized routes redirect to the role's home.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  const role = RoleSchema.safeParse(request.cookies.get("fp_role")?.value);

  if (!session || !role.success) {
    if (pathname === "/login") return NextResponse.next();
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (pathname === "/" || pathname === "/login") {
    return NextResponse.redirect(new URL(homeForRole(role.data), request.url));
  }
  if (!canAccessPath(role.data, pathname)) {
    const url = new URL(homeForRole(role.data), request.url);
    url.searchParams.set("denied", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/portal/:path*", "/console/:path*"],
};
