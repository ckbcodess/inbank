"use client";

/**
 * Today's rates, one tap from the hero card. A reference sheet:
 * the customer reads a rate and leaves. Buy/sell are spelled out because the
 * bank buys foreign currency from you at one and sells it to you at the other.
 */

import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CurrencyLogo } from "@/components/ui/currency-logo";
import { BOG_WEIGHTED_MEDIAN_RATE, FX_PUBLISHED_AT, FX_RATES, formatDate } from "@/lib/mock-data";

const rateText = (n: number) => n.toFixed(n < 0.1 ? 5 : 4);

const COLS = "grid grid-cols-[1fr_72px_72px_72px] items-center gap-x-4";

export function FxRatesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>FX Rates</DialogTitle>
        </DialogHeader>
        <DialogBody className="custom-scrollbar gap-6 py-6">
          <div>
            <p className="text-[12px] text-muted-foreground">US dollar weighted median</p>
            <p className="mt-1 text-[32px] leading-none tracking-[-0.02em] text-foreground tabular">
              GHS {BOG_WEIGHTED_MEDIAN_RATE.toFixed(4)}
            </p>
          </div>

          <div>
            <div className={`${COLS} pb-3 text-[12px] text-muted-foreground`}>
              <span />
              <span className="text-right">Buy</span>
              <span className="text-right">Sell</span>
              <span className="text-right">Trend</span>
            </div>
            <ul className="flex flex-col">
              {FX_RATES.map((r) => {
                const Trend = r.changePct >= 0 ? TrendingUp : TrendingDown;
                return (
                  <li key={r.pair} className={`${COLS} py-3.5`}>
                    <div className="flex min-w-0 items-center gap-3">
                      <CurrencyLogo currency={r.base} size={24} showBorder={false} />
                      <p className="truncate text-[14px] text-foreground">{r.currencyName}</p>
                    </div>
                    <span className="text-right text-[14px] text-foreground tabular">{rateText(r.buy)}</span>
                    <span className="text-right text-[14px] text-foreground tabular">{rateText(r.sell)}</span>
                    <span
                      className={`flex items-center justify-end gap-1 text-[13px] tabular ${r.changePct >= 0 ? "text-success-text" : "text-destructive"}`}
                    >
                      <Trend size={13} strokeWidth={1.9} aria-hidden="true" />
                      {Math.abs(r.changePct).toFixed(2)}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </DialogBody>
        <DialogFooter className="justify-between">
          <p className="text-[13px] text-muted-foreground tabular">Updated {formatDate(FX_PUBLISHED_AT)}</p>
          <Button variant="outline" nativeButton={false} render={<Link href="/fx-rates" />}>
            All rates
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
