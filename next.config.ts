import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Keeps this zone's _next/static chunks from colliding with the main
  // cyberussell.com app's own _next/static assets once both are served
  // under the same domain via multi-zone rewrites.
  assetPrefix: "/appointments-assets",
  experimental: {
    serverActions: {
      // Server Actions check the request's Origin header, which will be
      // the user-facing domain (cyberussell.com) proxying in, not this
      // app's own Vercel deployment domain.
      allowedOrigins: ["www.cyberussell.com", "cyberussell.com"],
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
