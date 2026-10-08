"use client";

/**
 * The two product pages, one level below the Products tile list on Invest. Each is a single list with nothing to toggle:
 *
 *  - Term Deposits: the three periods.
 *  - Treasury Bills & Bonds: two headed sections, the Primary Market (new issues, bought at auction) and the Secondary
 *    Market (bought from other investors). When the market is closed the sections give way to one plain message.
 *
 * A row opens its details. Looking never starts anything.
 */

import { Clock } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { TrueEmptyState } from "@/components/states/ListStates";
import { InvestProductsSkeleton } from "@/components/states/PageSkeletons";
import { InvestDevTools, PRODUCTS_HREF } from "@/components/invest/parts";
import { OfferRow, securityOffers, termOffers, type Offer } from "@/components/invest/offers";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { useMyTreasury, useTreasuryHydrated } from "@/lib/treasury";

const back = { href: PRODUCTS_HREF, label: "Products" };

function Group({ title, line, offers }: { title?: string; line?: string; offers: Offer[] }) {
  const { showAmounts } = useAmountVisibility();
  return (
    <section className="flex flex-col gap-3">
      {(title || line) && (
        <div className="flex flex-col gap-1 px-1">
          {title && <h2 className="text-[16px] font-medium tracking-[-0.01em] text-foreground">{title}</h2>}
          {line && <p className="text-[13px] text-muted-foreground">{line}</p>}
        </div>
      )}
      <ul className="flex flex-col gap-0.5 rounded-2xl border border-border bg-card p-2">
        {offers.map((o) => (
          <OfferRow key={o.key} offer={o} showAmounts={showAmounts} />
        ))}
      </ul>
    </section>
  );
}

export function TermDepositProducts() {
  const hydrated = useTreasuryHydrated();
  if (!hydrated) return <InvestProductsSkeleton groups={1} rows={3} />;
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Term Deposits" backTo={back} />
      <InvestDevTools section="Invest" />
      <Group offers={termOffers()} />
    </div>
  );
}

export function TreasuryProducts() {
  const hydrated = useTreasuryHydrated();
  const { marketOpen } = useMyTreasury();

  if (!hydrated) return <InvestProductsSkeleton groups={2} rows={2} />;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Treasury Bills & Bonds" backTo={back} />
      <InvestDevTools section="Invest" />
      {!marketOpen ? (
        <TrueEmptyState
          icon={<Clock size={22} strokeWidth={1.8} />}
          title="The market is closed right now"
          description="It will show here as soon as it reopens."
        />
      ) : (
        <div className="flex flex-col gap-10">
          <Group title="Primary Market" line="New issues, bought at auction." offers={securityOffers("primary")} />
          <Group title="Secondary Market" line="Bought from other investors." offers={securityOffers("secondary")} />
        </div>
      )}
    </div>
  );
}


