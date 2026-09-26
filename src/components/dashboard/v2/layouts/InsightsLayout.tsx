"use client";

/**
 * Insights — where the money goes.
 *
 * Strength: understanding. Three plain figures (in, out, already scheduled),
 * then the spend gauge beside a ranked category list so the "why" sits next to
 * the "how much". Activity follows as the evidence.
 */

import { motion } from "framer-motion";
import { formatMoney } from "@/lib/mock-data";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import {
  AccountSwitcher,
  ActivityCard,
  AnalyticsCard,
  BalanceFigure,
  BalanceMeta,
  Card,
  CardHeader,
  FxBar,
  Greeting,
  MoneyActions,
  Notices,
  PanelEmpty,
  PanelSkeleton,
  RefreshControl,
  SPRING,
  selectedAccount,
  type DashData,
  type DashViewProps,
} from "../parts";

function StatTile({
  label,
  value,
  tone = "default",
  loading,
}: {
  label: string;
  value: string;
  tone?: "default" | "positive";
  loading: boolean;
}) {
  // A row of the grouped stats panel on a phone; its own tile from sm up.
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:flex-col sm:items-start sm:justify-start sm:rounded-2xl sm:border sm:border-border sm:bg-card sm:p-5">
      <span className="text-[13px] text-muted-foreground sm:text-[12.5px]">{label}</span>
      {loading ? (
        <span className="h-5 w-24 animate-pulse rounded-md bg-muted/60 sm:h-6 sm:w-32" />
      ) : (
        <span className={`tabular shrink-0 text-[15px] leading-none tracking-[-0.01em] sm:text-[22px] ${tone === "positive" ? "text-success" : "text-foreground"}`}>
          {value}
        </span>
      )}
    </div>
  );
}

/** Last month's categories, largest first, each with its share of the total. */
function TopCategories({ data, loading, showAmounts }: { data: DashData; loading: boolean; showAmounts: boolean }) {
  const { t } = useTranslation();
  const month = data.spendByRange["1m"];
  const slices = month.slices.filter((s) => s.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 5);

  return (
    <Card>
      <CardHeader title={t("dashboard.topCategories", "Top categories")} href="/reports" />
      {loading ? (
        <PanelSkeleton rows={4} />
      ) : slices.length === 0 ? (
        <PanelEmpty text="No spending on this account in the past month." />
      ) : (
        <ul className="flex flex-col gap-3.5 sm:gap-4">
          {slices.map((s) => (
            <li key={s.label} className="flex flex-col gap-2">
              <span className="flex items-baseline justify-between gap-3 text-[13.5px]">
                <span className="truncate text-foreground">{s.label}</span>
                <span className="shrink-0 tabular text-muted-foreground">
                  {formatMoney(s.amount, "GHS", showAmounts)}
                  <span className="ml-2 text-[12px]">{Math.round(s.share * 100)}%</span>
                </span>
              </span>
              <span className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${Math.max(s.share * 100, 2)}%`, background: s.color }}
                />
              </span>
            </li>
          ))}
          <li className="text-[12px] text-muted-foreground">Past month</li>
        </ul>
      )}
    </Card>
  );
}

export function InsightsLayout(props: DashViewProps) {
  const { data, status, updatedAt, showAmounts, onToggle, onSelectAccount, onRefresh } = props;
  const loading = status === "loading";
  const currency = selectedAccount(data)?.currency ?? "GHS";
  const money = (n: number) => formatMoney(n, currency, showAmounts);

  return (
    <div className="flex flex-col gap-6 sm:gap-10">
      <div className="flex items-center justify-between gap-4 sm:flex-wrap">
        <Greeting firstName={data.firstName} />
        <div className="flex items-center gap-3 sm:flex-wrap">
          <MoneyActions accountId={data.selectedAccountId} hasOtherAccounts={data.accounts.length > 1} className="hidden sm:flex" />
          <RefreshControl updatedAt={updatedAt} refreshing={loading} onRefresh={onRefresh} />
        </div>
      </div>

      <div className="flex flex-col gap-6 sm:gap-8">
        <div className="flex flex-col gap-3 sm:gap-4">
          <AccountSwitcher data={data} onSelect={onSelectAccount} />
          <BalanceFigure data={data} loading={loading} showAmounts={showAmounts} onToggle={onToggle} />
          {/* In/out lives in the tiles below, so only the hold line here. */}
          {!loading && <BalanceMeta data={data} showAmounts={showAmounts} showFlow={false} updatedAt={updatedAt} />}
          <MoneyActions accountId={data.selectedAccountId} hasOtherAccounts={data.accounts.length > 1} variant="row" className="mt-3 sm:hidden" />
        </div>

        <Notices data={data} status={status} onRefresh={onRefresh} />

        <motion.div
          key={data.selectedAccountId ?? "none"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={SPRING}
          className="flex flex-col gap-4 sm:gap-6"
        >
          {/* One panel of three rows on a phone instead of three stacked boxes. */}
          <div className="grid grid-cols-1 divide-y divide-border/60 rounded-2xl border border-border bg-card sm:grid-cols-3 sm:gap-4 sm:divide-y-0 sm:rounded-none sm:border-0 sm:bg-transparent">
            <StatTile
              label={`Money in · last ${data.cashFlow.days} days`}
              value={`+ ${money(data.cashFlow.moneyIn)}`}
              tone="positive"
              loading={loading}
            />
            <StatTile
              label={`Money out · last ${data.cashFlow.days} days`}
              value={`− ${money(data.cashFlow.moneyOut)}`}
              loading={loading}
            />
            <StatTile label="Scheduled · next 30 days" value={money(data.scheduledNext30)} loading={loading} />
          </div>

          <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-6 lg:grid-cols-2">
            <AnalyticsCard data={data} loading={loading} showAmounts={showAmounts} />
            <TopCategories data={data} loading={loading} showAmounts={showAmounts} />
          </div>

          <ActivityCard data={data} loading={loading} showAmounts={showAmounts} limit={5} />
          <FxBar />
        </motion.div>
      </div>
    </div>
  );
}
