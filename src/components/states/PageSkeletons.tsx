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
 * - Every skeleton is measured by skullet (`<Skeleton loading>`), which draws the bones and the shimmer, and stops it under `prefers-reduced-motion`.
 * - Say it once for assistive tech (`role="status"` + one sr-only line); the bones are `aria-hidden`.
 * - No text in a skeleton: nothing to translate, nothing to go stale.
 * - A page that has two layouts (holding something or not) gets the skeleton of the one most customers see first. Pass a
 *   prop when the caller knows better.
 * - Widths and heights the page and the skeleton must agree on (`NARROW_COLUMN`, `PRODUCT_PHOTO_HEIGHT`) live in
 *   `lib/page-layout.ts`. The page and its skeleton both import them; never retype them.
 *
 * Variants: `ListPageSkeleton` (the default for any list or table page), `HubPageSkeleton`
 * (tile hubs), `DetailPageSkeleton` (one record), `FormPageSkeleton` (a form or flow),
 * `StepListSkeleton` (a flow's first question), `DashboardSkeleton` (the overview), plus one each for account detail, accounts,
 * settings, transactions and a receipt. Calm-page shapes: `ShelfPageSkeleton` (Insure and Loans home), `FactsPageSkeleton`
 * (a policy or loan), `ProductPageSkeleton`, `ScheduledListSkeleton` and `BusinessOverviewSkeleton`. List boxes copy `ListCard`: an 8px inset, no dividers.
 */

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "skullet/react";
import { NARROW_COLUMN, PRODUCT_PHOTO_HEIGHT } from "@/lib/page-layout";

/** One grey block. Everything below is built from these. */
export function Bone({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden="true" className={cn("skullet-block rounded-lg bg-muted/60", className)} style={style} />;
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
    <div data-page-header className="flex min-h-9 w-full items-center justify-between gap-2">
      <Bone className="h-6 w-38 rounded-lg" />
      {action && <Bone className="h-8 w-28 rounded-lg" />}
    </div>
  );
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-border bg-card", className)}>{children}</div>;
}

/** The box a list of rows sits in: the app's ListCard, a rounded box with an 8px inset and no dividers. */
function ListPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <Panel className={cn("overflow-hidden p-2", className)}>{children}</Panel>;
}

/** Back arrow and a title: the PageHeader of a detail page, a flow or any page that has a parent. */
function BackHeaderBones({ title = "w-45", action = false }: { title?: string; action?: boolean }) {
  return (
    <div data-page-header className="flex min-h-9 w-full items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Bone className="size-7 shrink-0 rounded-lg sm:size-8" />
        <Bone className={cn("h-6 rounded-lg", title)} />
      </div>
      {action && <Bone className="h-9 w-20 shrink-0 rounded-lg" />}
    </div>
  );
}

/** The pitch a customer who holds nothing sees (`ProductPitchBody`): the picture, three benefits, the dashed divider. */
function PitchBones() {
  return (
    <div className="flex flex-col gap-6">
      <Bone className={cn("w-full rounded-3xl", PRODUCT_PHOTO_HEIGHT)} />
      <div className="flex flex-col gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Bone className="size-10 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Bone className="h-4 w-3/5" />
              <Bone className="h-3 w-4/5" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-10 flex items-center gap-4">
        <Bone className="h-px flex-1 rounded-none" />
        <Bone className="h-4 w-32" />
        <Bone className="h-px flex-1 rounded-none" />
      </div>
    </div>
  );
}

/** Rows of avatar + two lines + trailing figure, the shape of most lists in the app. `avatar={false}` for rows that start with text. */
export function RowBones({ rows, avatar = true, className }: { rows: number; avatar?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-3 sm:px-3">
          {avatar && <Bone className="size-9 shrink-0 rounded-full" />}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Bone className="h-3 w-2/5" />
            <Bone className="h-2.5 w-1/4" />
          </div>
          <Bone className="h-3.5 w-17" />
        </div>
      ))}
    </div>
  );
}

/** Any list or table page: header, search and filters, then the panel of rows. */
function ListPageSkeletonBody({ rows = 8, toolbar = true, action = true, tabs = false }: { rows?: number; toolbar?: boolean; action?: boolean; tabs?: boolean }) {
  return (
    <Frame>
      <HeaderBones action={action} />
      {tabs && <Bone className="h-9 w-full max-w-[280px] rounded-xl" />}
      {toolbar && (
        <div className="flex flex-wrap items-center gap-2">
          <Bone className="h-9 w-full max-w-[320px] rounded-xl" />
          <Bone className="h-9 w-21 rounded-xl" />
          <Bone className="h-9 w-21 rounded-xl" />
        </div>
      )}
      <ListPanel>
        <RowBones rows={rows} />
      </ListPanel>
    </Frame>
  );
}

