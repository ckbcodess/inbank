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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AppliedFilters,
  FilterPanel,
  countActiveFilters,
  type FilterGroup,
} from "@/components/ui/filter-panel";
import { FilteredEmptyState, TrueEmptyState } from "@/components/states/ListStates";
import { TransactionStatusBadge } from "@/components/StatusBadge";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import { LIST_STATE_LABEL, type ListState } from "@/lib/states";
import {
  TRANSACTIONS,
  formatDate,
  formatMoney,
  TRANSACTION_CATEGORIES,
  TRANSACTION_PAYMENT_METHODS,
} from "@/lib/mock-data";

const LIST_STATES: readonly ListState[] = [
  "loading",
  "empty",
  "filtered-empty",
  "populated",
  "partial-load",
  "error",
] as const;

type ChannelFilter = "cards" | "mobile" | "transfer" | "bulk" | "trade";
type DirectionFilter = "all" | "debit" | "credit";
type StatusFilter = "completed" | "pending" | "failed";
type DatePreset = "all" | "today" | "7d" | "30d" | "this-month" | "last-month" | "custom";

const CHANNEL_OPTIONS: readonly { readonly id: ChannelFilter; readonly name: string }[] = [
  { id: "cards", name: "Cards & POS" },
  { id: "mobile", name: "Mobile Banking" },
  { id: "transfer", name: "Bank Transfers" },
  { id: "bulk", name: "Bulk Payments" },
  { id: "trade", name: "Trade Portal" },
] as const;

const STATUS_OPTIONS: readonly { readonly id: StatusFilter; readonly name: string }[] = [
  { id: "completed", name: "Completed" },
  { id: "pending", name: "Pending" },
  { id: "failed", name: "Failed / Exceptions" },
] as const;

function getPaymentMethodLabel(methodId?: string) {
  if (!methodId) return null;
  const found = TRANSACTION_PAYMENT_METHODS.find((m) => m.id === methodId);
  return found?.name || methodId;
}

