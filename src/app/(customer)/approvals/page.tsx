"use client";

/**
 * Approval Queue — section 4, state model 13.1.
 *
 * One shared queue showing everything requiring the current user's action. The
 * row's type decides which of the two approval screens it opens:
 *
 *   payment -> /approvals/payment/[id]  (13.4)
 *   trade   -> /approvals/trade/[id]    (13.5)
 *
 * These are two separate screens by design (section 4: "Approval Details" was
 * split into variants), not one screen with conditional content.
 *
 * Reachable only by an Approver — the nav hides it otherwise (12.3).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, FileText, Search, Send } from "lucide-react";
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
import { APPROVAL_QUEUE, formatMoney } from "@/lib/mock-data";

const LIST_STATES: readonly ListState[] = [
  "loading",
  "empty",
  "filtered-empty",
  "populated",
  "partial-load",
  "error",
] as const;

type TypeFilter = "all" | "payment" | "trade";

export default function ApprovalQueuePage() {
  const [state, setState] = useState<ListState>("populated");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const results = useMemo(() => {
    return APPROVAL_QUEUE.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        item.description.toLowerCase().includes(q) ||
        item.counterparty.toLowerCase().includes(q) ||
        item.reference.toLowerCase().includes(q)
      );
    });
  }, [query, typeFilter]);

  const filtersActive = query.trim() !== "" || typeFilter !== "all";
  const effective: ListState =
    state === "populated" && filtersActive && results.length === 0 ? "filtered-empty" : state;

  const rows = effective === "partial-load" ? APPROVAL_QUEUE : results;

  function resetFilters() {
    setQuery("");
    setTypeFilter("all");
    setState("populated");
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Approvals"
        description="Transactions waiting on your decision."
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
              placeholder="Search reference, description or counterparty"
              className="pl-9"
              aria-label="Search approvals"
            />
          </div>

          <div className="inline-flex rounded-lg bg-muted p-0.5">
            {(["all", "payment", "trade"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                aria-pressed={typeFilter === t}
                className={`rounded-md px-3 py-1.5 text-[12.5px] capitalize transition-all ${
                  typeFilter === t
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {effective === "loading" && <ListSkeleton rows={4} columns={5} />}

        {effective === "error" && (
          <ListErrorState
            onRetry={() => setState("populated")}
            description="We couldn't load your approval queue. Nothing has been approved or rejected — try again."
          />
        )}

        {effective === "empty" && (
          <TrueEmptyState
            icon={<CheckCircle2 size={20} strokeWidth={1.7} aria-hidden="true" />}
            title="Nothing waiting on you"
            description="When a colleague submits a payment or trade request that needs your approval, it will appear here."
          />
        )}

        {effective === "filtered-empty" && (
          <FilteredEmptyState
            onReset={resetFilters}
            description="No items match these filters. Clear them to see everything in your queue."
          />
        )}

        {(effective === "populated" || effective === "partial-load") && (
          <>
            <ul className="divide-y divide-border">
              {rows.map((item) => {
                const exceedsLimit = item.amount > item.approvalLimit;
                return (
                  <li key={item.id}>
                    <Link
                      href={
                        item.type === "payment"
                          ? `/approvals/payment/${item.id}`
                          : `/approvals/trade/${item.id}`
                      }
                      className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/50 active:scale-[0.99] transition-transform"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        {item.type === "payment" ? (
                          <Send size={16} strokeWidth={1.8} aria-hidden="true" />
                        ) : (
                          <FileText size={16} strokeWidth={1.8} aria-hidden="true" />
                        )}
                      </span>

                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[13.5px] text-foreground">{item.description}</span>
                          {item.priority === "urgent" && <Badge variant="warning">Urgent</Badge>}
                          {exceedsLimit && <Badge variant="destructive">Exceeds your limit</Badge>}
                        </span>
                        <span className="mt-0.5 truncate text-[12px] text-muted-foreground tabular">
                          {item.reference} · {item.submittedBy} · {item.submittedAt}
                        </span>
                      </span>

                      <span className="shrink-0 text-[13.5px] text-foreground tabular">
                        {formatMoney(item.amount, item.currency)}
                      </span>

                      <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>

            {effective === "partial-load" && <PartialLoadFooter />}
          </>
        )}
      </div>
    </div>
  );
}
