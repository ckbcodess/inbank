"use client";

/**
 * Overview — everything at a glance.
 *
 * Strength: breadth. Balance up top, then four equal panels (activity, coming
 * up, cards, spend) so nothing is more than a glance away. The default.
 */

import { motion } from "framer-motion";
import {
  AccountSwitcher,
  ActivityCard,
  AnalyticsCard,
  BalanceFigure,
  BalanceMeta,
  CardsCard,
  ComingUpCard,
  Greeting,
  MoneyActions,
  Notices,
  PayAgainCard,
  PromoBanner,
  RefreshControl,
  SPRING,
  type DashViewProps,
} from "../parts";

export function OverviewLayout(props: DashViewProps) {
  const { data, status, updatedAt, showAmounts, onToggle, onSelectAccount, onRefresh } = props;
  const loading = status === "loading";

  return (
    <div className="@container flex flex-col gap-6 sm:gap-10">
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
          {!loading && <BalanceMeta data={data} showAmounts={showAmounts} updatedAt={updatedAt} />}
          {/* On a phone the actions sit under the balance, in thumb reach. */}
          <MoneyActions accountId={data.selectedAccountId} hasOtherAccounts={data.accounts.length > 1} variant="row" className="mt-3 sm:hidden" />
        </div>

        <Notices data={data} status={status} onRefresh={onRefresh} onOpenFundModal={props.onOpenFundModal} />

        {/* Re-keyed per account so a switch visibly reloads the account's panels. */}
        <motion.div
          key={data.selectedAccountId ?? "none"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={SPRING}
          className="dash-grid items-stretch gap-4 sm:gap-6"
        >
          <ActivityCard
            data={data}
            loading={loading}
            showAmounts={showAmounts}
            onOpenFundModal={props.onOpenFundModal}
          />
          <PayAgainCard data={data} loading={loading} />
          <AnalyticsCard data={data} loading={loading} showAmounts={showAmounts} />
          <CardsCard data={data} loading={loading} onOpenFundModal={props.onOpenFundModal} />
          <ComingUpCard data={data} loading={loading} showAmounts={showAmounts} />
        </motion.div>

        <PromoBanner />
      </div>
    </div>
  );
}
