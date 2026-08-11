"use client";

/**
 * Shared renderers for the 13.1 List Pattern.
 *
 * The doc is explicit that true-empty and filtered-empty are different states
 * with different copy and different actions, so they are separate components
 * here — there is no single `<EmptyState>` that both screens could accidentally
 * share.
 */

import type { ReactNode } from "react";
import { AlertCircle, Inbox, RefreshCw, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

/** 13.1 Loading — skeleton rows, explicitly not a spinner-only screen. */
export function ListSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="divide-y divide-border" aria-busy="true" aria-label="Loading rows">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: columns }).map((_, c) => (
            <div
              key={c}
              className="h-3.5 rounded-md bg-muted animate-pulse"
              style={{
                width: c === 0 ? "22%" : c === columns - 1 ? "12%" : "16%",
                animationDelay: `${(r * columns + c) * 40}ms`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * 13.1 Empty (true) — no records exist yet for this user/context.
 * Carries a primary action where one is relevant.
 */
export function TrueEmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon ?? <Inbox size={20} strokeWidth={1.7} />}
      </div>
      <p className="text-[15px] text-foreground">{title}</p>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/**
 * 13.1 Filtered-empty — search/filter applied, zero matches.
 * Never reuses true-empty copy; always offers a way to reset the filters.
 */
export function FilteredEmptyState({
  onReset,
  description = "No records match the filters you've applied.",
}: {
  onReset: () => void;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <SearchX size={20} strokeWidth={1.7} />
      </div>
      <p className="text-[15px] text-foreground">No results for this filter</p>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      <Button variant="outline" size="sm" className="mt-5" onClick={onReset}>
        <RefreshCw size={14} strokeWidth={1.8} />
        Reset filters
      </Button>
    </div>
  );
}

/** 13.1 Error — fetch failed. Retry is required; never silently fall back to empty. */
export function ListErrorState({
  onRetry,
  description = "We couldn't load this list. Your data hasn't changed — try again.",
}: {
  onRetry: () => void;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle size={20} strokeWidth={1.7} />
      </div>
      <p className="text-[15px] text-foreground">Couldn&apos;t load</p>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
        <RefreshCw size={14} strokeWidth={1.8} />
        Retry
      </Button>
    </div>
  );
}

/**
 * 13.1 Partial load — pagination/infinite scroll mid-fetch.
 * Rendered *below* existing rows, which stay interactive throughout.
 */
export function PartialLoadFooter() {
  return (
    <div className="flex items-center justify-center gap-2.5 border-t border-border px-4 py-4 text-[13px] text-muted-foreground">
      <RefreshCw size={14} strokeWidth={1.8} className="animate-spin" />
      Loading more records…
    </div>
  );
}
