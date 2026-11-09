import type { NextConfig } from "next";

// Cache Components is off on purpose: the app renders client-side over a
// mock API (TanStack Query), so there is nothing to prerender-cache yet.
// Revisit when the real backend lands.
const nextConfig: NextConfig = {
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
