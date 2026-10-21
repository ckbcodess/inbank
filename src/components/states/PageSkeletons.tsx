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
 * `StepListSkeleton` (a flow's first question), `DashboardSkeleton` (the overview), plus one each for account detail, accounts,
 * settings, transactions and a receipt.
 */

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import AuthLayout from "@/components/auth/AuthLayout";

/** One grey block. Everything below is built from these. */
export function Bone({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden="true" className={cn("skeleton-shimmer rounded-lg bg-muted/60", className)} style={style} />;
}

/** The page frame: same vertical rhythm as a real page (`gap-4`), announced once to screen readers. */
function Frame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-busy="true" className={cn("flex w-full flex-col gap-4", className)}>
      <span className="sr-only">Loading</span>
      {children}
    </div>
  );
}

/** Title on the left, an optional primary action on the right: the PageHeader's footprint. */
function HeaderBones({ action = true }: { action?: boolean }) {
  return (
    <div className="flex w-full items-center justify-between gap-2">
      <Bone className="h-6 w-38 rounded-lg" />
      {action && <Bone className="h-8 w-28 rounded-lg" />}
    </div>
  );
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-border bg-card", className)}>{children}</div>;
}

/** Rows of avatar + two lines + trailing figure, the shape of most lists in the app. `avatar={false}` for rows that start with text. */
export function RowBones({ rows, avatar = true, className }: { rows: number; avatar?: boolean; className?: string }) {
  return (
    <div className={cn("divide-y divide-border/60", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3">
          {avatar && <Bone className="size-9 shrink-0 rounded-full" style={{ animationDelay: `${i * 60}ms` }} />}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Bone className="h-3 w-2/5" style={{ animationDelay: `${i * 60}ms` }} />
            <Bone className="h-2.5 w-1/4" style={{ animationDelay: `${i * 60}ms` }} />
          </div>
          <Bone className="h-3.5 w-17" style={{ animationDelay: `${i * 60}ms` }} />
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
        <div className="flex flex-wrap items-center gap-2">
          <Bone className="h-9 w-full max-w-[320px] rounded-xl" />
          <Bone className="h-9 w-21 rounded-xl" />
          <Bone className="h-9 w-21 rounded-xl" />
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
        <div key={g} className="flex flex-col gap-3">
          <div className="flex min-h-7 items-center px-1">
            <Bone className="h-3.5 w-12" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {Array.from({ length: tiles }).map((_, t) => (
              <Bone key={t} className="h-[72px] rounded-2xl" style={{ animationDelay: `${(g * tiles + t) * 50}ms` }} />
            ))}
          </div>
        </div>
      ))}
    </Frame>
  );
}

/** A flow's first question: back arrow, the question as a title, then one tile per answer (e.g. "Which bank do you want to send to?"). */
export function StepListSkeleton({ tiles = 4 }: { tiles?: number }) {
  return (
    <Frame className="mx-auto max-w-2xl gap-6">
      <div className="flex items-center gap-2 sm:gap-2">
        <Bone className="size-7 rounded-lg sm:size-8" />
        <Bone className="h-6 w-63 max-w-full rounded-lg" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: tiles }).map((_, i) => (
          <Bone key={i} className="h-[86px] rounded-2xl" style={{ animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
    </Frame>
  );
}

/** One record: back link and title, a summary block, and the panels beneath it. */
export function DetailPageSkeleton() {
  return (
    <Frame className="gap-5">
      <div className="flex items-center gap-2">
        <Bone className="size-8 rounded-lg" />
        <Bone className="h-6 w-45 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Panel className="flex flex-col gap-3 p-4">
          <Bone className="h-3.5 w-24" />
          <Bone className="h-8 w-42 rounded-lg" />
          <div className="flex flex-col gap-2 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-5">
                <Bone className="h-3 w-21" />
                <Bone className="h-3 w-28" />
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
    <Frame className="gap-5">
      <HeaderBones action={false} />
      <div className="flex w-full max-w-[560px] flex-col gap-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Bone className="h-3 w-24" style={{ animationDelay: `${i * 70}ms` }} />
            <Bone className="h-10 w-full rounded-2xl" style={{ animationDelay: `${i * 70}ms` }} />
          </div>
        ))}
        <Bone className="mt-1 h-10 w-full rounded-lg" />
      </div>
    </Frame>
  );
}

/**
 * A sign-up or sign-in step (business registration, activation). These routes have no app shell, so the skeleton sits
 * inside the real `AuthLayout` (header, banner, column) and only the step's content is bones: a title, a line of
 * description, labelled fields and the primary button.
 */
