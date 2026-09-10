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
import PageHeader from "@/components/layout/PageHeader";

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
  subItems?: { name: string; amount: number; percentage: number }[];
}

// Updated Top 5 App Categories + Cascading 'Other' with sub-breakdown
const MOCK_CATEGORIES_DATA: Record<SpendPeriod, SpendItem[]> = {
  "7d": [
    { id: "cat-1", name: "Family & Friends", amount: 4800, percentage: 32, color: "#0088FF" },
    { id: "cat-2", name: "Shopping", amount: 2250, percentage: 15, color: "#FF4D4F" },
    { id: "cat-3", name: "Bills", amount: 2100, percentage: 14, color: "#10B981" },
    { id: "cat-4", name: "Transport", amount: 1800, percentage: 12, color: "#FAAD14" },
    { id: "cat-5", name: "Food & Household", amount: 1500, percentage: 10, color: "#EB2F96" },
    {
      id: "cat-6",
      name: "Other",
      amount: 2700,
      percentage: 17,
      color: "#8C8C8C",
      subItems: [
        { name: "Education", amount: 900, percentage: 6 },
        { name: "Entertainment", amount: 750, percentage: 5 },
        { name: "Health", amount: 600, percentage: 4 },
        { name: "Donations", amount: 450, percentage: 2 },
      ],
    },
  ],
  "30d": [
    { id: "cat-1", name: "Family & Friends", amount: 14400, percentage: 30, color: "#0088FF" },
    { id: "cat-2", name: "Shopping", amount: 8100, percentage: 17, color: "#FF4D4F" },
    { id: "cat-3", name: "Bills", amount: 7200, percentage: 15, color: "#10B981" },
    { id: "cat-4", name: "Transport", amount: 5800, percentage: 12, color: "#FAAD14" },
    { id: "cat-5", name: "Food & Household", amount: 4800, percentage: 10, color: "#EB2F96" },
    {
      id: "cat-6",
      name: "Other",
      amount: 7700,
      percentage: 16,
      color: "#8C8C8C",
      subItems: [
        { name: "Education", amount: 2600, percentage: 5 },
        { name: "Entertainment", amount: 2100, percentage: 4 },
        { name: "Health", amount: 1800, percentage: 4 },
        { name: "Donations", amount: 1200, percentage: 3 },
      ],
    },
  ],
  "3m": [
    { id: "cat-1", name: "Family & Friends", amount: 42000, percentage: 31, color: "#0088FF" },
    { id: "cat-2", name: "Shopping", amount: 21500, percentage: 16, color: "#FF4D4F" },
    { id: "cat-3", name: "Bills", amount: 18900, percentage: 14, color: "#10B981" },
    { id: "cat-4", name: "Transport", amount: 16200, percentage: 12, color: "#FAAD14" },
    { id: "cat-5", name: "Food & Household", amount: 13500, percentage: 10, color: "#EB2F96" },
    {
      id: "cat-6",
      name: "Other",
      amount: 22900,
      percentage: 17,
      color: "#8C8C8C",
      subItems: [
        { name: "Education", amount: 8000, percentage: 6 },
        { name: "Entertainment", amount: 6500, percentage: 5 },
        { name: "Health", amount: 5000, percentage: 4 },
        { name: "Donations", amount: 3400, percentage: 2 },
      ],
    },
  ],
  "12m": [
    { id: "cat-1", name: "Family & Friends", amount: 168000, percentage: 32, color: "#0088FF" },
    { id: "cat-2", name: "Shopping", amount: 84000, percentage: 16, color: "#FF4D4F" },
    { id: "cat-3", name: "Bills", amount: 73500, percentage: 14, color: "#10B981" },
    { id: "cat-4", name: "Transport", amount: 63000, percentage: 12, color: "#FAAD14" },
    { id: "cat-5", name: "Food & Household", amount: 52500, percentage: 10, color: "#EB2F96" },
    {
      id: "cat-6",
      name: "Other",
      amount: 84000,
      percentage: 16,
      color: "#8C8C8C",
      subItems: [
        { name: "Education", amount: 28000, percentage: 5 },
        { name: "Entertainment", amount: 24000, percentage: 5 },
        { name: "Health", amount: 20000, percentage: 4 },
        { name: "Donations", amount: 12000, percentage: 2 },
      ],
    },
  ],
};

