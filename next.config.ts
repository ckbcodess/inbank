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
      "zustand",
    ],
  },
  devIndicators: false,

  // Pictures: serve the smallest format the browser takes, and let the optimised copies live for a week instead of
  // the default minute, so a returning visit doesn't fetch them again.
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },

  // Files in /public are served with "revalidate every time" unless told otherwise. These never change under the
  // same name in practice (rename a file when you replace it), so a browser can keep them for a week and refresh in
  // the background for another day.
  async headers() {
    const cache = [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }];
    return ["/images/:path*", "/flags/:path*", "/dashboard/:path*", "/illustrations/:path*", "/icons/:path*"].map(
      (source) => ({ source, headers: cache }),
    );
  },
};

export default nextConfig;
