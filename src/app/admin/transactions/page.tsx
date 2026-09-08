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
import { ChevronRight, Calendar, RotateCcw } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import StubNotice from "@/components/StubNotice";
import { ExpandableSearch } from "@/components/ui/expandable-search";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilteredEmptyState } from "@/components/states/ListStates";
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
import { cn } from "@/lib/utils";

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

const CHANNEL_MAP: Record<string, string> = {
  cards: "Cards & POS",
  mobile: "Mobile Banking",
  transfer: "Bank Transfers",
  bulk: "Bulk Payments",
  trade: "Trade Portal",
};

const STATUS_OPTIONS: readonly { readonly id: StatusFilter; readonly name: string }[] = [
  { id: "completed", name: "Completed" },
  { id: "pending", name: "Pending" },
  { id: "failed", name: "Failed / Exceptions" },
] as const;

const STATUS_MAP: Record<string, string> = {
  completed: "Completed",
  pending: "Pending",
  failed: "Failed / Exceptions",
};

const CATEGORY_MAP: Record<string, string> = TRANSACTION_CATEGORIES.reduce<Record<string, string>>((acc, cat) => {
  acc[cat.id] = cat.name;
  return acc;
}, {});

const METHOD_MAP: Record<string, string> = TRANSACTION_PAYMENT_METHODS.reduce<Record<string, string>>((acc, m) => {
  acc[m.id] = m.name;
  return acc;
}, {});

function handleMultiFilterChange(nextVal: string[], currentEffective: string[]): string[] {
  if (nextVal.includes("all") && !currentEffective.includes("all")) {
    return [];
  }
  return nextVal.filter((v) => v !== "all");
}