/** A hub of action tiles (Send & Pay): header with one action, then headed groups of two-up tiles. */
function HubPageSkeletonBody({ groups = 2, tiles = 4 }: { groups?: number; tiles?: number }) {
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
              <Bone key={t} className="h-[72px] rounded-2xl" />
            ))}
          </div>
        </div>
      ))}
    </Frame>
  );
}

/** A flow's first question: back arrow, the question as a title, then one tile per answer (e.g. "Which bank do you want to send to?"). */
function StepListSkeletonBody({ tiles = 4 }: { tiles?: number }) {
  return (
    <Frame className="mx-auto max-w-2xl gap-6">
      <div data-page-header className="flex items-center gap-2 sm:gap-2">
        <Bone className="size-7 rounded-lg sm:size-8" />
        <Bone className="h-6 w-63 max-w-full rounded-lg" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: tiles }).map((_, i) => (
          <Bone key={i} className="h-[86px] rounded-2xl" />
        ))}
      </div>
    </Frame>
  );
}

/** One record: back link and title, a summary block, and the panels beneath it. */
function DetailPageSkeletonBody() {
  return (
    <Frame className="gap-5">
      <div data-page-header className="flex items-center gap-2">
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
        <ListPanel>
          <RowBones rows={5} />
        </ListPanel>
      </div>
    </Frame>
  );
}

/** A form or a step of a flow: back arrow and title, then labelled fields and the primary button, in the flows' centred 560px column. */
function FormPageSkeletonBody({ fields = 4 }: { fields?: number }) {
  return (
    <Frame className="mx-auto max-w-[560px] gap-6">
      <BackHeaderBones title="w-49" />
      <div className="flex w-full flex-col gap-5">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Bone className="h-3 w-24" />
            <Bone className="h-10 w-full rounded-lg" />
          </div>
        ))}
        <Bone className="mt-1 h-10 w-full rounded-lg" />
      </div>
    </Frame>
  );
}

/** Insure and Loans home: the title, then a shelf of product cards (two across from 480px). */
function ShelfPageSkeletonBody({ cards = 4 }: { cards?: number }) {
  return (
    <Frame className="gap-6">
      <HeaderBones action={false} />
      <div className="mx-auto grid w-full max-w-[720px] grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-4">
        {Array.from({ length: cards }).map((_, i) => (
          <Bone key={i} className="min-h-[184px] rounded-2xl" />
        ))}
      </div>
    </Frame>
  );
}

/** Label on the left, value on the right, in one box with no dividers: the facts of a policy, a loan or a standing order. */
function FactsBones({ rows }: { rows: number }) {
  return (
    <Panel className="flex flex-col p-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-5 px-2 py-3">
          <Bone className="h-3 w-24" />
          <Bone className="h-3 w-28" />
        </div>
      ))}
    </Panel>
  );
}

/** Icon tile, title and meta, chevron: the action rows under a policy or a loan. */
function ActionRowBones({ rows }: { rows: number }) {
  return (
    <ListPanel>
      <div className="flex flex-col gap-0.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-3 sm:px-3">
            <Bone className="size-8 shrink-0 rounded-xl" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Bone className="h-3 w-1/4" />
              <Bone className="h-2.5 w-2/5" />
            </div>
          </div>
        ))}
      </div>
    </ListPanel>
  );
}

/** One policy or loan: back and title, an optional figure, the facts box, then the action rows. */
function FactsPageSkeletonBody({ figure = false, facts = 6, actions = 2 }: { figure?: boolean; facts?: number; actions?: number }) {
  return (
    <Frame className="mx-auto max-w-[560px] gap-6">
      <BackHeaderBones title="w-42" />
      <div className="flex flex-col gap-10">
        {figure && (
          <div className="flex flex-col gap-2 px-1">
            <Bone className="h-3.5 w-28" />
            <Bone className="h-8 w-42 rounded-lg" />
          </div>
        )}
        <FactsBones rows={facts} />
        {actions > 0 && <ActionRowBones rows={actions} />}
      </div>
    </Frame>
  );
}

