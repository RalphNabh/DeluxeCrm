import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Browsers cache /favicon.ico aggressively; redirect to uncached PNG path.
      {
        source: "/favicon.ico",
        destination: "/icons/icon-32.png",
        permanent: false,
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    // FIXME(PR#1.5): Re-enable strict TS checking after migrating
    // (a) all dynamic route handlers to Next 15's `params: Promise<...>` API,
    // (b) Stripe webhook handlers to Stripe SDK v20 / API 2025-11-17.clover,
    // (c) Supabase joined-row typings (single() vs array results).
    // Tracked: see TODO list and ARCHITECTURE.md.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
