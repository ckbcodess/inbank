/**
 * Route-level loading skeletons — what a screen shows in the moment before its content is ready.
 *
 * The pattern (the one Linear, Stripe and GitHub use): every route segment has a `loading.tsx`
 * that renders a skeleton shaped like the page that is coming. The shell (sidebar, header) stays
 * put; only the content area swaps. Because the skeleton keeps the real page's structure — header
 * row, toolbar, panel, rows — nothing jumps when the content lands, and the page reads as already
 * there rather than blank.
 *
 * Rules:
 * - Match the destination's layout, not a generic spinner. Pick the variant closest to the page.
 * - Every bone has a soft shimmer sweep (`.skeleton-shimmer`). It stops under `prefers-reduced-motion`.
 * - Say it once for assistive tech (`role="status"` + one sr-only line); the bones are `aria-hidden`.
 * - No text in a skeleton: nothing to translate, nothing to go stale.
 *
 * Variants: `ListPageSkeleton` (the default for any list or table page), `HubPageSkeleton`
 * (tile hubs), `DetailPageSkeleton` (one record), `FormPageSkeleton` (a form or flow),
 * `DashboardSkeleton` (the overview).
 */

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One grey block. Everything below is built from these. */
export function Bone({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden="true" className={cn("skeleton-shimmer rounded-md bg-muted/60", className)} style={style} />;
}

/** The page frame: same vertical rhythm as a real page (`gap-5`), announced once to screen readers. */
function Frame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-busy="true" className={cn("flex w-full flex-col gap-5", className)}>
      <span className="sr-only">Loading</span>
      {children}
    </div>
  );
}

/** Title on the left, an optional primary action on the right: the PageHeader's footprint. */
function HeaderBones({ action = true }: { action?: boolean }) {
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <Bone className="h-7 w-44 rounded-lg" />
      {action && <Bone className="h-9 w-32 rounded-lg" />}
    </div>
  );
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-border bg-card", className)}>{children}</div>;
}

/** Rows of avatar + two lines + trailing figure, the shape of most lists in the app. */
function RowBones({ rows, className }: { rows: number; className?: string }) {
  return (
    <div className={cn("divide-y divide-border/60", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3.5 px-4 py-3.5">
          <Bone className="size-10 shrink-0 rounded-full" style={{ animationDelay: `${i * 60}ms` }} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Bone className="h-3.5 w-2/5" style={{ animationDelay: `${i * 60}ms` }} />
            <Bone className="h-3 w-1/4" style={{ animationDelay: `${i * 60}ms` }} />
          </div>
          <Bone className="h-4 w-20" style={{ animationDelay: `${i * 60}ms` }} />
        </div>
      ))}
    </div>
  );
}

/** Any list or table page: header, search and filters, then the panel of rows. */
export function ListPageSkeleton({ rows = 8, toolbar = true }: { rows?: number; toolbar?: boolean }) {
  return (
    <Frame>
      <HeaderBones />
      {toolbar && (
        <div className="flex flex-wrap items-center gap-2.5">
          <Bone className="h-10 w-full max-w-[320px] rounded-xl" />
          <Bone className="h-10 w-24 rounded-xl" />
          <Bone className="h-10 w-24 rounded-xl" />
        </div>
      )}
      <Panel>
        <RowBones rows={rows} />
      </Panel>
    </Frame>
  );
}

/** A hub of action tiles (Send & Pay): a header, then labelled groups of tiles. */
export function HubPageSkeleton({ groups = 2, tiles = 4 }: { groups?: number; tiles?: number }) {
  return (
    <Frame className="gap-6">
      <HeaderBones action={false} />
      {Array.from({ length: groups }).map((_, g) => (
        <div key={g} className="flex flex-col gap-3">
          <Bone className="h-4 w-16" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: tiles }).map((_, t) => (
              <Bone key={t} className="h-[72px] rounded-[16px]" style={{ animationDelay: `${(g * tiles + t) * 50}ms` }} />
            ))}
          </div>
        </div>
      ))}
    </Frame>
  );
}

/** One record: back link and title, a summary block, and the panels beneath it. */
export function DetailPageSkeleton() {
  return (
    <Frame className="gap-6">
      <div className="flex items-center gap-2.5">
        <Bone className="size-9 rounded-lg" />
        <Bone className="h-7 w-52 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Panel className="flex flex-col gap-4 p-5">
          <Bone className="h-4 w-28" />
          <Bone className="h-9 w-48 rounded-lg" />
          <div className="flex flex-col gap-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-6">
                <Bone className="h-3.5 w-24" />
                <Bone className="h-3.5 w-32" />
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <RowBones rows={5} />
        </Panel>
      </div>
    </Frame>
  );
}

/** A form or a step of a flow: header, then labelled fields and the primary button. */
export function FormPageSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <Frame className="gap-6">
      <HeaderBones action={false} />
      <div className="flex w-full max-w-[560px] flex-col gap-5">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Bone className="h-3.5 w-28" style={{ animationDelay: `${i * 70}ms` }} />
            <Bone className="h-12 w-full rounded-2xl" style={{ animationDelay: `${i * 70}ms` }} />
          </div>
        ))}
        <Bone className="mt-1 h-11 w-full rounded-lg" />
      </div>
    </Frame>
  );
}

/** The overview: greeting row, the balance hero, then the panels that sit on it. */
export function DashboardSkeleton() {
  return (
    <Frame className="gap-6">
      <div className="flex items-center justify-between gap-3">
        <Bone className="h-7 w-56 rounded-lg" />
        <div className="hidden items-center gap-2 sm:flex">
          <Bone className="h-9 w-28 rounded-lg" />
          <Bone className="h-9 w-28 rounded-lg" />
          <Bone className="h-9 w-28 rounded-lg" />
        </div>
      </div>
      <Bone className="h-[260px] w-full rounded-3xl sm:h-[300px]" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Panel key={i} className="flex flex-col gap-4 p-5">
            <Bone className="h-4 w-32" style={{ animationDelay: `${i * 80}ms` }} />
            <RowBones rows={3} className="-mx-5" />
          </Panel>
        ))}
      </div>
    </Frame>
  );
}
