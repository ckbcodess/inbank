"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { canGoBackInApp } from "@/lib/nav-history";

/**
 * The one Back behaviour for every in-app back arrow:
 * 1. Came from another NIBS page → `router.back()`. Returns to exactly where
 *    the user was (same filter, same tab, same scroll) and pops history, so
 *    Back can never ping-pong between two pages.
 * 2. Landed here directly (deep link, new tab, reload after sign-in) →
 *    `router.replace()` to `returnUrl` or the logical parent. Replace, not
 *    push: a pushed "back" leaves this page underneath it, and the parent's
 *    own Back would bounce straight back here — the loop.
 *
 * Filters and tabs must use `router.replace` so they never become a Back step.
 */
export function useContextualBack(defaultFallbackUrl: string = "/overview") {
  const router = useRouter();

  const handleBack = useCallback(() => {
    if (canGoBackInApp()) {
      router.back();
      return;
    }
    // Read at click time — keeps this hook free of useSearchParams (no Suspense needed).
    const returnUrl = new URLSearchParams(window.location.search).get("returnUrl");
    router.replace(returnUrl ?? defaultFallbackUrl);
  }, [router, defaultFallbackUrl]);

  return { handleBack, router };
}
