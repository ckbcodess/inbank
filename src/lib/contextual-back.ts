"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * Hook for intelligent, contextual back navigation across all flows:
 * 1. Checks if an explicit `returnUrl` is present in query parameters (e.g. `?returnUrl=/cards/c1`).
 * 2. If no `returnUrl` is present, falls back to `router.back()` if browser history exists (`window.history.length > 1`).
 * 3. If there is no browser history (e.g. direct link or fresh tab), falls back to `defaultFallbackUrl`.
 */
export function useContextualBack(defaultFallbackUrl: string = "/overview") {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleBack = useCallback(() => {
    const returnUrl = searchParams.get("returnUrl");
    if (returnUrl) {
      router.push(returnUrl);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(defaultFallbackUrl);
    }
  }, [router, searchParams, defaultFallbackUrl]);

  return { handleBack, router };
}
