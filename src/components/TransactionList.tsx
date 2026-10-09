"use client";

/**
 * Transaction List — Figma 1:1 Data Table layout.
 *
 * Implements:
 * - Header: "Transactions" title + "Export Transactions" button with download icon.
 * - Search: Full-width search bar with placeholder "Search by reference ID,  recipient ...."
 * - Filters: one Filters button beside the search (status, date, account, method, category), with the applied filters shown as chips.
 * - Data Table: Date, Recipient, Account (e.g. Current •••4561), Method, Amount (with status/direction color formatting and privacy toggle), Category, Status (Complete, Failed, Pending pill badges).
 * - Pagination: "Showing 1–10 of X cases" + Previous / page numbers / Next.
 */

import { getTransactionType } from "@/lib/transaction-type";
import { TransactionStatusText } from "@/components/StatusBadge";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AppliedFilters,
  FilterPanel,
  countActiveFilters,
  type FilterGroup,
} from "@/components/ui/filter-panel";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import {
  FilteredEmptyState,
  ListErrorState,
  ListSkeleton,
  PartialLoadFooter,
  TrueEmptyState,
} from "@/components/states/ListStates";
import { LIST_STATE_LABEL, type ListState } from "@/lib/states";
import {
  accountsForProfile,
  findAccount,
  TRANSACTION_CATEGORIES,
  TRANSACTION_PAYMENT_METHODS,
  type Transaction,
} from "@/lib/mock-data";
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

