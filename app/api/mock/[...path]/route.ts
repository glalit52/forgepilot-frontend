import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { dispatch } from "@/lib/mock/handlers";
import { SESSION_COOKIE, WORKSPACE_COOKIE } from "@/lib/domain/permissions";

/**
 * Mock API. Every endpoint lives in lib/mock/handlers.ts; this file only
 * adapts Next.js requests to that dispatcher. Point NEXT_PUBLIC_API_BASE at
 * the real backend to replace it — UI code does not change.
 */
async function handle(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const store = await cookies();
  let body: unknown = undefined;
  if (req.method !== "GET") {
    const text = await req.text();
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
    }
  }
  const result = dispatch(req.method, "/" + path.join("/"), req.nextUrl.searchParams, body, {
    session: store.get(SESSION_COOKIE)?.value,
    workspace: store.get(WORKSPACE_COOKIE)?.value,
  });
  const res = NextResponse.json(result.body, { status: result.status });
  for (const c of result.setCookies ?? [])
    res.cookies.set(c.name, c.value, { path: "/", sameSite: "lax" });
  return res;
}

export const GET = handle;
export const POST = handle;
