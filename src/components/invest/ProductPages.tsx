"use client";

/**
 * The three Invest products, by kind: Term Deposits, Treasury Bills and Bonds. Each is a product page, two pages, never
 * both (PATTERNS §24), and its instruments are short lists because the products are small:
 *
 *  - Nothing held: the list of what to buy, and an About row behind which the explanation sits. A row opens the instrument
 *    (`OfferDetail`, a pitch of its own), then the flow.
 *  - Something held: only the holdings (one that matures within a week in amber on its row), a small Buy Another that
 *    opens the list as its own page (`...Open`), and the About row (`...About`: the benefits over a list card of facts).
 *
 * The securities account's own status (being set up, or ready to carry on) sits at the top of both securities pages.
 */

import { Clock } from "@/components/ui/icons";
import { AboutSheet } from "@/components/ui/about-sheet";
import { HolderActions } from "@/components/ui/holder-actions";
import PageHeader from "@/components/layout/PageHeader";
import { ListCard } from "@/components/ui/list-card";
import { TrueEmptyState } from "@/components/states/ListStates";
import { InvestProductsSkeleton } from "@/components/states/PageSkeletons";
import { BILLS_PRODUCTS_HREF, BONDS_PRODUCTS_HREF, INVEST_HOME, InvestDevTools, TERM_PRODUCTS_HREF, TREASURY_HOME } from "@/components/invest/parts";
import { OfferRow, securityOffers, termOffers, type Offer } from "@/components/invest/offers";
import { TreasuryAccountStatus, YourDeposits, YourTreasury } from "@/components/invest/OwnedRows";
import { ProductAboutBody } from "@/components/insure/ProductPitch";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { formatRate, useMyTreasury, useTreasuryHydrated } from "@/lib/treasury";
import { useMyDeposits } from "@/lib/term-deposits";
import { BILLS_HIGHLIGHTS, BONDS_HIGHLIGHTS, type PlanHighlight } from "@/lib/product-highlights";
import type { ProductKey } from "@/components/insure/parts";

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

/** What a holder can do, as two full-width buttons under the holdings: the main one, then the statement. */
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

/** What term deposits are, for the About sheet. */
function TermDepositAboutContent() {
  const { highlights, rows } = termFacts();
  return <ProductAboutBody productId="term-deposits" highlights={highlights} rows={rows} />;
}

/* ── Treasury Bills and Bonds ───────────────────────────────────────────── */

type SecurityKind = "bill" | "bond";

const SECURITY: Record<
  SecurityKind,
  { productId: ProductKey; title: string; href: string; openTitle: string; aboutTitle: string; highlights: readonly PlanHighlight[]; terms: string; extra: Array<[string, string]> }
> = {
  bill: {
    productId: "treasury-bills",
    title: "Treasury Bills",
    href: BILLS_PRODUCTS_HREF,
    openTitle: "Buy a Bill",
    aboutTitle: "About Treasury Bills",
    highlights: BILLS_HIGHLIGHTS,
    terms: "91 to 364 days",
    extra: [],
  },
  bond: {
    productId: "bonds",
    title: "Bonds",
    href: BONDS_PRODUCTS_HREF,
    openTitle: "Buy a Bond",
    aboutTitle: "About Bonds",
    highlights: BONDS_HIGHLIGHTS,
    terms: "Years, set by the bond",
    extra: [["Interest", "Every 6 months"]],
  },
};

/** What is on offer for one kind: both markets, none while the market is closed. */
function kindOffers(kind: SecurityKind, marketOpen: boolean): Offer[] {
  if (!marketOpen) return [];
  return [...securityOffers("primary"), ...securityOffers("secondary")].filter((o) => o.security?.kind === kind);
}

function Market({ kind, marketOpen }: { kind: SecurityKind; marketOpen: boolean }) {
  const offers = kindOffers(kind, marketOpen);
  if (!marketOpen) {
    return (
      <TrueEmptyState
        icon={<Clock size={22} strokeWidth={1.8} />}
        title="The market is closed right now"
        description="It will show here as soon as it reopens."
      />
    );
  }
  if (offers.length === 0) {
    return <TrueEmptyState icon={<Clock size={22} strokeWidth={1.8} />} title="Nothing on offer right now" description="New ones will show here as they open." />;
  }
  return <OfferList offers={offers} />;
}

function securityFacts(kind: SecurityKind, marketOpen: boolean) {
  const cfg = SECURITY[kind];
  const offers = kindOffers(kind, marketOpen);
  const rows: Array<[React.ReactNode, React.ReactNode]> = [
    ...(offers.length > 0
      ? ([["Rates from", <span key="rate" className="text-[20px]">{`${formatRate(Math.min(...offers.map((o) => o.rate)))} a year`}</span>]] as Array<[React.ReactNode, React.ReactNode]>)
      : []),
    ["Terms", cfg.terms],
    ...cfg.extra,
    ["Markets", "Primary at auction, secondary from other investors"],
    ["Held in", "Your own securities account at the CSD"],
    ["Early exit", "Sell back through a rediscount"],
  ];
  return { highlights: cfg.highlights, rows };
}

export function SecurityProducts({ kind }: { kind: SecurityKind }) {
  const hydrated = useTreasuryHydrated();
  const { marketOpen, holdings, orders } = useMyTreasury();
  if (!hydrated) return <InvestProductsSkeleton groups={1} rows={3} />;
  const cfg = SECURITY[kind];
  const holds = holdings.some((h) => h.kind === kind) || orders.some((o) => o.security.kind === kind);
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <PageHeader
        title={cfg.title}
        backTo={back}
        actions={
          <AboutSheet title={cfg.aboutTitle}>
            <SecurityAboutContent kind={kind} />
          </AboutSheet>
        }
      />
      <InvestDevTools section="Invest" />
      <div className="flex flex-col gap-10">
        <TreasuryAccountStatus />
        {holds ? (
          <>
            <YourTreasury kind={kind} />
            <HolderActions primary={{ label: "Buy Another", href: `${cfg.href}/open` }} secondary={{ label: "View Statements", href: `${TREASURY_HOME}/statement` }} />
          </>
        ) : (
          <Market kind={kind} marketOpen={marketOpen} />
        )}
      </div>
    </div>
  );
}

export function SecurityOpen({ kind }: { kind: SecurityKind }) {
  const hydrated = useTreasuryHydrated();
  const { marketOpen } = useMyTreasury();
  if (!hydrated) return <InvestProductsSkeleton groups={1} rows={3} />;
  const cfg = SECURITY[kind];
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <PageHeader title={cfg.openTitle} backTo={{ href: cfg.href, label: cfg.title }} />
      <InvestDevTools section="Invest" />
      <Market kind={kind} marketOpen={marketOpen} />
    </div>
  );
}

/** What treasury bills or bonds are, for the About sheet. */
function SecurityAboutContent({ kind }: { kind: SecurityKind }) {
  const { marketOpen } = useMyTreasury();
  const cfg = SECURITY[kind];
  const { highlights, rows } = securityFacts(kind, marketOpen);
  return <ProductAboutBody productId={cfg.productId} highlights={highlights} rows={rows} />;
}
