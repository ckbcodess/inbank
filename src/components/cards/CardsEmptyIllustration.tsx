import { Plus } from "lucide-react";
import { getCardTheme } from "@/components/cards/card-themes";

/** Three fanned cards with a "+" — the empty Cards page's picture. Pure CSS, no assets. */
export function CardsEmptyIllustration() {
  const back = getCardTheme("gold").colorHex;
  const middle = getCardTheme("blue").colorHex;
  const front = getCardTheme("black").colorHex;

  return (
    <div className="relative mb-2 h-[132px] w-[200px]" aria-hidden="true">
      <div
        className="absolute left-2.5 top-1.5 aspect-[1.586/1] w-[128px] -rotate-[10deg] rounded-xl shadow-md"
        style={{ backgroundColor: back }}
      />
      <div
        className="absolute left-[46px] top-1 aspect-[1.586/1] w-[128px] rotate-[7deg] rounded-xl shadow-md"
        style={{ backgroundColor: middle }}
      />
      <div
        className="absolute left-[30px] top-[22px] flex aspect-[1.586/1] w-[140px] flex-col justify-between rounded-xl p-2 shadow-lg"
        style={{ backgroundColor: front }}
      >
        <div className="h-3.5 w-5 rounded-sm bg-warning/90" />
        <div className="flex flex-col gap-2">
          <div className="h-1.5 w-17 rounded-full bg-white/35" />
          <div className="h-1.5 w-9 rounded-full bg-white/20" />
        </div>
      </div>
      <span className="absolute right-2.5 top-1 flex size-6 items-center justify-center rounded-full bg-foreground text-background shadow-md">
        <Plus size={15} strokeWidth={2} />
      </span>
    </div>
  );
}
