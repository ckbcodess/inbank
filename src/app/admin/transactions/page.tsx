"use client";

/**
 * Transaction Monitoring — section 7, state model 13.1. STUB.
 *
 * Operational work queue optimized for scanning, filtering and exceptions. Rows
 * open Transaction Details in the OPERATIONS VIEW — a variant of the same
 * object screen, view-only with no execution (12.5).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import StubNotice from "@/components/StubNotice";
import { ExpandableSearch } from "@/components/ui/expandable-search";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilteredEmptyState } from "@/components/states/ListStates";
import { TransactionStatusBadge } from "@/components/StatusBadge";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import { LIST_STATE_LABEL, type ListState } from "@/lib/states";
import { TRANSACTIONS, formatDate, formatMoney } from "@/lib/mock-data";

const LIST_STATES: readonly ListState[] = [
  "loading",
  "empty",
  "filtered-empty",
  "populated",
  "partial-load",
  "error",
] as const;

type ChannelFilter = "all" | "cards" | "mobile" | "transfer" | "bulk" | "trade";
type DirectionFilter = "all" | "debit" | "credit";
type StatusFilter = "all" | "completed" | "pending" | "failed";

export default function TransactionMonitoringPage() {
  const [state, setState] = useState<ListState>("populated");
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    return TRANSACTIONS.filter((t) => {
      // 1. Text Search Query
      if (query.trim()) {
        const q = query.toLowerCase();
        const match =
          t.description.toLowerCase().includes(q) ||
          t.reference.toLowerCase().includes(q) ||
          t.counterparty.toLowerCase().includes(q) ||
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
        if (channelFilter === "trade" && !ch.includes("trade")) return false;
      }

      // 3. Direction Filter
      if (directionFilter !== "all") {
        if (t.direction !== directionFilter) return false;
      }

      // 4. Status Filter
      if (statusFilter !== "all") {
        if (statusFilter === "completed" && t.state !== "completed") return false;
        if (
          statusFilter === "pending" &&
          t.state !== "pending" &&
          t.state !== "awaiting-approval"
        )
          return false;
        if (
          statusFilter === "failed" &&
          !t.state.startsWith("failed") &&
          t.state !== "reversed" &&
          t.state !== "disputed"
        )
          return false;
      }

      return true;
    });
  }, [query, channelFilter, directionFilter, statusFilter]);

  const hasActiveFilters =
    query.trim() !== "" ||
    channelFilter !== "all" ||
    directionFilter !== "all" ||
    statusFilter !== "all";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Transaction monitoring"
        description="Operational queue across all customers. View-only — no execution from this portal."
      />

      <StateSwitcher
        section="13.1"
        states={LIST_STATES}
        value={state}
        onChange={setState}
        labels={LIST_STATE_LABEL}
      />

      <StubNotice section="section 7 / sitemap 12.5" states="13.1 list, 13.2 ops variant" />

      <section className="rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* shadcn Select for Channels */}
            <Select value={channelFilter} onValueChange={(val) => setChannelFilter(val as ChannelFilter)}>
              <SelectTrigger className="w-[150px] sm:w-[165px] h-9">
                <SelectValue placeholder="All Channels" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="cards">Cards & POS</SelectItem>
                <SelectItem value="mobile">Mobile Banking</SelectItem>
                <SelectItem value="transfer">Bank Transfers</SelectItem>
                <SelectItem value="bulk">Bulk Payments</SelectItem>
                <SelectItem value="trade">Trade Portal</SelectItem>
              </SelectContent>
            </Select>

            {/* shadcn Select for Direction / Flow */}
            <Select value={directionFilter} onValueChange={(val) => setDirectionFilter(val as DirectionFilter)}>
              <SelectTrigger className="w-[140px] sm:w-[155px] h-9">
                <SelectValue placeholder="All Flows" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="all">All Flows</SelectItem>
                <SelectItem value="debit">Debits (Money Out)</SelectItem>
                <SelectItem value="credit">Credits (Money In)</SelectItem>
              </SelectContent>
            </Select>

            {/* shadcn Select for Status */}
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as StatusFilter)}>
              <SelectTrigger className="w-[135px] sm:w-[150px] h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed / Exceptions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[13px] font-medium text-muted-foreground whitespace-nowrap hidden sm:inline">
              {filtered.length} {filtered.length === 1 ? "record" : "records"}
            </span>
            <ExpandableSearch
              value={query}
              onChange={setQuery}
              placeholder="Search reference, customer or counterparty..."
              tooltip="Search transactions"
              inputWidthClassName="w-64 sm:w-80"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          hasActiveFilters ? (
            <FilteredEmptyState
              onReset={() => {
                setQuery("");
                setChannelFilter("all");
                setDirectionFilter("all");
                setStatusFilter("all");
              }}
              description="No transactions match your search filters. Reset filters to view all operational records."
            />
          ) : (
            <div className="py-12 text-center text-[13px] text-muted-foreground">
              No transactions recorded in monitoring queue
            </div>
          )
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((t) => (
            <li key={t.id}>
              <Link
                href={`/admin/transactions/${t.id}`}
                className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/50 active:scale-[0.99] transition-transform"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13.5px] text-foreground">{t.description}</span>
                  <span className="mt-0.5 truncate text-[12px] text-muted-foreground tabular">
                    {t.reference} · {formatDate(t.date)} · {t.channel}
                  </span>
                </span>
                <span className="shrink-0 text-[13.5px] text-foreground tabular">
                  {formatMoney(t.amount, t.currency)}
                </span>
                <TransactionStatusBadge state={t.state} />
                <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
    </div>
  );
}
