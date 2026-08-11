"use client";

/**
 * Cards (list) — BRD FR-33 / FR-34.
 *
 * Not named as a surface in Screen Consolidation v2, which stops at the ~30
 * MVP surfaces; the BRD carries Card Services as its own requirement area. It
 * is therefore built on the doc's existing patterns rather than as a new
 * pattern: 13.1 for this list, 13.9 baseline + action states for Card Details,
 * and section 8's compliance interaction for block/unblock.
 *
 * Card Details is reached from a row here, never from navigation (12.4).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, CreditCard, Search } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import {
  FilteredEmptyState,
  ListErrorState,
  ListSkeleton,
  PartialLoadFooter,
  TrueEmptyState,
} from "@/components/states/ListStates";
import { LIST_STATE_LABEL, type ListState } from "@/lib/states";
import { cardsForProfile, formatMoney, type CardStatus } from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";

const LIST_STATES: readonly ListState[] = [
  "loading",
  "empty",
  "filtered-empty",
  "populated",
  "partial-load",
  "error",
] as const;

const STATUS_VARIANT: Record<CardStatus, "success" | "destructive" | "secondary"> = {
  Active: "success",
  Blocked: "destructive",
  Expired: "secondary",
};

export default function CardsPage() {
  const activeProfile = useSession((s) => s.activeProfile);
  const cards = cardsForProfile(activeProfile?.kind);

  const [state, setState] = useState<ListState>("populated");
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!query.trim()) return cards;
    const q = query.toLowerCase();
    return cards.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.holder.toLowerCase().includes(q) ||
        c.maskedNumber.includes(q.replace(/\s/g, "")),
    );
  }, [query, cards]);

  const effective: ListState =
    state === "populated" && query.trim() && results.length === 0 ? "filtered-empty" : state;

  const rows = effective === "partial-load" ? cards : results;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Cards"
        description="Prepaid and debit cards linked to this relationship. Fund eligible prepaid cards, or block a card you no longer control."
      />

      <StateSwitcher
        section="13.1"
        states={LIST_STATES}
        value={state}
        onChange={setState}
        labels={LIST_STATE_LABEL}
      />

      <div className="rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <div className="relative min-w-[200px] flex-1">
            <Search
              size={15}
              strokeWidth={1.9}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by card name, holder or last four digits"
              className="pl-9"
              aria-label="Search cards"
            />
          </div>
        </div>

        {effective === "loading" && <ListSkeleton rows={4} columns={4} />}

        {effective === "error" && (
          <ListErrorState
            onRetry={() => setState("populated")}
            description="We couldn't load your cards. Card status and balances are unaffected — try again."
          />
        )}

        {effective === "empty" && (
          <TrueEmptyState
            icon={<CreditCard size={20} strokeWidth={1.7} aria-hidden="true" />}
            title="No cards issued yet"
            description="Prepaid and debit cards issued under this relationship will appear here once they are active."
          />
        )}

        {effective === "filtered-empty" && (
          <FilteredEmptyState
            onReset={() => {
              setQuery("");
              setState("populated");
            }}
            description="No cards match your search. Clear it to see every card on this relationship."
          />
        )}

        {(effective === "populated" || effective === "partial-load") && (
          <>
            <ul className="divide-y divide-border">
              {rows.map((card) => (
                <li key={card.id}>
                  <Link
                    href={`/cards/${card.id}`}
                    className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/50 active:scale-[0.99] transition-transform"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <CreditCard size={17} strokeWidth={1.8} aria-hidden="true" />
                    </span>

                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-[14px] text-foreground">{card.name}</span>
                        <Badge variant={STATUS_VARIANT[card.status]}>{card.status}</Badge>
                      </span>
                      <span className="mt-0.5 text-[12px] text-muted-foreground tabular">
                        {card.scheme} {card.type} · {card.maskedNumber} · {card.holder}
                      </span>
                    </span>

                    <span className="flex shrink-0 flex-col items-end">
                      {card.balance === null ? (
                        <span className="text-[13px] text-muted-foreground">Draws on account</span>
                      ) : (
                        <span className="text-[14px] text-foreground tabular">
                          {formatMoney(card.balance, card.currency)}
                        </span>
                      )}
                      <span className="mt-0.5 text-[12px] text-muted-foreground tabular">
                        Expires {card.expiry}
                      </span>
                    </span>

                    <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>

            {effective === "partial-load" && <PartialLoadFooter />}
          </>
        )}
      </div>
    </div>
  );
}
