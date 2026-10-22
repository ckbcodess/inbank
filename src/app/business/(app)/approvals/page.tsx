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
 * Each person sees only what waits on them: a Reviewer the payments at review, an Authoriser those at
 * authorisation, on accounts they can see, never their own (BRL-04, UAR-05). Reachable only by reviewers and
 * authorisers; the nav hides it otherwise (12.3).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText, Send, UserCog } from "@/components/ui/icons";
import PageHeader from "@/components/layout/PageHeader";
import { ExpandableSearch } from "@/components/ui/expandable-search";
import { AppliedFilters, FilterPanel, type FilterGroup } from "@/components/ui/filter-panel";
import { Badge } from "@/components/ui/badge";
import { TileChip } from "@/components/ui/action-tile";
import { LIST_CARD_CLASS, ListCard } from "@/components/ui/list-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import {
  FilteredEmptyState,
  ListErrorState,
  ListSkeleton,
  PartialLoadFooter,
  TrueEmptyState,
} from "@/components/states/ListStates";
import { LIST_STATE_LABEL, type ListState } from "@/lib/states";
import { formatMoney } from "@/lib/mock-data";
import { currentStep, eligibility, queueFor } from "@/lib/corporate/approvals";
import { findCompanyUser, userChangesToApprove, useControlsVersion } from "@/lib/corporate/controls";
import { useSession } from "@/lib/session-store";

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
  const actor = useSession((s) => s.actor);
  const queue = useMemo(() => queueFor(actor), [actor]);
  // An Authoriser is also the second person on user changes that widen access (option C).
  const version = useControlsVersion();
  const userChanges = useMemo(() => {
    void version;
    return userChangesToApprove(actor);
  }, [actor, version]);

  const results = useMemo(() => {
    return queue.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        item.description.toLowerCase().includes(q) ||
        item.counterparty.toLowerCase().includes(q) ||
        item.reference.toLowerCase().includes(q)
      );
    });
  }, [queue, query, typeFilter]);

  const filtersActive = query.trim() !== "" || typeFilter !== "all";
  const effective: ListState =
    state === "populated" && filtersActive && results.length === 0 ? "filtered-empty" : state;

  const rows = effective === "partial-load" ? queue : results;

  function resetFilters() {
    setQuery("");
    setTypeFilter("all");
    setState("populated");
  }

  const filterGroups: FilterGroup[] = [
    {
      id: "type",
      kind: "single",
      label: "Type",
      options: [
        { value: "payment", label: "Payment" },
        { value: "trade", label: "Trade" },
      ],
      value: typeFilter,
      onChange: (v) => setTypeFilter(v as TypeFilter),
    },
  ];

  return (
    <div className="flex flex-col gap-10">
      <PageHeader title="Approvals" />

      {userChanges.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeading title="User Changes" />
          <ListCard>
            {userChanges.map((c) => {
              const name = c.userId ? (findCompanyUser(c.userId)?.name ?? c.after.name) : c.after.name;
              return (
                <li key={c.id}>
                  <Link
                    href={`/business/approvals/user-change/${c.id}`}
                    className="group flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-item-hover sm:px-3"
                  >
                    <TileChip tone="onCard">
                      <UserCog size={20} aria-hidden="true" />
                    </TileChip>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="truncate text-[15px] font-medium tracking-[var(--ls-tight)] text-foreground">
                        {c.kind === "add" ? `Add ${name}` : c.kind === "reactivate" ? `Reactivate ${name}` : `Change ${name}'s access`}
                      </span>
                      <span className="tabular truncate text-[13px] text-muted-foreground">{`Proposed by ${c.proposedBy} · ${c.proposedAt}`}</span>
                    </span>
                    <ChevronRight size={20} aria-hidden="true" className="shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                  </Link>
                </li>
              );
            })}
          </ListCard>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <StateSwitcher section="13.1" states={LIST_STATES} value={state} onChange={setState} labels={LIST_STATE_LABEL} />

        <div className="flex min-h-6 flex-wrap items-center justify-between gap-2">
          <h2 className="text-[16px] font-medium text-foreground">Payments</h2>
          <div className="flex flex-wrap items-center gap-2">
            <AppliedFilters groups={filterGroups} />
            <FilterPanel groups={filterGroups} onClear={() => setTypeFilter("all")} align="end" />
            <ExpandableSearch
              value={query}
              onChange={setQuery}
              placeholder="Search reference or description"
              tooltip="Search approvals"
              inputWidthClassName="w-52 sm:w-70"
            />
          </div>
        </div>

        {effective === "loading" && (
          <div className={LIST_CARD_CLASS}>
            <ListSkeleton rows={4} />
          </div>
        )}

        {effective === "error" && (
          <ListErrorState
            onRetry={() => setState("populated")}
            description="We couldn't load your approval queue. Nothing has been approved or rejected — try again."
          />
        )}

        {effective === "empty" && (
          <TrueEmptyState illustration="caught-up" title="Nothing waiting on you" description="Payments that need your review or authorisation show here." />
        )}

        {effective === "filtered-empty" && (
          <FilteredEmptyState
            onReset={resetFilters}
            description="No items match these filters. Clear them to see everything in your queue."
          />
        )}

        {(effective === "populated" || effective === "partial-load") && (
          <ListCard as="div">
            <ul className="flex flex-col gap-0.5">
              {rows.map((item) => {
                const check = eligibility(actor, item);
                const stepLabel = currentStep(item)?.kind === "review" ? "To review" : "To authorise";
                return (
                  <li key={item.id}>
                    <Link
                      href={item.type === "payment" ? `/business/approvals/payment/${item.id}` : `/business/approvals/trade/${item.id}`}
                      className="group flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-item-hover sm:px-3"
                    >
                      <TileChip tone="onCard">
                        {item.type === "payment" ? (
                          <Send size={20} aria-hidden="true" />
                        ) : (
                          <FileText size={20} aria-hidden="true" />
                        )}
                      </TileChip>
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-[15px] font-medium tracking-[var(--ls-tight)] text-foreground">{item.counterparty}</span>
                          {item.priority === "urgent" && <Badge variant="warning">Urgent</Badge>}
                          {!check.ok && <Badge variant="warning">{check.reason === "over-limit" ? "Above your limit" : "Over today's limit"}</Badge>}
                        </span>
                        <span className="tabular truncate text-[13px] text-muted-foreground">
                          {stepLabel} · {item.submittedBy} · {item.submittedAt}
                        </span>
                      </span>
                      <span className="tabular shrink-0 text-[14px] text-foreground">{formatMoney(item.amount, item.currency, true)}</span>
                      <ChevronRight size={20} aria-hidden="true" className="shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>
            {effective === "partial-load" && <PartialLoadFooter />}
          </ListCard>
        )}
      </section>
    </div>
  );
}
