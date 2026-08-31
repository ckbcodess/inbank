"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Plus,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { setCardStatus, type PaymentCard } from "@/lib/mock-data";

export function InteractiveCardsHub({
  cards,
  onTopUp,
  onChanged
}: {
  cards: PaymentCard[];
  onTopUp: (cardId: string) => void;
  onChanged: () => void;
}) {
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [revealedCards, setRevealedCards] = useState<Record<string, boolean>>({});

  if (cards.length === 0) {
    return (
      <div className="flex h-full flex-col rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-[15px] font-medium text-foreground">Cards</h2>
          <Link href="/cards" className="text-[12px] text-primary hover:underline">
            Manage
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 py-8 text-center">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-2">
            <CreditCard size={20} />
          </span>
          <p className="text-[13px] text-foreground font-medium">No cards active</p>
          <p className="text-[12px] text-muted-foreground mt-0.5 mb-3">Request a physical or instant virtual card</p>
          <Button size="sm" variant="outline" render={<Link href="/cards" />} nativeButton={false}>
            Order Card
          </Button>
        </div>
      </div>
    );
  }

  const currentCard = cards[activeCardIndex] || cards[0];
  const isBlocked = currentCard.status === "Blocked";
  const isRevealed = !!revealedCards[currentCard.id];

  function toggleCardBlock() {
    setCardStatus(currentCard.id, isBlocked ? "Active" : "Blocked");
    onChanged();
  }

  function toggleRevealDetails() {
    setRevealedCards((prev) => ({
      ...prev,
      [currentCard.id]: !prev[currentCard.id]
    }));
  }

  // Visual card styles
  const isVirtual = currentCard.type === "Virtual";
  const cardGradient = isVirtual
    ? "from-slate-900 via-indigo-950 to-blue-900 text-white"
    : isBlocked
    ? "from-zinc-800 to-zinc-900 text-zinc-400 opacity-90"
    : "from-amber-950 via-stone-900 to-neutral-900 text-amber-100";

  return (
    <div className="flex h-full flex-col rounded-3xl border border-border bg-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-medium text-foreground">Cards &amp; Wallets</h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary font-mono">
            {cards.length}
          </span>
        </div>
        <Link href="/cards" className="text-[12px] text-primary hover:underline flex items-center gap-0.5">
          View all <ChevronRight size={13} />
        </Link>
      </div>

      {/* Card Carousel Selector Tabs */}
      {cards.length > 1 && (
        <div className="flex gap-1.5 pt-3 pb-2 overflow-x-auto scrollbar-none">
          {cards.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCardIndex(i)}
              className={`px-3 py-1 text-[11.5px] rounded-xl font-medium transition-all ${
                activeCardIndex === i
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.name.split(" ")[0]} ({c.maskedNumber.slice(-4)})
            </button>
          ))}
        </div>
      )}

      {/* Interactive Visual Card */}
      <div className="pt-2">
        <div
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-tr p-4.5 shadow-md transition-all duration-300 ${cardGradient} min-h-[170px] flex flex-col justify-between`}
        >
          {/* Card Ambient Gloss Overlay */}
          <div className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-white/10 blur-xl" />

          {/* Top Row: Brand & Status */}
          <div className="flex items-center justify-between z-10">
            <div>
              <span className="text-[10px] font-medium tracking-widest uppercase opacity-80 block">
                GCB BANK PLC
              </span>
              <span className="text-[13px] font-medium">{currentCard.name}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {isBlocked ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10.5px] font-medium border border-rose-500/30">
                  <Lock size={10} /> Frozen
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10.5px] font-medium border border-emerald-500/30">
                  <Sparkles size={10} /> Active
                </span>
              )}
            </div>
          </div>

          {/* Middle: Card Number (Masked or Unmasked) */}
          <div className="my-2 z-10 flex items-center justify-between">
            <span className="font-mono text-[15px] sm:text-[16px] tracking-wider font-medium">
              {isRevealed
                ? `4111 8820 9410 ${currentCard.maskedNumber.slice(-4)}`
                : `•••• •••• •••• ${currentCard.maskedNumber.slice(-4)}`}
            </span>
            <button
              type="button"
              onClick={toggleRevealDetails}
              className="p-1 rounded-md bg-white/10 hover:bg-white/20 transition-colors text-white"
              title={isRevealed ? "Hide details" : "Reveal details"}
            >
              {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>

          {/* Bottom Row: Expiry, CVV & Scheme */}
          <div className="flex items-end justify-between text-[11px] font-mono z-10 opacity-90">
            <div className="flex gap-4">
              <div>
                <span className="text-[9px] uppercase tracking-wider block opacity-70">Expires</span>
                <span>{currentCard.expiry}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider block opacity-70">CVV</span>
                <span>{isRevealed ? "782" : "•••"}</span>
              </div>
            </div>

            <div className="text-right font-sans font-medium text-[14px] tracking-tight">
              {currentCard.scheme}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Interactive Card Actions */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <Button
          variant={isBlocked ? "default" : "outline"}
          size="sm"
          onClick={toggleCardBlock}
          className={`h-9 text-[12.5px] gap-1.5 rounded-xl ${
            isBlocked ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
          }`}
        >
          {isBlocked ? (
            <>
              <Unlock size={13} /> Unfreeze Card
            </>
          ) : (
            <>
              <Lock size={13} /> Freeze Card
            </>
          )}
        </Button>

        {currentCard.fundable ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTopUp(currentCard.id)}
            className="h-9 text-[12.5px] gap-1.5 rounded-xl"
          >
            <Plus size={13} /> Top Up
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/cards/${currentCard.id}`} />}
            nativeButton={false}
            className="h-9 text-[12.5px] gap-1.5 rounded-xl"
          >
            Limits &amp; PIN
          </Button>
        )}
      </div>

      {/* Spend Limit Meter */}
      <div className="mt-3.5 pt-3 border-t border-border/60 text-[11.5px]">
        <div className="flex justify-between items-center text-muted-foreground mb-1">
          <span>Monthly Spend Limit</span>
          <span className="font-mono text-foreground font-medium">GHS 2,450 / 10,000</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: "24.5%" }} />
        </div>
      </div>
    </div>
  );
}
