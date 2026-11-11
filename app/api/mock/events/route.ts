import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { dbFingerprint, getDb } from "@/lib/mock/db";
import { SESSION_COOKIE, WORKSPACE_COOKIE } from "@/lib/domain/permissions";

/**
 * Live updates (Server-Sent Events). Pushes:
 *  - `change` whenever anything in the workspace data changed (screens refetch),
 *  - `tick` once a second while agent sessions or verification runs are active,
 *    with their ids, so live logs and progress keep streaming.
 * Events carry ids only, scoped to the caller's active workspace.
 * A real backend would publish these from its event bus (PRD §14.5).
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const store = await cookies();
  const userId = store.get(SESSION_COOKIE)?.value;
  const wsCookie = store.get(WORKSPACE_COOKIE)?.value;
  if (!userId) return new Response("Not signed in", { status: 401 });

  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          if (timer) clearInterval(timer);
        }
      };
      let last = "";
      let beats = 0;
      const step = () => {
        let db;
        try {
          db = getDb();
        } catch {
          return send("error", { message: "mock data invalid" });
        }
        const memberships = db.memberships.filter((m) => m.userId === userId);
        const orgId = (memberships.find((m) => m.orgId === wsCookie) ?? memberships[0])?.orgId;
        if (!orgId) return;
        const fp = dbFingerprint(db);
        if (fp !== last) {
          if (last) send("change", { at: Date.now() });
          last = fp;
        }
        const sessions = db.sessions
          .filter((s) => s.orgId === orgId && (s.status === "running" || s.status === "waiting"))
          .map((s) => s.id);
        const runs = db.testRuns
          .filter((r) => r.orgId === orgId && r.status === "running")
          .map((r) => r.id);
        if (sessions.length || runs.length) send("tick", { sessions, runs });
        if (++beats % 15 === 0) send("ping", { at: Date.now() });
      };
      send("ready", { at: Date.now() });
      step();
      timer = setInterval(step, 1000);
      req.signal.addEventListener("abort", () => {
        if (timer) clearInterval(timer);
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      if (timer) clearInterval(timer);
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
