import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { dispatch } from "@/lib/mock/handlers";
import { SESSION_COOKIE } from "@/lib/domain/roles";

/**
 * Mock API. Every endpoint lives in lib/mock/handlers.ts; this file only
 * adapts Next.js requests to that dispatcher. Replace with the real backend
 * by pointing NEXT_PUBLIC_API_BASE at it — UI code does not change.
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
  const result = dispatch(
    req.method,
    "/" + path.join("/"),
    req.nextUrl.searchParams,
    body,
    store.get(SESSION_COOKIE)?.value,
  );
  const res = NextResponse.json(result.body, { status: result.status });
  for (const c of result.setCookies ?? []) {
    res.cookies.set(c.name, c.value, { path: "/", sameSite: "lax", httpOnly: false });
  }
  return res;
}

export const GET = handle;
export const POST = handle;