function formatAccountDisplay(accountId: string): string {
  const acc = findAccount(accountId);
  if (!acc) return "Current •••4561";
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

function getAmountStyling(t: Transaction) {
  const isFailed = t.state.startsWith("failed") || t.state === "reversed" || t.state === "disputed";
  if (isFailed) {
    return {
      colorClass: "text-destructive-text font-normal",
      prefix: t.direction === "debit" ? "− " : "+ ",
    };
  }
  if (t.direction === "credit" && t.state === "completed") {
    return {
      colorClass: "text-success-text font-normal",
      prefix: "+ ",
    };
  }
  return {
    colorClass: "text-foreground font-normal",
    prefix: t.direction === "debit" ? "− " : "+ ",
  };
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
  /** Start filtered to one account (e.g. "View All Transactions" from Account Details). */
  initialAccountId?: string;
}

export default function TransactionList({
  transactions,
  detailBase = "/transactions",
  showStateSwitcher = true,
  emptyTitle = "No transactions yet",
  emptyDescription = "Activity will appear here as soon as money moves on this account.",
  initialAccountId,
}: TransactionListProps) {
  const router = useRouter();
  const activeProfile = useSession((s) => s.activeProfile);

  const [state, setState] = useState<ListState>("populated");
  const [query, setQuery] = useState("");
  const [accountFilter, setAccountFilter] = useState<string>(initialAccountId ?? "all");
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
      id: "status",
      kind: "multi",
      label: "Status",
      options: STATUS_OPTIONS.map((st) => ({ value: st.id, label: st.name })),
      value: statusFilters,
      onChange: (v) => setStatusFilters(v as StatusFilter[]),
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
              <Label htmlFor="txn-from">
                From
              </Label>
              <Input
                id="txn-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="tabular"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="txn-to">
                To
              </Label>
              <Input
                id="txn-to"
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
      id: "account",
      kind: "single",
      label: "Account",
      options: availableAccounts.map((acc) => ({ value: acc.id, label: formatAccountDisplay(acc.id) })),
      value: accountFilter,
      onChange: setAccountFilter,
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
    setAccountFilter("all");
    setCategoryFilters([]);
    setMethodFilters([]);
    setStatusFilters([]);
    setDatePreset("all");
    setDateFrom("");
    setDateTo("");
  };

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

      {/* ── Page Header: Title & Export Action (no description underneath) ── */}
      <div className="flex items-center justify-between gap-3 w-full">
        <h1 className="text-[18px] sm:text-[20px] lg:text-[22px] font-medium leading-[24px] sm:leading-[28px] tracking-[-0.02em] text-foreground truncate">
          Transactions
        </h1>
        <Button
          variant="outline"
          onClick={() => exportTransactionsCSV(results)}
          className="h-9 gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 text-[13px] border-border/80 bg-card hover:bg-muted/50 rounded-lg shadow-xs shrink-0"
        >
          <ArrowDownToLine size={14} className="text-muted-foreground shrink-0" />
          <span className="hidden sm:inline">Export Transactions</span>
          <span className="sm:hidden">Export</span>
        </Button>
      </div>

      {/* Full-width search with the Filters button beside it */}
      <div className="flex w-full items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by reference ID,  recipient ...."
            className="w-full h-11 sm:h-12 pl-11 pr-10 rounded-xl border border-field-border bg-field text-[14px] sm:text-[14px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0 focus:border-field-border-focus focus:bg-field-focus transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <FilterPanel
          groups={filterGroups}
          onClear={clearFilterGroups}
          className="h-11 sm:h-12 px-4"
        />
      </div>

      <AppliedFilters groups={filterGroups} className="-mt-2" />

      {/* Custom Date Range Controls (Desktop) */}
      {datePreset === "custom" && (
        <div className="hidden sm:flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/20 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-muted-foreground">From:</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 tabular"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-muted-foreground">To:</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 tabular"
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
      {effective === "loading" && <ListSkeleton rows={8} />}

      {effective === "error" && <ListErrorState onRetry={() => setState("populated")} />}

      {effective === "empty" && (
        <TrueEmptyState illustration="empty-activity"
          icon={<ArrowLeftRight size={20} strokeWidth={1.7} />}
          title={emptyTitle}
          description={emptyDescription}
        />
      )}

      <AnimatePresence mode="wait">
        {effective === "filtered-empty" && (
          <motion.div
            key="filtered-empty"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            <FilteredEmptyState
              onReset={resetAllFilters}
              description="No transactions match your search filters. Reset filters to view all transactions."
            />
          </motion.div>
        )}

        {/* Data Table / List Views */}
        {(effective === "populated" || effective === "partial-load") && (
          <motion.div
            key="transactions-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-4"
          >
          {/* One list at every breakpoint — the same rows as the dashboard's Recent activity. */}
          <div className="flex flex-col gap-0.5 rounded-2xl border border-border bg-card p-2">
            {paginatedRows.map((t) => {
              const { colorClass, prefix } = getAmountStyling(t);
              const isCredit = t.direction === "credit";

              return (
                <div
                  key={t.id}
                  onClick={() => router.push(`${detailBase}/${t.id}`)}
                  className="flex items-center gap-4 rounded-xl px-3 py-4 transition-colors hover:bg-muted/50 cursor-pointer active:bg-muted/70 sm:px-4"
                >
                  {/* Direction Anchor Icon */}
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
                      isCredit
                        ? "bg-success/10 text-success-text"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCredit ? (
                      <ArrowDownLeft className="size-4 stroke-[1.8]" />
                    ) : (
                      <ArrowUpRight className="size-4 stroke-[1.8]" />
                    )}
                  </div>

                  {/* Counterparty & Metadata */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <span className="font-normal text-foreground text-[14px] leading-tight truncate">
                      {t.counterparty || t.description}
                    </span>
                    <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground truncate">
                      <span className="truncate">{getTransactionType(t)}</span>
                      <span>·</span>
                      <span>{formatTableDate(t.date)}</span>
                    </div>
                  </div>

                  {/* Amount & State / Account Number */}
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <span className={cn("tabular text-[14px]", colorClass)}>
                      {prefix}
                      {t.currency}{" "}
                      {t.amount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <TransactionStatusText state={t.state} />
                  </div>
                </div>
              );
            })}
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
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
