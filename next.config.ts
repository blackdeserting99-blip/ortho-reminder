import type { NextConfig } from "next";
import path from "path";

const traceRoot = process.env.NEXT_PRIVATE_OUTPUT_TRACE_ROOT
  ? path.resolve(process.env.NEXT_PRIVATE_OUTPUT_TRACE_ROOT)
  : path.resolve(__dirname);

const nextConfig: NextConfig = {
  // OpenNext sets NEXT_PRIVATE_OUTPUT_TRACE_ROOT for monorepos; use it when present.
  // Fallback to the app root for regular local Next.js builds.
  outputFileTracingRoot: traceRoot,
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
