"use client";

/**
 * What is on offer, as rows. A term deposit, a bill or bond at auction (primary market) and one for resale (secondary
 * market) are different products, but a row reads the same for all of them: a name, one line, and the rate. Tapping a
 * row only ever opens its details; starting is a separate, deliberate button there.
 */

import Link from "next/link";
import { ChevronRight, FileText, Landmark, PiggyBank } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/mock-data";
import { addDays, daysLeftLabel, formatRate, MOCK_TODAY, securitiesFor, type Security } from "@/lib/treasury";
import { TENURES } from "@/lib/term-deposits";

/** Which part of the market an offer belongs to. */
export type OfferGroup = "term" | "primary" | "secondary";

export interface Offer {
  key: string;
  group: OfferGroup;
  icon: "deposit" | "bill" | "bond";
  title: string;
  rate: number;
  /** Where starting it goes. */
  href: string;
  /** What the customer calls it, kept so the investment can be picked up after they set up their account. */
  label: string;
  security?: Security;
  tenureDays?: number;
}

export function termOffers(): Offer[] {
  return TENURES.map((t) => ({
    key: `td-${t.days}`,
    group: "term",
    icon: "deposit",
    title: `${t.days}-day Term Deposit`,
    rate: t.rate,
    href: `/invest/term-deposits/new?days=${t.days}`,
    label: `${t.days}-day term deposit`,
    tenureDays: t.days,
  }));
}

export function securityOffers(market: "primary" | "secondary"): Offer[] {
  return securitiesFor(market).map((s) => ({
    key: s.id,
    group: market,
    icon: s.kind,
    title: s.title,
    rate: s.rate,
    href: `/invest/treasury/buy?id=${s.id}`,
    label: s.title,
    security: s,
  }));
}

/** Every offer, by its key, for the details screen. */
export function findOffer(key: string): Offer | undefined {
  return [...termOffers(), ...securityOffers("primary"), ...securityOffers("secondary")].find((o) => o.key === key);
}

export const detailsHref = (offer: Offer) => `/invest/offer/${offer.key}`;

const ICONS = { deposit: PiggyBank, bill: FileText, bond: Landmark };

export function OfferIcon({ icon }: { icon: Offer["icon"] }) {
  const Icon = ICONS[icon];
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
      <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
    </span>
  );
}

/** One offer. It always opens its details: looking costs nothing and commits to nothing. */
export function OfferRow({ offer, showAmounts }: { offer: Offer; showAmounts: boolean }) {
  const s = offer.security;

  const meta =
    offer.group === "term" ? (
      <span className="truncate">{`Matures ${formatDate(addDays(MOCK_TODAY, offer.tenureDays ?? 0))}`}</span>
    ) : s && offer.group === "primary" ? (
      <span className="truncate">{`Settles ${formatDate(s.settlement ?? s.maturity)}`}</span>
    ) : s ? (
      <>
        <span className="shrink-0">{`Matures ${formatDate(s.maturity)}`}</span>
        <span aria-hidden="true">·</span>
        <span className="truncate">{daysLeftLabel(s.maturity)}</span>
      </>
    ) : null;

  const sub =
    offer.group === "term"
      ? "a year"
      : s && s.market === "secondary" && s.available !== undefined
        ? `${formatMoney(s.available, "GHS", showAmounts)} available`
        : offer.icon === "bond"
          ? "Bond"
          : "Bill";

  return (
    <li>
      <Link
        href={detailsHref(offer)}
        className="flex w-full items-center gap-4 rounded-xl px-3 py-4 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-4"
      >
        <OfferIcon icon={offer.icon} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[14px] text-foreground">{offer.title}</span>
          <span className="tabular flex min-w-0 gap-1 truncate text-[12px] text-muted-foreground">{meta}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end">
          <span className="tabular text-[14px] text-foreground">{formatRate(offer.rate)}</span>
          <span className="tabular text-[12px] text-muted-foreground">{sub}</span>
        </span>
        <ChevronRight size={15} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}
