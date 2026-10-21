"use client";

/**
 * The seam between a transaction row and its detail sheet. In the prototype the list already holds the whole
 * transaction, so this only simulates the round trip a real app has: the list returns a summary, and opening a row
 * fetches the rest by id. The sheet shows what the row already knows straight away and fills the rest in when this
 * says `ready`; on `error` it offers a retry.
 *
 * To go live, replace the timeout in the effect with the real request (`GET /transactions/:id`), keyed by
 * `summary.id`, and put the response in `result`. The sheet does not change.
 */

import { useEffect, useState } from "react";
import { SHOW_DEMO_TOOLS } from "@/lib/demo-tools";
import { useTransactionDev } from "@/lib/transaction-dev";
import type { Transaction } from "@/lib/mock-data";

export type DetailStatus = "loading" | "ready" | "error";

const SLOW_MS = 1200;

export function useTransactionDetail(summary: Transaction | null): { status: DetailStatus; retry: () => void } {
  const dev = useTransactionDev();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; status: "ready" | "error" } | null>(null);

  // Outside dev, and in dev's default mode, the detail is already in hand: ready at once, no round trip.
  const instant = !SHOW_DEMO_TOOLS || dev.detail === "instant";
  const key = summary ? `${summary.id}:${attempt}:${dev.detail}` : "";

  useEffect(() => {
    if (!summary || instant) return;
    const timer = window.setTimeout(
      () => setResult({ key, status: dev.detail === "fail" ? "error" : "ready" }),
      SLOW_MS,
    );
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, instant]);

  const status: DetailStatus = !summary ? "loading" : instant ? "ready" : result?.key === key ? result.status : "loading";
  return { status, retry: () => setAttempt((n) => n + 1) };
}
