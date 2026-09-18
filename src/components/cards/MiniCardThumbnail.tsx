/* eslint-disable @next/next/no-img-element */
import type { PaymentCard } from "@/lib/mock-data";
import { getCardTheme } from "@/components/cards/card-themes";

export function MiniCardThumbnail({ card }: { card: PaymentCard }) {
  const isVisa = card.scheme === "Visa";
  const isVirtual = card.type === "Virtual" || Boolean(card.isVirtual);
  const isBlocked = card.status === "Blocked";

  const themeId =
    card.colorTheme ||
    (card.type === "Virtual" ? "blue" : card.type === "Prepaid" ? "maroon" : "black");
  const theme = getCardTheme(themeId);

  return (
    <div
      style={{ backgroundColor: theme.colorHex }}
      className={`relative aspect-[1.586/1] w-12 shrink-0 rounded-md p-1.5 shadow-xs overflow-hidden flex flex-col justify-between select-none ${
        theme.textColor
      } ${
        isBlocked ? "opacity-60 saturate-50" : ""
      }`}
    >
      <img
        src={theme.bgImage}
        alt=""
        className="absolute -inset-0.5 w-[calc(100%+4px)] h-[calc(100%+4px)] max-w-none object-cover scale-[1.04] pointer-events-none select-none"
      />
      <div className="relative z-10 flex items-center justify-between">
        <div className="size-2 rounded-[2px] bg-yellow-300/80 border border-amber-600/40" />
        {isVirtual && (
          <span className="rounded bg-black/40 backdrop-blur-xs px-1 py-0.5 text-[5px] font-bold text-white uppercase tracking-tighter">
            VIRTUAL
          </span>
        )}
        {isBlocked && !isVirtual && (
          <span className="rounded bg-black/60 px-1 py-0.5 text-[6px] font-medium text-white uppercase tracking-tighter">
            Lock
          </span>
        )}
      </div>
      <div className="relative z-10 flex items-end justify-end leading-none mt-auto">
        {isVisa ? (
          <span className="font-sans text-[8px] font-black italic tracking-tighter drop-shadow-xs">VISA</span>
        ) : (
          <div className="flex -space-x-1 drop-shadow-xs">
            <div className="size-2 rounded-full bg-red-500/90" />
            <div className="size-2 rounded-full bg-amber-400/90" />
          </div>
        )}
      </div>
    </div>
  );
}