function formatMultiFilterValue(
  values: string[],
  allLabel: string,
  map: Record<string, string>,
  pluralNoun: string
): string {
  if (!values || values.length === 0 || (values.length === 1 && values[0] === "all")) {
    return allLabel;
  }
  const clean = values.filter((v) => v !== "all");
  if (clean.length === 0) return allLabel;
  if (clean.length === 1) return map[clean[0]] || clean[0];
  if (clean.length === 2) {
    const l1 = map[clean[0]] || clean[0];
    const l2 = map[clean[1]] || clean[1];
    if (l1.length + l2.length <= 18) {
      return `${l1}, ${l2}`;
    }
    return `2 ${pluralNoun}`;
  }
  return `${clean.length} ${pluralNoun}`;
}

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

  const activeFiltersCount =
    (query.trim() !== "" ? 1 : 0) +
    categoryFilters.length +
    methodFilters.length +
    channelFilters.length +
    (directionFilter !== "all" ? 1 : 0) +
    statusFilters.length +
    (datePreset !== "all" ? 1 : 0);

  const hasActiveFilters = activeFiltersCount > 0;

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

  const effectiveCategory = categoryFilters.length === 0 ? ["all"] : categoryFilters;
  const effectiveMethod = methodFilters.length === 0 ? ["all"] : methodFilters;
  const effectiveChannel = channelFilters.length === 0 ? ["all"] : channelFilters;
  const effectiveStatus = statusFilters.length === 0 ? ["all"] : statusFilters;

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
        <div className="flex flex-col gap-3 border-b border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ExpandableSearch
              value={query}
              onChange={setQuery}
              placeholder="Search reference, customer or counterparty..."
              tooltip="Search transactions"
              inputWidthClassName="w-64 sm:w-80"
            />

            <div className="flex items-center gap-3">
              {hasActiveFilters && (
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border border-border">
                    {activeFiltersCount} {activeFiltersCount === 1 ? "filter" : "filters"} applied
                  </span>
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="flex items-center gap-1 text-[12.5px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer py-1 px-1.5"
                  >
                    <RotateCcw size={12} strokeWidth={2} />
                    Reset all
                  </button>
                </div>
              )}
              <span className="text-[13px] font-medium text-muted-foreground whitespace-nowrap hidden sm:inline">
                {filtered.length} {filtered.length === 1 ? "record" : "records"}
              </span>
            </div>
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {/* 1. Date Preset Filter */}
            <Select value={datePreset} onValueChange={(val) => setDatePreset((val as DatePreset) ?? "all")}>
              <SelectTrigger className="w-[140px] sm:w-[155px] h-9 text-[13px]">
                <div className="flex items-center gap-1.5 truncate">
                  <Calendar size={13} strokeWidth={1.8} className="shrink-0 text-muted-foreground" />
                  <SelectValue placeholder="All Dates" />
                </div>
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="custom">Custom Range...</SelectItem>
              </SelectContent>
            </Select>

            {/* 2. Category Filter (multi-select) */}
            <Select
              multiple
              value={effectiveCategory}
              onValueChange={(val) =>
                setCategoryFilters(handleMultiFilterChange(val as string[], effectiveCategory))
              }
            >
              <SelectTrigger
                className={cn(
                  "w-[155px] sm:w-[170px] h-9 text-[13px]",
                  categoryFilters.length > 0 && "border-foreground/30 font-medium"
                )}
              >
                <SelectValue placeholder="All Categories">
                  {(val: string[]) =>
                    formatMultiFilterValue(val, "All Categories", CATEGORY_MAP, "Categories")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="all">All Categories</SelectItem>
                <SelectSeparator />
                {TRANSACTION_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 3. Payment Method Filter (multi-select) */}
            <Select
              multiple
              value={effectiveMethod}
              onValueChange={(val) =>
                setMethodFilters(handleMultiFilterChange(val as string[], effectiveMethod))
              }
            >
              <SelectTrigger
                className={cn(
                  "w-[160px] sm:w-[175px] h-9 text-[13px]",
                  methodFilters.length > 0 && "border-foreground/30 font-medium"
                )}
              >
                <SelectValue placeholder="All Methods">
                  {(val: string[]) =>
                    formatMultiFilterValue(val, "All Methods", METHOD_MAP, "Methods")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="all">All Methods</SelectItem>
                <SelectSeparator />
                {TRANSACTION_PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.id} value={method.id}>
                    {method.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 4. Channel Filter (multi-select) */}
            <Select
              multiple
              value={effectiveChannel}
              onValueChange={(val) =>
                setChannelFilters(
                  handleMultiFilterChange(val as string[], effectiveChannel) as ChannelFilter[]
                )
              }
            >
              <SelectTrigger
                className={cn(
                  "w-[145px] sm:w-[160px] h-9 text-[13px]",
                  channelFilters.length > 0 && "border-foreground/30 font-medium"
                )}
              >
                <SelectValue placeholder="All Channels">
                  {(val: string[]) =>
                    formatMultiFilterValue(val, "All Channels", CHANNEL_MAP, "Channels")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="all">All Channels</SelectItem>
                <SelectSeparator />
                {CHANNEL_OPTIONS.map((ch) => (
                  <SelectItem key={ch.id} value={ch.id}>
                    {ch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 5. Flow / Direction Filter (single-select) */}
            <Select value={directionFilter} onValueChange={(val) => setDirectionFilter((val as DirectionFilter) ?? "all")}>
              <SelectTrigger
                className={cn(
                  "w-[135px] sm:w-[150px] h-9 text-[13px]",
                  directionFilter !== "all" && "border-foreground/30 font-medium"
                )}
              >
                <SelectValue placeholder="All Flows" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="all">All Flows</SelectItem>
                <SelectItem value="debit">Debits (Money Out)</SelectItem>
                <SelectItem value="credit">Credits (Money In)</SelectItem>
              </SelectContent>
            </Select>

            {/* 6. Status Filter (multi-select) */}
            <Select
              multiple
              value={effectiveStatus}
              onValueChange={(val) =>
                setStatusFilters(
                  handleMultiFilterChange(val as string[], effectiveStatus) as StatusFilter[]
                )
              }
            >
              <SelectTrigger
                className={cn(
                  "w-[130px] sm:w-[145px] h-9 text-[13px]",
                  statusFilters.length > 0 && "border-foreground/30 font-medium"
                )}
              >
                <SelectValue placeholder="All Statuses">
                  {(val: string[]) =>
                    formatMultiFilterValue(val, "All Statuses", STATUS_MAP, "Statuses")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectSeparator />
                {STATUS_OPTIONS.map((st) => (
                  <SelectItem key={st.id} value={st.id}>
                    {st.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range Picker */}
          {datePreset === "custom" && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/60 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-muted-foreground">From:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 rounded-lg border border-border bg-background px-2.5 text-[12.5px] text-foreground outline-none focus:border-ring tabular"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-muted-foreground">To:</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 rounded-lg border border-border bg-background px-2.5 text-[12.5px] text-foreground outline-none focus:border-ring tabular"
                />
              </div>
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="text-[12px] text-muted-foreground hover:text-foreground cursor-pointer underline underline-offset-2 ml-1"
                >
                  Clear date range
                </button>
              )}
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          hasActiveFilters ? (
            <FilteredEmptyState
              onReset={resetAllFilters}
              description="No transactions match your search filters. Reset filters to view all operational records."
            />
          ) : (
            <div className="py-12 text-center text-[13px] text-muted-foreground">
              No transactions recorded in monitoring queue
            </div>
          )
        ) : (
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
        )}
      </section>
    </div>
  );
}