const MOCK_TYPES_DATA: Record<SpendPeriod, SpendItem[]> = {
  "7d": [
    { id: "type-1", name: "Mobile Money", amount: 6750, percentage: 45, color: "#0088FF" },
    { id: "type-2", name: "Other Local Bank", amount: 3750, percentage: 25, color: "#FF4D4F" },
    { id: "type-3", name: "Other GCB Transfer", amount: 2250, percentage: 15, color: "#10B981" },
    { id: "type-4", name: "Card Payments", amount: 1500, percentage: 10, color: "#FAAD14" },
    {
      id: "type-5",
      name: "All Others",
      amount: 750,
      percentage: 5,
      color: "#8C8C8C",
      subItems: [
        { name: "Own Account Transfer", amount: 300, percentage: 2 },
        { name: "Cardless Withdrawal", amount: 250, percentage: 2 },
        { name: "PAPSS / Cross-border", amount: 200, percentage: 1 },
      ],
    },
  ],
  "30d": [
    { id: "type-1", name: "Mobile Money", amount: 21600, percentage: 45, color: "#0088FF" },
    { id: "type-2", name: "Other Local Bank", amount: 12000, percentage: 25, color: "#FF4D4F" },
    { id: "type-3", name: "Other GCB Transfer", amount: 7200, percentage: 15, color: "#10B981" },
    { id: "type-4", name: "Card Payments", amount: 4800, percentage: 10, color: "#FAAD14" },
    {
      id: "type-5",
      name: "All Others",
      amount: 2400,
      percentage: 5,
      color: "#8C8C8C",
      subItems: [
        { name: "Own Account Transfer", amount: 960, percentage: 2 },
        { name: "Cardless Withdrawal", amount: 800, percentage: 2 },
        { name: "PAPSS / Cross-border", amount: 640, percentage: 1 },
      ],
    },
  ],
  "3m": [
    { id: "type-1", name: "Mobile Money", amount: 60750, percentage: 45, color: "#0088FF" },
    { id: "type-2", name: "Other Local Bank", amount: 33750, percentage: 25, color: "#FF4D4F" },
    { id: "type-3", name: "Other GCB Transfer", amount: 20250, percentage: 15, color: "#10B981" },
    { id: "type-4", name: "Card Payments", amount: 13500, percentage: 10, color: "#FAAD14" },
    {
      id: "type-5",
      name: "All Others",
      amount: 6750,
      percentage: 5,
      color: "#8C8C8C",
      subItems: [
        { name: "Own Account Transfer", amount: 2700, percentage: 2 },
        { name: "Cardless Withdrawal", amount: 2250, percentage: 2 },
        { name: "PAPSS / Cross-border", amount: 1800, percentage: 1 },
      ],
    },
  ],
  "12m": [
    { id: "type-1", name: "Mobile Money", amount: 236250, percentage: 45, color: "#0088FF" },
    { id: "type-2", name: "Other Local Bank", amount: 131250, percentage: 25, color: "#FF4D4F" },
    { id: "type-3", name: "Other GCB Transfer", amount: 78750, percentage: 15, color: "#10B981" },
    { id: "type-4", name: "Card Payments", amount: 52500, percentage: 10, color: "#FAAD14" },
    {
      id: "type-5",
      name: "All Others",
      amount: 26250,
      percentage: 5,
      color: "#8C8C8C",
      subItems: [
        { name: "Own Account Transfer", amount: 10500, percentage: 2 },
        { name: "Cardless Withdrawal", amount: 8750, percentage: 2 },
        { name: "PAPSS / Cross-border", amount: 7000, percentage: 1 },
      ],
    },
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
  const [expandedOther, setExpandedOther] = useState(false);

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

  // Compute dynamic chart data — if 'Other' / 'All Others' is expanded/morphed, replace it with its sub-items
  const chartData = useMemo(() => {
    if (!expandedOther) return items;
    const targetName = viewMode === "categories" ? "Other" : "All Others";
    const catchAllItem = items.find((i: SpendItem) => i.name === targetName);
    if (!catchAllItem || !catchAllItem.subItems) return items;

    const subColors = ["#8C8C8C", "#A6A6A6", "#BFBFBF", "#D9D9D9"];
    const subChartItems: SpendItem[] = catchAllItem.subItems.map((sub, idx) => ({
      id: `sub-${idx}`,
      name: sub.name,
      amount: sub.amount,
      percentage: sub.percentage,
      color: subColors[idx % subColors.length],
    }));

    return [
      ...items.filter((i: SpendItem) => i.name !== targetName),
      ...subChartItems,
    ];
  }, [items, expandedOther, viewMode]);

  const activeSpendItem = useMemo(() => {
    return chartData.find((i: SpendItem) => i.name === selectedItemName) || null;
  }, [chartData, selectedItemName]);

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
      {/* ── PageHeader with Back Button (matching detail views standard) ── */}
      <PageHeader
        title="My Spends"
        backTo={{
          href: "/accounts",
          label: "Accounts",
          onClick: onBackToAccounts,
        }}
      />

      {/* ── 3. Filters Toolbar (1:1 Figma Node 1386:59783) ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Toggle Pill: Transaction vs Category */}
        <div className="inline-flex w-fit flex-wrap rounded-xl bg-muted p-1">
          <button
            type="button"
            onClick={() => {
              setViewMode("types");
              setSelectedItemName(null);
              setExpandedOther(false);
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] transition-all cursor-pointer ${
              viewMode === "types"
                ? "bg-background text-foreground shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Transaction
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("categories");
              setSelectedItemName(null);
              setExpandedOther(false);
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] transition-all cursor-pointer ${
              viewMode === "categories"
                ? "bg-background text-foreground shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
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
          <DropdownMenuContent align="start" className="w-fit min-w-max">
            <DropdownMenuItem
              onClick={() => onSelectAccount?.(null)}
              className={cn(
                "py-1.5 px-3 text-[13px] font-normal cursor-pointer rounded-lg whitespace-nowrap",
                !selectedAccountId ? "bg-muted font-medium" : ""
              )}
            >
              All Accounts
            </DropdownMenuItem>
            {accounts.map((acc) => (
              <DropdownMenuItem
                key={acc.id}
                onClick={() => onSelectAccount?.(acc.id)}
                className={cn(
                  "py-1.5 px-3 text-[13px] font-normal cursor-pointer rounded-lg whitespace-nowrap",
                  selectedAccountId === acc.id ? "bg-muted font-medium text-foreground" : "text-foreground"
                )}
              >
                {acc.name} ({acc.number})
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
          <div className="relative flex items-center justify-center size-[340px] sm:size-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="amount"
                  nameKey="name"
                  innerRadius={110}
                  outerRadius={160}
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={true}
                  onClick={(data) => {
                    if (data?.name) {
                      const catchAllName = viewMode === "categories" ? "Other" : "All Others";
                      if (data.name === catchAllName) {
                        setExpandedOther(!expandedOther);
                      } else {
                        setSelectedItemName(selectedItemName === data.name ? null : data.name);
                      }
                    }
                  }}
                  className="cursor-pointer"
                >
                  {chartData.map((entry) => (
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
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center p-4">
              <span className="text-[13px] text-muted-foreground font-normal">
                {selectedItemName || (expandedOther ? `${viewMode === "categories" ? "Other" : "All Others"} Sub-breakdown` : "Total Spends")}
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
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-medium text-muted-foreground">
              {viewMode === "categories"
                ? expandedOther
                  ? "Other Categories Sub-breakdown"
                  : "Category Breakdown"
                : expandedOther
                ? "All Others Channel Sub-breakdown"
                : "Channel Breakdown"}
            </h3>
            {expandedOther && (
              <button
                type="button"
                onClick={() => setExpandedOther(false)}
                className="text-[12.5px] font-medium text-primary hover:underline cursor-pointer"
              >
                ← Back to Primary List
              </button>
            )}
          </div>

          <div className="flex flex-col divide-y divide-border/40">
            {chartData.map((item) => {
              const isSelected = selectedItemName === item.name;
              const isCatchAll =
                !expandedOther &&
                ((viewMode === "categories" && item.name === "Other") ||
                  (viewMode === "types" && item.name === "All Others"));

              return (
                <div key={item.name} className="flex flex-col">
                  <div
                    onClick={() => {
                      if (isCatchAll) {
                        setExpandedOther(true);
                      } else {
                        setSelectedItemName(isSelected ? null : item.name);
                      }
                    }}
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
                      {isCatchAll && (
                        <span className="text-[11.5px] font-medium text-muted-foreground/80 bg-muted px-2 py-0.5 rounded-full ml-1">
                          Click to expand
                        </span>
                      )}
                    </div>
                    <span className="text-[14px] font-medium text-foreground tabular-nums numorainput">
                      GH₵{item.amount.toLocaleString()}
                    </span>
                  </div>
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
