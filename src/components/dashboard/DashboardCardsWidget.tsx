import { useState } from "react";
import Link from "next/link";
import { Snowflake, X, Smartphone, Globe } from "lucide-react";
import { toast } from "sonner";

interface CardItem {
  id: string;
  type: "Debit" | "Virtual";
  maskedNumber: string;
  frozen: boolean;
  network: "VISA" | "MASTERCARD";
  gradient: string;
  limit: number;
  onlineEnabled: boolean;
  intlEnabled: boolean;
  contactlessEnabled: boolean;
}

export function DashboardCardsWidget() {
  const [cards, setCards] = useState<CardItem[]>([
    {
      id: "card-debit",
      type: "Debit",
      maskedNumber: "•••• 9102",
      frozen: false,
      network: "VISA",
      gradient: "linear-gradient(135deg, rgb(0, 153, 102) 0%, rgb(0, 150, 137) 50%, rgb(0, 117, 149) 100%)",
      limit: 15000,
      onlineEnabled: true,
      intlEnabled: true,
      contactlessEnabled: true,
    },
    {
      id: "card-virtual",
      type: "Virtual",
      maskedNumber: "•••• 9102",
      frozen: false,
      network: "MASTERCARD",
      gradient: "linear-gradient(135deg, rgb(29, 41, 61) 0%, rgb(24, 24, 27) 50%, rgb(15, 23, 43) 100%)",
      limit: 5000,
      onlineEnabled: true,
      intlEnabled: false,
      contactlessEnabled: true,
    },
  ]);

  const [managingCard, setManagingCard] = useState<CardItem | null>(null);

  const toggleFreeze = (cardId: string) => {
    setCards((prev) =>
      prev.map((c) => {
        if (c.id === cardId) {
          const nextState = !c.frozen;
          toast(nextState ? `${c.type} card frozen` : `${c.type} card unfrozen`, {
            description: nextState ? "Online and POS transactions are temporarily blocked." : "Card is now active.",
          });
          return { ...c, frozen: nextState };
        }
        return c;
      })
    );
  };

  const handleToggleCardSetting = (setting: "onlineEnabled" | "intlEnabled" | "contactlessEnabled") => {
    if (!managingCard) return;
    const nextVal = !managingCard[setting];
    const updated = { ...managingCard, [setting]: nextVal };
    setManagingCard(updated);
    setCards((prev) => prev.map((c) => (c.id === managingCard.id ? updated : c)));
    toast.success(`Card security settings updated`);
  };

  return (
    <>
      <div className="flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xs transition-all">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-medium text-foreground">Cards</h2>
          <Link
            href="/cards"
            className="text-[14px] text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
          </Link>
        </div>

        {/* Cards List */}
        <div className="my-auto py-2 flex flex-col divide-y divide-border/60">
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex items-center justify-between py-3.5 first:pt-1 last:pb-1"
            >
              {/* Left: Mini Card Graphic & Info */}
              <div
                className="flex items-center gap-4 cursor-pointer group"
                onClick={() => setManagingCard(card)}
              >
                {/* Mini Card Graphic */}
                <div
                  className="relative flex h-[42px] w-[66px] flex-col justify-between overflow-hidden rounded-md p-1.5 shadow-xs transition-transform duration-200 group-hover:scale-105"
                  style={{ background: card.gradient }}
                >
                  {/* Chip */}
                  <div className="h-2.5 w-3 rounded-xs bg-[#f9c632]/90" />
                  {/* Network logo */}
                  <div className="flex justify-end">
                    {card.network === "VISA" ? (
                      <span className="text-[9px] font-bold tracking-tight text-white">VISA</span>
                    ) : (
                      <div className="flex items-center -space-x-1">
                        <div className="size-2.5 rounded-full bg-[#eb001b]/90" />
                        <div className="size-2.5 rounded-full bg-[#f79e1b]/90" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Details */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium text-foreground group-hover:text-primary transition-colors">{card.type}</span>
                    <span className="text-[12px] text-muted-foreground">{card.maskedNumber}</span>
                  </div>
                  {card.frozen ? (
                    <span className="text-[11px] font-medium text-destructive">Frozen</span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Active · GHS {card.limit.toLocaleString()} limit</span>
                  )}
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleFreeze(card.id)}
                  className={`flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition-colors cursor-pointer ${
                    card.frozen
                      ? "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
                      : "border-border bg-muted/60 text-foreground hover:bg-muted"
                  }`}
                >
                  <Snowflake size={13} strokeWidth={2} />
                  <span>{card.frozen ? "Unfreeze" : "Freeze"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setManagingCard(card)}
                  className="flex h-7 items-center rounded-md border border-border bg-muted/60 px-2.5 text-[12px] font-medium text-foreground transition-colors hover:bg-muted cursor-pointer"
                >
                  Manage
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Card Quick Management Modal */}
      {managingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className="relative flex h-[34px] w-[52px] flex-col justify-between overflow-hidden rounded-md p-1 shadow-xs"
                  style={{ background: managingCard.gradient }}
                >
                  <div className="h-2 w-2.5 rounded-xs bg-[#f9c632]/90" />
                  <div className="text-[8px] font-bold text-white text-right">{managingCard.network}</div>
                </div>
                <div>
                  <h3 className="text-[16px] font-medium text-foreground">{managingCard.type} Card Controls</h3>
                  <p className="text-[12px] text-muted-foreground">{managingCard.maskedNumber} · Exp: 09/29</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManagingCard(null)}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Controls */}
            <div className="mt-4 flex flex-col divide-y divide-border/60">
              {/* Freeze Toggle */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-muted text-foreground">
                    <Snowflake size={16} />
                  </div>
                  <div>
                    <span className="text-[14px] font-medium text-foreground">Freeze Card</span>
                    <p className="text-[12px] text-muted-foreground">Temporarily disable transactions</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleFreeze(managingCard.id)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    managingCard.frozen ? "bg-destructive" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                      managingCard.frozen ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Online Purchases */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-muted text-foreground">
                    <Globe size={16} />
                  </div>
                  <div>
                    <span className="text-[14px] font-medium text-foreground">Online Purchases</span>
                    <p className="text-[12px] text-muted-foreground">Allow web and e-commerce payments</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleCardSetting("onlineEnabled")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    managingCard.onlineEnabled ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                      managingCard.onlineEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Contactless Payments */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-muted text-foreground">
                    <Smartphone size={16} />
                  </div>
                  <div>
                    <span className="text-[14px] font-medium text-foreground">Contactless POS</span>
                    <p className="text-[12px] text-muted-foreground">Tap-to-pay on point of sale terminals</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleCardSetting("contactlessEnabled")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    managingCard.contactlessEnabled ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                      managingCard.contactlessEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-between items-center gap-2">
              <Link
                href="/cards"
                className="text-[13px] font-medium text-primary hover:underline"
              >
                Open Full Card Hub →
              </Link>
              <button
                type="button"
                onClick={() => setManagingCard(null)}
                className="rounded-xl bg-foreground px-5 py-2 text-[14px] font-medium text-background hover:bg-foreground/90 cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
