"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Landmark,
} from "lucide-react";
import { formatDate, TRANSACTIONS, type Account, type Transaction } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type SpendViewMode = "types" | "categories";
export type SpendPeriod = "7d" | "30d" | "3m" | "12m";

const PERIOD_LABELS: Record<SpendPeriod, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "3m": "Last 3 months",
  "12m": "Last 12 months",
};

interface SpendItem {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

// 1:1 Figma Node 1386:59645 Category Breakdown Colors & Values
const MOCK_CATEGORIES_DATA: Record<SpendPeriod, SpendItem[]> = {
  "7d": [
    { id: "cat-1", name: "Groceries", amount: 4800, percentage: 32, color: "#0088FF" },
    { id: "cat-2", name: "Shopping", amount: 2250, percentage: 15, color: "#FF4D4F" },
    { id: "cat-3", name: "Cash & MoMo", amount: 2100, percentage: 14, color: "#10B981" },
    { id: "cat-4", name: "Transport", amount: 1800, percentage: 12, color: "#FAAD14" },
    { id: "cat-5", name: "Utilities", amount: 1500, percentage: 10, color: "#EB2F96" },
    { id: "cat-6", name: "Other", amount: 2700, percentage: 18, color: "#8C8C8C" },
  ],
  "30d": [
    { id: "cat-1", name: "Groceries", amount: 14400, percentage: 30, color: "#0088FF" },
    { id: "cat-2", name: "Shopping", amount: 8100, percentage: 17, color: "#FF4D4F" },
    { id: "cat-3", name: "Cash & MoMo", amount: 7200, percentage: 15, color: "#10B981" },
    { id: "cat-4", name: "Transport", amount: 5800, percentage: 12, color: "#FAAD14" },
    { id: "cat-5", name: "Utilities", amount: 4800, percentage: 10, color: "#EB2F96" },
    { id: "cat-6", name: "Other", amount: 7700, percentage: 16, color: "#8C8C8C" },
  ],
  "3m": [
    { id: "cat-1", name: "Groceries", amount: 42000, percentage: 31, color: "#0088FF" },
    { id: "cat-2", name: "Shopping", amount: 21500, percentage: 16, color: "#FF4D4F" },
    { id: "cat-3", name: "Cash & MoMo", amount: 18900, percentage: 14, color: "#10B981" },
    { id: "cat-4", name: "Transport", amount: 16200, percentage: 12, color: "#FAAD14" },
    { id: "cat-5", name: "Utilities", amount: 13500, percentage: 10, color: "#EB2F96" },
    { id: "cat-6", name: "Other", amount: 22900, percentage: 17, color: "#8C8C8C" },
  ],
  "12m": [
    { id: "cat-1", name: "Groceries", amount: 168000, percentage: 32, color: "#0088FF" },
    { id: "cat-2", name: "Shopping", amount: 84000, percentage: 16, color: "#FF4D4F" },
    { id: "cat-3", name: "Cash & MoMo", amount: 73500, percentage: 14, color: "#10B981" },
    { id: "cat-4", name: "Transport", amount: 63000, percentage: 12, color: "#FAAD14" },
    { id: "cat-5", name: "Utilities", amount: 52500, percentage: 10, color: "#EB2F96" },
    { id: "cat-6", name: "Other", amount: 84000, percentage: 16, color: "#8C8C8C" },
  ],
};

const MOCK_TYPES_DATA: Record<SpendPeriod, SpendItem[]> = {
  "7d": [
    { id: "type-1", name: "Mobile Money", amount: 6750, percentage: 45, color: "#0088FF" },
    { id: "type-2", name: "Other Local Bank", amount: 3750, percentage: 25, color: "#FF4D4F" },
    { id: "type-3", name: "Other GCB Transfer", amount: 2250, percentage: 15, color: "#10B981" },
    { id: "type-4", name: "Card Payments", amount: 1500, percentage: 10, color: "#FAAD14" },
    { id: "type-5", name: "All Others", amount: 750, percentage: 5, color: "#8C8C8C" },
  ],
  "30d": [
    { id: "type-1", name: "Mobile Money", amount: 21600, percentage: 45, color: "#0088FF" },
    { id: "type-2", name: "Other Local Bank", amount: 12000, percentage: 25, color: "#FF4D4F" },
    { id: "type-3", name: "Other GCB Transfer", amount: 7200, percentage: 15, color: "#10B981" },
    { id: "type-4", name: "Card Payments", amount: 4800, percentage: 10, color: "#FAAD14" },
    { id: "type-5", name: "All Others", amount: 2400, percentage: 5, color: "#8C8C8C" },
  ],
  "3m": [
    { id: "type-1", name: "Mobile Money", amount: 60750, percentage: 45, color: "#0088FF" },
    { id: "type-2", name: "Other Local Bank", amount: 33750, percentage: 25, color: "#FF4D4F" },
    { id: "type-3", name: "Other GCB Transfer", amount: 20250, percentage: 15, color: "#10B981" },
    { id: "type-4", name: "Card Payments", amount: 13500, percentage: 10, color: "#FAAD14" },
    { id: "type-5", name: "All Others", amount: 6750, percentage: 5, color: "#8C8C8C" },
  ],
  "12m": [
    { id: "type-1", name: "Mobile Money", amount: 236250, percentage: 45, color: "#0088FF" },
    { id: "type-2", name: "Other Local Bank", amount: 131250, percentage: 25, color: "#FF4D4F" },
    { id: "type-3", name: "Other GCB Transfer", amount: 78750, percentage: 15, color: "#10B981" },
    { id: "type-4", name: "Card Payments", amount: 52500, percentage: 10, color: "#FAAD14" },
    { id: "type-5", name: "All Others", amount: 26250, percentage: 5, color: "#8C8C8C" },
  ],
};

export interface MySpendsWidgetProps {
  accounts: Account[];
  selectedAccountId?: string | null;
  onSelectAccount?: (id: string | null) => void;
  onBackToAccounts?: () => void;
}

export function MySpendsWidget({
  accounts,
  selectedAccountId,
  onSelectAccount,
  onBackToAccounts,
}: MySpendsWidgetProps) {
  const [viewMode, setViewMode] = useState<SpendViewMode>("categories");
  const [period, setPeriod] = useState<SpendPeriod>("7d");
  const [selectedItemName, setSelectedItemName] = useState<string | null>(null);

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId) ?? accounts[0];
  }, [accounts, selectedAccountId]);

  // Compute items & total spend
  const items = useMemo(() => {
    return viewMode === "categories" ? MOCK_CATEGORIES_DATA[period] : MOCK_TYPES_DATA[period];
  }, [viewMode, period]);

  const totalSpend = useMemo(() => {
    if (period === "7d") return 5000;
    return items.reduce((acc, item) => acc + item.amount, 0);
  }, [items, period]);

  const activeSpendItem = useMemo(() => {
    return items.find((i) => i.name === selectedItemName) || null;
  }, [items, selectedItemName]);

  // Mock activity transactions matching Figma 1386:59927
  const displayTransactions = useMemo<Transaction[]>(() => {
    const raw = TRANSACTIONS.slice(0, 4);
    if (raw.length === 0) {
      return [
        {
          id: "txn-sp-01",
          reference: "NIB-2026-901126",
          date: "2026-08-08",
          valueDate: "2026-08-08",
          description: "Transfer to Savings",
          counterparty: "Personal Savings",
          counterpartyAccount: "4001 9922 1100",
          accountId: "acc-ret-001",
          currency: "GHS",
          amount: 2000.0,
          direction: "credit",
          kind: "single",
          state: "completed",
          channel: "Internet Banking",
          paymentMethod: "own-account",
          profileKind: "RETAIL",
        },
        {
          id: "txn-sp-02",
          reference: "NIB-2026-901127",
          date: "2026-08-08",
          valueDate: "2026-08-08",
          description: "Transfer to Savings",
          counterparty: "Personal Savings",
          counterpartyAccount: "4001 9922 1100",
          accountId: "acc-ret-001",
          currency: "GHS",
          amount: 2000.0,
          direction: "credit",
          kind: "single",
          state: "completed",
          channel: "Internet Banking",
          paymentMethod: "own-account",
          profileKind: "RETAIL",
        },
        {
          id: "txn-sp-03",
          reference: "NIB-2026-901128",
          date: "2026-08-08",
          valueDate: "2026-08-08",
          description: "Transfer to Savings",
          counterparty: "Personal Savings",
          counterpartyAccount: "4001 9922 1100",
          accountId: "acc-ret-001",
          currency: "GHS",
          amount: 2000.0,
          direction: "credit",
          kind: "single",
          state: "completed",
          channel: "Internet Banking",
          paymentMethod: "own-account",
          profileKind: "RETAIL",
        },
        {
          id: "txn-sp-04",
          reference: "NIB-2026-901129",
          date: "2026-08-08",
          valueDate: "2026-08-08",
          description: "Transfer to Savings",
          counterparty: "Personal Savings",
          counterpartyAccount: "4001 9922 1100",
          accountId: "acc-ret-001",
          currency: "GHS",
          amount: 2000.0,
          direction: "credit",
          kind: "single",
          state: "completed",
          channel: "Internet Banking",
          paymentMethod: "own-account",
          profileKind: "RETAIL",
        },
      ];
    }
    return raw;
  }, []);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* ── 1. Breadcrumb (1:1 Figma Node 1386:59752: Accounts > My Spends) ── */}
      <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
        {onBackToAccounts ? (
          <button
            type="button"
            onClick={onBackToAccounts}
            className="hover:text-foreground transition-colors cursor-pointer"
          >
            Accounts
          </button>
        ) : (
          <Link href="/accounts" className="hover:text-foreground transition-colors">
            Accounts
          </Link>
        )}
        <ChevronRight size={14} className="text-muted-foreground/60" />
        <span className="text-foreground font-medium">My Spends</span>
      </div>

      {/* ── 2. Title (1:1 Figma Node 1386:59780) ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-medium text-foreground tracking-tight">
          My Spends
        </h1>
      </div>

      {/* ── 3. Filters Toolbar (1:1 Figma Node 1386:59783) ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Toggle Pill: Transaction vs Category */}
        <div className="inline-flex rounded-xl bg-muted/70 p-1 border border-border/60">
          <button
            type="button"
            onClick={() => {
              setViewMode("types");
              setSelectedItemName(null);
            }}
            className={cn(
              "px-3.5 py-1.5 text-[13px] font-medium rounded-lg transition-all cursor-pointer",
              viewMode === "types"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Transaction
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("categories");
              setSelectedItemName(null);
            }}
            className={cn(
              "px-3.5 py-1.5 text-[13px] font-medium rounded-lg transition-all cursor-pointer",
              viewMode === "categories"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Category
          </button>
        </div>

        {/* Account Selector Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl h-9 px-3.5 text-[13px] font-medium border-border/80 bg-card shadow-xs hover:bg-muted/50 cursor-pointer"
              >
                <Landmark size={14} className="text-muted-foreground mr-2" />
                <span className="truncate max-w-[200px]">
                  {selectedAccount ? selectedAccount.name : "Personal Current Account"}
                </span>
                <ChevronDown size={14} className="text-muted-foreground ml-2 opacity-70" />
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem
              onClick={() => onSelectAccount?.(null)}
              className={!selectedAccountId ? "bg-muted font-medium" : ""}
            >
              All Accounts
            </DropdownMenuItem>
            {accounts.map((acc) => (
              <DropdownMenuItem
                key={acc.id}
                onClick={() => onSelectAccount?.(acc.id)}
                className={selectedAccountId === acc.id ? "bg-muted font-medium" : ""}
              >
                {acc.name} ({acc.type})
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Date Range Selector Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl h-9 px-3.5 text-[13px] font-medium border-border/80 bg-card shadow-xs hover:bg-muted/50 cursor-pointer"
              >
                <Calendar size={14} className="text-muted-foreground mr-2" />
                <span>{PERIOD_LABELS[period]}</span>
                <ChevronDown size={14} className="text-muted-foreground ml-2 opacity-70" />
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="w-44">
            {(Object.keys(PERIOD_LABELS) as SpendPeriod[]).map((p) => (
              <DropdownMenuItem
                key={p}
                onClick={() => setPeriod(p)}
                className={period === p ? "bg-muted font-medium" : ""}
              >
                {PERIOD_LABELS[p]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── 4. Donut Chart & Category Breakdown (1:1 Figma Node 1386:59792) ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center py-6">
        {/* Left: Donut Chart with Center Total Spends */}
        <div className="md:col-span-6 flex items-center justify-center">
          <div className="relative flex items-center justify-center size-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={items}
                  dataKey="amount"
                  nameKey="name"
                  innerRadius={90}
                  outerRadius={135}
                  paddingAngle={2}
                  stroke="var(--background)"
                  strokeWidth={3}
                  isAnimationActive={true}
                  onClick={(data) => {
                    if (data?.name) {
                      setSelectedItemName(selectedItemName === data.name ? null : data.name);
                    }
                  }}
                  className="cursor-pointer"
                >
                  {items.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.color}
                      opacity={selectedItemName && selectedItemName !== entry.name ? 0.35 : 1}
                      className="transition-opacity duration-200"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Centered Total Spends Text (1:1 Figma Node 1386:59819) */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[12.5px] text-muted-foreground font-normal">
                {selectedItemName || "Total Spends"}
              </span>
              <span className="mt-1 text-[26px] sm:text-[28px] font-bold text-foreground tracking-tight tabular-nums numorainput">
                GH₵{(activeSpendItem ? activeSpendItem.amount : totalSpend).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Category Breakdown (1:1 Figma Node 1386:59870) */}
        <div className="md:col-span-6 flex flex-col justify-center">
          <h3 className="text-[14px] font-medium text-muted-foreground mb-3">
            {viewMode === "categories" ? "Category Breakdown" : "Channel Breakdown"}
          </h3>

          <div className="flex flex-col divide-y divide-border/40">
            {items.map((item) => {
              const isSelected = selectedItemName === item.name;
              return (
                <div
                  key={item.name}
                  onClick={() => setSelectedItemName(isSelected ? null : item.name)}
                  className={cn(
                    "flex items-center justify-between py-2.5 px-3 rounded-xl transition-all cursor-pointer",
                    isSelected ? "bg-muted/70 ring-1 ring-border" : "hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-[14px] font-normal text-foreground">{item.name}</span>
                    <span className="text-[13px] text-muted-foreground tabular-nums numorainput">
                      {item.percentage}%
                    </span>
                  </div>
                  <span className="text-[14px] font-medium text-foreground tabular-nums numorainput">
                    GH₵{item.amount.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 5. Activity Section (1:1 Figma Node 1386:59927) ── */}
      <div className="flex flex-col gap-3 mt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-foreground tracking-tight">Activity</h2>
          <Link
            href="/transactions"
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            View all
          </Link>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card divide-y divide-border/60 overflow-hidden shadow-xs">
          {displayTransactions.map((t) => (
            <Link
              key={t.id}
              href={`/transactions/${t.id}`}
              className="flex items-center justify-between p-4 sm:px-5 hover:bg-muted/40 transition-colors group"
            >
              <div className="flex flex-col min-w-0">
                <span className="text-[14px] font-medium text-foreground truncate group-hover:text-primary transition-colors">
                  {t.description}
                </span>
                <span className="text-[12.5px] text-muted-foreground mt-0.5 tabular-nums numorainput">
                  {t.reference} · {formatDate(t.date)}
                </span>
              </div>

              <div className="flex items-center gap-3.5 shrink-0">
                <span className="text-[14px] font-medium text-foreground tabular-nums numorainput">
                  {t.direction === "credit" ? "+" : "-"}GH₵{t.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  Completed
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
