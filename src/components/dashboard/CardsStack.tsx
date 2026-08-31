"use client";

/**
 * FR-33 / FR-34 — the card stack.
 *
 * The two most recent cards render as a layered deck rather than a plain
 * list — "is my card active, can I use it" is a glance question, and a card
 * that looks like a card answers it faster than an icon and a row of text.
 * Block/fund/statement stay on `/cards`, not duplicated here: this is a
 * status glance, not a second management surface.
 */

import Link from "next/link";
import { CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { type PaymentCard } from "@/lib/mock-data";

export function CardsStack({ cards }: { cards: PaymentCard[] }) {
  const top = cards.slice(0, 2);
  const [front, back] = top;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] text-foreground">Cards</h2>
        <Link href="/cards" className="text-[12px] text-primary underline-offset-4 hover:underline">
          Manage all →
        </Link>
      </div>

      {!front ? (
        <p className="mt-6 flex-1 text-center text-[13px] text-muted-foreground">
          No cards on this relationship yet.
        </p>
      ) : (
        <>
          <div className="relative mt-4 h-[186px]">
            {back && (
              <div
                className="absolute inset-x-4 top-6 flex h-32 flex-col justify-between rounded-xl bg-primary p-3.5 text-primary-foreground shadow-sm"
                style={{ transform: "rotate(-2.2deg)" }}
              >
                <div className="flex items-center justify-between text-[10.5px] opacity-90">
                  <span className="truncate">{back.name}</span>
                  {(back.type === "Virtual" || back.isVirtual) && (
                    <span className="shrink-0 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[8.5px] uppercase tracking-wide">
                      Virtual
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="absolute inset-x-0 top-10 flex h-[132px] flex-col justify-between rounded-xl bg-foreground p-4 text-background shadow-md">
              <div className="flex items-center justify-between">
                <span className="h-[19px] w-[26px] rounded-[5px] bg-background/20" aria-hidden="true" />
                <Badge variant={front.status === "Active" ? "success" : "destructive"} className="text-[9px]">
                  {front.status}
                </Badge>
              </div>
              <div className="tabular text-[14.5px] tracking-[0.08em]">
                •••• •••• •••• {front.maskedNumber.replace(/\D/g, "")}
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[7.5px] uppercase tracking-wide opacity-55">Card holder</div>
                  <div className="mt-0.5 text-[10.5px]">{front.holder.toUpperCase()}</div>
                </div>
                <div>
                  <div className="text-[7.5px] uppercase tracking-wide opacity-55">Expires</div>
                  <div className="tabular mt-0.5 text-[10.5px]">{front.expiry}</div>
                </div>
                <div className="text-[13px] italic tracking-[-0.02em]">{front.scheme}</div>
              </div>
            </div>
          </div>

          {top.length > 1 && (
            <div className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
              <span className="h-1 w-3.5 rounded-full bg-foreground" />
              <span className="h-1 w-1 rounded-full bg-border" />
            </div>
          )}

          <ul className="mt-4 divide-y divide-border rounded-xl border border-border">
            {top.map((card) => (
              <li key={card.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <CreditCard size={15} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[12.5px] text-foreground">{card.name}</span>
                  <span className="tabular mt-0.5 text-[11px] text-muted-foreground">
                    {card.maskedNumber} · Exp {card.expiry}
                  </span>
                </span>
                <Badge variant={card.status === "Active" ? "success" : "destructive"} className="text-[10px]">
                  {card.status}
                </Badge>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
