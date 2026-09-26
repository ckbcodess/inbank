"use client";

/**
 * Focus — calm, balance first.
 *
 * Strength: answers "am I OK?" in one glance. A large centred balance, one
 * forward-looking line (what's left after scheduled payments), then only what's
 * next and what just happened. Cards, spend and rates are one quiet link away.
 */

import Link from "next/link";
import { motion } from "framer-motion";
import { formatMoney } from "@/lib/mock-data";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import {
  AccountSwitcher,
  ActivityBody,
  activityHref,
  BalanceFigure,
  CardHeader,
  ComingUpEmpty,
  forecastFor,
  Greeting,
  MoneyActions,
  Notices,
  PanelSkeleton,
  RefreshControl,
  SPRING,
  selectedAccount,
  UpcomingList,
  type DashData,
  type DashViewProps,
} from "../parts";

/** What's left once this account's standing orders for the next 30 days have run. */
function Forecast({ data, showAmounts }: { data: DashData; showAmounts: boolean }) {
  const account = selectedAccount(data);
  const forecast = forecastFor(data);
  if (!account || !forecast) return null;
  const { left } = forecast;
  const money = (n: number) => formatMoney(n, account.currency, showAmounts);

  if (left >= 0) {
    return (
      // One text run so it translates as a single sentence.
      <p className="text-[14px] text-muted-foreground tabular">
        {money(left)} left after scheduled payments in the next 30 days
      </p>
    );
  }
  // Framed as a heads-up with a way out, never a verdict.
  return (
    <p className="text-[14px] text-muted-foreground tabular">
      Scheduled payments over the next 30 days come to {money(data.scheduledNext30)} — more than you have available.{" "}
      <Link href="/payments/standing" className="text-foreground underline-offset-4 hover:underline">
        Review them
      </Link>
    </p>
  );
}

/** A quiet section — no card chrome, just a heading and a list. */
function Section({ children }: { children: React.ReactNode }) {
  return <section className="flex flex-col gap-4">{children}</section>;
}

export function FocusLayout(props: DashViewProps) {
  const { data, status, updatedAt, showAmounts, onToggle, onSelectAccount, onRefresh } = props;
  const { t } = useTranslation();
  const loading = status === "loading";

  const elsewhere = [
    { label: t("dashboard.cards", "Cards"), href: "/cards" },
    { label: t("dashboard.analytics", "Analytics"), href: "/reports" },
    { label: t("dashboard.exchangeRates", "Exchange rates"), href: "/fx-rates" },
    { label: t("dashboard.accounts", "Accounts"), href: "/accounts" },
  ];

  return (
    <div className="flex flex-col gap-8 sm:gap-12">
      <div className="flex items-center justify-between gap-4">
        <Greeting firstName={data.firstName} className="sm:text-[20px] sm:leading-[26px]" />
        <RefreshControl updatedAt={updatedAt} refreshing={loading} onRefresh={onRefresh} />
      </div>

      {/* Hero — the left pad offsets the eye button so the number reads centred. */}
      <div className="flex flex-col items-center gap-4 text-center sm:gap-5">
        <AccountSwitcher data={data} onSelect={onSelectAccount} align="center" />
        <BalanceFigure data={data} loading={loading} showAmounts={showAmounts} onToggle={onToggle} size="xl" className="pl-10 sm:pl-12" />
        {!loading && <Forecast data={data} showAmounts={showAmounts} />}
        <MoneyActions accountId={data.selectedAccountId} hasOtherAccounts={data.accounts.length > 1} className="mt-3 hidden justify-center sm:flex" />
        <MoneyActions accountId={data.selectedAccountId} hasOtherAccounts={data.accounts.length > 1} variant="row" className="mt-2 w-full sm:hidden" />
      </div>

      <motion.div
        key={data.selectedAccountId ?? "none"}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={SPRING}
        className="mx-auto flex w-full max-w-2xl flex-col gap-8 sm:gap-12"
      >
        <Notices data={data} status={status} onRefresh={onRefresh} />

        <Section>
          <CardHeader title={t("dashboard.comingUp", "Coming up")} href="/payments/standing" cta={t("common.manage", "Manage")} />
          {loading ? (
            <PanelSkeleton rows={3} />
          ) : data.upcoming.length === 0 ? (
            <ComingUpEmpty accountId={data.selectedAccountId} />
          ) : (
            <UpcomingList items={data.upcoming} showAmounts={showAmounts} />
          )}
        </Section>

        <Section>
          <CardHeader title={t("dashboard.recentActivity", "Recent activity")} href={activityHref(data.selectedAccountId)} />
          <ActivityBody data={data} loading={loading} showAmounts={showAmounts} limit={5} />
        </Section>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-border pt-6">
          {elsewhere.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </motion.div>
    </div>
  );
}
