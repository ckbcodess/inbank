"use client";

/** Shared pieces for the four Cards layouts, so they can't drift apart. */

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { accountsForProfile, formatMoney, type PaymentCard } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export interface CardsLayoutProps {
  cards: PaymentCard[];
}

const DELIVERY_LABEL: Record<string, string> = {
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  in_transit: "In transit",
  in_production: "In production",
  processing: "Processing",
};

/** Only says something when there is something to say — Active cards stay quiet. */
export function cardStatusNote(card: PaymentCard): { label: string; alert: boolean } | null {
  if (card.deliveryStatus) {
    if (card.deliveryStatus === "delivered") {
      return card.status === "Inactive" ? { label: "Needs activation", alert: false } : null;
    }
    return { label: DELIVERY_LABEL[card.deliveryStatus] ?? "In progress", alert: false };
  }
  if (card.status === "Inactive") return { label: "Needs activation", alert: false };
  if (card.status === "Blocked") return { label: "Blocked", alert: true };
  if (card.status === "Expired") return { label: "Expired", alert: false };
  return null;
}

/** Prepaid and virtual cards carry their own money; debit draws on an account. */
export function cardFigure(card: PaymentCard): { label: string; value: string } {
  if (card.balance !== null) return { label: "Balance", value: formatMoney(card.balance, card.currency) };
  const account = accountsForProfile(card.profileKind ?? "CORPORATE").find((a) => a.id === card.linkedAccountId);
  return { label: "Linked account", value: account?.name ?? "—" };
}

export function StatusPill({ card, className }: { card: PaymentCard; className?: string }) {
  const note = cardStatusNote(card);
  if (!note) return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10.5px] leading-none",
        note.alert
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-border bg-muted text-foreground",
        className,
      )}
    >
      {note.label}
    </span>
  );
}

export function CardDetails({ card }: { card: PaymentCard }) {
  const figure = cardFigure(card);
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[15px] text-foreground">{card.name}</span>
          <StatusPill card={card} />
        </div>
        <span className="tabular text-[12px] text-muted-foreground">
          {figure.label} · <span className="text-foreground">{figure.value}</span>
        </span>
      </div>
      <Button
        nativeButton={false}
        render={<Link href={`/cards/${card.id}`} />}
        variant="outline"
        className="h-9 shrink-0 rounded-lg px-3.5 text-[13px]"
      >
        Manage
      </Button>
    </div>
  );
}

/** In-flow shortcut to the same request flow the header button opens. */
export function RequestTile({ className }: { className?: string }) {
  return (
    <Link
      href="/cards/request"
      className={cn(
        "flex aspect-[1.586/1] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted/40 hover:text-foreground",
        className,
      )}
    >
      <Plus size={18} strokeWidth={1.8} aria-hidden="true" />
      <span className="text-[13px]">Request a card</span>
    </Link>
  );
}
