"use client";

/**
 * Loans (Figma "Loans and Advances"), as a shelf like Insure and Invest. The advance that fits the customer is a card
 * with one quiet line about what they hold ("1 loan", amber when a payment is overdue). The card opens the advance's own
 * page (`AdvanceProductPage`), where their loans, what the advance costs and the Apply button sit.
 *
 * The bank already knows which income a customer has, so only their own advance is shown. A customer who isn't paid into
 * GCB still sees the card; the page behind it says why and what would change it (CONSTITUTION §1). "Calculate Loan
 * Eligibility" belongs to the Personal Loan, which isn't offered online yet.
 */

import { useState } from "react";
import { Skeleton } from "skullet/react";
import { ProductBanner } from "@/components/ui/product-banner";
import { useProductAlertItems } from "@/lib/product-alerts";
import { LoansWelcome } from "@/components/loans/LoansWelcome";
import { LosRedirectDialog } from "@/components/loans/LosRedirectDialog";
import PageHeader from "@/components/layout/PageHeader";
import { ADVANCE_PRODUCT_HREF, LoansDevTools } from "@/components/loans/parts";
import { ProductCard, useCardLooks, type ProductStatus } from "@/components/insure/PlanCards";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { formatMoney } from "@/lib/mock-data";
import { ADVANCE_PRODUCTS, LOS_LOANS, useLoansHydrated, useMyLoans } from "@/lib/loans";
import { MOCK_TODAY } from "@/lib/treasury";
import { PRODUCT_IMAGES } from "@/lib/product-images";
import { cn } from "@/lib/utils";

/** `loading` forces the skeleton: the route's loading.tsx draws the page itself, so skullet measures the real cards. */
export function LoansHome({ loading: forced = false }: { loading?: boolean }) {
  const alerts = useProductAlertItems().loans;
  const hydrated = useLoansHydrated();
  const { income, advances, limit, product } = useMyLoans();
  const { showAmounts } = useAmountVisibility();
  const { look, layout, groups: cardGroups } = useCardLooks();
  const [losLoan, setLosLoan] = useState<string | null>(null);

  const loading = forced || !hydrated;

  const shown = product ?? ADVANCE_PRODUCTS.salary;
  const active = advances.filter((a) => a.status === "active");
  const overdue = active.some((a) => a.dueOn < MOCK_TODAY);

  const status: ProductStatus | undefined =
    active.length > 0
      ? { text: `${active.length === 1 ? "1 Loan" : `${active.length} Loans`}${overdue ? " · Payment Overdue" : ""}`, attention: overdue }
      : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Loans" />
      {hydrated && !forced && <LoansDevTools extraGroups={cardGroups} />}
      {!loading && <LoansWelcome />}
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-10">
        {!loading && <ProductBanner items={alerts} noun="advances" />}
        <Skeleton loading={loading}>
        <div className={cn(!loading && "stagger-items", "grid gap-3 sm:gap-4", layout === "grid" ? "grid-cols-1 min-[480px]:grid-cols-2" : "grid-cols-1")}>
          <ProductCard
            id="advance"
            name={shown.name}
            line={income ? `Up to ${formatMoney(limit, "GHS", showAmounts)} · ${shown.limitNote}` : shown.line}
            status={loading ? undefined : status}
            image={PRODUCT_IMAGES.advance}
            look={look}
            layout={layout}
            href={ADVANCE_PRODUCT_HREF}
          />
          {LOS_LOANS.map((loan) => (
            <ProductCard key={loan.id} id={loan.id} name={loan.name} line={loan.line} image={PRODUCT_IMAGES[loan.id]} look={look} layout={layout} onOpen={() => setLosLoan(loan.name)} />
          ))}
        </div>
        </Skeleton>
      </div>
      <LosRedirectDialog loan={losLoan} onClose={() => setLosLoan(null)} />
    </div>
  );
}
