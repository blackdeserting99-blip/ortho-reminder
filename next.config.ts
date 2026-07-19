import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Ensure output tracing root is set to this project root so Next's server
  // bundles include vendor chunks (avoids missing './vendor-chunks/*' at runtime)
  outputFileTracingRoot: path.resolve(__dirname),
  images: {
    unoptimized: true,
  },
  // Allow dev HMR and related dev resources to be served to the cloud tunnel hostname
  // so the site works when accessed through the quick Cloudflare tunnel.
  allowedDevOrigins: process.env.NODE_ENV === "development" ? [
    "jpg-slope-meant-montreal.trycloudflare.com",
  ] : undefined,
};

export default nextConfig;
