import type { PaymentCard } from "@/lib/mock-data";

export function MiniCardThumbnail({ card }: { card: PaymentCard }) {
  const isVisa = card.scheme === "Visa";
  const isPrepaid = card.type === "Prepaid";

  let bgGradient = "from-amber-400 via-yellow-400 to-amber-500 text-zinc-950";
  if (card.scheme === "Mastercard" && isPrepaid) {
    bgGradient = "from-slate-800 via-zinc-900 to-slate-900 text-white border border-white/10";
  } else if (isVisa && !isPrepaid) {
    bgGradient = "from-emerald-600 via-teal-600 to-cyan-700 text-white";
  } else if (!isVisa && !isPrepaid) {
    bgGradient = "from-indigo-600 via-purple-600 to-blue-700 text-white";
  }

  return (
    <div className={`relative aspect-[1.586/1] w-12 shrink-0 rounded-md bg-gradient-to-tr ${bgGradient} p-1.5 shadow-xs overflow-hidden flex flex-col justify-between select-none`}>
      <div className="flex items-center justify-between">
        <div className="size-2 rounded-[2px] bg-yellow-300/80 border border-amber-600/40" />
      </div>
      <div className="flex items-end justify-end leading-none mt-auto">
        {isVisa ? (
          <span className="font-sans text-[8px] font-black italic tracking-tighter">VISA</span>
        ) : (
          <div className="flex -space-x-1">
            <div className="size-2 rounded-full bg-red-500/90" />
            <div className="size-2 rounded-full bg-amber-400/90" />
          </div>
        )}
      </div>
    </div>
  );
}
