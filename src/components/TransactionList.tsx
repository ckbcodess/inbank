"use client";

/**
 * Transaction List — Figma 1:1 Data Table layout.
 *
 * Implements:
 * - Header: "Transactions" title + "Export Transactions" button with download icon.
 * - Search: Full-width search bar with placeholder "Search by reference ID,  recipient ...."
 * - Filters: All Accounts (Landmark icon), All Dates, All Methods, All Categories, All Statuses, with reset & active badges.
 * - Data Table: Date, Recipient, Account (e.g. Personal Current •••4561), Method, Amount (with status/direction color formatting and privacy toggle), Category, Status (Complete, Failed, Pending pill badges).
 * - Pagination: "Showing 1–10 of X cases" + Previous / page numbers / Next.
 */

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Landmark,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import {
  FilteredEmptyState,
  ListErrorState,
  ListSkeleton,
  PartialLoadFooter,
  TrueEmptyState,
} from "@/components/states/ListStates";
import { LIST_STATE_LABEL, type ListState, type TransactionState } from "@/lib/states";
import {
  accountsForProfile,
  findAccount,
  TRANSACTION_CATEGORIES,
  TRANSACTION_PAYMENT_METHODS,
  type Transaction,
} from "@/lib/mock-data";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { useSession } from "@/lib/session-store";
import { cn } from "@/lib/utils";

const LIST_STATES: readonly ListState[] = [
  "loading",
  "empty",
  "filtered-empty",
  "populated",
  "partial-load",
  "error",
] as const;

type StatusFilter = "completed" | "pending" | "failed";
type DatePreset = "all" | "today" | "7d" | "30d" | "this-month" | "last-month" | "custom";

const STATUS_OPTIONS: readonly { readonly id: StatusFilter; readonly name: string }[] = [
  { id: "completed", name: "Complete" },
  { id: "pending", name: "Pending" },
  { id: "failed", name: "Failed" },
] as const;

const STATUS_MAP: Record<string, string> = {
  completed: "Complete",
  pending: "Pending",
  failed: "Failed",
};

const CATEGORY_MAP: Record<string, string> = TRANSACTION_CATEGORIES.reduce<Record<string, string>>(
  (acc, cat) => {
    acc[cat.id] = cat.name;
    return acc;
  },
  {}
);

const METHOD_MAP: Record<string, string> = TRANSACTION_PAYMENT_METHODS.reduce<Record<string, string>>(
  (acc, m) => {
    acc[m.id] = m.name;
    return acc;
  },
  {}
);

function formatAccountDisplay(accountId: string): string {
  const acc = findAccount(accountId);
  if (!acc) return "Personal Current •••4561";
  const cleanName = acc.name.replace(/\s+Account$/i, "");
  const cleanNum = acc.number.replace(/\s+/g, "");
  const last4 = cleanNum.slice(-4);
  return `${cleanName} •••${last4}`;
}

function getPaymentMethodDisplay(t: Transaction): string {
  if (t.paymentMethod === "papss") return "PAPSS Payment";
  if (t.paymentMethod === "airtime") return "Airtime";
  if (t.paymentMethod === "data") return "Data";
  if (t.paymentMethod === "wallet-to-bank") return "Wallet to Bank";
  if (t.paymentMethod === "gip") return "GhIPSS Instant (GIP)";
  if (t.paymentMethod === "ach") return "ACH Direct Credit";
  if (t.paymentMethod === "rtgs") return "RTGS High Value";
  if (t.paymentMethod === "momo") return "Mobile Money (MoMo)";
  if (t.paymentMethod === "own-account") return "Between My Accounts";
  if (t.paymentMethod === "card") return "Card / POS Payment";
  if (t.paymentMethod === "bill") return "Bill Payment";
  if (t.paymentMethod === "bulk") return "Bulk Upload";
  if (t.paymentMethod === "trade") return "Trade Portal";
  return t.channel || "Bank Transfer";
}

function formatTableDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

function renderStatusPill(state: TransactionState) {
  if (state === "completed") {
    return (
      <span className="inline-flex items-center justify-center rounded-full px-3 py-0.5 text-[12px] font-medium bg-emerald-500/10 text-[#12B76A] dark:text-emerald-400 border border-emerald-500/20">
        Complete
      </span>
    );
  }
  if (state.startsWith("failed") || state === "reversed" || state === "disputed") {
    return (
      <span className="inline-flex items-center justify-center rounded-full px-3 py-0.5 text-[12px] font-medium bg-rose-500/10 text-[#F04438] dark:text-rose-400 border border-rose-500/20">
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center rounded-full px-3 py-0.5 text-[12px] font-medium bg-amber-500/10 text-[#F79009] dark:text-amber-400 border border-amber-500/20">
      Pending
    </span>
  );
}

function getAmountStyling(t: Transaction) {
  const isFailed = t.state.startsWith("failed") || t.state === "reversed" || t.state === "disputed";
  if (isFailed) {
    return {
      colorClass: "text-[#F04438] dark:text-rose-400 font-normal",
      prefix: t.direction === "debit" ? "− " : "+ ",
    };
  }
  if (t.direction === "credit" && t.state === "completed") {
    return {
      colorClass: "text-[#12B76A] dark:text-emerald-400 font-normal",
      prefix: "+ ",
    };
  }
  return {
    colorClass: "text-foreground font-normal",
    prefix: t.direction === "debit" ? "− " : "+ ",
  };
}

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

function exportTransactionsCSV(txns: Transaction[]) {
  const headers = [
    "Date",
    "Recipient",
    "Account",
    "Method",
    "Amount",
    "Currency",
    "Direction",
    "Category",
    "Status",
    "Reference",
  ];
  const rows = txns.map((t) => [
    t.date,
    `"${(t.counterparty || t.description).replace(/"/g, '""')}"`,
    `"${formatAccountDisplay(t.accountId)}"`,
    `"${getPaymentMethodDisplay(t)}"`,
    t.amount.toFixed(2),
    t.currency,
    t.direction,
    `"${t.category || ""}"`,
    t.state === "completed" ? "Complete" : t.state.startsWith("failed") ? "Failed" : "Pending",
    t.reference,
  ]);
  const csvContent =
    "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `transactions_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

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
  const router = useRouter();
  const activeProfile = useSession((s) => s.activeProfile);
  const { showAmounts } = useAmountVisibility();

  const [state, setState] = useState<ListState>("populated");
  const [query, setQuery] = useState("");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [methodFilters, setMethodFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<StatusFilter[]>([]);
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const availableAccounts = useMemo(() => {
    return accountsForProfile(activeProfile?.kind);
  }, [activeProfile?.kind]);

  const results = useMemo(() => {
    return transactions.filter((t) => {
      // 1. Text Search Query (reference, counterparty, description, method, category, account)
      if (query.trim()) {
        const q = query.toLowerCase();
        const accountStr = formatAccountDisplay(t.accountId).toLowerCase();
        const methodStr = getPaymentMethodDisplay(t).toLowerCase();
        const match =
          t.description.toLowerCase().includes(q) ||
          t.counterparty.toLowerCase().includes(q) ||
          t.reference.toLowerCase().includes(q) ||
          t.channel.toLowerCase().includes(q) ||
          accountStr.includes(q) ||
          methodStr.includes(q) ||
          (t.category && t.category.toLowerCase().includes(q)) ||
          (t.paymentMethod && t.paymentMethod.toLowerCase().includes(q));
        if (!match) return false;
      }

      // 2. Account Filter
      if (accountFilter !== "all") {
        if (t.accountId !== accountFilter) return false;
      }

      // 3. Category Filter (multi-select)
      if (categoryFilters.length > 0) {
        const cat = (t.category || "").toLowerCase();
        const desc = t.description.toLowerCase();
        const matchesCategory = categoryFilters.some((cf) => {
          if (cf === "fees") {
            return (
              cat.includes("fee") ||
              cat.includes("charge") ||
              desc.includes("fee") ||
              desc.includes("charge")
            );
          }
          if (cf === "transport") {
            return (
              cat.includes("transport") ||
              desc.includes("uber") ||
              desc.includes("bolt") ||
              desc.includes("fuel") ||
              desc.includes("transit")
            );
          }
          if (cf === "bills") {
            return cat.includes("bill") || desc.includes("bill") || desc.includes("utility");
          }
          if (cf === "airtime-data") {
            return (
              cat.includes("airtime") ||
              cat.includes("data") ||
              desc.includes("airtime") ||
              desc.includes("data") ||
              desc.includes("bundle")
            );
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

      // 4. Payment Method Filter (multi-select)
      if (methodFilters.length > 0) {
        const pm = (t.paymentMethod || "").toLowerCase();
        const ch = t.channel.toLowerCase();
        const desc = t.description.toLowerCase();

        const matchesMethod = methodFilters.some((mf) => {
          if (mf === "wallet-to-bank") {
            return (
              pm === "wallet-to-bank" ||
              desc.includes("wallet to bank") ||
              ch.includes("wallet to bank")
            );
          }
          if (mf === "papss") {
            return pm === "papss" || ch.includes("papss") || desc.includes("papss");
          }
          if (mf === "airtime") {
            return pm === "airtime" || ch.includes("airtime") || desc.includes("airtime");
          }
          if (mf === "data") {
            return pm === "data" || ch.includes("data") || desc.includes("data");
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
            return (
              pm === "bill" ||
              desc.includes("utility") ||
              t.category === "Utilities" ||
              t.category === "Bills"
            );
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

      // 5. Status Filter (multi-select)
      if (statusFilters.length > 0) {
        const matchesStatus = statusFilters.some((sf) => {
          if (sf === "completed") return t.state === "completed";
          if (sf === "pending") return t.state === "pending" || t.state === "awaiting-approval";
          if (sf === "failed") {
            return (
              t.state.startsWith("failed") ||
              t.state === "reversed" ||
              t.state === "disputed"
            );
          }
          return false;
        });
        if (!matchesStatus) return false;
      }

      // 6. Date Filter
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
    transactions,
    query,
    accountFilter,
    categoryFilters,
    methodFilters,
    statusFilters,
    datePreset,
    dateFrom,
    dateTo,
  ]);

  // Reset to page 1 whenever any filter or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [query, accountFilter, categoryFilters, methodFilters, statusFilters, datePreset, dateFrom, dateTo]);

  const activeFiltersCount =
    (query.trim() !== "" ? 1 : 0) +
    (accountFilter !== "all" ? 1 : 0) +
    categoryFilters.length +
    methodFilters.length +
    statusFilters.length +
    (datePreset !== "all" ? 1 : 0);

  const hasActiveFilters = activeFiltersCount > 0;

  const resetAllFilters = () => {
    setQuery("");
    setAccountFilter("all");
    setCategoryFilters([]);
    setMethodFilters([]);
    setStatusFilters([]);
    setDatePreset("all");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
    setState("populated");
  };

  const effectiveCategory = categoryFilters.length === 0 ? ["all"] : categoryFilters;
  const effectiveMethod = methodFilters.length === 0 ? ["all"] : methodFilters;
  const effectiveStatus = statusFilters.length === 0 ? ["all"] : statusFilters;

  const effective: ListState =
    state === "populated" && hasActiveFilters && results.length === 0 ? "filtered-empty" : state;

  const rows = effective === "partial-load" ? transactions : results;

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRows = rows.slice(startIndex, startIndex + pageSize);

  const renderPageButtons = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }

    return pages.map((page, idx) => {
      if (typeof page === "string") {
        return (
          <span key={`dots-${idx}`} className="px-1 text-muted-foreground select-none">
            •••
          </span>
        );
      }
      const isActive = page === currentPage;
      return (
        <button
          key={page}
          type="button"
          onClick={() => setCurrentPage(page)}
          className={cn(
            "min-w-8 h-8 px-2 rounded-md text-[13px] font-medium transition-colors cursor-pointer",
            isActive
              ? "bg-muted/80 text-foreground border border-border/80 shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
        >
          {page}
        </button>
      );
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {showStateSwitcher && (
        <StateSwitcher
          section="13.1"
          states={LIST_STATES}
          value={state}
          onChange={setState}
          labels={LIST_STATE_LABEL}
        />
      )}

      {/* Page Title & Export Action Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[26px] font-semibold tracking-tight text-foreground">Transactions</h1>
        <Button
          variant="outline"
          onClick={() => exportTransactionsCSV(results)}
          className="h-9 gap-2 px-3.5 text-[13px] font-medium border-border/80 bg-background/50 hover:bg-muted/50 rounded-lg shadow-xs"
        >
          <ArrowDownToLine size={14} className="text-muted-foreground" />
          Export Transactions
        </Button>
      </div>

      {/* Full-width Search Input */}
      <div className="relative w-full">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by reference ID,  recipient ...."
          className="w-full h-12 pl-11 pr-10 rounded-xl border border-border/70 bg-card/40 text-[14px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* 1. Account Filter */}
          {(() => {
            const isAccountActive = accountFilter !== "all";
            return (
              <Select
                value={accountFilter}
                onValueChange={(val) => setAccountFilter((val as string) ?? "all")}
              >
                <SelectTrigger
                  size="sm"
                  isActive={isAccountActive}
                  onClear={isAccountActive ? () => setAccountFilter("all") : undefined}
                  clearLabel="Clear account filter"
                  className="h-9 w-auto min-w-[145px] text-[13px] rounded-lg border-border/80 bg-background/60"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {isAccountActive ? (
                      <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" />
                    ) : (
                      <Landmark size={13} className="shrink-0 text-muted-foreground" />
                    )}
                    <SelectValue placeholder="All Accounts">
                      {(val: string) =>
                        !val || val === "all" ? "All Accounts" : formatAccountDisplay(val)
                      }
                    </SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent align="start" className="min-w-[260px] max-h-72">
                  <SelectItem value="all">All Accounts</SelectItem>
                  <SelectSeparator />
                  {availableAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {formatAccountDisplay(acc.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          })()}

          {/* 2. Date Preset Filter */}
          {(() => {
            const isDateActive = datePreset !== "all";
            return (
              <Select
                value={datePreset}
                onValueChange={(val) => setDatePreset((val as DatePreset) ?? "all")}
              >
                <SelectTrigger
                  size="sm"
                  isActive={isDateActive}
                  onClear={
                    isDateActive
                      ? () => {
                          setDatePreset("all");
                          setDateFrom("");
                          setDateTo("");
                        }
                      : undefined
                  }
                  clearLabel="Clear date filter"
                  className="h-9 w-auto min-w-[115px] text-[13px] rounded-lg border-border/80 bg-background/60"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {isDateActive && (
                      <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" />
                    )}
                    <SelectValue placeholder="All Dates">
                      {(val: string) => {
                        if (val === "today") return "Today";
                        if (val === "7d") return "Last 7 Days";
                        if (val === "30d") return "Last 30 Days";
                        if (val === "this-month") return "This Month";
                        if (val === "last-month") return "Last Month";
                        if (val === "custom")
                          return dateFrom ? `${dateFrom} – ${dateTo || "..."}` : "Custom Range";
                        return "All Dates";
                      }}
                    </SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent align="start" className="min-w-[190px] max-h-72">
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="custom">Custom Range...</SelectItem>
                </SelectContent>
              </Select>
            );
          })()}

          {/* 3. Payment Method Filter (multi-select) */}
          {(() => {
            const isMethodActive = methodFilters.length > 0;
            return (
              <Select
                multiple
                value={effectiveMethod}
                onValueChange={(val) =>
                  setMethodFilters(handleMultiFilterChange(val as string[], effectiveMethod))
                }
              >
                <SelectTrigger
                  size="sm"
                  isActive={isMethodActive}
                  onClear={isMethodActive ? () => setMethodFilters([]) : undefined}
                  clearLabel="Clear payment method filter"
                  className="h-9 w-auto min-w-[125px] text-[13px] rounded-lg border-border/80 bg-background/60"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <SelectValue placeholder="All Methods">
                      {(val: string[]) =>
                        formatMultiFilterValue(val, "All Methods", METHOD_MAP, "Methods")
                      }
                    </SelectValue>
                    {isMethodActive && (
                      <span className="flex size-4 items-center justify-center rounded-full bg-foreground text-background text-[10px] font-semibold tabular shrink-0 leading-none">
                        {methodFilters.length}
                      </span>
                    )}
                  </div>
                </SelectTrigger>
                <SelectContent align="start" className="min-w-[260px] max-h-72">
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectSeparator />
                  {TRANSACTION_PAYMENT_METHODS.filter((m) => m.id !== "all").map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          })()}

          {/* 4. Category Filter (multi-select) */}
          {(() => {
            const isCategoryActive = categoryFilters.length > 0;
            return (
              <Select
                multiple
                value={effectiveCategory}
                onValueChange={(val) =>
                  setCategoryFilters(handleMultiFilterChange(val as string[], effectiveCategory))
                }
              >
                <SelectTrigger
                  size="sm"
                  isActive={isCategoryActive}
                  onClear={isCategoryActive ? () => setCategoryFilters([]) : undefined}
                  clearLabel="Clear category filter"
                  className="h-9 w-auto min-w-[130px] text-[13px] rounded-lg border-border/80 bg-background/60"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <SelectValue placeholder="All Categories">
                      {(val: string[]) =>
                        formatMultiFilterValue(val, "All Categories", CATEGORY_MAP, "Categories")
                      }
                    </SelectValue>
                    {isCategoryActive && (
                      <span className="flex size-4 items-center justify-center rounded-full bg-foreground text-background text-[10px] font-semibold tabular shrink-0 leading-none">
                        {categoryFilters.length}
                      </span>
                    )}
                  </div>
                </SelectTrigger>
                <SelectContent align="start" className="min-w-[250px] max-h-72">
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectSeparator />
                  {TRANSACTION_CATEGORIES.filter((c) => c.id !== "all").map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          })()}

          {/* 5. Status Filter (multi-select) */}
          {(() => {
            const isStatusActive = statusFilters.length > 0;
            return (
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
                  size="sm"
                  isActive={isStatusActive}
                  onClear={isStatusActive ? () => setStatusFilters([]) : undefined}
                  clearLabel="Clear status filter"
                  className="h-9 w-auto min-w-[120px] text-[13px] rounded-lg border-border/80 bg-background/60"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <SelectValue placeholder="All Statuses">
                      {(val: string[]) =>
                        formatMultiFilterValue(val, "All Statuses", STATUS_MAP, "Statuses")
                      }
                    </SelectValue>
                    {isStatusActive && (
                      <span className="flex size-4 items-center justify-center rounded-full bg-foreground text-background text-[10px] font-semibold tabular shrink-0 leading-none">
                        {statusFilters.length}
                      </span>
                    )}
                  </div>
                </SelectTrigger>
                <SelectContent align="start" className="min-w-[190px] max-h-72">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectSeparator />
                  {STATUS_OPTIONS.map((st) => (
                    <SelectItem key={st.id} value={st.id}>
                      {st.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          })()}
        </div>

        {/* Active Filter Counter & Reset */}
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
      </div>

      {/* Custom Date Range Controls */}
      {datePreset === "custom" && (
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/20 animate-in fade-in slide-in-from-top-1 duration-150">
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

      {/* List States Handling */}
      {effective === "loading" && <ListSkeleton rows={8} columns={7} />}

      {effective === "error" && <ListErrorState onRetry={() => setState("populated")} />}

      {effective === "empty" && (
        <div className="rounded-xl border border-border/70 bg-card/40 p-8">
          <TrueEmptyState
            icon={<ArrowLeftRight size={20} strokeWidth={1.7} />}
            title={emptyTitle}
            description={emptyDescription}
          />
        </div>
      )}

      {effective === "filtered-empty" && (
        <div className="rounded-xl border border-border/70 bg-card/40 p-8">
          <FilteredEmptyState
            onReset={resetAllFilters}
            description="No transactions match your search filters. Reset filters to view all transactions."
          />
        </div>
      )}

      {/* 1:1 Figma Data Table */}
      {(effective === "populated" || effective === "partial-load") && (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto rounded-xl border border-border/70 bg-card/40 backdrop-blur-sm">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border/70 text-[13px] font-medium text-muted-foreground bg-muted/15">
                  <th className="py-3.5 pl-5 pr-4 text-left font-normal w-[95px]">Date</th>
                  <th className="py-3.5 px-4 text-left font-normal min-w-[160px]">Recipient</th>
                  <th className="py-3.5 px-4 text-left font-normal min-w-[210px]">Account</th>
                  <th className="py-3.5 px-4 text-left font-normal min-w-[140px]">Method</th>
                  <th className="py-3.5 px-4 text-right font-normal min-w-[150px]">Amount</th>
                  <th className="py-3.5 pl-10 pr-4 text-left font-normal min-w-[130px]">Category</th>
                  <th className="py-3.5 px-4 pr-5 text-center font-normal w-[120px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {paginatedRows.map((t) => {
                  const { colorClass, prefix } = getAmountStyling(t);
                  return (
                    <tr
                      key={t.id}
                      onClick={() => router.push(`${detailBase}/${t.id}`)}
                      className="hover:bg-muted/25 transition-colors cursor-pointer text-[13.5px] group"
                    >
                      <td className="py-4 pl-5 pr-4 text-left text-muted-foreground text-[13px] whitespace-nowrap">
                        {formatTableDate(t.date)}
                      </td>
                      <td className="py-4 px-4 text-left font-normal text-foreground whitespace-nowrap">
                        {t.counterparty || t.description}
                      </td>
                      <td className="py-4 px-4 text-left text-muted-foreground text-[13px] whitespace-nowrap">
                        {formatAccountDisplay(t.accountId)}
                      </td>
                      <td className="py-4 px-4 text-left text-muted-foreground text-[13px] whitespace-nowrap">
                        {getPaymentMethodDisplay(t)}
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <span className={cn("tabular text-[13.5px]", colorClass)}>
                          {prefix}
                          {t.currency}{" "}
                          {showAmounts
                            ? t.amount.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : "••••••"}
                        </span>
                      </td>
                      <td className="py-4 pl-10 pr-4 text-left text-muted-foreground text-[13px] whitespace-nowrap">
                        {t.category || "—"}
                      </td>
                      <td className="py-4 px-4 pr-5 text-center whitespace-nowrap">
                        {renderStatusPill(t.state)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {effective === "partial-load" && <PartialLoadFooter />}

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 text-[13px] text-muted-foreground">
            <div>
              Showing {rows.length === 0 ? 0 : startIndex + 1}–
              {Math.min(startIndex + pageSize, rows.length)} of {rows.length} cases
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-8 gap-1 px-2.5 text-[12.5px] text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                  Previous
                </Button>

                {renderPageButtons()}

                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 gap-1 px-2.5 text-[12.5px] text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={14} />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
