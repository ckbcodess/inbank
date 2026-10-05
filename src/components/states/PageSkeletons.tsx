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
 * `DashboardSkeleton` (the overview), plus one each for account detail, accounts,
 * settings, transactions and a receipt.
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

/** A hub of action tiles (Send & Pay): header with one action, then headed groups of two-up tiles. */
export function HubPageSkeleton({ groups = 2, tiles = 4 }: { groups?: number; tiles?: number }) {
  return (
    <Frame className="gap-10">
      <HeaderBones />
      {Array.from({ length: groups }).map((_, g) => (
        <div key={g} className="flex flex-col gap-4">
          <div className="flex min-h-8 items-center px-1">
            <Bone className="h-4 w-14" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
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

/** The overview: greeting row, the hero (account pill, balance, money actions), then the sheet of five panels. */
export function DashboardSkeleton() {
  return (
    <Frame className="gap-6 sm:gap-12">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <Bone className="h-7 w-56 rounded-lg" />
        <Bone className="h-4 w-40" />
      </div>
      <div className="flex flex-col">
        <div className="-mb-8 sm:px-3">
          <Bone className="h-[340px] w-full rounded-b-none rounded-t-3xl bg-muted/70 sm:h-[400px]" />
        </div>
        <div className="relative flex flex-col gap-4 rounded-[calc(var(--radius)*2.2+var(--spacing)*3+1px)] bg-muted/30 p-3 sm:gap-6 sm:rounded-[calc(var(--radius)*2.2+var(--spacing)*6+1px)] sm:p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex min-h-[300px] flex-col gap-4 rounded-3xl bg-card p-5">
                <Bone className="h-4 w-32" style={{ animationDelay: `${i * 80}ms` }} />
                <RowBones rows={i === 2 ? 2 : 3} className="-mx-5 divide-y-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}

/** One account: the card, the two round actions, then the option tiles. A single narrow column. */
export function AccountDetailSkeleton() {
  return (
    <Frame className="mx-auto max-w-[440px] gap-10 sm:gap-12">
      <div className="flex items-center gap-2.5">
        <Bone className="size-9 rounded-lg" />
        <Bone className="h-7 w-44 rounded-lg" />
      </div>
      <div className="flex flex-col gap-6">
        <Bone className="h-[248px] w-full rounded-xl" />
        <div className="flex w-full items-start justify-evenly">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Bone className="size-14 rounded-full" style={{ animationDelay: `${i * 60}ms` }} />
              <Bone className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4">
          <Bone className="h-[72px] rounded-[16px]" />
          <Bone className="h-[72px] rounded-[16px]" />
        </div>
        <div className="flex flex-col gap-4">
          <Bone className="h-[72px] rounded-[16px]" />
          <Bone className="h-[72px] rounded-[16px]" />
          <Bone className="h-[72px] rounded-[16px]" />
        </div>
      </div>
    </Frame>
  );
}

/** My Accounts: header with Add Account, the accounts panel, then the sources of funds section. */
export function AccountsPageSkeleton() {
  return (
    <Frame className="gap-10">
      <HeaderBones />
      <Panel className="overflow-hidden">
        <RowBones rows={2} />
      </Panel>
      <div className="flex flex-col gap-4">
        <div className="flex min-h-8 items-center justify-between px-1">
          <Bone className="h-4 w-36" />
          <Bone className="h-8 w-40 rounded-lg" />
        </div>
        <Panel className="overflow-hidden">
          <RowBones rows={2} />
        </Panel>
      </div>
    </Frame>
  );
}

/** Settings: title and description, the tab row on its hairline, then a panel of labelled fields. */
export function SettingsPageSkeleton() {
  return (
    <Frame className="mx-auto max-w-4xl gap-6 py-2">
      <div className="flex flex-col gap-2">
        <Bone className="h-7 w-32 rounded-lg" />
        <Bone className="h-3.5 w-3/5 max-w-[460px]" />
      </div>
      <div className="flex items-center gap-1.5 border-b border-border pb-2">
        {[148, 124, 164, 112].map((w, i) => (
          <Bone key={i} className="h-9 rounded-lg" style={{ width: w, animationDelay: `${i * 50}ms` }} />
        ))}
      </div>
      <Panel className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <Bone className="size-16 shrink-0 rounded-full" />
          <div className="flex flex-col gap-2">
            <Bone className="h-4 w-40" />
            <Bone className="h-3 w-56" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Bone className="h-3.5 w-24" style={{ animationDelay: `${i * 60}ms` }} />
              <Bone className="h-11 w-full rounded-xl" style={{ animationDelay: `${i * 60}ms` }} />
            </div>
          ))}
        </div>
      </Panel>
    </Frame>
  );
}

/** Transactions: header with Export, the search field, the filter row, then the rows. */
export function TransactionsPageSkeleton() {
  return (
    <Frame>
      <HeaderBones />
      <Bone className="h-11 w-full rounded-xl sm:h-12" />
      <div className="flex flex-wrap items-center gap-2.5">
        <Bone className="h-9 w-[200px] rounded-lg" />
        <Bone className="h-9 w-[145px] rounded-lg" />
        <Bone className="h-9 w-[115px] rounded-lg" />
      </div>
      <Panel className="overflow-hidden">
        <RowBones rows={9} />
      </Panel>
    </Frame>
  );
}

/** A receipt: back and title with its actions, then the amount block and the details grid. */
export function ReceiptPageSkeleton() {
  return (
    <Frame className="gap-8">
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Bone className="size-9 rounded-lg" />
          <Bone className="h-7 w-48 rounded-lg" />
          <Bone className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Bone className="h-8 w-20 rounded-lg" />
          <Bone className="h-8 w-24 rounded-lg" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-3xl">
        <Panel className="p-6 sm:p-8">
          <div className="flex flex-col items-center gap-3 border-b border-border pb-6">
            <Bone className="size-12 rounded-2xl" />
            <Bone className="h-3 w-28" />
            <Bone className="h-10 w-48 rounded-lg" />
            <Bone className="h-3.5 w-40" />
          </div>
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 pt-6 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Bone className="h-3 w-24" style={{ animationDelay: `${i * 40}ms` }} />
                <Bone className="h-4 w-40" style={{ animationDelay: `${i * 40}ms` }} />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </Frame>
  );
}
