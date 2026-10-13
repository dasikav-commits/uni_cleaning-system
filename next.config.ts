import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    cpus: 1,
    workerThreads: true,
  },
  // Type errors now fail the build instead of being silently shipped.
  // (Previously `typescript.ignoreBuildErrors: true` hid 8 real type errors.)
};

export default nextConfig;
