"use client";

/**
 * Fee Concessions — BRD FR-37.
 *
 * "The system shall support automated creation, maintenance, and application of
 * approved fee concessions", so that manual fee reversals are eliminated. The
 * point of the requirement is that application is automatic once approved —
 * this screen maintains the concessions, it does not apply them by hand, and
 * there is deliberately no "reverse a fee" action anywhere on it.
 *
 * Bank Admin only (FR-37 addresses a Bank Administrator). State model: 13.1.
 */

import { useMemo, useState } from "react";
import { Percent, Plus } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { ExpandableSearch } from "@/components/ui/expandable-search";
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
import { FEE_CONCESSIONS, formatDate, type FeeConcession } from "@/lib/mock-data";

const LIST_STATES: readonly ListState[] = [
  "loading",
  "empty",
  "filtered-empty",
  "populated",
  "partial-load",
  "error",
] as const;

const STATUS_VARIANT: Record<FeeConcession["status"], "success" | "warning" | "secondary"> = {
  Active: "success",
  "Pending approval": "warning",
  Expired: "secondary",
};

export default function FeeConcessionsPage() {
  const [state, setState] = useState<ListState>("populated");
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FEE_CONCESSIONS;
    return FEE_CONCESSIONS.filter(
      (f) => f.customer.toLowerCase().includes(q) || f.feeType.toLowerCase().includes(q),
    );
  }, [query]);

  const effective: ListState =
    state === "populated" && query.trim() && results.length === 0 ? "filtered-empty" : state;

  const rows = effective === "partial-load" ? FEE_CONCESSIONS : results;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Fee concessions"
        description="Approved concessions are applied automatically at transaction time. Maintaining them here removes the need for manual fee reversals."
        actions={
          <Button size="sm">
            <Plus size={14} strokeWidth={1.9} aria-hidden="true" />
            New concession
          </Button>
        }
      />

      <StateSwitcher
        section="13.1"
        states={LIST_STATES}
        value={state}
        onChange={setState}
        labels={LIST_STATE_LABEL}
      />

      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <span className="text-[13px] font-medium text-foreground">
            Concessions ({results.length})
          </span>
          <ExpandableSearch
            value={query}
            onChange={setQuery}
            placeholder="Search by customer or fee type..."
            tooltip="Search fee concessions"
            inputWidthClassName="w-64 sm:w-80"
          />
        </div>

        {effective === "loading" && <ListSkeleton rows={4} columns={5} />}

        {effective === "error" && (
          <ListErrorState
            onRetry={() => setState("populated")}
            description="We couldn't load fee concessions. Existing concessions are still being applied — try again."
          />
        )}

        {effective === "empty" && (
          <TrueEmptyState
            icon={<Percent size={20} strokeWidth={1.7} aria-hidden="true" />}
            title="No concessions configured"
            description="Standard tariffs apply to every customer until a concession is created and approved."
            action={
              <Button size="sm">
                <Plus size={14} strokeWidth={1.9} aria-hidden="true" />
                New concession
              </Button>
            }
          />
        )}

        {effective === "filtered-empty" && (
          <FilteredEmptyState
            onReset={() => {
              setQuery("");
              setState("populated");
            }}
            description="No concessions match your search. Clear it to see every configured concession."
          />
        )}

        {(effective === "populated" || effective === "partial-load") && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-[13px]">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-4 py-3 font-normal">Customer</th>
                    <th className="px-4 py-3 font-normal">Fee type</th>
                    <th className="px-4 py-3 text-right font-normal">Concession</th>
                    <th className="px-4 py-3 font-normal">Effective</th>
                    <th className="px-4 py-3 font-normal">Status</th>
                    <th className="px-4 py-3 font-normal">Approved by</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((fee) => (
                    <tr key={fee.id} className="transition-colors hover:bg-muted/50">
                      <td className="px-4 py-3.5 text-foreground">{fee.customer}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">{fee.feeType}</td>
                      <td className="px-4 py-3.5 text-right text-foreground tabular">
                        {fee.concessionPct}%
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground tabular">
                        {formatDate(fee.effectiveFrom)} — {formatDate(fee.effectiveTo)}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={STATUS_VARIANT[fee.status]}>{fee.status}</Badge>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">{fee.approvedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {effective === "partial-load" && <PartialLoadFooter />}
          </>
        )}
      </div>
    </div>
  );
}
