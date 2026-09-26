"use client";

/**
 * Card Details Page — Updated 1:1 to Figma Node 5383:9189.
 * Left Column: Hero Virtual Card with 3 Action Circle Buttons & Settings List.
 * Right Column: Spending Limits (Daily & Monthly progress bars) & Recent Activity list.
 */

import { use, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
} from "lucide-react";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import { ListErrorState, ListSkeleton, TrueEmptyState } from "@/components/states/ListStates";
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

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Prototype Baseline State Switcher (Active when not populated) */}
      {state !== "populated" && (
        <StateSwitcher
          section="13.9"
          states={BASELINE_STATES}
          value={state}
          onChange={setState}
          labels={BASELINE_LABEL}
        />
      )}

      {state === "loading" && <ListSkeleton rows={5} columns={3} />}

      {state === "error" && (
        <ListErrorState
          onRetry={() => setState("populated")}
          description="Couldn't load card details. Your account has not changed — try again."
        />
      )}

      {state === "empty" && (
        <TrueEmptyState
          title="No card activity found"
          description="Transactions made with this card will appear here once authorized."
        />
      )}

      {state === "populated" && <VirtualCardDetailsView card={card} />}
    </div>
  );
}

