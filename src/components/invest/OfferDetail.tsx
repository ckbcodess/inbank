"use client";

/**
 * One instrument, pitched the way an Insure plan is (picture, three benefits, the figure on the dashed divider, one
 * button), because a customer should be able to see what they are about to commit to before they commit. The three
 * benefits are about this instrument (its rate, its dates, how it ends); the divider carries the worked example in cedis
 * (GHS 1,000 in, what comes out), and what starting involves is said right above the button: with no securities account
 * yet, we set it up first.
 */

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SearchX } from "@/components/ui/icons";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OfferDetailSkeleton } from "@/components/states/PageSkeletons";
import { TrueEmptyState } from "@/components/states/ListStates";
import { BILLS_PRODUCTS_HREF, BONDS_PRODUCTS_HREF, TERM_PRODUCTS_HREF } from "@/components/invest/parts";
import { findOffer, type Offer } from "@/components/invest/offers";
import { SecuritiesAccountDialog } from "@/components/invest/SecuritiesAccountDialog";
import { ProductPitchBody, type PitchPrice } from "@/components/insure/ProductPitch";
import type { ProductKey } from "@/components/insure/parts";
import { formatDate, formatMoney } from "@/lib/mock-data";
import { depositTerms, securityTerms } from "@/lib/terms";
import { roundMoney, sumMoney } from "@/lib/money";
import { addDays, costFromFace, couponPerPeriod, formatRate, MOCK_TODAY, useMyTreasury, useTreasuryHydrated } from "@/lib/treasury";
import { interestFor } from "@/lib/term-deposits";
import type { PlanHighlight } from "@/lib/product-highlights";

const EXAMPLE = 1000;
const money = (n: number) => formatMoney(n, "GHS", true);

/** The product this instrument belongs to, and the page its back link returns to. */
function productOf(offer: Offer): { id: ProductKey; back: { href: string; label: string } } {
  if (offer.group === "term") return { id: "term-deposits", back: { href: TERM_PRODUCTS_HREF, label: "Term Deposits" } };
  if (offer.security?.kind === "bond") return { id: "bonds", back: { href: BONDS_PRODUCTS_HREF, label: "Bonds" } };
  return { id: "treasury-bills", back: { href: BILLS_PRODUCTS_HREF, label: "Treasury Bills" } };
}

/** Three benefits specific to this instrument, with the figures the tables hold. */
function highlightsOf(offer: Offer): PlanHighlight[] {
  const s = offer.security;
  if (offer.group === "term") {
    return [
      { icon: "rate", label: `${formatRate(offer.rate)} a year`, value: "Fixed for the whole term" },
      { icon: "time", label: `${offer.tenureDays} days`, value: `Matures ${formatDate(addDays(MOCK_TODAY, offer.tenureDays ?? 0))}` },
      { icon: "choice", label: "You decide at the end", value: "Take it out or roll it over" },
    ];
  }
  const rate: PlanHighlight =
    offer.group === "primary"
      ? { icon: "rate", label: `About ${formatRate(offer.rate)} a year`, value: "The final rate is set at auction" }
      : s?.kind === "bond"
        ? { icon: "rate", label: `${formatRate(offer.rate)} a year`, value: "Paid every 6 months" }
        : { icon: "rate", label: `${formatRate(offer.rate)} a year`, value: "Fixed until it matures" };
  const time: PlanHighlight = s
    ? {
        icon: "time",
        label: `Matures ${formatDate(s.maturity)}`,
        value: offer.group === "primary" ? `Settles ${formatDate(s.settlement ?? s.maturity)}` : "Bought from another investor",
      }
    : { icon: "time", label: "Fixed period", value: "" };
  return [rate, time, { icon: "exit", label: "Sell before it matures", value: "Through a rediscount, with the price shown first" }];
}

/** What the customer agrees to, in plain words and only what the app actually does. */
function termsOf(offer: Offer): string[] {
  if (offer.group === "term") return depositTerms(offer.tenureDays);
  const s = offer.security;
  return securityTerms(s?.kind === "bond" ? "bond" : "bill", offer.group === "primary");
}

/** The worked example, said once on the divider. */
function priceOf(offer: Offer): PitchPrice | undefined {
  const s = offer.security;
  if (offer.group === "term" && offer.tenureDays) {
    const total = sumMoney([EXAMPLE, interestFor(EXAMPLE, offer.rate, offer.tenureDays)]);
    return { prefix: `${money(EXAMPLE)} returns`, figure: money(total) };
  }
  if (!s) return undefined;
  if (s.kind === "bond") return { prefix: `Each ${money(EXAMPLE)} pays`, figure: money(couponPerPeriod(EXAMPLE, s.rate)), suffix: "every 6 months" };
  const cost = costFromFace(s, EXAMPLE);
  return { prefix: `Pay ${money(cost)}, receive`, figure: money(roundMoney(EXAMPLE)) };
}

export function OfferDetail() {
  const { key } = useParams<{ key: string }>();
  const hydrated = useTreasuryHydrated();
  const { csd, marketOpen } = useMyTreasury();
  const offer = findOffer(key);
  const [needsCsd, setNeedsCsd] = useState(false);
  const [terms, setTerms] = useState(false);

  if (!hydrated) return <OfferDetailSkeleton />;
  if (!offer) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
        <PageHeader title="Investment" backTo={{ href: "/invest", label: "Invest" }} />
        <TrueEmptyState
          icon={<SearchX size={22} strokeWidth={1.8} />}
          title="We couldn’t find that one"
          description="It may have been sold or the auction may have closed."
          action={
            <Button nativeButton={false} render={<Link href="/invest" />}>
              View Products
            </Button>
          }
        />
      </div>
    );
  }

  const product = productOf(offer);
  const closed = offer.group !== "term" && !marketOpen;

  // Term Deposits need no securities account and have no market hours; bills and bonds check both.
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
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <PageHeader title={offer.title} backTo={product.back} />
      <div className="flex flex-col gap-6">
        <ProductPitchBody productId={product.id} highlights={highlightsOf(offer)} price={priceOf(offer)} />
        <div className="flex flex-col gap-2">
          {note && <p className="px-1 text-center text-[13px] text-muted-foreground">{note}</p>}
          <Button
            type="button"
            className="h-11 w-full text-[16px]"
            disabled={!canStart}
            nativeButton={!(canStart && hasAccess)}
            render={canStart && hasAccess ? <Link href={startHref} /> : undefined}
            onClick={canStart && !hasAccess ? () => setNeedsCsd(true) : undefined}
          >
            Invest
          </Button>
          <Button type="button" variant="outline" className="h-11 w-full text-[14px]" onClick={() => setTerms(true)}>
            Terms and Conditions
          </Button>
        </div>
      </div>

      <Dialog open={terms} onOpenChange={setTerms}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Terms and Conditions</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <ul className="flex flex-col gap-3 text-[14px] leading-relaxed text-muted-foreground">
              {termsOf(offer).map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </DialogBody>
          <DialogFooter>
            <Button type="button" onClick={() => setTerms(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SecuritiesAccountDialog open={needsCsd} onOpenChange={setNeedsCsd} next={{ href: offer.href, label: offer.label }} />
    </div>
  );
}
