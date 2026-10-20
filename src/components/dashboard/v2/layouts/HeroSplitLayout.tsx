"use client";

/**
 * Hero split — the Figma dashboard with the hero split.
 *
 * Strength: reading order on a wide screen. The account sits at the top left and
 * My QR at the top right; below them the balance on the left and the actions
 * (Send Money, Bills, Top-Up, FX Rates) on the right, on one line. Same sheet
 * of panels below.
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
  RecommendedCard,
  type DashViewProps,
} from "../parts";
import {
  AccountScoped,
  HeroBalance,
  HeroStack,
  HeroSurface,
  LastLogin,
  HeroQrAction,
  HeroFxRatesButton,
  HeroAccountOptionsMenu,
} from "../hero-parts";

export function HeroSplitLayout(props: DashViewProps) {
  const { data, status, showAmounts, onSelectAccount, onRefresh } = props;
  const loading = status === "loading";
  const hasOtherAccounts = data.accounts.length > 1;

  return (
    <div className="flex flex-col gap-5 sm:gap-10">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <Greeting firstName={data.firstName} />
        <LastLogin />
      </div>

      <HeroStack
        hero={
          // Two rows. Top: the account (pill and options) on the left, My QR on the right. Bottom: the balance on the
          // left and the four actions on the right, on one line (the balance and the buttons share a centre line).
          // The foot has the space the sheet covers added to it. The hero is the one deliberate exception to the
          // spacing scale (pt-7, gap-18, px-9, still 4px multiples): it keeps the designer's original proportions.
          <HeroSurface className="flex flex-col justify-between gap-10 rounded-t-3xl px-3 pb-[56px] pt-5 sm:gap-18 sm:px-9 sm:pb-[72px] sm:pt-7">
            <div className="relative z-10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AccountSwitcher data={data} onSelect={onSelectAccount} tone="hero" />
                <HeroAccountOptionsMenu data={data} />
              </div>
              <HeroQrAction />
            </div>

            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <HeroBalance data={data} loading={loading} />
              <MoneyActions
                accountId={data.selectedAccountId}
                hasOtherAccounts={hasOtherAccounts}
                tone="hero"
                className="relative w-full max-sm:gap-2 sm:w-auto sm:gap-2 lg:justify-end"
                extra={(buttonClassName) => <HeroFxRatesButton className={buttonClassName} />}
              />
            </div>
          </HeroSurface>
        }
      >
        <Notices data={data} status={status} onRefresh={onRefresh} onOpenFundModal={props.onOpenFundModal} />

        <AccountScoped accountId={data.selectedAccountId} className="dash-grid items-stretch gap-2 sm:gap-4">
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
          <RecommendedCard loading={loading} className="rounded-3xl" />
        </AccountScoped>
      </HeroStack>

      <PromoBanner />
    </div>
  );
}
