"use client";

/**
 * Shared renderers for the 13.1 List Pattern.
 *
 * Super clean, minimal, and unboxed — no background fills or heavy borders.
 */

import type { ReactNode } from "react";
import { AlertCircle, Inbox, RefreshCw, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

/** 13.1 Loading — skeleton rows, explicitly not a spinner-only screen. */
export function ListSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="divide-y divide-border/60" aria-busy="true" aria-label="Loading rows">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: columns }).map((_, c) => (
            <div
              key={c}
              className="h-3.5 rounded-md bg-muted/60 animate-pulse"
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
 * Simple, minimal, unboxed — no container fill or card border.
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
    <div className="flex flex-col items-center justify-center px-4 py-14 sm:py-16 text-center">
      <div className="mb-3 text-muted-foreground/60 flex items-center justify-center">
        {icon ?? <Inbox size={22} strokeWidth={1.5} />}
      </div>
      <p className="text-[14.5px] font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/**
 * 13.1 Filtered-empty — search/filter applied, zero matches.
 * Simple, minimal, unboxed — offers a way to reset the filters.
 */
export function FilteredEmptyState({
  onReset,
  description = "No records match the filters you've applied.",
}: {
  onReset: () => void;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-14 sm:py-16 text-center">
      <div className="mb-3 text-muted-foreground/60 flex items-center justify-center">
        <SearchX size={22} strokeWidth={1.5} />
      </div>
      <p className="text-[14.5px] font-medium text-foreground">No results found</p>
      <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      <Button variant="outline" size="sm" className="mt-4 h-8 px-3 rounded-lg text-[13px]" onClick={onReset}>
        <RefreshCw size={13} strokeWidth={1.8} />
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
    <div className="flex flex-col items-center justify-center px-4 py-14 sm:py-16 text-center">
      <div className="mb-3 text-destructive/80 flex items-center justify-center">
        <AlertCircle size={22} strokeWidth={1.5} />
      </div>
      <p className="text-[14.5px] font-medium text-foreground">Couldn&apos;t load records</p>
      <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      <Button variant="outline" size="sm" className="mt-4 h-8 px-3 rounded-lg text-[13px]" onClick={onRetry}>
        <RefreshCw size={13} strokeWidth={1.8} />
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
    <div className="flex items-center justify-center gap-2 border-t border-border/60 px-4 py-3.5 text-[13px] text-muted-foreground">
      <RefreshCw size={13} strokeWidth={1.8} className="animate-spin" />
      Loading more records…
    </div>
  );
}
