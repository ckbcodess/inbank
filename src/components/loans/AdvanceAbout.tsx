"use client";

/**
 * What the advance is: the explanation a customer who already has advances opens from the About chip on the product
 * page (`AboutSheet`). The benefits, then the list card with the limit first and larger, then the costs.
 */

import { advanceHighlights, advanceRows } from "@/components/loans/AdvanceInfo";
import { ProductAboutBody } from "@/components/insure/ProductPitch";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { ADVANCE_PRODUCTS, useMyLoans } from "@/lib/loans";

export function AdvanceAboutContent() {
  const { income, limit, product } = useMyLoans();
  const { showAmounts } = useAmountVisibility();

  const shown = product ?? ADVANCE_PRODUCTS.salary;

  return (
    <>
      <p className="px-1 text-[14px] leading-relaxed text-muted-foreground">{shown.line}</p>
      <ProductAboutBody productId="advance" highlights={advanceHighlights()} rows={advanceRows(shown.limitNote, income ? limit : null, showAmounts)} />
    </>
  );
}
