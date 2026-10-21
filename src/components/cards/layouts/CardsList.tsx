"use client";

/** List — the original rows: thumbnail, name, status, chevron. */

import { ListCard } from "@/components/ui/list-card";
import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AppLoader } from "@/components/ui/loader";
import { MiniCardThumbnail } from "@/components/cards/MiniCardThumbnail";
import { StatusPill, type CardsLayoutProps } from "@/components/cards/CardParts";
import { cn } from "@/lib/utils";

export function CardsList({ cards }: CardsLayoutProps) {
  const [navigatingId, setNavigatingId] = useState<string | null>(null);

  return (
    <ListCard>
        {cards.map((card) => {
          const isNavigating = navigatingId === card.id;
          return (
            <li key={card.id}>
              <Link
                href={`/cards/${card.id}`}
                onClick={() => setNavigatingId(card.id)}
                className={cn(
                  "group flex items-center justify-between gap-2 rounded-xl px-2 py-3 transition-colors hover:bg-item-hover sm:gap-3 sm:px-3",
                  isNavigating && "bg-item-hover",
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                  <MiniCardThumbnail card={card} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[14px] font-medium text-foreground">{card.name}</span>
                      <StatusPill card={card} />
                    </div>
                    <span className="tabular mt-0.5 text-[12px] text-muted-foreground">
                      {card.type} · {card.maskedNumber}
                    </span>
                  </div>
                </div>
                {isNavigating ? (
                  <AppLoader size={16} className="text-foreground" />
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
      </ListCard>
  );
}
