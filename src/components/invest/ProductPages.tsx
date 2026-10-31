"use client";

/**
 * The Invest products: Term Deposits and Treasury Bills & Bonds.
 * Each is a product page:
 *  - Nothing held: the offers grouped into sections, and an About sheet.
 *  - Something held: only the holdings, a Buy Another action, and the About sheet.
 */

import { Clock } from "@/components/ui/icons";
import { AboutSheet } from "@/components/ui/about-sheet";
import { HolderActions } from "@/components/ui/holder-actions";
import PageHeader from "@/components/layout/PageHeader";
import { ListCard } from "@/components/ui/list-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { TrueEmptyState } from "@/components/states/ListStates";
import { InvestProductsSkeleton } from "@/components/states/PageSkeletons";
import {
  INVEST_HOME,
  InvestDevTools,
  TERM_PRODUCTS_HREF,
  TREASURY_HOME,
  TREASURY_PRODUCTS_HREF,
} from "@/components/invest/parts";
import { OfferRow, securityOffers, termOffers, type Offer } from "@/components/invest/offers";
import { TreasuryAccountStatus, YourDeposits, YourTreasury } from "@/components/invest/OwnedRows";
import { ProductAboutBody } from "@/components/insure/ProductPitch";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { formatRate, useMyTreasury, useTreasuryHydrated } from "@/lib/treasury";
import { useMyDeposits } from "@/lib/term-deposits";
import { TREASURY_HIGHLIGHTS, type PlanHighlight } from "@/lib/product-highlights";

const back = { href: INVEST_HOME, label: "Invest" };
const TERM_OPEN_HREF = `${TERM_PRODUCTS_HREF}/open`;
const TERMS_STATEMENT_HREF = `${TREASURY_HOME}/statement?product=term-deposits`;

function OfferList({ offers }: { offers: Offer[] }) {
  const { showAmounts } = useAmountVisibility();
  return (
    <ListCard>
      {offers.map((o) => (
        <OfferRow key={o.key} offer={o} showAmounts={showAmounts} />
      ))}
    </ListCard>
  );
}

/* ── Term Deposits ──────────────────────────────────────────────────────── */

function termFacts() {
  const offers = termOffers();
  const days = offers.map((o) => o.tenureDays ?? 0);
  const highlights: PlanHighlight[] = [
    { icon: "rate", label: "Your rate is fixed", value: "It will not change once you start" },
    { icon: "time", label: "You choose how long", value: `${days.slice(0, -1).join(", ")} or ${days[days.length - 1]} days` },
    { icon: "choice", label: "You decide at the end", value: "Take it out or roll it over" },
  ];
  const rows: Array<[React.ReactNode, React.ReactNode]> = [
    ["Rates from", <span key="rate" className="text-[20px]">{`${formatRate(Math.min(...offers.map((o) => o.rate)))} a year`}</span>],
    ["Terms", `${Math.min(...days)} to ${Math.max(...days)} days`],
    ["Early exit", "Allowed. The cost is shown first"],
  ];
  return { offers, highlights, rows };
}

export function TermDepositProducts() {
  const hydrated = useTreasuryHydrated();
  const { active: deposits } = useMyDeposits();
  if (!hydrated) return <InvestProductsSkeleton groups={1} rows={3} />;
  const { offers } = termFacts();
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <PageHeader
        title="Term Deposits"
        backTo={back}
        actions={
          <AboutSheet title="About Term Deposits">
            <TermDepositAboutContent />
          </AboutSheet>
        }
      />
      <InvestDevTools section="Invest" />
      {deposits.length > 0 ? (
        <div className="flex flex-col gap-10">
          <YourDeposits />
          <HolderActions primary={{ label: "Open Another", href: TERM_OPEN_HREF }} secondary={{ label: "View Statements", href: TERMS_STATEMENT_HREF }} />
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          <OfferList offers={offers} />
        </div>
      )}
    </div>
  );
}

export function TermDepositOpen() {
  const hydrated = useTreasuryHydrated();
  if (!hydrated) return <InvestProductsSkeleton groups={1} rows={3} />;
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <PageHeader title="Open a Deposit" backTo={{ href: TERM_PRODUCTS_HREF, label: "Term Deposits" }} />
      <InvestDevTools section="Invest" />
      <OfferList offers={termFacts().offers} />
    </div>
  );
}

