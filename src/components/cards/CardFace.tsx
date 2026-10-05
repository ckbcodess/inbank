/* eslint-disable @next/next/no-img-element */
"use client";

/**
 * A full card face that scales to whatever width it's given. Every measurement
 * is in container units (`cqw`), so the same face works as a 96px selector chip
 * and as a 480px hero. Reads the tilt context, so wrapping it in `TiltCard3D`
 * lights up the chip and logo sheen.
 */

import { Lock, Wifi } from "lucide-react";
import type { PaymentCard } from "@/lib/mock-data";
import { getCardTheme } from "@/components/cards/card-themes";
import { EmvChip } from "@/components/cards/EmvChip";
import { GcbCardLogo } from "@/components/cards/GcbCardLogo";
import { cn } from "@/lib/utils";

export function themeForCard(card: PaymentCard) {
  return getCardTheme(
    card.colorTheme ||
      (card.type === "Virtual"
        ? "blue"
        : card.type === "Prepaid"
          ? "maroon"
          : "black"),
  );
}

export function CardFace({
  card,
  className,
}: {
  card: PaymentCard;
  className?: string;
}) {
  const theme = themeForCard(card);
  const blocked = card.status === "Blocked";
  const dimmed = blocked || card.status === "Expired";

  return (
    <div
      style={{ backgroundColor: theme.colorHex }}
      className={cn(
        "relative aspect-[1.586/1] w-full select-none overflow-hidden rounded-2xl ring-1 ring-inset ring-black/10 [container-type:inline-size] dark:ring-white/15",
        theme.textColor,
        dimmed && "opacity-60 saturate-50",
        className,
      )}
    >
      <div className="absolute inset-0">
        <img
          src={theme.bgImage}
          alt=""
          className="pointer-events-none absolute -inset-[3px] h-[calc(100%+6px)] w-[calc(100%+6px)] max-w-none scale-[1.03] select-none object-cover"
        />

        <div className="absolute inset-0 flex flex-col justify-between p-[6.5cqw]">
          <div className="flex items-center justify-between">
            <GcbCardLogo
              themeId={theme.id}
              className="h-[8cqw] w-auto shrink-0"
            />
            <span className="text-[3.6cqw] leading-none tracking-wide opacity-90">
              {card.type}
            </span>
          </div>

          {/* A virtual card is never held, so it has no chip and no contactless mark. */}
          {!(card.type === "Virtual" || card.isVirtual) && (
            <div className="flex items-center gap-[3cqw]">
              <EmvChip className="w-[12cqw]! sm:w-[12cqw]!" />
              <Wifi
                strokeWidth={2.2}
                className="size-[5.4cqw] rotate-90 opacity-85"
                aria-hidden="true"
              />
            </div>
          )}

          <div className="flex items-end justify-between">
            <span className="tabular text-[4.6cqw] leading-none tracking-[0.06em]">
              {card.maskedNumber}
            </span>
            {card.scheme === "Mastercard" ? (
              <div
                className="flex -space-x-[1.8cqw] items-center"
                aria-label="Mastercard"
              >
                <div className="size-[5.4cqw] rounded-full bg-[var(--mc-red)]/95" />
                <div className="size-[5.4cqw] rounded-full bg-[var(--mc-orange)]/95" />
              </div>
            ) : (
              <span
                aria-label="Visa"
                className="font-sans text-[6cqw] font-black italic leading-none tracking-tighter opacity-95"
              >
                VISA
              </span>
            )}
          </div>
        </div>
      </div>

      {blocked && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-[18cqw] items-center justify-center rounded-full bg-white/90 text-primary-foreground shadow-md">
            <Lock
              className="size-[8cqw]"
              strokeWidth={1.8}
              aria-label="Blocked"
            />
          </span>
        </div>
      )}
    </div>
  );
}
