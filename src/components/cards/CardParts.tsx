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

type Tone = "active" | "production" | "transit" | "delivery" | "pickup" | "activate" | "blocked" | "expired";

interface StatusNote {
  label: string;
  tone: Tone;
}

const DELIVERY_NOTE: Record<string, StatusNote> = {
  in_production: { label: "In production", tone: "production" },
  processing: { label: "Processing", tone: "production" },
  in_transit: { label: "In transit", tone: "transit" },
  out_for_delivery: { label: "Out for delivery", tone: "delivery" },
  ready_for_pickup: { label: "Ready for pickup", tone: "pickup" },
};

/** One hue per state so a row of cards can be scanned without reading. */
const TONE_CLASS: Record<Tone, string> = {
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  production: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  transit: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  delivery: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  pickup: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  activate: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  blocked: "bg-red-500/10 text-red-700 dark:text-red-400",
  expired: "bg-muted text-muted-foreground",
};

/** Says something only when there is something to say, unless `includeActive` (gallery scanning). */
export function cardStatusNote(card: PaymentCard, includeActive = false): StatusNote | null {
  if (card.deliveryStatus && card.deliveryStatus !== "delivered") {
    return DELIVERY_NOTE[card.deliveryStatus] ?? { label: "In progress", tone: "production" };
  }
  if (card.status === "Inactive") return { label: "Needs activation", tone: "activate" };
  if (card.status === "Blocked") return { label: "Blocked", tone: "blocked" };
  if (card.status === "Expired") return { label: "Expired", tone: "expired" };
  return includeActive ? { label: "Active", tone: "active" } : null;
}

/** Prepaid and virtual cards carry their own money; debit draws on an account. */
export function cardFigure(card: PaymentCard): { label: string; value: string } {
  if (card.balance !== null) return { label: "Balance", value: formatMoney(card.balance, card.currency) };
  const account = accountsForProfile(card.profileKind ?? "CORPORATE").find((a) => a.id === card.linkedAccountId);
  return { label: "Linked account", value: account?.name ?? "—" };
}

export function StatusPill({
  card,
  className,
  includeActive,
}: {
  card: PaymentCard;
  className?: string;
  includeActive?: boolean;
}) {
  const note = cardStatusNote(card, includeActive);
  if (!note) return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] leading-none",
        TONE_CLASS[note.tone],
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

/** Card-shaped placeholders — same footprint as the gallery so nothing shifts when the real cards land. */
export function CardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading cards">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="aspect-[1.586/1] w-full animate-pulse rounded-2xl bg-muted" />
          <div className="flex items-center justify-between px-1">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** The whole /cards page in outline — header, filter, cards. One skeleton for the route
 *  boundary and the in-page gate, so the handoff between them is invisible. */
export function CardsPageSkeleton() {
  return (
    <div className="flex w-full flex-col gap-8" aria-busy="true">
      <div className="flex items-center justify-between">
        <div className="h-7 w-20 rounded-lg bg-muted/60" />
        <div className="h-9 w-[140px] rounded-lg bg-muted/60" />
      </div>
      <div className="h-11 w-[360px] max-w-full rounded-xl bg-muted/60" />
      <CardsSkeleton />
    </div>
  );
}