/**
 * A product's or plan's own page (Insure plan, Loans advance). Most customers hold nothing yet and see the pitch, so
 * that is the default: back and title, the picture, the benefits, the one big button. A customer who holds something
 * sees an About chip and their list instead, so a caller that knows it passes `holding`.
 */
function ProductPageSkeletonBody({ holding = false, rows = 2 }: { holding?: boolean; rows?: number }) {
  return (
    <Frame className={NARROW_COLUMN}>
      <BackHeaderBones title="w-42" action={holding} />
      {holding ? (
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-3">
            <div className="flex min-h-7 items-center px-1">
              <Bone className="h-3.5 w-28" />
            </div>
            <ListPanel>
              <RowBones rows={rows} />
            </ListPanel>
          </div>
          <Bone className="h-12 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <PitchBones />
          <Bone className="h-12 w-full rounded-2xl" />
        </div>
      )}
    </Frame>
  );
}

/** Scheduled payments: title with its action, the one number, then the headed list. */
function ScheduledListSkeletonBody() {
  return (
    <Frame className="gap-10">
      <HeaderBones />
      <div className="flex flex-col gap-2 px-1">
        <Bone className="h-3.5 w-49" />
        <Bone className="h-8 w-42 rounded-lg" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex min-h-7 items-center px-1">
          <Bone className="h-3.5 w-28" />
        </div>
        <ListPanel>
          <RowBones rows={3} />
        </ListPanel>
      </div>
    </Frame>
  );
}

/** The business overview: name, the available cash, the Accounts list without a box, then the shortcut buttons. */
function BusinessOverviewSkeletonBody() {
  return (
    <Frame className="gap-10">
      <HeaderBones action={false} />
      <div className="flex flex-col gap-3">
        <Bone className="h-3.5 w-35" />
        <Bone className="h-10 w-56 rounded-lg sm:h-14" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex min-h-6 items-center">
          <Bone className="h-3.5 w-21" />
        </div>
        <RowBones rows={3} avatar={false} className="-mx-3" />
      </div>
      <div className="flex flex-wrap gap-3">
        <Bone className="h-9 w-38 rounded-lg" />
        <Bone className="h-9 w-35 rounded-lg" />
      </div>
    </Frame>
  );
}


