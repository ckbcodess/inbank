"use client";

/**
 * The advance's own page (`/loans/products/salary-advance`), two pages, never both, like an insurance plan (PATTERNS §24):
 *
 *  - No advance yet: the pitch. A picture, three benefits, the most the customer can take set into a dashed divider, and one
 *    button that names the product (Apply for ...). A customer who isn't paid into GCB gets the way in instead of the
 *    button (CONSTITUTION §1: the way back, never just "not eligible").
 *  - One or more advances: only their loans (the overdue one first, its problem in amber on the row), a small Apply for
 *    Another beside the heading, and an About this advance row. While one is waiting or unpaid, Apply for Another is off and
 *    says why under the list.
 */

import Link from "next/link";
import { ChevronRight, HandCoins } from "@/components/ui/icons";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { AboutSheet } from "@/components/ui/about-sheet";
import { AdvanceAboutContent } from "@/components/loans/AdvanceAbout";
import { HolderActions } from "@/components/ui/holder-actions";
import { ListCard } from "@/components/ui/list-card";
import { SetupPrompt, type SetupStep } from "@/components/ui/setup-prompt";
import { SectionHeading } from "@/components/ui/section-heading";
import { ProductPageSkeleton } from "@/components/states/PageSkeletons";
import { ADVANCE_HREF, LOANS_HOME, LoansDevTools } from "@/components/loans/parts";
import { advanceHighlights } from "@/components/loans/AdvanceInfo";
import { useCardLooks } from "@/components/insure/PlanCards";
import { ProductPitchBody } from "@/components/insure/ProductPitch";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { formatDate, formatMoney } from "@/lib/mock-data";
import { ADVANCE_PRODUCTS, owedBy, useLoansHydrated, useMyLoans, type Advance } from "@/lib/loans";
import { MOCK_TODAY, useTreasuryAccounts } from "@/lib/treasury";
import { cn } from "@/lib/utils";

/** What happens once pay arrives, for the setup card and the progress track. */
const ADVANCE_STEPS: SetupStep[] = [
  { title: "Get paid into GCB", detail: "Ask your employer or pension office to pay into your GCB account." },
  { title: "Your first credit arrives", detail: "Your first advance is available after it lands." },
  { title: "Take an advance", detail: "Up to 80% of what’s paid in." },
];

function statusLine(a: Advance): string {
  switch (a.status) {
    case "pending":
      return "Waiting for approval";
    case "declined":
      return "Not approved";
    case "repaid":
      return `Repaid ${formatDate(a.repaidOn ?? "")}`;
    default:
      return a.dueOn < MOCK_TODAY ? `Overdue since ${formatDate(a.dueOn)}` : `Due ${formatDate(a.dueOn)}`;
  }
}

function AdvanceRow({ advance, showAmounts }: { advance: Advance; showAmounts: boolean }) {
  const overdue = advance.status === "active" && advance.dueOn < MOCK_TODAY;
  const figure = advance.status === "active" ? owedBy(advance) : advance.status === "repaid" ? (advance.repaidAmount ?? advance.amount) : advance.amount;
  const muted = advance.status === "declined" || advance.status === "repaid";
  return (
    <li>
      <Link
        href={`/loans/${advance.id}`}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-3"
      >
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-xl", overdue ? "bg-warning/15 text-warning-text" : "bg-muted text-foreground")}>
          <HandCoins size={16} aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={cn("truncate text-[14px]", muted ? "text-muted-foreground" : "text-foreground")}>{ADVANCE_PRODUCTS[advance.kind].name}</span>
          <span className={cn("tabular truncate text-[12px]", overdue ? "text-warning-text" : "text-muted-foreground")}>{statusLine(advance)}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end">
          <span className={cn("tabular text-[14px]", muted ? "text-muted-foreground" : "text-foreground")}>{formatMoney(figure, "GHS", showAmounts)}</span>
          {advance.status === "active" && <span className="text-[12px] text-muted-foreground">Owed today</span>}
        </span>
        <ChevronRight size={15} aria-hidden="true" className="shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

export function AdvanceProductPage() {
  const hydrated = useLoansHydrated();
  const { income, advances, open, limit, product } = useMyLoans();
  const { showAmounts } = useAmountVisibility();
  const accounts = useTreasuryAccounts();
  const { gate } = useCardLooks();

  if (!hydrated) return <ProductPageSkeleton />;

  const shown = product ?? ADVANCE_PRODUCTS.salary;
  const money = (n: number) => formatMoney(n, "GHS", showAmounts);
  // The overdue one first, then the one waiting or unpaid, then the newest.
  const rank = (a: Advance) => (a.status === "active" && a.dueOn < MOCK_TODAY ? 0 : a === open ? 1 : 2);
  const sorted = [...advances].sort((a, b) => rank(a) - rank(b) || b.requestedOn.localeCompare(a.requestedOn));
  const account = accounts[0];
  const gateText = account
    ? `You can take up to 80% of your salary, national service allowance or pension once it’s paid into a GCB account. Ask your employer or pension office to pay into ${account.name} (${account.number}). Your first advance is available after the first credit arrives.`
    : "You can take up to 80% of your salary, national service allowance or pension once it’s paid into a GCB account.";

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <PageHeader
        title={shown.name}
        backTo={{ href: LOANS_HOME, label: "Loans" }}
        actions={
          advances.length > 0 ? (
            <AboutSheet title={`About ${shown.name}`}>
              <AdvanceAboutContent />
            </AboutSheet>
          ) : undefined
        }
      />
      <LoansDevTools />

      {advances.length > 0 ? (
        <div className="flex flex-col gap-10">
          <section className="flex flex-col gap-3">
            <SectionHeading title="Your Loans" />
            <ListCard>
              {sorted.map((a) => (
                <AdvanceRow key={a.id} advance={a} showAmounts={showAmounts} />
              ))}
            </ListCard>
            {open && (
              <p className="px-1 text-[12px] text-muted-foreground">
                {open.status === "pending" ? "You can take another once this request is decided and repaid." : "Repay your current advance to take another."}
              </p>
            )}
          </section>

          <HolderActions primary={{ label: "Apply for Another", href: ADVANCE_HREF, disabled: !!open }} />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <ProductPitchBody
            productId="advance"
            highlights={advanceHighlights()}
            price={income ? { prefix: "Up to", figure: money(limit) } : undefined}
          />
          {income && product ? (
            <Button nativeButton={false} render={<Link href={ADVANCE_HREF} />} className="h-12 w-full rounded-2xl text-[16px]">
              {`Apply for ${shown.name}`}
            </Button>
          ) : (
            <SetupPrompt
              look={gate}
              rowHeading="Advances are for customers paid into GCB"
              rowText={gateText}
              heading="Advances are for customers paid into GCB"
              text={gateText}
              steps={ADVANCE_STEPS}
              progressLabel="Advances"
              progressNote="Waiting for your first credit"
              action={
                account && (
                  <Button
                    size={gate === "card" ? "default" : "sm"}
                    onClick={() => {
                      navigator.clipboard.writeText(account.number);
                      toast.success("Account number copied", { id: "loans-copy-account" });
                    }}
                  >
                    Copy Account Number
                  </Button>
                )
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
