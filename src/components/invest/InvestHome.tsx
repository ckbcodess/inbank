"use client";

/**
 * Invest, with one control at the top to switch between two views:
 *
 *  - Your Investments: what you hold, kept apart by kind (Term Deposits, and Treasury Bills & Bonds). With nothing yet it
 *    is one push to the products.
 *  - Products: the two kinds of investment, as two tiles. Each opens its own page (see `ProductPages`), so there is never
 *    more than one control on a screen.
 *
 * Tapping a market only ever looks. The securities account is created when the customer chooses to invest, and the
 * option's details say so before they do.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, FileText, PiggyBank, ShieldCheck, TrendingUp } from "lucide-react";
import { Bank, Safe } from "reicon-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ListErrorState, ListSkeleton, TrueEmptyState } from "@/components/states/ListStates";
import { InvestDevTools, PRODUCTS_HREF, SecurityIcon, TERM_PRODUCTS_HREF, TREASURY_HOME, TREASURY_PRODUCTS_HREF } from "@/components/invest/parts";
import { InvestWelcome } from "@/components/invest/InvestWelcome";
import { SecuritiesAccountDialog } from "@/components/invest/SecuritiesAccountDialog";
import { ActionTile } from "@/components/ui/action-tile";
import { glassOf, rectRegion } from "@/components/ui/glass-icon";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { formatDate, formatMoney } from "@/lib/mock-data";
import { sumMoney } from "@/lib/money";
import { daysLeftLabel, SUPPORT_PHONE, useMyTreasury, useTreasury, useTreasuryHydrated } from "@/lib/treasury";
import { termInterest, useMyDeposits } from "@/lib/term-deposits";

// The product tiles use the same duotone glass icons as the Send & Pay hub: amber glass with a graphite part.
// Built once at module level so each is a stable component.
const TermDepositIcon = glassOf(Safe as never, "amber", { tone: "slate", region: rectRegion(0, 13, 24, 12) });
const TreasuryIcon = glassOf(Bank as never, "amber", { tone: "slate", region: rectRegion(0, 17.6, 24, 7) });

type View = "investments" | "products";
const VIEWS: readonly { value: View; label: string }[] = [
  { value: "investments", label: "Your Investments" },
  { value: "products", label: "Products" },
];

const STATES = ["populated", "loading", "error"] as const;
type PageState = (typeof STATES)[number];
const STATE_LABELS: Record<PageState, string> = { populated: "Loaded", loading: "Loading", error: "Error" };

interface Row {
  id: string;
  href: string;
  icon: "deposit" | "bill" | "bond";
  title: string;
  meta: string;
  amount: number;
  sub: string;
  maturity: string;
}

export function InvestHome() {
  const router = useRouter();
  const params = useSearchParams();
  const view: View = params.get("view") === "products" ? "products" : "investments";

  const hydrated = useTreasuryHydrated();
  const { ownerId, csd, intent, holdings, orders } = useMyTreasury();
  const { active: deposits } = useMyDeposits();
  const clearIntent = useTreasury((s) => s.clearIntent);
  const { showAmounts } = useAmountVisibility();
  const [state, setState] = useState<PageState>("populated");
  const [needsAccount, setNeedsAccount] = useState(false);

  const money = (n: number) => formatMoney(n, "GHS", showAmounts);

  const setView = (next: View) => router.replace(next === "products" ? PRODUCTS_HREF : "/invest", { scroll: false });
  const goProducts = () => setView("products");

  const treasuryRows: Row[] = holdings
    .map<Row>((h) => ({
      id: h.id,
      href: `${TREASURY_HOME}/holdings/${h.id}`,
      icon: h.kind,
      title: h.title,
      meta: h.kind === "bill" ? `Bill · Matures ${formatDate(h.maturity)}` : `Bond · Matures ${formatDate(h.maturity)}`,
      amount: h.face,
      sub: h.status === "rediscount-pending" ? "Cash-in requested" : daysLeftLabel(h.maturity),
      maturity: h.maturity,
    }))
    .sort((a, b) => a.maturity.localeCompare(b.maturity));
  const depositRows: Row[] = deposits.map<Row>((d) => ({
    id: d.id,
    href: `/invest/term-deposits/${d.id}`,
    icon: "deposit",
    title: `${d.tenureDays}-day Term Deposit`,
    meta: `Matures ${formatDate(d.maturity)}`,
    amount: sumMoney([d.principal, termInterest(d)]),
    sub: daysLeftLabel(d.maturity),
    maturity: d.maturity,
  }));

  const hasTreasury = treasuryRows.length > 0 || orders.length > 0;
  const hasDeposits = depositRows.length > 0;
  const nothingYet = !hasTreasury && !hasDeposits;

  /* ── Your Investments ────────────────────────────────────────────────── */

  function status() {
    if (csd?.status === "pending") {
      return (
        <section className="mx-auto flex max-w-[460px] flex-col items-center gap-4 px-4 py-14 text-center sm:py-16">
          <span className="flex size-20 items-center justify-center rounded-full bg-muted text-foreground">
            <ShieldCheck size={40} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-2">
            <h2 className="text-[20px] tracking-[-0.01em] text-foreground">Your securities account is being set up</h2>
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              {intent
                ? `It’ll be ready within 7 working days of ${formatDate(csd.requestedOn)}. Your choice, ${intent.label}, is saved. Meanwhile, you can explore our products.`
                : `It’ll be ready within 7 working days of ${formatDate(csd.requestedOn)}. Meanwhile, you can explore our products.`}
            </p>
          </div>
          <Button type="button" onClick={() => goProducts()}>
            Explore Products
          </Button>
          <p className="text-[12px] text-muted-foreground">{`Need help? Call ${SUPPORT_PHONE}.`}</p>
        </section>
      );
    }
    if (csd?.status === "active" && intent) {
      return (
        <section className="flex flex-col gap-3 px-1">
          <h2 className="text-[18px] tracking-[-0.01em] text-foreground">Your securities account is ready</h2>
          <p className="text-[14px] text-muted-foreground">{`Carry on with ${intent.label}.`}</p>
          <div>
            <Button
              type="button"
              onClick={() => {
                clearIntent(ownerId);
                router.push(intent.href);
              }}
            >
              Continue
            </Button>
          </div>
        </section>
      );
    }
    return null;
  }

  function renderRow(r: Row) {
    return (
      <li key={r.id}>
        <Link
          href={r.href}
          className="flex w-full items-center gap-4 rounded-xl px-3 py-4 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-4"
        >
          {r.icon === "deposit" ? (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
              <PiggyBank size={16} strokeWidth={1.8} aria-hidden="true" />
            </span>
          ) : (
            <SecurityIcon kind={r.icon} />
          )}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[14px] text-foreground">{r.title}</span>
            <span className="truncate text-[12px] text-muted-foreground">{r.meta}</span>
          </span>
          <span className="flex shrink-0 flex-col items-end">
            <span className="tabular text-[14px] text-foreground">{money(r.amount)}</span>
            <span className="tabular text-[12px] text-muted-foreground">{r.sub}</span>
          </span>
          <ChevronRight size={15} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
        </Link>
      </li>
    );
  }

  /** One kind of investment, its own heading and its own total, never mixed with the other. */
  function section(title: string, children: React.ReactNode, action?: React.ReactNode) {
    return (
      <section className="flex flex-col gap-4">
        <div className="flex min-h-8 items-center justify-between gap-4 px-1">
          <h2 className="text-[16px] font-medium tracking-[-0.01em] text-foreground">{title}</h2>
          {action}
        </div>
        <ul className="flex flex-col gap-0.5 rounded-2xl border border-border bg-card p-2">{children}</ul>
      </section>
    );
  }

  const yourInvestments = () => {
    if (state === "loading") return <ListSkeleton rows={3} />;
    if (state === "error") return <ListErrorState onRetry={() => setState("populated")} />;

    return (
      <div className="flex flex-col gap-10">
        {status()}

        {nothingYet && csd?.status !== "pending" && !(csd?.status === "active" && intent) && (
          <TrueEmptyState
            icon={<TrendingUp size={22} strokeWidth={1.8} />}
            title={csd?.status === "active" ? "Start your first investment" : "You haven’t started investing yet"}
            description="Browse the products to see what’s on offer."
            action={
              <Button type="button" onClick={() => (csd ? goProducts() : setNeedsAccount(true))}>
                Start Investing
              </Button>
            }
          />
        )}

        {hasDeposits && section("Term Deposits", depositRows.map(renderRow))}

        {hasTreasury &&
          section(
            "Treasury Bills & Bonds",
            <>
              {treasuryRows.map(renderRow)}
              {orders.map((o) => (
                <li key={o.id} className="flex w-full items-center gap-4 rounded-xl px-3 py-4 sm:px-4">
                  <SecurityIcon kind={o.security.kind} muted />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[14px] text-muted-foreground">{o.security.title}</span>
                    <span className="truncate text-[12px] text-muted-foreground">
                      {o.security.settlement ? `Settles ${formatDate(o.security.settlement)}` : `Placed ${formatDate(o.placedOn)}`}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end">
                    <span className="tabular text-[14px] text-muted-foreground">{money(o.face)}</span>
                    <span className="text-[12px] text-muted-foreground">Waiting to settle</span>
                  </span>
                </li>
              ))}
            </>,
            csd?.status === "active" ? (
              <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`${TREASURY_HOME}/statement`} />}>
                <FileText size={14} strokeWidth={1.8} aria-hidden="true" />
                Statement
              </Button>
            ) : undefined,
          )}
      </div>
    );
  };

  /* ── Products ─────────────────────────────────────────────────────────── */

  const products = () => (
    <div className="flex flex-col gap-6">
      {csd?.status === "pending" && <p className="px-1 text-[13px] text-muted-foreground">Your securities account is being set up.</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ActionTile
          icon={TermDepositIcon}
          bareIcon
          title="Term Deposits"
          href={TERM_PRODUCTS_HREF}
        />
        <ActionTile
          icon={TreasuryIcon}
          bareIcon
          title="Treasury Bills & Bonds"
          href={TREASURY_PRODUCTS_HREF}
        />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Invest" />
      <InvestDevTools section="Invest" states={STATES} value={state} onChange={(v) => setState(v as PageState)} labels={STATE_LABELS} />
      <InvestWelcome />
      <SecuritiesAccountDialog open={needsAccount} onOpenChange={setNeedsAccount} />
      <SegmentedControl aria-label="Invest view" options={VIEWS} value={view} onChange={setView} />
      {!hydrated ? <ListSkeleton rows={4} /> : view === "products" ? products() : yourInvestments()}
    </div>
  );
}
