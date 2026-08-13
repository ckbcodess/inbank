import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NIBS MVP — mock-data UI prototype. No standalone/server output needed.
  //
  // `@hugeicons/core-free-icons` is 16k files / 73MB behind a 6MB barrel index.
  // It was in `transpilePackages`, which pushed the whole thing through SWC on
  // every compile — both packages already ship ESM with an exports map and
  // `sideEffects: false`, so they never needed transpiling. Optimizing the
  // barrel instead rewrites `{ Tick02Icon } from "@hugeicons/core-free-icons"`
  // to the single-icon subpath, so a compile touches one file, not the barrel.
  experimental: {
    optimizePackageImports: ["@hugeicons/core-free-icons", "@hugeicons/react"],
  },
  // The dev overlay badge sits on top of every screen and would land in each
  // Figma capture. Nothing else in the prototype depends on it.
  devIndicators: false,
};

export default nextConfig;
