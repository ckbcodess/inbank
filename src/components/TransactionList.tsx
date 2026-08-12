"use client";

/**
 * Transaction List — section 2, classified "Reusable": one structural list
 * reused across transaction contexts (account activity, global transactions,
 * operations monitoring). State model is 13.1.
 *
 * Enhanced with shadcn Select filters for channels and transaction types.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TransactionStatusBadge } from "@/components/StatusBadge";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import {
  FilteredEmptyState,
  ListErrorState,
  ListSkeleton,
  PartialLoadFooter,
  TrueEmptyState,
} from "@/components/states/ListStates";
import { LIST_STATE_LABEL, type ListState } from "@/lib/states";
import { formatDate, formatMoney, type Transaction } from "@/lib/mock-data";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";

const LIST_STATES: readonly ListState[] = [
  "loading",
  "empty",
  "filtered-empty",
  "populated",
  "partial-load",
  "error",
] as const;

type ChannelFilter = "all" | "cards" | "mobile" | "transfer" | "bulk";
type DirectionFilter = "all" | "debit" | "credit";

interface TransactionListProps {
  transactions: Transaction[];
  /** Route prefix for the detail destination. */
  detailBase?: string;
  /** Show the 13.1 state switcher — off when embedded in a screen that owns its own. */
  showStateSwitcher?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

export default function TransactionList({
  transactions,
  detailBase = "/transactions",
  showStateSwitcher = true,
  emptyTitle = "No transactions yet",
  emptyDescription = "Activity will appear here as soon as money moves on this account.",
}: TransactionListProps) {
  useAmountVisibility();
  const [state, setState] = useState<ListState>("populated");
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>("all");

  const results = useMemo(() => {
    return transactions.filter((t) => {
      // 1. Text Search Query
      if (query.trim()) {
        const q = query.toLowerCase();
        const match =
          t.description.toLowerCase().includes(q) ||
          t.counterparty.toLowerCase().includes(q) ||
          t.reference.toLowerCase().includes(q) ||
          t.channel.toLowerCase().includes(q);
        if (!match) return false;
      }

      // 2. Channel Filter
      if (channelFilter !== "all") {
        const ch = t.channel.toLowerCase();
        if (channelFilter === "cards" && !ch.includes("card")) return false;
        if (channelFilter === "mobile" && !ch.includes("mobile")) return false;
        if (
          channelFilter === "transfer" &&
          !ch.includes("internet") &&
          !ch.includes("rtgs") &&
          !ch.includes("ach")
        )
          return false;
        if (channelFilter === "bulk" && !ch.includes("bulk")) return false;
      }

      // 3. Direction Filter
      if (directionFilter !== "all") {
        if (t.direction !== directionFilter) return false;
      }

      return true;
    });
  }, [transactions, query, channelFilter, directionFilter]);

  const hasActiveFilters = query.trim() !== "" || channelFilter !== "all" || directionFilter !== "all";

  const effective: ListState =
    state === "populated" && hasActiveFilters && results.length === 0 ? "filtered-empty" : state;

  const rows = effective === "partial-load" ? transactions : results;

  return (
    <div className="flex flex-col gap-4">
      {showStateSwitcher && (
        <StateSwitcher
          section="13.1"
          states={LIST_STATES}
          value={state}
          onChange={setState}
          labels={LIST_STATE_LABEL}
        />
      )}

      <div className="rounded-2xl border border-border bg-card">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search
              size={15}
              strokeWidth={1.9}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search description, counterparty or reference..."
              className="pl-9"
              aria-label="Search transactions"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* shadcn Select for Channels */}
            <Select value={channelFilter} onValueChange={(val) => setChannelFilter(val as ChannelFilter)}>
              <SelectTrigger className="w-[170px] h-9">
                <SelectValue placeholder="All Channels" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="cards">Cards</SelectItem>
                <SelectItem value="mobile">Mobile Banking</SelectItem>
                <SelectItem value="transfer">Bank Transfer</SelectItem>
                <SelectItem value="bulk">Bulk Payments</SelectItem>
              </SelectContent>
            </Select>

            {/* shadcn Select for Direction / Types */}
            <Select value={directionFilter} onValueChange={(val) => setDirectionFilter(val as DirectionFilter)}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="debit">Debits</SelectItem>
                <SelectItem value="credit">Credits</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {effective === "loading" && <ListSkeleton rows={6} columns={5} />}

        {effective === "error" && <ListErrorState onRetry={() => setState("populated")} />}

        {effective === "empty" && (
          <TrueEmptyState
            icon={<ArrowLeftRight size={20} strokeWidth={1.7} />}
            title={emptyTitle}
            description={emptyDescription}
          />
        )}

        {effective === "filtered-empty" && (
          <FilteredEmptyState
            onReset={() => {
              setQuery("");
              setChannelFilter("all");
              setDirectionFilter("all");
              setState("populated");
            }}
            description="No transactions match your search filters. Reset filters to view all transactions."
          />
        )}

        {(effective === "populated" || effective === "partial-load") && (
          <>
            <ul className="divide-y divide-border">
              {rows.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`${detailBase}/${t.id}`}
                    className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/50"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[13.5px] text-foreground">{t.description}</span>
                      <span className="mt-0.5 truncate text-[12px] text-muted-foreground tabular">
                        {t.reference} · {formatDate(t.date)}
                      </span>
                    </span>

                    <span className="hidden min-w-0 shrink-0 sm:block sm:w-40">
                      <span className="block truncate text-[12.5px] text-muted-foreground">
                        {t.counterparty}
                      </span>
                    </span>

                    <span
                      className={`shrink-0 text-[13.5px] tabular ${
                        t.direction === "credit" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                      }`}
                    >
                      {t.direction === "debit" ? "−" : "+"}
                      {formatMoney(t.amount, t.currency)}
                    </span>

                    <span className="w-[120px] shrink-0 text-right">
                      <TransactionStatusBadge state={t.state} />
                    </span>
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
