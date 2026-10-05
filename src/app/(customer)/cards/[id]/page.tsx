"use client";

/**
 * Card Details Page — Updated 1:1 to Figma Node 5383:9189.
 * Left Column: Hero Virtual Card with 3 Action Circle Buttons & Settings List.
 * Right Column: Spending Limits (Daily & Monthly progress bars) & Recent Activity list.
 */

import { use, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
} from "lucide-react";
import CardDetailsLoading from "./loading";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import { ListErrorState, TrueEmptyState } from "@/components/states/ListStates";
import { VirtualCardDetailsView } from "@/components/cards/VirtualCardDetailsView";
import type { BaselineState } from "@/lib/states";
import type { DevStateGroup } from "@/components/providers/DevStateProvider";
import { findCard } from "@/lib/mock-data";
import { getEffectiveCard, useCardsDevStore } from "@/lib/cards-dev-store";
import { useSessionHydrated } from "@/lib/session-store";
import { readyCache } from "@/lib/ready-cache";
import { useCardAssetsReady } from "@/components/cards/useCardAssetsReady";

const BASELINE_STATES: readonly BaselineState[] = ["loading", "empty", "populated", "error"] as const;

const BASELINE_LABEL: Record<BaselineState, string> = {
  loading: "Loading",
  empty: "Empty",
  populated: "Populated",
  error: "Error",
};

export default function CardDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const devState = useCardsDevStore();
  const rawCard = findCard(id);

  const card = useMemo(() => {
    return getEffectiveCard(id, rawCard, devState, rawCard?.profileKind);
  }, [id, rawCard, devState]);

  const [state, setState] = useState<BaselineState>("populated");
  // The page-level states also sit in the card page's own Dev Mode groups, so every state is reachable from one menu.
  const pageStateGroup = useMemo<DevStateGroup[]>(
    () => [
      {
        label: "Page state",
        states: BASELINE_STATES.map((id) => ({ id, label: BASELINE_LABEL[id] })),
        value: state,
        onChange: (v) => setState(v as BaselineState),
      },
    ],
    [state],
  );

  // Hold the page until the session and this card's artwork are in, so the face never paints bare.
  const sessionHydrated = useSessionHydrated();
  if (sessionHydrated) readyCache.session = true;
  const sessionReady = sessionHydrated || readyCache.session;
  const assetsReady = useCardAssetsReady(card ? [card] : []);
  const ready = sessionReady && assetsReady;

  if (!ready) return <CardDetailsLoading />;

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

      {state === "loading" && <CardDetailsLoading />}

      {state === "error" && (
        <ListErrorState
          onRetry={() => setState("populated")}
          description="Couldn't load card details. Your account has not changed — try again."
        />
      )}

      {state === "empty" && (
        <TrueEmptyState illustration="empty-activity"
          title="No card activity found"
          description="Transactions made with this card will appear here once authorized."
        />
      )}

      {state === "populated" && <VirtualCardDetailsView card={card} extraDevGroups={pageStateGroup} />}
    </div>
  );
}

