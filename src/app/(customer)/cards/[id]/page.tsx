"use client";

/**
 * Card Details Page — Updated 1:1 to Figma Node 5383:9189.
 * Left Column: Hero Virtual Card with 3 Action Circle Buttons & Settings List.
 * Right Column: Spending Limits (Daily & Monthly progress bars) & Recent Activity list.
 */

import { use, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ChevronRight,
  CreditCard,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import { ListSkeleton } from "@/components/states/ListStates";
import { VirtualCardDetailsView } from "@/components/cards/VirtualCardDetailsView";
import type { BaselineState } from "@/lib/states";
import { findCard } from "@/lib/mock-data";

const BASELINE_STATES: readonly BaselineState[] = ["loading", "empty", "populated", "error"] as const;

const BASELINE_LABEL: Record<BaselineState, string> = {
  loading: "Loading",
  empty: "Empty",
  populated: "Populated",
  error: "Error",
};

export default function CardDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const card = findCard(id);

  const [state, setState] = useState<BaselineState>("populated");

  if (!card) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Link href="/cards" className="hover:underline">
            Cards
          </Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">Card not found</span>
        </div>
        <p className="text-[14px] text-muted-foreground">The requested card details could not be found.</p>
      </div>
    );
  }

  const maskedDigits = card.maskedNumber ? card.maskedNumber.slice(-4) : "5345";

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 1. Breadcrumbs Header matching Figma 5383:9306 */}
      <div className="flex items-center gap-2 text-[13px]">
        <Link href="/cards" className="text-[#737373] hover:text-foreground transition-colors font-normal">
          Cards
        </Link>
        <ChevronRight size={12} className="text-[#737373]" />
        <span className="text-[#111111] dark:text-foreground font-normal">
          Virtual Card ••• {maskedDigits}
        </span>
      </div>

      {/* 2. Prototype Baseline State Switcher */}
      <StateSwitcher
        section="13.9"
        states={BASELINE_STATES}
        value={state}
        onChange={setState}
        labels={BASELINE_LABEL}
      />

      {state === "loading" && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <ListSkeleton rows={5} columns={3} />
        </div>
      )}

      {state === "error" && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-12 text-center">
          <AlertCircle size={20} className="text-destructive mb-2" />
          <p className="text-[14px] font-medium text-foreground">Couldn&apos;t load card details</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setState("populated")}>
            <RefreshCw size={14} /> Retry
          </Button>
        </div>
      )}

      {state === "empty" && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-12 text-center">
          <CreditCard size={24} className="text-muted-foreground mb-2" />
          <p className="text-[14px] font-medium text-foreground">No card activity found</p>
        </div>
      )}

      {state === "populated" && (
        <VirtualCardDetailsView card={card} />
      )}
    </div>
  );
}

