"use client";

/** C · Gallery — every card at once, full size, each captioned with its state. */

import Link from "next/link";
import { CardFace } from "@/components/cards/CardFace";
import { RequestTile, StatusPill, type CardsLayoutProps } from "@/components/cards/CardParts";

export function CardsGallery({ cards }: CardsLayoutProps) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <Link key={card.id} href={`/cards/${card.id}`} className="group flex flex-col gap-3">
          <div className="transition-transform duration-300 ease-out group-hover:-translate-y-1">
            <CardFace card={card} className="shadow-lg" />
          </div>
          <div className="flex items-center justify-between gap-3 px-1">
            <span className="truncate text-[14px] text-foreground">{card.name}</span>
            <StatusPill card={card} includeActive />
          </div>
        </Link>
      ))}
      <div className="flex flex-col gap-3">
        <RequestTile />
      </div>
    </div>
  );
}
