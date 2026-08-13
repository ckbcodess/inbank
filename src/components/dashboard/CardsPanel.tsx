"use client";

/**
 * FR-33 / FR-34 — cards, with their two urgent actions in reach.
 *
 * Blocking a card is something people do while standing at a counter having
 * just lost it. Burying that behind a card-detail page and a settings menu adds
 * taps to the one action where seconds matter, so Block/Unblock and Fund sit
 * directly on the dashboard row, next to the account list.
 *
 * Blocking takes effect immediately and unblocking is one tap away, so neither
 * is behind a confirmation dialog — the action is reversible, and a dialog here
 * would cost more than the mistake does.
 */

import Link from "next/link";
import { ChevronRight, Lock, Plus, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MiniCardThumbnail } from "@/components/cards/MiniCardThumbnail";
import { formatMoney, setCardStatus, type PaymentCard } from "@/lib/mock-data";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";

export function CardsPanel({
  cards,
  onTopUp,
  onChanged,
}: {
  cards: PaymentCard[];
  /** Opens the dashboard's top-up flow for a specific card. */
  onTopUp: (cardId: string) => void;
  /** Card data is module-level and mutated in place; this re-reads it. */
  onChanged: () => void;
}) {
  const { showAmounts } = useAmountVisibility();

  function toggleBlock(card: PaymentCard) {
    setCardStatus(card.id, card.status === "Blocked" ? "Active" : "Blocked");
    onChanged();
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-[15px] text-foreground">Your cards</h2>
        <Link href="/cards" className="text-[12px] text-primary underline-offset-4 hover:underline">
          View all cards
        </Link>
      </div>

      {cards.length === 0 ? (
        <p className="px-5 py-8 text-center text-[13px] text-muted-foreground">
          No cards on this relationship yet.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {cards.slice(0, 3).map((card) => {
            const blocked = card.status === "Blocked";
            const expired = card.status === "Expired";
            const canFund = card.fundable && card.balance !== null && !blocked && !expired;

            return (
              <li key={card.id} className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <MiniCardThumbnail card={card} />
                  <Link href={`/cards/${card.id}`} className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[13px] text-foreground">{card.name}</span>
                      {card.status !== "Active" && (
                        <Badge variant="destructive">{card.status}</Badge>
                      )}
                    </span>
                    <span className="mt-0.5 text-[11.5px] text-muted-foreground tabular">
                      {card.scheme} {card.type} · {card.maskedNumber}
                    </span>
                  </Link>
                  <span className="shrink-0 text-right text-[13px] text-foreground tabular">
                    {card.balance !== null
                      ? formatMoney(card.balance, card.currency, showAmounts)
                      : "Debit"}
                  </span>
                  <ChevronRight
                    size={15}
                    strokeWidth={1.8}
                    aria-hidden="true"
                    className="shrink-0 text-muted-foreground"
                  />
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-[52px]">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 px-2.5 text-[12px]"
                    onClick={() => toggleBlock(card)}
                    disabled={expired}
                    aria-label={blocked ? `Unblock ${card.name}` : `Block ${card.name}`}
                  >
                    {blocked ? (
                      <Unlock size={13} strokeWidth={1.9} aria-hidden="true" />
                    ) : (
                      <Lock size={13} strokeWidth={1.9} aria-hidden="true" />
                    )}
                    {blocked ? "Unblock" : "Block"}
                  </Button>

                  {canFund && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 px-2.5 text-[12px]"
                      onClick={() => onTopUp(card.id)}
                      aria-label={`Fund ${card.name}`}
                    >
                      <Plus size={13} strokeWidth={1.9} aria-hidden="true" />
                      Fund card
                    </Button>
                  )}

                  {blocked && (
                    <span className="text-[11.5px] text-muted-foreground">
                      Transactions declined while blocked
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
