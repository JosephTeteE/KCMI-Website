import type { NextConfig } from "next";
import {
  contentSecurityPolicy,
  securityHeaders,
} from "./src/lib/security/headers";
import { legacyHtmlRedirects } from "./src/lib/routing/legacy-redirects";

/**
 * Host-based rewrites for events subdomain (ADR-0002).
 * Legacy .html permanent redirects for public cutover readiness (C1).
 */
const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    // Source marketing uploads may be large phone photos; stored output is much smaller.
    serverActions: {
      bodySizeLimit: "16mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "54321",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "54321",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...securityHeaders,
          {
            key: "Content-Security-Policy-Report-Only",
            value: contentSecurityPolicy(),
          },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'",
          },
        ],
      },
    ];
  },
  async redirects() {
    return legacyHtmlRedirects.map((rule) => ({
      source: rule.source,
      destination: rule.destination,
      permanent: true,
    }));
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/:path*",
          has: [{ type: "host", value: "events.kcmi-rcc.org" }],
          destination: "/events/:path*",
        },
      ],
    };
  },
};

export default nextConfig;
