import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NIBS MVP — mock-data UI prototype. No standalone/server output needed.
  transpilePackages: ["@hugeicons/react", "@hugeicons/core-free-icons"],
};

export default nextConfig;
