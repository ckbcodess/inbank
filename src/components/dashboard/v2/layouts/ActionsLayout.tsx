"use client";

/**
 * Actions — get things done fast.
 *
 * Strength: speed to the task. The Send & Pay hub tiles move onto the
 * dashboard, each opening on the selected account, so the most common jobs are
 * one tap from sign-in. The header buttons step aside (the tiles replace them);
 * what's scheduled and what just happened follow.
 */

import { motion } from "framer-motion";
import { ArrowLeftRight, CalendarClock, CreditCard, Receipt, Send, Smartphone } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { ActionTile } from "@/components/ui/action-tile";
import {
  AccountSwitcher,
  ActivityCard,
  BalanceFigure,
  BalanceMeta,
  ComingUpCard,
  FxBar,
  Greeting,
  Notices,
  RefreshControl,
  SPRING,
  withFrom,
  type DashViewProps,
} from "../parts";

export function ActionsLayout(props: DashViewProps) {
  const { data, status, updatedAt, showAmounts, onToggle, onSelectAccount, onRefresh } = props;
  const { t } = useTranslation();
  const loading = status === "loading";
  const from = data.selectedAccountId;

  const tiles = [
    { icon: Send, title: t("dashboard.sendMoney", "Send Money"), href: withFrom("/payments/send", from) },
    { icon: Receipt, title: t("dashboard.payBill", "Pay Bill"), href: withFrom("/payments/bills", from) },
    { icon: Smartphone, title: t("dashboard.airtimeData", "Airtime & Data"), href: withFrom("/payments/send?rail=airtime", from) },
    // Only meaningful with somewhere else to move money to.
    ...(data.accounts.length > 1
      ? [{ icon: ArrowLeftRight, title: t("dashboard.betweenAccounts", "Between my accounts"), href: withFrom("/payments/send?category=own", from) }]
      : []),
    { icon: CalendarClock, title: t("dashboard.schedulePayment", "Schedule a payment"), href: withFrom("/payments/standing/new", from) },
    { icon: CreditCard, title: t("dashboard.cards", "Cards"), href: "/cards" },
  ];

  return (
    <div className="flex flex-col gap-6 sm:gap-10">
      <div className="flex items-center justify-between gap-4">
        <Greeting firstName={data.firstName} />
        <RefreshControl updatedAt={updatedAt} refreshing={loading} onRefresh={onRefresh} />
      </div>

      <div className="flex flex-col gap-6 sm:gap-8">
        <div className="flex flex-col gap-3 sm:gap-4">
          <AccountSwitcher data={data} onSelect={onSelectAccount} />
          <BalanceFigure data={data} loading={loading} showAmounts={showAmounts} onToggle={onToggle} />
          {!loading && <BalanceMeta data={data} showAmounts={showAmounts} updatedAt={updatedAt} />}
        </div>

        <Notices data={data} status={status} onRefresh={onRefresh} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {tiles.map((tile) => (
            <ActionTile key={tile.title} icon={tile.icon} title={tile.title} href={tile.href} />
          ))}
        </div>

        <motion.div
          key={data.selectedAccountId ?? "none"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={SPRING}
          className="grid grid-cols-1 items-stretch gap-4 sm:gap-6 lg:grid-cols-2"
        >
          <ComingUpCard data={data} loading={loading} showAmounts={showAmounts} />
          <ActivityCard data={data} loading={loading} showAmounts={showAmounts} />
          <div className="lg:col-span-2">
            <FxBar />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
