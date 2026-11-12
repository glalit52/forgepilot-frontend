import type { NextConfig } from "next";

// Cache Components is off on purpose: the app renders client-side over a
// mock API (TanStack Query), so there is nothing to prerender-cache yet.
// Revisit when the real backend lands.
// Real backend: set BACKEND_URL (e.g. http://localhost:8080) and NEXT_PUBLIC_API_BASE=/api/v1.
// Requests are proxied through this app so the session cookie stays same-origin.
const backend = process.env.BACKEND_URL?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return backend ? [{ source: "/api/v1/:path*", destination: `${backend}/api/v1/:path*` }] : [];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
