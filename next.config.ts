import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow dev HMR and related dev resources to be served to the cloud tunnel hostname
  // so the site works when accessed through the quick Cloudflare tunnel.
  allowedDevOrigins: process.env.NODE_ENV === "development" ? [
    "jpg-slope-meant-montreal.trycloudflare.com",
  ] : undefined,
};

export default nextConfig;
