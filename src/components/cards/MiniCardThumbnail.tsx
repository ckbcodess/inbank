import type { PaymentCard } from "@/lib/mock-data";

export function MiniCardThumbnail({ card }: { card: PaymentCard }) {
  const isVisa = card.scheme === "Visa";
  const isPrepaid = card.type === "Prepaid";
  const isVirtual = card.type === "Virtual" || Boolean(card.isVirtual);
  const isBlocked = card.status === "Blocked";

  let bgGradient = "from-amber-400 via-yellow-400 to-amber-500 text-zinc-950";
  if (isVirtual) {
    bgGradient = "from-cyan-500 via-sky-600 to-indigo-700 text-white border border-cyan-300/30";
  } else if (card.scheme === "Mastercard" && isPrepaid) {
    bgGradient = "from-slate-800 via-zinc-900 to-slate-900 text-white border border-white/10";
  } else if (isVisa && !isPrepaid) {
    bgGradient = "from-emerald-600 via-teal-600 to-cyan-700 text-white";
  } else if (!isVisa && !isPrepaid) {
    bgGradient = "from-indigo-600 via-purple-600 to-blue-700 text-white";
  }

  return (
    <div
      className={`relative aspect-[1.586/1] w-12 shrink-0 rounded-md bg-gradient-to-tr ${bgGradient} p-1.5 shadow-xs overflow-hidden flex flex-col justify-between select-none ${
        isBlocked ? "opacity-60 saturate-50" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="size-2 rounded-[2px] bg-yellow-300/80 border border-amber-600/40" />
        {isVirtual && (
          <span className="rounded bg-white/25 px-1 py-0.5 text-[5px] font-bold text-white uppercase tracking-tighter">
            VIRTUAL
          </span>
        )}
        {isBlocked && !isVirtual && (
          <span className="rounded bg-black/60 px-1 py-0.5 text-[6px] font-medium text-white uppercase tracking-tighter">
            Lock
          </span>
        )}
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