export function AuthPageSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <AuthLayout>
      <div role="status" aria-busy="true" className="flex w-full flex-col gap-6">
        <span className="sr-only">Loading</span>
        <div className="flex flex-col gap-3">
          <Bone className="h-7 w-56 rounded-lg" />
          <Bone className="h-4 w-full max-w-[380px]" />
        </div>
        <div className="flex flex-col gap-4">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Bone className="h-3 w-24" style={{ animationDelay: `${i * 70}ms` }} />
              <Bone className="h-10 w-full rounded-lg" style={{ animationDelay: `${i * 70}ms` }} />
            </div>
          ))}
          <Bone className="mt-1 h-10 w-full rounded-lg" />
        </div>
      </div>
    </AuthLayout>
  );
}

/** The overview: greeting row, the hero (account pill, balance, money actions), then the sheet of five panels. */
export function DashboardSkeleton() {
  return (
    <Frame className="gap-5 sm:gap-10">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <Bone className="h-6 w-49 rounded-lg" />
        <Bone className="h-3.5 w-35" />
      </div>
      <div className="flex flex-col">
        <div className="-mb-6 sm:px-2">
          <Bone className="h-[340px] w-full rounded-b-none rounded-t-3xl bg-muted/70 sm:h-[400px]" />
        </div>
        <div className="relative flex flex-col gap-3 rounded-[calc(var(--radius-3xl)+var(--spacing)*2+1px)] bg-muted/30 p-2 sm:gap-5 sm:rounded-[calc(var(--radius-3xl)+var(--spacing)*5+1px)] sm:p-5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex min-h-[300px] flex-col gap-3 rounded-3xl bg-card p-4">
                <Bone className="h-3.5 w-28" style={{ animationDelay: `${i * 80}ms` }} />
                <RowBones rows={i === 2 ? 2 : 3} className="-mx-4 divide-y-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}

/** The account page below its header: the card and two round actions, then the option tiles (side by side from lg). */
export function AccountDetailBody() {
  return (
    <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-5">
      <div className="flex flex-col gap-5 lg:mx-auto lg:w-[78%]">
        <Bone className="h-[248px] w-full rounded-xl" />
        <div className="flex w-full items-start justify-evenly">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Bone className="size-12 rounded-full" style={{ animationDelay: `${i * 60}ms` }} />
              <Bone className="h-2.5 w-14" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3">
          <Bone className="h-[72px] rounded-2xl" />
          <Bone className="h-[72px] rounded-2xl" />
        </div>
        <div className="flex flex-col gap-3">
          <Bone className="h-[72px] rounded-2xl" />
          <Bone className="h-[72px] rounded-2xl" />
          <Bone className="h-[72px] rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

/** One account: back and title, then the body. One narrow column, two from lg. */
export function AccountDetailSkeleton() {
  return (
    <Frame className="mx-auto max-w-[440px] gap-10 sm:gap-10 lg:max-w-[1000px]">
      <div className="flex items-center gap-2">
        <Bone className="size-8 rounded-lg" />
        <Bone className="h-6 w-38 rounded-lg" />
      </div>
      <AccountDetailBody />
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
      <div className="flex flex-col gap-3">
        <div className="flex min-h-7 items-center justify-between px-1">
          <Bone className="h-3.5 w-31" />
          <Bone className="h-7 w-35 rounded-lg" />
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
    <Frame className="mx-auto max-w-4xl gap-5 py-2">
      <div className="flex flex-col gap-2">
        <Bone className="h-6 w-28 rounded-lg" />
        <Bone className="h-3 w-3/5 max-w-[460px]" />
      </div>
      <div className="flex items-center gap-2 border-b border-border pb-2">
        {[148, 124, 164, 112].map((w, i) => (
          <Bone key={i} className="h-8 rounded-lg" style={{ width: w, animationDelay: `${i * 50}ms` }} />
        ))}
      </div>
      <Panel className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <Bone className="size-14 shrink-0 rounded-full" />
          <div className="flex flex-col gap-2">
            <Bone className="h-3.5 w-35" />
            <Bone className="h-2.5 w-49" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Bone className="h-3 w-21" style={{ animationDelay: `${i * 60}ms` }} />
              <Bone className="h-10 w-full rounded-xl" style={{ animationDelay: `${i * 60}ms` }} />
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
      <Bone className="h-10 w-full rounded-xl sm:h-10" />
      <div className="flex flex-wrap items-center gap-2">
        <Bone className="h-8 w-[200px] rounded-lg" />
        <Bone className="h-8 w-[145px] rounded-lg" />
        <Bone className="h-8 w-[115px] rounded-lg" />
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
    <Frame className="gap-6">
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bone className="size-8 rounded-lg" />
          <Bone className="h-6 w-42 rounded-lg" />
          <Bone className="h-5 w-17 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Bone className="h-7 w-17 rounded-lg" />
          <Bone className="h-7 w-21 rounded-lg" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-3xl">
        <Panel className="p-5 sm:p-6">
          <div className="flex flex-col items-center gap-2 border-b border-border pb-5">
            <Bone className="size-10 rounded-2xl" />
            <Bone className="h-2.5 w-24" />
            <Bone className="h-9 w-42 rounded-lg" />
            <Bone className="h-3 w-35" />
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 pt-5 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Bone className="h-2.5 w-21" style={{ animationDelay: `${i * 40}ms` }} />
                <Bone className="h-3.5 w-35" style={{ animationDelay: `${i * 40}ms` }} />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </Frame>
  );
}

/** Square icon tile + two lines + trailing rate/amount, the shape of investment holdings and product rows. */
export function InvestRowBones({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("divide-y divide-border/60", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3">
          <Bone className="size-8 shrink-0 rounded-xl" style={{ animationDelay: `${i * 60}ms` }} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Bone className="h-3 w-2/5" style={{ animationDelay: `${i * 60}ms` }} />
            <Bone className="h-2.5 w-1/4" style={{ animationDelay: `${i * 60}ms` }} />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <Bone className="h-3 w-14" style={{ animationDelay: `${i * 60}ms` }} />
            <Bone className="h-2 w-9" style={{ animationDelay: `${i * 60}ms` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Invest home page: header with title, segmented control tab, and two investment sections with rows. */
export function InvestHomeSkeleton() {
  return (
    <Frame className="gap-6">
      <HeaderBones action={false} />
      <Bone className="h-9 w-full max-w-[280px] rounded-xl" />
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <div className="flex min-h-7 items-center px-1">
            <Bone className="h-3.5 w-28" />
          </div>
          <Panel className="overflow-hidden p-1">
            <InvestRowBones rows={2} />
          </Panel>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex min-h-7 items-center px-1">
            <Bone className="h-3.5 w-38" />
          </div>
          <Panel className="overflow-hidden p-1">
            <InvestRowBones rows={2} />
          </Panel>
        </div>
      </div>
    </Frame>
  );
}

/** Invest products page (Term Deposits, Treasury Bills & Bonds). */
export function InvestProductsSkeleton({ groups = 1, rows = 3 }: { groups?: number; rows?: number }) {
  return (
    <Frame className="gap-6">
      <div className="flex items-center gap-2">
        <Bone className="size-8 rounded-lg" />
        <Bone className="h-6 w-42 rounded-lg" />
      </div>
      <div className="flex flex-col gap-10">
        {Array.from({ length: groups }).map((_, g) => (
          <div key={g} className="flex flex-col gap-3">
            {groups > 1 && (
              <div className="flex min-h-7 flex-col gap-2 px-1">
                <Bone className="h-3.5 w-31" />
                <Bone className="h-2.5 w-42" />
              </div>
            )}
            <Panel className="overflow-hidden p-1">
              <InvestRowBones rows={rows} />
            </Panel>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/** Invest offer overview/calculator page (e.g. /invest/offer/[key]): single-column facts, worked example, CTA. */
export function OfferDetailSkeleton() {
  return (
    <Frame className="gap-6">
      <div className="flex items-center gap-2">
        <Bone className="size-8 rounded-lg" />
        <Bone className="h-6 w-45 rounded-lg" />
      </div>
      <div className="mx-auto flex w-full max-w-[600px] flex-col gap-6">
        <Panel className="flex flex-col gap-2 p-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-5 px-2 py-2">
              <Bone className="h-3 w-24" />
              <Bone className="h-3 w-28" />
            </div>
          ))}
        </Panel>
        <div className="flex flex-col gap-2">
          <div className="px-1">
            <Bone className="h-3 w-31" />
          </div>
          <Panel className="flex flex-col gap-2 p-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-5 px-2 py-2">
                <Bone className="h-3 w-21" />
                <Bone className="h-3 w-24" />
              </div>
            ))}
          </Panel>
        </div>
        <Bone className="h-11 w-full rounded-2xl" />
      </div>
    </Frame>
  );
}

/** Single investment holding/deposit detail page: hero amount, facts card, and 3 action tiles. */
export function InvestmentDetailSkeleton() {
  return (
    <Frame className="gap-6">
      <div className="flex items-center gap-2">
        <Bone className="size-8 rounded-lg" />
        <Bone className="h-6 w-49 rounded-lg" />
        <Bone className="h-5 w-14 rounded-full" />
      </div>
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6">
        <div className="flex flex-col gap-2 px-1">
          <Bone className="h-3 w-21" />
          <Bone className="h-9 w-42 rounded-lg" />
          <Bone className="h-3 w-31" />
        </div>
        <Panel className="flex flex-col gap-2 p-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-5 px-2 py-2">
              <Bone className="h-3 w-24" style={{ animationDelay: `${i * 40}ms` }} />
              <Bone className="h-3 w-28" style={{ animationDelay: `${i * 40}ms` }} />
            </div>
          ))}
        </Panel>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Bone key={i} className="h-[72px] w-full rounded-2xl" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      </div>
    </Frame>
  );
}
