"use client";

/**
 * Invest is a shelf like Insure and Loans: the three kinds of investment (Term Deposits, Treasury Bills, Bonds) as tiles, the same for every customer. Each tile
 * carries one quiet line about what the customer holds ("2 deposits", amber when one matures within a week or the
 * securities account is ready to carry on). There is no total above them (designer, 2026-10-24): a figure that mixes a
 * deposit's principal with a holding's cost answers nothing the customer asked, and each product page shows its own.
 *
 * A tile opens its product page (`ProductPages`): the customer's own investments first, then what they can start. Tapping
 * a market only ever looks. The securities account is created when the customer chooses to invest, and the option's
 * details say so before they do.
 */

import { useState } from "react";
import { Skeleton } from "skullet/react";
import { ProductBanner } from "@/components/ui/product-banner";
import { useProductAlertItems } from "@/lib/product-alerts";
import PageHeader from "@/components/layout/PageHeader";
import { ListErrorState } from "@/components/states/ListStates";
import { InvestDevTools, TERM_PRODUCTS_HREF, TREASURY_PRODUCTS_HREF } from "@/components/invest/parts";
import { InvestWelcome } from "@/components/invest/InvestWelcome";
import { ProductCard, useCardLooks, type ProductStatus } from "@/components/insure/PlanCards";
import { MOCK_TODAY, useMyTreasury, useTreasuryHydrated } from "@/lib/treasury";
import { useMyDeposits } from "@/lib/term-deposits";
import { PRODUCT_IMAGES } from "@/lib/product-images";
import { cn } from "@/lib/utils";

const STATES = ["populated", "loading", "error"] as const;
type PageState = (typeof STATES)[number];
const STATE_LABELS: Record<PageState, string> = { populated: "Loaded", loading: "Loading", error: "Error" };

/** Matures within a week of the prototype's today. */
const soon = (maturity: string) => (Date.parse(maturity) - Date.parse(MOCK_TODAY)) / 86_400_000 <= 7;

/** `loading` forces the skeleton: the route's loading.tsx draws the page itself, so skullet measures the real cards. */
export function InvestHome({ loading: forced = false }: { loading?: boolean }) {
  const alerts = useProductAlertItems().invest;
  const hydrated = useTreasuryHydrated();
  const { csd, intent, holdings, orders } = useMyTreasury();
  const { active: deposits } = useMyDeposits();
  const [state, setState] = useState<PageState>("populated");
  const { look, layout } = useCardLooks();

  const loading = forced || !hydrated || state === "loading";

  const depositsSoon = deposits.filter((d) => soon(d.maturity)).length;
  const termStatus: ProductStatus | undefined =
    deposits.length === 0
      ? undefined
      : {
          text: `${deposits.length === 1 ? "1 deposit" : `${deposits.length} deposits`}${depositsSoon > 0 ? ` · ${depositsSoon} matures soon` : ""}`,
          attention: depositsSoon > 0,
        };

  const ready = csd?.status === "active" && Boolean(intent);
  const securityStatus = (): ProductStatus | undefined => {
    const mine = holdings;
    const waiting = orders.length;
    const mineSoon = mine.filter((h) => soon(h.maturity)).length;
    if (mine.length === 0 && waiting === 0) {
      return ready
        ? { text: "Your securities account is ready" }
        : csd?.status === "pending"
          ? { text: "Securities account being set up", attention: true }
          : undefined;
    }
    return {
      text: `${mine.length === 1 ? "1 holding" : `${mine.length} holdings`}${waiting > 0 ? ` · ${waiting} waiting to settle` : ""}${mineSoon > 0 ? ` · ${mineSoon} matures soon` : ""}`,
      attention: mineSoon > 0,
    };
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Invest" />
      {hydrated && !forced && <InvestDevTools section="Invest" states={STATES} value={state} onChange={(v) => setState(v as PageState)} labels={STATE_LABELS} />}
      {!loading && <InvestWelcome />}
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-10">
        {!loading && <ProductBanner items={alerts} noun="investments" />}
        {state === "error" && !loading ? (
          <ListErrorState onRetry={() => setState("populated")} />
        ) : (
          <Skeleton loading={loading}>
          <div className={cn(!loading && "stagger-items", "grid gap-3 sm:gap-4", layout === "grid" ? "grid-cols-1 min-[480px]:grid-cols-2" : "grid-cols-1")}>
            <ProductCard
              id="term-deposits"
              name="Term Deposits"
              line="Lock money away at a fixed rate"
              status={loading ? undefined : termStatus}
              image={PRODUCT_IMAGES["term-deposits"]}
              look={look}
              layout={layout}
              href={TERM_PRODUCTS_HREF}
            />
            <ProductCard
              id="treasury"
              name="Treasury Bills & Bonds"
              line="Lend to the government at fixed rates or auction"
              status={loading ? undefined : securityStatus()}
              image={PRODUCT_IMAGES.treasury}
              look={look}
              layout={layout}
              href={TREASURY_PRODUCTS_HREF}
            />
          </div>
          </Skeleton>
        )}
      </div>
    </div>
  );
}
