"use client";

/** A · Wallet stack — cards overlap like a wallet; the picked one drops to the front. */

import { useState } from "react";
import { motion } from "framer-motion";
import { CardFace } from "@/components/cards/CardFace";
import { CardDetails, RequestTile, StatusPill, type CardsLayoutProps } from "@/components/cards/CardParts";

/** Card height as a share of its width (1 / 1.586). */
const CARD_H = 63.05;
/** How much of each card behind the front one stays visible, as % of card height. */
const PEEK = 22;

export function CardsStack({ cards }: CardsLayoutProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = cards.find((c) => c.id === activeId) ?? cards[cards.length - 1];

  // The active card takes the last slot (front, fully visible); the rest keep their order above it.
  const order = [...cards.filter((c) => c.id !== active.id), active];
  const peekWidthPct = (CARD_H * PEEK) / 100;

  return (
    <div className="mx-auto flex w-full max-w-[460px] flex-col gap-6">
      <div className="relative w-full" style={{ paddingBottom: `${CARD_H + (order.length - 1) * peekWidthPct}%` }}>
        {order.map((card, slot) => {
          const isFront = card.id === active.id;
          return (
            <motion.button
              key={card.id}
              type="button"
              onClick={() => setActiveId(card.id)}
              aria-label={isFront ? `${card.name}, selected` : `Bring ${card.name} to the front`}
              aria-pressed={isFront}
              initial={false}
              animate={{ y: `${slot * PEEK}%`, scale: 1 }}
              whileHover={isFront ? undefined : { y: `${slot * PEEK - 3}%` }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              style={{ zIndex: slot }}
              className="absolute inset-x-0 top-0 block cursor-pointer text-left"
            >
              <CardFace card={card} className="shadow-lg" />
              {!isFront && (
                <span className="pointer-events-none absolute right-[6.5%] top-[6%]">
                  <StatusPill card={card} />
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      <CardDetails card={active} />
      <RequestTile className="aspect-auto h-14 flex-row" />
    </div>
  );
}
