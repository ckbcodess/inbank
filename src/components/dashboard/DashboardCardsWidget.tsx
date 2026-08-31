"use client";

import { useState } from "react";
import Link from "next/link";
import { Snowflake } from "lucide-react";
import { toast } from "sonner";

interface CardItem {
  id: string;
  type: "Debit" | "Virtual";
  maskedNumber: string;
  frozen: boolean;
  network: "VISA" | "MASTERCARD";
  gradient: string;
}

export function DashboardCardsWidget() {
  const [cards, setCards] = useState<CardItem[]>([
    {
      id: "card-debit",
      type: "Debit",
      maskedNumber: "•••• 9102",
      frozen: false,
      network: "VISA",
      gradient: "linear-gradient(135deg, rgb(0, 153, 102) 0%, rgb(0, 150, 137) 50%, rgb(0, 117, 149) 100%)",
    },
    {
      id: "card-virtual",
      type: "Virtual",
      maskedNumber: "•••• 9102",
      frozen: false,
      network: "MASTERCARD",
      gradient: "linear-gradient(135deg, rgb(29, 41, 61) 0%, rgb(24, 24, 27) 50%, rgb(15, 23, 43) 100%)",
    },
  ]);

  const toggleFreeze = (cardId: string) => {
    setCards((prev) =>
      prev.map((c) => {
        if (c.id === cardId) {
          const nextState = !c.frozen;
          toast(nextState ? `${c.type} card frozen` : `${c.type} card unfrozen`, {
            description: nextState ? "Online and POS transactions are temporarily blocked." : "Card is now active.",
          });
          return { ...c, frozen: nextState };
        }
        return c;
      })
    );
  };

  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xs transition-all">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-medium text-foreground">Cards</h2>
        <Link
          href="/cards"
          className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
        </Link>
      </div>

      {/* Cards List */}
      <div className="mt-4 flex flex-col divide-y divide-border/60">
        {cards.map((card) => (
          <div
            key={card.id}
            className="flex items-center justify-between py-3.5 first:pt-1 last:pb-1"
          >
            {/* Left: Mini Card Graphic & Info */}
            <div className="flex items-center gap-4">
              {/* Mini Card Graphic */}
              <div
                className="relative flex h-[42px] w-[66px] flex-col justify-between overflow-hidden rounded-md p-1.5 shadow-xs transition-transform duration-200 hover:scale-105"
                style={{ background: card.gradient }}
              >
                {/* Chip */}
                <div className="h-2.5 w-3 rounded-xs bg-[#f9c632]/90" />
                {/* Network logo */}
                <div className="flex justify-end">
                  {card.network === "VISA" ? (
                    <span className="text-[9px] font-bold tracking-tight text-white">VISA</span>
                  ) : (
                    <div className="flex items-center -space-x-1">
                      <div className="size-2.5 rounded-full bg-[#eb001b]/90" />
                      <div className="size-2.5 rounded-full bg-[#f79e1b]/90" />
                    </div>
                  )}
                </div>
              </div>

              {/* Card Details */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-foreground">{card.type}</span>
                  <span className="text-[12px] text-muted-foreground">{card.maskedNumber}</span>
                </div>
                {card.frozen && (
                  <span className="text-[11px] font-medium text-destructive">Frozen</span>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleFreeze(card.id)}
                className={`flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition-colors cursor-pointer ${
                  card.frozen
                    ? "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
                    : "border-border bg-muted/60 text-foreground hover:bg-muted"
                }`}
              >
                <Snowflake size={13} strokeWidth={2} />
                <span>{card.frozen ? "Unfreeze" : "Freeze"}</span>
              </button>

              <Link
                href={`/cards`}
                className="flex h-7 items-center rounded-md border border-border bg-muted/60 px-2.5 text-[12px] font-medium text-foreground transition-colors hover:bg-muted"
              >
                Manage
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