/** The overview: greeting row, the hero (account pill, balance, money actions), then the sheet of five panels. */
function DashboardSkeletonBody() {
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
                <Bone className="h-3.5 w-28" />
                <RowBones rows={i === 2 ? 2 : 3} className="-mx-4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}

/** The account page below its header: the card and two round actions, then the option tiles (side by side from lg). */
function AccountDetailRows() {
  return (
    <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-5">
      <div className="flex flex-col gap-5 lg:mx-auto lg:w-[78%]">
        <Bone className="h-[248px] w-full rounded-xl" />
        <div className="flex w-full items-start justify-evenly">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Bone className="size-12 rounded-full" />
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
function AccountDetailSkeletonBody() {
  return (
    <Frame className="mx-auto max-w-[440px] gap-10 sm:gap-10 lg:max-w-[1000px]">
      <div data-page-header className="flex items-center gap-2">
        <Bone className="size-8 rounded-lg" />
        <Bone className="h-6 w-38 rounded-lg" />
      </div>
      <AccountDetailRows />
    </Frame>
  );
}

/** My Accounts: header with Add Account, the accounts panel, then the sources of funds section. */
function AccountsPageSkeletonBody() {
  return (
    <Frame className="gap-10">
      <HeaderBones />
      <ListPanel>
        <RowBones rows={2} />
      </ListPanel>
      <div className="flex flex-col gap-3">
        <div className="flex min-h-7 items-center justify-between px-1">
          <Bone className="h-3.5 w-31" />
          <Bone className="h-7 w-35 rounded-lg" />
        </div>
        <ListPanel>
          <RowBones rows={2} />
        </ListPanel>
      </div>
    </Frame>
  );
}

/** Settings: title and description, the tab row on its hairline, then a panel of labelled fields. */
function SettingsPageSkeletonBody() {
  return (
    <Frame className="mx-auto max-w-4xl gap-5 py-2">
      <div className="flex flex-col gap-2">
        <Bone className="h-6 w-28 rounded-lg" />
        <Bone className="h-3 w-3/5 max-w-[460px]" />
      </div>
      <div className="flex items-center gap-2 border-b border-border pb-2">
        {[148, 124, 164, 112].map((w, i) => (
          <Bone key={i} className="h-8 rounded-lg" style={{ width: w }} />
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
              <Bone className="h-3 w-21" />
              <Bone className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </Panel>
    </Frame>
  );
}

/** Transactions: header with Export, the search field, the filter row, then the rows. */
function TransactionsPageSkeletonBody() {
  return (
    <Frame>
      <HeaderBones />
      <Bone className="h-10 w-full rounded-xl sm:h-10" />
      <div className="flex flex-wrap items-center gap-2">
        <Bone className="h-8 w-[200px] rounded-lg" />
        <Bone className="h-8 w-[145px] rounded-lg" />
        <Bone className="h-8 w-[115px] rounded-lg" />
      </div>
      <ListPanel>
        <RowBones rows={9} />
      </ListPanel>
    </Frame>
  );
}

/** A receipt: back and title with its actions, then the amount block and the details grid. */
function ReceiptPageSkeletonBody() {
  return (
    <Frame className="gap-6">
      <div data-page-header className="flex w-full items-center justify-between gap-2">
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
                <Bone className="h-2.5 w-21" />
                <Bone className="h-3.5 w-35" />
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
    <div className={cn("flex flex-col gap-0.5", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-3 sm:px-3">
          <Bone className="size-8 shrink-0 rounded-xl" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Bone className="h-3 w-2/5" />
            <Bone className="h-2.5 w-1/4" />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <Bone className="h-3 w-14" />
            <Bone className="h-2 w-9" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Invest home page: header with title, segmented control tab, and two investment sections with rows. */
function InvestHomeSkeletonBody() {
  return (
    <Frame className="gap-6">
      <HeaderBones action={false} />
      <Bone className="h-9 w-full max-w-[280px] rounded-xl" />
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <div className="flex min-h-7 items-center px-1">
            <Bone className="h-3.5 w-28" />
          </div>
          <ListPanel>
            <InvestRowBones rows={2} />
          </ListPanel>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex min-h-7 items-center px-1">
            <Bone className="h-3.5 w-38" />
          </div>
          <ListPanel>
            <InvestRowBones rows={2} />
          </ListPanel>
        </div>
      </div>
    </Frame>
  );
}

/**
 * Invest products page (Term Deposits, Treasury Bills & Bonds): the 560px column, an About chip on the product's own
 * page (`action`), and the offers under one heading each when there is more than one group.
 */
function InvestProductsSkeletonBody({ groups = 1, rows = 3, action = false }: { groups?: number; rows?: number; action?: boolean }) {
  return (
    <Frame className={NARROW_COLUMN}>
      <BackHeaderBones title="w-42" action={action} />
      <div className="flex flex-col gap-8">
        {Array.from({ length: groups }).map((_, g) => (
          <div key={g} className="flex flex-col gap-3">
            {groups > 1 && (
              <div className="flex min-h-7 items-center px-1">
                <Bone className="h-3.5 w-31" />
              </div>
            )}
            <ListPanel>
              <InvestRowBones rows={rows} />
            </ListPanel>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/** An Invest offer's page (/invest/offer/[key]): the same pitch as a product page, then Invest and Terms and Conditions. */
function OfferDetailSkeletonBody() {
  return (
    <Frame className={NARROW_COLUMN}>
      <BackHeaderBones title="w-45" />
      <div className="flex flex-col gap-6">
        <PitchBones />
        <div className="flex flex-col gap-2">
          <Bone className="h-11 w-full rounded-xl" />
          <Bone className="h-11 w-full rounded-xl" />
        </div>
      </div>
    </Frame>
  );
}

/** Single investment holding/deposit detail page: hero amount, facts card, and 3 action tiles. */
function InvestmentDetailSkeletonBody() {
  return (
    <Frame className="gap-6">
      <div data-page-header className="flex items-center gap-2">
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
              <Bone className="h-3 w-24" />
              <Bone className="h-3 w-28" />
            </div>
          ))}
        </Panel>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Bone key={i} className="h-[72px] w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </Frame>
  );
}

/** The admin dashboard: title, four summary cards across, then the work-queue panel with its link rows. */
function AdminDashboardSkeletonBody() {
  return (
    <Frame>
      <HeaderBones action={false} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bone key={i} className="h-[88px] rounded-2xl" />
        ))}
      </div>
      <Panel className="flex flex-col gap-3 p-4">
        <Bone className="h-4 w-35" />
        <Bone className="h-3 w-3/5 max-w-[360px]" />
        <div className="flex flex-col gap-2 pt-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Bone key={i} className="h-[52px] rounded-xl" />
          ))}
        </div>
      </Panel>
    </Frame>
  );
}

export function ListPageSkeleton(props?: Parameters<typeof ListPageSkeletonBody>[0]) {
  return (
    <Skeleton loading label="Loading">
      <ListPageSkeletonBody {...props} />
    </Skeleton>
  );
}

export function HubPageSkeleton(props?: Parameters<typeof HubPageSkeletonBody>[0]) {
  return (
    <Skeleton loading label="Loading">
      <HubPageSkeletonBody {...props} />
    </Skeleton>
  );
}

export function StepListSkeleton(props?: Parameters<typeof StepListSkeletonBody>[0]) {
  return (
    <Skeleton loading label="Loading">
      <StepListSkeletonBody {...props} />
    </Skeleton>
  );
}

export function DetailPageSkeleton() {
  return (
    <Skeleton loading label="Loading">
      <DetailPageSkeletonBody />
    </Skeleton>
  );
}

export function FormPageSkeleton(props?: Parameters<typeof FormPageSkeletonBody>[0]) {
  return (
    <Skeleton loading label="Loading">
      <FormPageSkeletonBody {...props} />
    </Skeleton>
  );
}

export function ShelfPageSkeleton(props?: Parameters<typeof ShelfPageSkeletonBody>[0]) {
  return (
    <Skeleton loading label="Loading">
      <ShelfPageSkeletonBody {...props} />
    </Skeleton>
  );
}

export function FactsPageSkeleton(props?: Parameters<typeof FactsPageSkeletonBody>[0]) {
  return (
    <Skeleton loading label="Loading">
      <FactsPageSkeletonBody {...props} />
    </Skeleton>
  );
}

export function ProductPageSkeleton(props?: Parameters<typeof ProductPageSkeletonBody>[0]) {
  return (
    <Skeleton loading label="Loading">
      <ProductPageSkeletonBody {...props} />
    </Skeleton>
  );
}

export function ScheduledListSkeleton() {
  return (
    <Skeleton loading label="Loading">
      <ScheduledListSkeletonBody />
    </Skeleton>
  );
}

export function BusinessOverviewSkeleton() {
  return (
    <Skeleton loading label="Loading">
      <BusinessOverviewSkeletonBody />
    </Skeleton>
  );
}

export function DashboardSkeleton() {
  return (
    <Skeleton loading label="Loading">
      <DashboardSkeletonBody />
    </Skeleton>
  );
}

export function AccountDetailSkeleton() {
  return (
    <Skeleton loading label="Loading">
      <AccountDetailSkeletonBody />
    </Skeleton>
  );
}

export function AccountsPageSkeleton() {
  return (
    <Skeleton loading label="Loading">
      <AccountsPageSkeletonBody />
    </Skeleton>
  );
}

export function SettingsPageSkeleton() {
  return (
    <Skeleton loading label="Loading">
      <SettingsPageSkeletonBody />
    </Skeleton>
  );
}

export function TransactionsPageSkeleton() {
  return (
    <Skeleton loading label="Loading">
      <TransactionsPageSkeletonBody />
    </Skeleton>
  );
}

export function ReceiptPageSkeleton() {
  return (
    <Skeleton loading label="Loading">
      <ReceiptPageSkeletonBody />
    </Skeleton>
  );
}

export function InvestHomeSkeleton() {
  return (
    <Skeleton loading label="Loading">
      <InvestHomeSkeletonBody />
    </Skeleton>
  );
}

export function InvestProductsSkeleton(props?: Parameters<typeof InvestProductsSkeletonBody>[0]) {
  return (
    <Skeleton loading label="Loading">
      <InvestProductsSkeletonBody {...props} />
    </Skeleton>
  );
}

export function OfferDetailSkeleton() {
  return (
    <Skeleton loading label="Loading">
      <OfferDetailSkeletonBody />
    </Skeleton>
  );
}

export function InvestmentDetailSkeleton() {
  return (
    <Skeleton loading label="Loading">
      <InvestmentDetailSkeletonBody />
    </Skeleton>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <Skeleton loading label="Loading">
      <AdminDashboardSkeletonBody />
    </Skeleton>
  );
}

export function AccountDetailBody() {
  return (
    <Skeleton loading label="Loading">
      <AccountDetailRows />
    </Skeleton>
  );
}