function TermDepositAboutContent() {
  const { highlights, rows } = termFacts();
  return <ProductAboutBody productId="term-deposits" highlights={highlights} rows={rows} />;
}

/* ── Treasury Bills & Bonds ─────────────────────────────────────────────── */

function treasuryFacts(marketOpen: boolean) {
  const primary = marketOpen ? securityOffers("primary") : [];
  const secondary = marketOpen ? securityOffers("secondary") : [];
  const allOffers = [...primary, ...secondary];
  const rows: Array<[React.ReactNode, React.ReactNode]> = [
    ...(allOffers.length > 0
      ? ([["Rates from", <span key="rate" className="text-[20px]">{`${formatRate(Math.min(...allOffers.map((o) => o.rate)))} a year`}</span>]] as Array<[React.ReactNode, React.ReactNode]>)
      : []),
    ["Terms", "91 days to 15 years"],
    ["Markets", "Primary at auction, secondary from other investors"],
    ["Held in", "Your own securities account at the CSD"],
    ["Early exit", "Sell back through a rediscount"],
  ];
  return { highlights: TREASURY_HIGHLIGHTS, rows };
}

function TreasuryMarket({ marketOpen }: { marketOpen: boolean }) {
  if (!marketOpen) {
    return (
      <TrueEmptyState
        icon={<Clock size={22} strokeWidth={1.8} />}
        title="The market is closed right now"
        description="It will show here as soon as it reopens."
      />
    );
  }
  const primaryOffers = securityOffers("primary");
  const secondaryOffers = securityOffers("secondary");

  if (primaryOffers.length === 0 && secondaryOffers.length === 0) {
    return (
      <TrueEmptyState
        icon={<Clock size={22} strokeWidth={1.8} />}
        title="Nothing on offer right now"
        description="New ones will show here as they open."
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {primaryOffers.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeading title="Primary Market" />
          <OfferList offers={primaryOffers} />
        </section>
      )}
      {secondaryOffers.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeading title="Secondary Market" />
          <OfferList offers={secondaryOffers} />
        </section>
      )}
    </div>
  );
}

export function TreasuryProducts() {
  const hydrated = useTreasuryHydrated();
  const { marketOpen, holdings, orders } = useMyTreasury();
  if (!hydrated) return <InvestProductsSkeleton groups={2} rows={3} />;
  const holds = holdings.length > 0 || orders.length > 0;
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <PageHeader
        title="Treasury Bills & Bonds"
        backTo={back}
        actions={
          <AboutSheet title="About Treasury Bills & Bonds">
            <TreasuryAboutContent />
          </AboutSheet>
        }
      />
      <InvestDevTools section="Invest" />
      <div className="flex flex-col gap-10">
        <TreasuryAccountStatus />
        {holds ? (
          <>
            <YourTreasury kind="all" />
            <HolderActions
              primary={{ label: "Buy Another", href: `${TREASURY_PRODUCTS_HREF}/open` }}
              secondary={{ label: "View Statements", href: `${TREASURY_HOME}/statement` }}
            />
          </>
        ) : (
          <TreasuryMarket marketOpen={marketOpen} />
        )}
      </div>
    </div>
  );
}

export function TreasuryOpen() {
  const hydrated = useTreasuryHydrated();
  const { marketOpen } = useMyTreasury();
  if (!hydrated) return <InvestProductsSkeleton groups={2} rows={3} />;
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <PageHeader title="Buy Bills & Bonds" backTo={{ href: TREASURY_PRODUCTS_HREF, label: "Treasury Bills & Bonds" }} />
      <InvestDevTools section="Invest" />
      <TreasuryMarket marketOpen={marketOpen} />
    </div>
  );
}

function TreasuryAboutContent() {
  const { marketOpen } = useMyTreasury();
  const { highlights, rows } = treasuryFacts(marketOpen);
  return <ProductAboutBody productId="treasury" highlights={highlights} rows={rows} />;
}

/** Backward-compatible aliases for any prior links/components. */
export function SecurityProducts() {
  return <TreasuryProducts />;
}

export function SecurityOpen() {
  return <TreasuryOpen />;
}
