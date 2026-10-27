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

import { ProductBanner } from "@/components/ui/product-banner";
import { useProductAlertItems } from "@/lib/product-alerts";
import { LoansWelcome } from "@/components/loans/LoansWelcome";
import PageHeader from "@/components/layout/PageHeader";
import { ShelfPageSkeleton } from "@/components/states/PageSkeletons";
import { ADVANCE_PRODUCT_HREF, LoansDevTools } from "@/components/loans/parts";
import { ProductCard, useCardLooks, type ProductStatus } from "@/components/insure/PlanCards";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { formatMoney } from "@/lib/mock-data";
import { ADVANCE_PRODUCTS, useLoansHydrated, useMyLoans } from "@/lib/loans";
import { MOCK_TODAY } from "@/lib/treasury";
import { PRODUCT_IMAGES } from "@/lib/product-images";

export function LoansHome() {
  const alerts = useProductAlertItems().loans;
  const hydrated = useLoansHydrated();
  const { income, advances, limit, product } = useMyLoans();
  const { showAmounts } = useAmountVisibility();
  const { look, layout, groups: cardGroups } = useCardLooks();

  if (!hydrated) return <ShelfPageSkeleton cards={1} />;

  const shown = product ?? ADVANCE_PRODUCTS.salary;
  const active = advances.filter((a) => a.status === "active");
  const pending = advances.filter((a) => a.status === "pending");
  const overdue = active.some((a) => a.dueOn < MOCK_TODAY);

  const status: ProductStatus | undefined =
    active.length > 0
      ? { text: `${active.length === 1 ? "1 loan" : `${active.length} loans`}${overdue ? " · payment overdue" : ""}`, attention: overdue }
      : pending.length > 0
        ? { text: "Waiting for approval" }
        : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Loans" />
      <LoansDevTools extraGroups={cardGroups} />
      <LoansWelcome />
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-10">
        <ProductBanner items={alerts} noun="advances" />
        <div className={layout === "grid" ? "grid grid-cols-1 min-[480px]:grid-cols-2" : "grid grid-cols-1"}>
          <ProductCard
            id="advance"
            name={shown.name}
            price={income ? { label: "Up to", amount: formatMoney(limit, "GHS", showAmounts) } : undefined}
            status={status}
            image={PRODUCT_IMAGES.advance}
            alwaysPrice
            look={look}
            layout={layout}
            href={ADVANCE_PRODUCT_HREF}
          />
        </div>
      </div>
    </div>
  );
}
