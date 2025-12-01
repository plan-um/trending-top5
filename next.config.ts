import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  assetPrefix: process.env.NODE_ENV === 'production' ? 'https://trending-top5.vercel.app' : undefined,
};

export default nextConfig;
