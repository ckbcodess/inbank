/* eslint-disable @next/next/no-img-element */
import type { PaymentCard } from "@/lib/mock-data";
import { getCardTheme } from "@/components/cards/card-themes";
import { cn } from "@/lib/utils";

export interface MiniCardThumbnailProps {
  card: PaymentCard;
  className?: string;
}

export function MiniCardThumbnail({ card, className }: MiniCardThumbnailProps) {
  const isVisa = card.scheme === "Visa";
  const isBlocked = card.status === "Blocked";

  const themeId =
    card.colorTheme ||
    (card.type === "Virtual" ? "blue" : card.type === "Prepaid" ? "maroon" : "black");
  const theme = getCardTheme(themeId);

  return (
    <div
      style={{ backgroundColor: theme.colorHex }}
      className={cn(
        "relative aspect-[1.586/1] w-12 shrink-0 rounded-[7px] p-1.5 shadow-2xs overflow-hidden flex flex-col justify-between select-none ring-1 ring-inset ring-black/10 dark:ring-white/15",
        theme.textColor,
        isBlocked && "opacity-60 saturate-50",
        className
      )}
    >
      {/* Background artwork texture */}
      <img
        src={theme.bgImage}
        alt=""
        className="absolute -inset-0.5 w-[calc(100%+4px)] h-[calc(100%+4px)] max-w-none object-cover scale-[1.04] pointer-events-none select-none"
      />

      {/* Top Row: Mini EMV Chip / Contact element */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="size-2 rounded-[2px] bg-amber-400/90 border border-amber-600/40 shadow-2xs" />
      </div>

      {/* Bottom Row: Clean Scheme Brand Logo */}
      <div className="relative z-10 flex items-end justify-end leading-none mt-auto">
        {isVisa ? (
          <span className="font-sans text-[8px] font-black italic tracking-tighter drop-shadow-xs opacity-95">
            VISA
          </span>
        ) : (
          <div className="flex -space-x-1 drop-shadow-xs">
            <div className="size-2 rounded-full bg-[#eb001b]/95" />
            <div className="size-2 rounded-full bg-[#f79e1b]/95" />
          </div>
        )}
      </div>
    </div>
  );
}
