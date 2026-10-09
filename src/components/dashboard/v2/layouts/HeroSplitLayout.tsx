"use client";

/**
 * Hero split — the Figma dashboard with the hero split.
 *
 * Strength: reading order on a wide screen. Pill, balance and "Updated" stack
 * on the left, sat on the card's foot; the actions wait on the right, where the
 * eye lands after the number. Spacing follows Figma 1951:2350. Same sheet of
 * panels below.
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

export function HeroSplitLayout(props: DashViewProps) {
  const { data, status, showAmounts, onToggle, onSelectAccount, onRefresh } = props;
  const loading = status === "loading";
  const hasOtherAccounts = data.accounts.length > 1;

  return (
    <div className="flex flex-col gap-6 sm:gap-12">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <Greeting firstName={data.firstName} />
        <LastLogin />
      </div>

      <HeroStack
        hero={
          // Spacing per Figma 1951:2350: 40px sides and foot (+32px the sheet covers),
          // content sat on the foot; pill 40px above the balance, "Updated" 16px below it.
          <HeroSurface className="flex flex-col gap-8 rounded-t-3xl px-4 pb-[64px] pt-[60px] sm:px-10 sm:pb-[72px] sm:pt-[88px] lg:flex-row lg:items-end lg:justify-between">
            <HeroTopActions data={data} className="absolute right-4 top-4 sm:right-8 sm:top-8" />
            <div className="flex flex-col items-start gap-8 sm:gap-10">
              <div className="flex items-center gap-2">
                <AccountSwitcher data={data} onSelect={onSelectAccount} tone="hero" />
                <HeroAccountOptionsMenu data={data} />
              </div>
              <HeroBalance data={data} loading={loading} showAmounts={showAmounts} onToggle={onToggle} />
            </div>

            <MoneyActions
              accountId={data.selectedAccountId}
              hasOtherAccounts={hasOtherAccounts}
              tone="hero"
              className="relative w-full max-sm:gap-1.5 sm:w-auto sm:gap-3 lg:justify-end"
            />
          </HeroSurface>
        }
      >
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
