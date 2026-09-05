import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sif/node"],
  turbopack: {},
  webpack: (config) => {
    config.externals = [...(config.externals || []), "@sif/node"];
    return config;
  },
};

export default nextConfig;
