import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sif/node", "mongoose", "mongodb", "pg"],
  turbopack: {},
  webpack: (config) => {
    config.externals = [
      ...(config.externals || []),
      "@sif/node",
      "mongoose",
      "mongodb",
      "pg",
    ];
    return config;
  },
};

export default nextConfig;
