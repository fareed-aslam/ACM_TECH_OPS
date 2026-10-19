import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Ensure katex CSS is handled properly
  webpack: (config) => {
    return config;
  },
};

export default nextConfig;
