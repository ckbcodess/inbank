"use client";

/**
 * Hero — the Figma dashboard (Internet Banking, node 1945:5108).
 *
 * Strength: presence. The balance sits centred on a slate hero panel with the
 * account pill above it, and the panels rise out of the hero on one sheet:
 * Recent activity · Pay again · Cards · Analytics, then Exchange rates. Send /
 * Pay Bill / Top-Up sit beside the greeting, where every other layout keeps
 * them. The app promo closes the page.
 */

import {
  AccountSwitcher,
  ActivityCard,
  AnalyticsCard,
  CardsCard,
  ComingUpCard,
  Greeting,
  MoneyActions,
  Notices,
  PayAgainCard,
  PromoBanner,
  type DashViewProps,
} from "../parts";
import {
  AccountScoped,
  HeroBalance,
  HeroStack,
  HeroSurface,
  LastLogin,
  HeroTopActions,
  HeroAccountOptionsMenu,
} from "../hero-parts";

export function HeroLayout(props: DashViewProps) {
  const { data, status, showAmounts, onToggle, onSelectAccount, onRefresh } = props;
  const loading = status === "loading";
  const hasOtherAccounts = data.accounts.length > 1;

  return (
    <div className="flex flex-col gap-6 sm:gap-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <Greeting firstName={data.firstName} />
          <LastLogin />
        </div>
        <MoneyActions accountId={data.selectedAccountId} hasOtherAccounts={hasOtherAccounts} className="hidden sm:flex" />
      </div>

      <HeroStack
        hero={
          <HeroSurface className="flex flex-col items-center gap-6 rounded-t-3xl px-4 pb-16 pt-14 sm:pb-28 sm:pt-20">
            <HeroTopActions data={data} className="absolute right-4 top-4 sm:right-6 sm:top-6" />
            <div className="flex items-center gap-2">
              <AccountSwitcher data={data} onSelect={onSelectAccount} align="center" tone="hero" />
              <HeroAccountOptionsMenu data={data} />
            </div>
            <HeroBalance data={data} loading={loading} showAmounts={showAmounts} onToggle={onToggle} />
          </HeroSurface>
        }
      >
        {/* On a phone the actions sit right under the balance, in thumb reach. */}
        <MoneyActions
          accountId={data.selectedAccountId}
          hasOtherAccounts={hasOtherAccounts}
          variant="row"
          className="relative py-2 sm:hidden"
        />

        <Notices data={data} status={status} onRefresh={onRefresh} onOpenFundModal={props.onOpenFundModal} />

        <AccountScoped accountId={data.selectedAccountId} className="dash-grid items-stretch gap-3 sm:gap-5">
          <ActivityCard
            data={data}
            loading={loading}
            showAmounts={showAmounts}
            className="rounded-3xl"
            onOpenFundModal={props.onOpenFundModal}
          />
          <PayAgainCard data={data} loading={loading} className="rounded-3xl" />
          <AnalyticsCard data={data} loading={loading} showAmounts={showAmounts} className="rounded-3xl" />
          <CardsCard data={data} loading={loading} className="rounded-3xl" onOpenFundModal={props.onOpenFundModal} />
          <ComingUpCard data={data} loading={loading} showAmounts={showAmounts} className="rounded-3xl" />
        </AccountScoped>
      </HeroStack>

      <PromoBanner />
    </div>
  );
}
