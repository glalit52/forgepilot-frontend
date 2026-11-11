/**
 * The ONLY place that knows API URLs. Every response is validated against its
 * Zod schema, so a backend that drifts from lib/schemas fails loudly.
 */
import { z } from "zod";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api/mock";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

export function buildUrl(path: string, query?: Query) {
  const qs = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  });
  const s = qs.toString();
  return `${API_BASE}${path}${s ? `?${s}` : ""}`;
}

async function request<T>(
  schema: z.ZodType<T>,
  method: string,
  path: string,
  opts: { query?: Query; body?: unknown } = {},
) {
  const res = await fetch(buildUrl(path, opts.query), {
    method,
    headers: opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: "same-origin",
    cache: "no-store",
  });
  const json: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = json as { error?: string; details?: unknown };
    throw new ApiError(res.status, err.error ?? `Request failed (${res.status})`, err.details);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    console.error(`API response for ${method} ${path} failed validation`, parsed.error.issues);
    throw new ApiError(500, `Unexpected response shape from ${path}`, parsed.error.issues);
  }
  return parsed.data;
}

export const api = {
  get: <T>(schema: z.ZodType<T>, path: string, query?: Query) =>
    request(schema, "GET", path, { query }),
  post: <T>(schema: z.ZodType<T>, path: string, body?: unknown, query?: Query) =>
    request(schema, "POST", path, { body: body ?? {}, query }),
};