export default function TransactionMonitoringPage() {
  const [state, setState] = useState<ListState>("populated");
  const [query, setQuery] = useState("");
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [methodFilters, setMethodFilters] = useState<string[]>([]);
  const [channelFilters, setChannelFilters] = useState<ChannelFilter[]>([]);
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>("all");
  const [statusFilters, setStatusFilters] = useState<StatusFilter[]>([]);
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const filtered = useMemo(() => {
    return TRANSACTIONS.filter((t) => {
      // 1. Text Search Query
      if (query.trim()) {
        const q = query.toLowerCase();
        const match =
          t.description.toLowerCase().includes(q) ||
          t.reference.toLowerCase().includes(q) ||
          t.counterparty.toLowerCase().includes(q) ||
          t.channel.toLowerCase().includes(q) ||
          (t.category && t.category.toLowerCase().includes(q)) ||
          (t.paymentMethod && t.paymentMethod.toLowerCase().includes(q));
        if (!match) return false;
      }

      // 2. Category Filter (multi-select)
      if (categoryFilters.length > 0) {
        const cat = (t.category || "").toLowerCase();
        const desc = t.description.toLowerCase();
        const matchesCategory = categoryFilters.some((cf) => {
          if (cf === "fees") {
            return cat.includes("fee") || cat.includes("charge") || desc.includes("fee") || desc.includes("charge");
          }
          if (cf === "transport") {
            return cat.includes("transport") || desc.includes("uber") || desc.includes("bolt") || desc.includes("fuel") || desc.includes("transit");
          }
          if (cf === "airtime-data") {
            return cat.includes("airtime") || cat.includes("data") || desc.includes("airtime") || desc.includes("data") || desc.includes("bundle");
          }
          if (cf === "cash-momo") {
            return cat.includes("cash") || cat.includes("momo") || desc.includes("momo");
          }
          if (cf === "trade-imports") {
            return cat.includes("trade") || cat.includes("import") || t.kind === "trade";
          }
          if (cf === "taxes-levies") {
            return cat.includes("tax") || cat.includes("levy") || desc.includes("tax") || desc.includes("gra");
          }
          if (cf === "rent-facilities") {
            return cat.includes("rent") || desc.includes("rent") || desc.includes("landlord");
          }
          return cat.includes(cf.toLowerCase());
        });
        if (!matchesCategory) return false;
      }

      // 3. Payment Method Filter (multi-select)
      if (methodFilters.length > 0) {
        const pm = (t.paymentMethod || "").toLowerCase();
        const ch = t.channel.toLowerCase();
        const desc = t.description.toLowerCase();

        const matchesMethod = methodFilters.some((mf) => {
          if (mf === "wallet-to-bank") {
            return pm === "wallet-to-bank" || desc.includes("wallet to bank");
          }
          if (mf === "papss") {
            return pm === "papss" || ch.includes("papss") || desc.includes("papss");
          }
          if (mf === "gip") {
            return pm === "gip" || desc.includes("gip") || ch.includes("gip");
          }
          if (mf === "ach") {
            return pm === "ach" || ch.includes("ach");
          }
          if (mf === "rtgs") {
            return pm === "rtgs" || ch.includes("rtgs");
          }
          if (mf === "momo") {
            return pm === "momo" || ch.includes("mobile") || desc.includes("momo");
          }
          if (mf === "own-account") {
            return pm === "own-account" || desc.includes("between my accounts") || desc.includes("to savings");
          }
          if (mf === "card") {
            return pm === "card" || ch.includes("card") || ch.includes("pos");
          }
          if (mf === "bill") {
            return pm === "bill" || desc.includes("utility") || t.category === "Utilities";
          }
          if (mf === "airtime") {
            return pm === "airtime" || desc.includes("bundle") || desc.includes("airtime");
          }
          if (mf === "bulk") {
            return pm === "bulk" || t.kind === "bulk" || ch.includes("bulk");
          }
          if (mf === "trade") {
            return pm === "trade" || t.kind === "trade" || ch.includes("trade");
          }
          return false;
        });
        if (!matchesMethod) return false;
      }

      // 4. Channel Filter (multi-select)
      if (channelFilters.length > 0) {
        const ch = t.channel.toLowerCase();
        const matchesChannel = channelFilters.some((cf) => {
          if (cf === "cards") return ch.includes("card");
          if (cf === "mobile") return ch.includes("mobile");
          if (cf === "transfer") return ch.includes("internet") || ch.includes("rtgs") || ch.includes("ach");
          if (cf === "bulk") return ch.includes("bulk");
          if (cf === "trade") return ch.includes("trade");
          return false;
        });
        if (!matchesChannel) return false;
      }

      // 5. Direction Filter (single-select)
      if (directionFilter !== "all") {
        if (t.direction !== directionFilter) return false;
      }

      // 6. Status Filter (multi-select)
      if (statusFilters.length > 0) {
        const matchesStatus = statusFilters.some((sf) => {
          if (sf === "completed") return t.state === "completed";
          if (sf === "pending") return t.state === "pending" || t.state === "awaiting-approval";
          if (sf === "failed") return t.state.startsWith("failed") || t.state === "reversed" || t.state === "disputed";
          return false;
        });
        if (!matchesStatus) return false;
      }

      // 7. Date Filter (single-select)
      if (datePreset !== "all") {
        const tDate = t.date.slice(0, 10);
        if (datePreset === "today") {
          const todayStr = new Date().toISOString().slice(0, 10);
          if (tDate !== "2026-08-11" && tDate !== todayStr) return false;
        } else if (datePreset === "7d") {
          if (tDate < "2026-08-04") return false;
        } else if (datePreset === "30d") {
          if (tDate < "2026-07-12") return false;
        } else if (datePreset === "this-month") {
          if (!tDate.startsWith("2026-08")) return false;
        } else if (datePreset === "last-month") {
          if (!tDate.startsWith("2026-07")) return false;
        } else if (datePreset === "custom") {
          if (dateFrom && tDate < dateFrom) return false;
          if (dateTo && tDate > dateTo) return false;
        }
      }

      return true;
    });
  }, [
    query,
    categoryFilters,
    methodFilters,
    channelFilters,
    directionFilter,
    statusFilters,
    datePreset,
    dateFrom,
    dateTo,
  ]);

  const DATE_OPTIONS: { value: DatePreset; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
    { value: "this-month", label: "This Month" },
    { value: "last-month", label: "Last Month" },
    { value: "custom", label: "Custom Range" },
  ];

  const filterGroups: FilterGroup[] = [
    {
      id: "direction",
      kind: "single",
      label: "Direction",
      options: [
        { value: "debit", label: "Debit" },
        { value: "credit", label: "Credit" },
      ],
      value: directionFilter,
      onChange: (v) => setDirectionFilter(v as DirectionFilter),
    },
    {
      id: "date",
      kind: "single",
      label: "Date",
      options: DATE_OPTIONS,
      value: datePreset,
      onChange: (v) => {
        setDatePreset(v as DatePreset);
        if (v !== "custom") {
          setDateFrom("");
          setDateTo("");
        }
      },
      chipLabel: (v) =>
        v === "custom" && dateFrom
          ? `${dateFrom} – ${dateTo || "…"}`
          : (DATE_OPTIONS.find((o) => o.value === v)?.label ?? v),
      extra:
        datePreset === "custom" ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="mon-from" className="text-[13px]">
                From
              </Label>
              <Input
                id="mon-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="tabular"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="mon-to" className="text-[13px]">
                To
              </Label>
              <Input
                id="mon-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="tabular"
              />
            </div>
          </div>
        ) : null,
    },
    {
      id: "status",
      kind: "multi",
      label: "Status",
      options: STATUS_OPTIONS.map((st) => ({ value: st.id, label: st.name })),
      value: statusFilters,
      onChange: (v) => setStatusFilters(v as StatusFilter[]),
    },
    {
      id: "channel",
      kind: "multi",
      label: "Channel",
      options: CHANNEL_OPTIONS.map((c) => ({ value: c.id, label: c.name })),
      value: channelFilters,
      onChange: (v) => setChannelFilters(v as ChannelFilter[]),
    },
    {
      id: "method",
      kind: "multi",
      label: "Payment Method",
      options: TRANSACTION_PAYMENT_METHODS.filter((m) => m.id !== "all").map((m) => ({
        value: m.id,
        label: m.name,
      })),
      value: methodFilters,
      onChange: setMethodFilters,
    },
    {
      id: "category",
      kind: "multi",
      label: "Category",
      options: TRANSACTION_CATEGORIES.filter((c) => c.id !== "all").map((c) => ({
        value: c.id,
        label: c.name,
      })),
      value: categoryFilters,
      onChange: setCategoryFilters,
    },
  ];

  const hasActiveFilters = query.trim() !== "" || countActiveFilters(filterGroups) > 0;

  const clearFilterGroups = () => {
    setCategoryFilters([]);
    setMethodFilters([]);
    setChannelFilters([]);
    setDirectionFilter("all");
    setStatusFilters([]);
    setDatePreset("all");
    setDateFrom("");
    setDateTo("");
  };

  const resetAllFilters = () => {
    setQuery("");
    setCategoryFilters([]);
    setMethodFilters([]);
    setChannelFilters([]);
    setDirectionFilter("all");
    setStatusFilters([]);
    setDatePreset("all");
    setDateFrom("");
    setDateTo("");
    setState("populated");
  };


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
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <FilterPanel groups={filterGroups} onClear={clearFilterGroups} align="start" />
            <AppliedFilters groups={filterGroups} />
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-[13px] text-muted-foreground whitespace-nowrap tabular sm:inline">
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
      </section>

      {filtered.length === 0 ? (
        hasActiveFilters ? (
          <FilteredEmptyState
            onReset={resetAllFilters}
            description="No transactions match your search filters. Reset filters to view all operational records."
          />
        ) : (
          <TrueEmptyState
            title="No transactions recorded"
            description="No operational records in the monitoring queue."
          />
        )
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <ul className="divide-y divide-border">
            {filtered.map((t) => {
              const methodLabel = getPaymentMethodLabel(t.paymentMethod);
              return (
                <li key={t.id}>
                  <Link
                    href={`/admin/transactions/${t.id}`}
                    className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/50 active:scale-[0.99] transition-transform"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[13.5px] text-foreground">{t.description}</span>
                      <span className="mt-0.5 truncate text-[12px] text-muted-foreground tabular">
                        {t.reference} · {formatDate(t.date)} · {t.channel}
                        {t.category && ` · ${t.category}`}
                        {methodLabel && ` · ${methodLabel}`}
                      </span>
                    </span>
                    <span className="shrink-0 text-[13.5px] text-foreground tabular">
                      {formatMoney(t.amount, t.currency)}
                    </span>
                    <TransactionStatusBadge state={t.state} />
                    <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
