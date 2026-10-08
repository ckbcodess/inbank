"use client";

/**
 * One option, to look at before committing to anything (the way a brokerage shows a stock before you buy it): the
 * rate, the few facts that matter, and a worked example in cedis. Starting is one clear button at the bottom, and
 * what starting involves is said right above it: with no securities account yet, we set it up first.
 */

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SearchX } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { OfferDetailSkeleton } from "@/components/states/PageSkeletons";
import { TrueEmptyState } from "@/components/states/ListStates";
import { FactsPanel, TERM_PRODUCTS_HREF, TREASURY_PRODUCTS_HREF } from "@/components/invest/parts";
import { findOffer } from "@/components/invest/offers";
import { SecuritiesAccountDialog } from "@/components/invest/SecuritiesAccountDialog";
import { formatDate, formatMoney } from "@/lib/mock-data";
import { multiplyMoney, roundMoney, sumMoney } from "@/lib/money";
import { addDays, costFromFace, couponPerPeriod, formatRate, MOCK_TODAY, useMyTreasury, useTreasuryHydrated } from "@/lib/treasury";
import { interestFor, MIN_DEPOSIT } from "@/lib/term-deposits";

const EXAMPLE = 1000;
const money = (n: number) => formatMoney(n, "GHS", true);

export function OfferDetail() {
  const { key } = useParams<{ key: string }>();
  const hydrated = useTreasuryHydrated();
  const { csd, marketOpen } = useMyTreasury();
  const offer = findOffer(key);
  const [needsCsd, setNeedsCsd] = useState(false);
  const back =
    offer?.group === "term"
      ? { href: TERM_PRODUCTS_HREF, label: "Term Deposits" }
      : { href: TREASURY_PRODUCTS_HREF, label: "Treasury Bills & Bonds" };

  if (!hydrated) return <OfferDetailSkeleton />;
  if (!offer) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Investment" backTo={back} />
        <TrueEmptyState
          icon={<SearchX size={22} strokeWidth={1.8} />}
          title="We couldn’t find that one"
          description="It may have been sold or the auction may have closed."
          action={
            <Button nativeButton={false} render={<Link href="/invest?view=products" />}>
              View Products
            </Button>
          }
        />
      </div>
    );
  }

  const s = offer.security;
  const closed = offer.group !== "term" && !marketOpen;

  const facts: Array<[string, React.ReactNode]> =
    offer.group === "term"
      ? [
          ["Rate", formatRate(offer.rate)],
          ["Deposit period", `${offer.tenureDays} days`],
          ["Matures", formatDate(addDays(MOCK_TODAY, offer.tenureDays ?? 0))],
          ["Minimum deposit", money(MIN_DEPOSIT)],
        ]
      : s && offer.group === "primary"
        ? [
            ["Indicative rate", formatRate(offer.rate)],
            ["Auction number", String(s.auction)],
            ["Settles", formatDate(s.settlement ?? s.maturity)],
            ["Matures", formatDate(s.maturity)],
          ]
        : s
          ? [
              ["Rate", formatRate(offer.rate)],
              ["Matures", formatDate(s.maturity)],
              ["Available", money(s.available ?? 0)],
            ]
          : [];

  let exampleRows: Array<[string, React.ReactNode]> = [];

  if (offer.group === "term" && offer.tenureDays) {
    const interest = interestFor(EXAMPLE, offer.rate, offer.tenureDays);
    const total = sumMoney([EXAMPLE, interest]);
    exampleRows = [
      ["You deposit", money(EXAMPLE)],
      ["Estimated interest", <span key="interest" className="text-success-text font-medium">+{money(interest)}</span>],
      ["You receive at maturity", <span key="total" className="font-medium">{money(total)}</span>],
    ];
  } else if (s) {
    if (s.kind === "bond") {
      const coupon = couponPerPeriod(EXAMPLE, s.rate);
      const annualCoupon = multiplyMoney(EXAMPLE, s.rate);
      exampleRows = [
        ["Face value", money(EXAMPLE)],
        ["Interest every 6 months", money(coupon)],
        ["Annual interest yield", <span key="annual" className="text-success-text font-medium">+{money(annualCoupon)}</span>],
        ["Principal returned at maturity", <span key="face" className="font-medium">{money(EXAMPLE)}</span>],
      ];
    } else {
      const cost = costFromFace(s, EXAMPLE);
      const discountGain = roundMoney(EXAMPLE - cost);
      exampleRows = [
        ["You pay today", money(cost)],
        ["Discount earnings", <span key="gain" className="text-success-text font-medium">+{money(discountGain)}</span>],
        ["You receive at maturity", <span key="maturity" className="font-medium">{money(EXAMPLE)}</span>],
      ];
    }
  }

  // For Term Deposits, no CSD is required and market hours do not apply.
  // For Treasury Bills & Bonds, CSD profile and market status are checked.
  const isTerm = offer.group === "term";
  const note = isTerm
    ? null
    : closed
      ? "The market is closed right now."
      : csd?.status === "pending"
        ? "Your securities account is being set up. You can invest once it’s ready."
        : !csd
          ? "To start investing in securities, you need a securities account."
          : null;

  const canStart = isTerm ? true : !closed && csd?.status !== "pending";
  const hasAccess = isTerm || Boolean(csd && csd.status === "active");
  const startHref = hasAccess
    ? offer.href
    : `/invest/profile?next=${encodeURIComponent(offer.href)}&label=${encodeURIComponent(offer.label)}`;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={offer.title} backTo={back} />
      <div className="mx-auto flex w-full max-w-[600px] flex-col gap-8">
        <FactsPanel rows={facts} />

        <section className="flex flex-col gap-3">
          <div className="px-1 text-[13px] text-muted-foreground">{`For example, ${money(EXAMPLE)}`}</div>
          <FactsPanel rows={exampleRows} />
          {offer.group === "primary" && (
            <p className="px-1 text-[12px] text-muted-foreground">The final rate is set at the auction.</p>
          )}
        </section>

        <div className="flex flex-col gap-3">
          {note && <p className="px-1 text-center text-[13px] text-muted-foreground">{note}</p>}
          <Button
            type="button"
            className="h-13 w-full rounded-2xl text-[16px]"
            disabled={!canStart}
            nativeButton={!(canStart && hasAccess)}
            render={canStart && hasAccess ? <Link href={startHref} /> : undefined}
            onClick={canStart && !hasAccess ? () => setNeedsCsd(true) : undefined}
          >
            Invest
          </Button>
        </div>
      </div>

      <SecuritiesAccountDialog open={needsCsd} onOpenChange={setNeedsCsd} next={{ href: offer.href, label: offer.label }} />
    </div>
  );
}
