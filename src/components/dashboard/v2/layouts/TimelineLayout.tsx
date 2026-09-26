"use client";

/**
 * Timeline — past and upcoming in one feed.
 *
 * Strength: the story of the account. One chronological feed reads top-down
 * from what's about to leave (scheduled) into what just happened, grouped by
 * day. The balance, cards and rates sit in a quiet rail beside it.
 */

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney, type Transaction } from "@/lib/mock-data";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import type { UpcomingPayment } from "@/lib/dashboard-insights";
import {
  AccountSwitcher,
  activityHref,
  BalanceFigure,
  BalanceMeta,
  Card,
  CardHeader,
  CardsCard,
  ComingUpEmpty,
  dayLabel,
  FxBar,
  Greeting,
  MoneyActions,
  Notices,
  PanelEmpty,
  PanelSkeleton,
  RefreshControl,
  SPRING,
  type DashViewProps,
} from "../parts";

const FEED_LIMIT = 10;

function DayHeading({ children }: { children: React.ReactNode }) {
  return (
    <li className="pb-1 pt-5 text-[12px] text-muted-foreground tabular first:pt-0">{children}</li>
  );
}

function ScheduledRow({ p, showAmounts }: { p: UpcomingPayment; showAmounts: boolean }) {
  return (
    <li className="flex items-center gap-3.5 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground">
        <CalendarClock size={16} strokeWidth={1.8} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[14px] text-foreground">{p.payee}</span>
        <span className="text-[12px] text-muted-foreground tabular">
          {dayLabel(p.date)} · {p.frequency}
        </span>
      </span>
      <span className="shrink-0 tabular text-[14px] text-muted-foreground">
        − {formatMoney(p.amount, p.currency, showAmounts)}
      </span>
    </li>
  );
}

function TxnRow({ t: txn, showAmounts }: { t: Transaction; showAmounts: boolean }) {
  const credit = txn.direction === "credit";
  const failed = typeof txn.state === "string" && txn.state.startsWith("failed");
  const pending = txn.state === "pending";
  return (
    <li>
      <Link href={`/transactions/${txn.id}`} className="flex items-center gap-3.5 py-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full",
            credit ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
          )}
        >
          {credit ? <ArrowDownLeft size={16} strokeWidth={1.8} /> : <ArrowUpRight size={16} strokeWidth={1.8} />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[14px] text-foreground">{txn.counterparty || txn.description}</span>
          <span
            className={cn(
              "text-[12px]",
              failed ? "text-destructive" : pending ? "text-warning" : "text-muted-foreground",
            )}
          >
            {failed ? "Failed" : pending ? "Pending" : txn.category || txn.channel}
          </span>
        </span>
        <span className={cn("shrink-0 tabular text-[14px]", credit ? "text-success" : "text-foreground")}>
          {credit ? "+ " : "− "}
          {formatMoney(Math.abs(txn.amount), txn.currency, showAmounts)}
        </span>
      </Link>
    </li>
  );
}

function Feed({ data, loading, showAmounts }: Pick<DashViewProps, "data" | "showAmounts"> & { loading: boolean }) {
  const { t } = useTranslation();

  if (loading) return <PanelSkeleton rows={7} />;

  const txns = data.latestTxns.slice(0, FEED_LIMIT);
  if (data.upcoming.length === 0 && txns.length === 0) {
    return <PanelEmpty text="Nothing has happened on this account yet." />;
  }

  // Group settled activity by day, keeping ledger order (newest first).
  const days: { day: string; items: Transaction[] }[] = [];
  for (const txn of txns) {
    const last = days[days.length - 1];
    if (last && last.day === txn.date) last.items.push(txn);
    else days.push({ day: txn.date, items: [txn] });
  }

  return (
    <ul className="flex flex-col">
      <DayHeading>{t("dashboard.comingUp", "Coming up")}</DayHeading>
      {data.upcoming.length === 0 ? (
        <li>
          <ComingUpEmpty accountId={data.selectedAccountId} />
        </li>
      ) : (
        data.upcoming.map((p) => <ScheduledRow key={p.id} p={p} showAmounts={showAmounts} />)
      )}
      {days.map((d) => (
        <li key={d.day}>
          <ul className="flex flex-col">
            <DayHeading>{dayLabel(d.day)}</DayHeading>
            {d.items.map((txn) => (
              <TxnRow key={txn.id} t={txn} showAmounts={showAmounts} />
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

export function TimelineLayout(props: DashViewProps) {
  const { data, status, updatedAt, showAmounts, onToggle, onSelectAccount, onRefresh } = props;
  const { t } = useTranslation();
  const loading = status === "loading";

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex items-center justify-between gap-4 sm:flex-wrap">
        <Greeting firstName={data.firstName} />
        <div className="flex items-center gap-3 sm:flex-wrap">
          <MoneyActions accountId={data.selectedAccountId} hasOtherAccounts={data.accounts.length > 1} className="hidden sm:flex" />
          <RefreshControl updatedAt={updatedAt} refreshing={loading} onRefresh={onRefresh} />
        </div>
      </div>

      <Notices data={data} status={status} onRefresh={onRefresh} />

      <motion.div
        key={data.selectedAccountId ?? "none"}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={SPRING}
        className="grid grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
      >
        {/* The rail comes first on small screens so the balance still leads. */}
        <aside className="flex flex-col gap-4 sm:gap-6 lg:sticky lg:top-6 lg:order-2">
          <Card className="sm:gap-4">
            <AccountSwitcher data={data} onSelect={onSelectAccount} />
            <BalanceFigure data={data} loading={loading} showAmounts={showAmounts} onToggle={onToggle} size="md" />
            {!loading && <BalanceMeta data={data} showAmounts={showAmounts} updatedAt={updatedAt} />}
            <MoneyActions accountId={data.selectedAccountId} hasOtherAccounts={data.accounts.length > 1} variant="row" className="mt-3 sm:hidden" />
          </Card>
          <CardsCard data={data} loading={loading} />
          <FxBar />
        </aside>

        <Card className="lg:order-1">
          <CardHeader title={t("dashboard.activity", "Activity")} href={activityHref(data.selectedAccountId)} />
          <Feed data={data} loading={loading} showAmounts={showAmounts} />
        </Card>
      </motion.div>
    </div>
  );
}
