  import type { NextConfig } from "next";
  import path from "path";

  const nextConfig: NextConfig = {
    // Keep standalone output at the app root, where OpenNext expects it.
    outputFileTracingRoot: path.resolve(__dirname),
    serverExternalPackages: [
    "styled-jsx",
  ],
    outputFileTracingIncludes: {
      "/*": ["../../node_modules/.prisma/client/**/*"],
    },
    images: {
      unoptimized: true,
    },
    eslint: {
      ignoreDuringBuilds: true,
    },
    // Allow dev HMR and related dev resources to be served to the cloud tunnel hostname
    // so the site works when accessed through the quick Cloudflare tunnel.
    allowedDevOrigins: process.env.NODE_ENV === "development" ? [
      "jpg-slope-meant-montreal.trycloudflare.com",
    ] : undefined,
  };

  export default nextConfig;
