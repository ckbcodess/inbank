"use client";

/** List — the original rows: thumbnail, name, status, chevron. */

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Loader2 } from "lucide-react";
import { MiniCardThumbnail } from "@/components/cards/MiniCardThumbnail";
import { StatusPill, type CardsLayoutProps } from "@/components/cards/CardParts";
import { cn } from "@/lib/utils";

export function CardsList({ cards }: CardsLayoutProps) {
  const [navigatingId, setNavigatingId] = useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <ul className="flex flex-col gap-0.5 p-2">
        {cards.map((card) => {
          const isNavigating = navigatingId === card.id;
          return (
            <li key={card.id}>
              <Link
                href={`/cards/${card.id}`}
                onClick={() => setNavigatingId(card.id)}
                className={cn(
                  "group flex items-center justify-between gap-3 rounded-xl px-3 py-4 transition-colors hover:bg-muted/50 sm:gap-4 sm:px-4",
                  isNavigating && "bg-muted/60",
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                  <MiniCardThumbnail card={card} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[14px] text-foreground">{card.name}</span>
                      <StatusPill card={card} />
                    </div>
                    <span className="tabular mt-0.5 text-[12px] text-muted-foreground">
                      {card.type} · {card.maskedNumber}
                    </span>
                  </div>
                </div>
                {isNavigating ? (
                  <Loader2 size={16} className="shrink-0 animate-spin text-foreground" />
                ) : (
                  <ChevronRight
                    size={16}
                    strokeWidth={1.8}
                    className="shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
