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
    optimizePackageImports: [
      "lucide-react",
      "@hugeicons/core-free-icons",
      "@hugeicons/react",
      "recharts",
      "date-fns",
      "framer-motion",
      "motion",
      "@base-ui/react",
      "sonner",
      "clsx",
      "tailwind-merge",
      "calligraph",
      "zustand",
    ],
  },
  devIndicators: false,
};

export default nextConfig;
