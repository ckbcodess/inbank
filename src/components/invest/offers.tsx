"use client";

/**
 * What is on offer, as rows. A term deposit, a bill or bond at auction (primary market) and one for resale (secondary
 * market) are different products, but a row reads the same for all of them: a name, one line, and the rate. Tapping a
 * row opens its flow; a bill or bond that can't be started yet opens a modal that says why instead.
 */

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText, Landmark, PiggyBank } from "@/components/ui/icons";
import { formatDate, formatMoney } from "@/lib/mock-data";
import { addDays, daysLeftLabel, formatRate, MOCK_TODAY, securitiesFor, useMyTreasury, type Security } from "@/lib/treasury";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
    href: `/invest/products/term-deposits/new?days=${t.days}`,
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

const ICONS = { deposit: PiggyBank, bill: FileText, bond: Landmark };

export function OfferIcon({ icon }: { icon: Offer["icon"] }) {
  const Icon = ICONS[icon];
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
      <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
    </span>
  );
}

/** Why a bill or bond can't be started right now, said in a modal on the row instead of on a page of its own. */
type Gate = { title: string; text: string; action?: { label: string; href: string } };

function gateFor(offer: Offer, csd: ReturnType<typeof useMyTreasury>["csd"], marketOpen: boolean): Gate | null {
  if (offer.group === "term") return null;
  if (!csd) {
    return {
      title: "Open a Securities Account",
      text: "Bills and bonds are held in a securities account. You can start investing within 7 working days of creating it.",
      action: {
        label: "Open a Securities Account",
        href: `/invest/profile?next=${encodeURIComponent(offer.href)}&label=${encodeURIComponent(offer.label)}`,
      },
    };
  }
  if (!marketOpen) return { title: "The Market Is Closed", text: "Bills and bonds can be bought while the market is open. Try again then." };
  if (csd.status === "pending") {
    return { title: "Your Securities Account Is Being Set Up", text: "You can invest once it’s ready. We’ll tell you when it is." };
  }
  return null;
}

const ROW_CLASS =
  "flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-3";

/** One offer: it opens its flow, or, when a bill or bond can't be started yet, a modal that says why and what to do. */
export function OfferRow({ offer, showAmounts }: { offer: Offer; showAmounts: boolean }) {
  const s = offer.security;
  const { csd, marketOpen } = useMyTreasury();
  const gate = gateFor(offer, csd, marketOpen);
  const [gateOpen, setGateOpen] = useState(false);

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
    s && s.market === "secondary" && s.available !== undefined
      ? `${formatMoney(s.available, "GHS", showAmounts)} available`
      : null;

  const body = (
    <>
      <OfferIcon icon={offer.icon} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[14px] text-foreground">{offer.title}</span>
        <span className="tabular flex min-w-0 gap-1 truncate text-[12px] text-muted-foreground">{meta}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <span className="tabular text-[14px] text-foreground">{formatRate(offer.rate)}</span>
        {sub && <span className="tabular text-[12px] text-muted-foreground">{sub}</span>}
      </span>
      <ChevronRight size={15} aria-hidden="true" className="shrink-0 text-muted-foreground" />
    </>
  );

  return (
    <li>
      {gate ? (
        <button type="button" onClick={() => setGateOpen(true)} className={ROW_CLASS}>
          {body}
        </button>
      ) : (
        <Link href={offer.href} className={ROW_CLASS}>
          {body}
        </Link>
      )}
      {gate && (
        <Dialog open={gateOpen} onOpenChange={setGateOpen}>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>{gate.title}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <p className="text-[14px] leading-relaxed text-muted-foreground">{gate.text}</p>
            </DialogBody>
            <DialogFooter>
              {gate.action ? (
                <Button size="md" nativeButton={false} className="w-full" render={<Link href={gate.action.href} />}>
                  {gate.action.label}
                </Button>
              ) : (
                <Button size="md" type="button" className="w-full" onClick={() => setGateOpen(false)}>
                  Close
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </li>
  );
}
