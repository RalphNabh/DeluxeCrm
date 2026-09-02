import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Browsers cache /favicon.ico aggressively; redirect to uncached PNG path.
      {
        source: "/favicon.ico",
        destination: "/icons/icon-32.png",
        permanent: false,
      },
      // The main CRM landing page was renamed from /dashboard to /home.
      {
        source: "/dashboard",
        destination: "/home",
        permanent: false,
      },
      {
        source: "/dashboard/:path*",
        destination: "/home/:path*",
        permanent: false,
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  widenClientFileUpload: true,
  disableLogger: true,
});
