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
  FxBar,
  Greeting,
  MoneyActions,
  Notices,
  PayAgainCard,
  type DashViewProps,
} from "../parts";
import {
  AccountScoped,
  HeroBalance,
  HeroPromo,
  HeroStack,
  HeroSurface,
  HeroUpdated,
  LastLogin,
  ManageAccountsLink,
} from "../hero-parts";

export function HeroSplitLayout(props: DashViewProps) {
  const { data, status, updatedAt, showAmounts, onToggle, onSelectAccount, onRefresh } = props;
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
          <HeroSurface className="flex flex-col gap-8 rounded-t-3xl px-5 pb-[64px] pt-16 sm:px-10 sm:pb-[72px] sm:pt-[108px] lg:flex-row lg:items-end lg:justify-between">
            <ManageAccountsLink className="absolute right-4 top-4 sm:right-8 sm:top-8" />
            <div className="flex flex-col items-start gap-8 sm:gap-10">
              <AccountSwitcher data={data} onSelect={onSelectAccount} tone="hero" />
              <div className="flex flex-col gap-4">
                <HeroBalance data={data} loading={loading} showAmounts={showAmounts} onToggle={onToggle} />
                <HeroUpdated updatedAt={updatedAt} className="opacity-50" />
              </div>
            </div>

            <MoneyActions
              accountId={data.selectedAccountId}
              hasOtherAccounts={hasOtherAccounts}
              tone="hero"
              className="relative hidden gap-3 sm:flex lg:justify-end"
            />
            <MoneyActions
              accountId={data.selectedAccountId}
              hasOtherAccounts={hasOtherAccounts}
              variant="row"
              tone="hero"
              className="relative sm:hidden"
            />
          </HeroSurface>
        }
      >
        <Notices data={data} status={status} onRefresh={onRefresh} />

        <AccountScoped accountId={data.selectedAccountId} className="grid grid-cols-1 items-stretch gap-3 sm:gap-5 lg:grid-cols-2">
          <ActivityCard data={data} loading={loading} showAmounts={showAmounts} className="rounded-3xl" />
          <PayAgainCard data={data} className="rounded-3xl" />
          <CardsCard data={data} loading={loading} className="rounded-3xl" />
          <AnalyticsCard data={data} loading={loading} showAmounts={showAmounts} className="rounded-3xl" />
          <div className="lg:col-span-2">
            <FxBar className="rounded-3xl" />
          </div>
        </AccountScoped>
      </HeroStack>

      <HeroPromo />
    </div>
  );
}
