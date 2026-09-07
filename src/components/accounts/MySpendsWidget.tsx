"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Cell, Pie, PieChart } from "recharts";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  ChevronDown,
  CreditCard,
  History,
  Layers,
  Phone,
  Receipt,
  Send,
  ShoppingBag,
  Truck,
  Utensils,
  Wallet,
  Zap,
} from "lucide-react";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { useAmountVisibility, RevealingAmount } from "@/components/providers/AmountVisibilityProvider";
import { formatDate, transactionsForAccount, type Account } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  icon: React.ElementType;
}

const TYPE_COLORS = [
  "#2563EB", // Blue - MoMo
  "#F59E0B", // Amber - GCB Transfer
  "#10B981", // Emerald - Other Local Bank
  "#8B5CF6", // Purple - Card
  "#64748B", // Slate - Others
];

const CATEGORY_COLORS = [
  "#EF4444", // Red - Food / Dining
  "#F59E0B", // Amber - Groceries
  "#3B82F6", // Blue - Prepaid Top up / Utilities
  "#10B981", // Emerald - Transport
  "#8B5CF6", // Purple - Shopping
  "#EC4899", // Pink - Cash & MoMo
  "#64748B", // Slate - Others
];

// Transaction distributions per period
const MOCK_TYPE_DATA: Record<SpendPeriod, Array<{ name: string; amount: number; color: string; icon: React.ElementType }>> = {
  "7d": [
    { name: "Mobile Money", amount: 5000, color: TYPE_COLORS[0], icon: Phone },
    { name: "Other GCB Transfer", amount: 50, color: TYPE_COLORS[1], icon: Send },
    { name: "Other Local Bank", amount: 1000, color: TYPE_COLORS[2], icon: ArrowUpRight },
    { name: "Card Payments", amount: 450, color: TYPE_COLORS[3], icon: CreditCard },
    { name: "All Others", amount: 0, color: TYPE_COLORS[4], icon: Layers },
  ],
  "30d": [
    { name: "Mobile Money", amount: 14200, color: TYPE_COLORS[0], icon: Phone },
    { name: "Other GCB Transfer", amount: 1250, color: TYPE_COLORS[1], icon: Send },
    { name: "Other Local Bank", amount: 3500, color: TYPE_COLORS[2], icon: ArrowUpRight },
    { name: "Card Payments", amount: 2100, color: TYPE_COLORS[3], icon: CreditCard },
    { name: "All Others", amount: 320, color: TYPE_COLORS[4], icon: Layers },
  ],
  "3m": [
    { name: "Mobile Money", amount: 38500, color: TYPE_COLORS[0], icon: Phone },
    { name: "Other GCB Transfer", amount: 4800, color: TYPE_COLORS[1], icon: Send },
    { name: "Other Local Bank", amount: 11200, color: TYPE_COLORS[2], icon: ArrowUpRight },
    { name: "Card Payments", amount: 6400, color: TYPE_COLORS[3], icon: CreditCard },
    { name: "All Others", amount: 1250, color: TYPE_COLORS[4], icon: Layers },
  ],
  "12m": [
    { name: "Mobile Money", amount: 154000, color: TYPE_COLORS[0], icon: Phone },
    { name: "Other GCB Transfer", amount: 21000, color: TYPE_COLORS[1], icon: Send },
    { name: "Other Local Bank", amount: 48500, color: TYPE_COLORS[2], icon: ArrowUpRight },
    { name: "Card Payments", amount: 28200, color: TYPE_COLORS[3], icon: CreditCard },
    { name: "All Others", amount: 5100, color: TYPE_COLORS[4], icon: Layers },
  ],
};

const MOCK_CAT_DATA: Record<SpendPeriod, Array<{ name: string; amount: number; color: string; icon: React.ElementType }>> = {
  "7d": [
    { name: "Prepaid Top up", amount: 5000, color: CATEGORY_COLORS[2], icon: Zap },
    { name: "Food & Dining", amount: 850, color: CATEGORY_COLORS[0], icon: Utensils },
    { name: "Transport", amount: 320, color: CATEGORY_COLORS[3], icon: Truck },
    { name: "Groceries", amount: 240, color: CATEGORY_COLORS[1], icon: ShoppingBag },
    { name: "Others", amount: 90, color: CATEGORY_COLORS[6], icon: Receipt },
  ],
  "30d": [
    { name: "Prepaid Top up", amount: 11500, color: CATEGORY_COLORS[2], icon: Zap },
    { name: "Food & Dining", amount: 3200, color: CATEGORY_COLORS[0], icon: Utensils },
    { name: "Transport", amount: 1400, color: CATEGORY_COLORS[3], icon: Truck },
    { name: "Groceries", amount: 3800, color: CATEGORY_COLORS[1], icon: ShoppingBag },
    { name: "Shopping", amount: 1100, color: CATEGORY_COLORS[4], icon: ShoppingBag },
    { name: "Others", amount: 370, color: CATEGORY_COLORS[6], icon: Receipt },
  ],
  "3m": [
    { name: "Prepaid Top up", amount: 28000, color: CATEGORY_COLORS[2], icon: Zap },
    { name: "Food & Dining", amount: 9400, color: CATEGORY_COLORS[0], icon: Utensils },
    { name: "Transport", amount: 4800, color: CATEGORY_COLORS[3], icon: Truck },
    { name: "Groceries", amount: 12100, color: CATEGORY_COLORS[1], icon: ShoppingBag },
    { name: "Shopping", amount: 4900, color: CATEGORY_COLORS[4], icon: ShoppingBag },
    { name: "Others", amount: 2950, color: CATEGORY_COLORS[6], icon: Receipt },
  ],
  "12m": [
    { name: "Prepaid Top up", amount: 104000, color: CATEGORY_COLORS[2], icon: Zap },
    { name: "Food & Dining", amount: 42000, color: CATEGORY_COLORS[0], icon: Utensils },
    { name: "Transport", amount: 21500, color: CATEGORY_COLORS[3], icon: Truck },
    { name: "Groceries", amount: 51200, color: CATEGORY_COLORS[1], icon: ShoppingBag },
    { name: "Shopping", amount: 24100, color: CATEGORY_COLORS[4], icon: ShoppingBag },
    { name: "Others", amount: 14000, color: CATEGORY_COLORS[6], icon: Receipt },
  ],
};

export function MySpendsWidget({
  accounts,
  selectedAccountId,
  onSelectAccount,
}: {
  accounts: Account[];
  selectedAccountId?: string | null;
  onSelectAccount?: (id: string | null) => void;
}) {
  useAmountVisibility();
  const [viewMode, setViewMode] = useState<SpendViewMode>("types");
  const [period, setPeriod] = useState<SpendPeriod>("7d");
  const [selectedItemName, setSelectedItemName] = useState<string | null>(null);

  // Compute items & total spend
  const rawData = viewMode === "types" ? MOCK_TYPE_DATA[period] : MOCK_CAT_DATA[period];
  const totalSpend = useMemo(() => rawData.reduce((acc, item) => acc + item.amount, 0), [rawData]);

  const items: SpendItem[] = useMemo(() => {
    return rawData.map((item, idx) => ({
      id: `${viewMode}-${idx}`,
      name: item.name,
      amount: item.amount,
      percentage: totalSpend > 0 ? (item.amount / totalSpend) * 100 : 0,
      color: item.color,
      icon: item.icon,
    }));
  }, [rawData, totalSpend, viewMode]);

  const chartConfig = useMemo(() => {
    return Object.fromEntries(
      items.map((i) => [i.name, { label: i.name, color: i.color }]),
    ) as ChartConfig;
  }, [items]);

  // Selected or active item for drill down
  const activeSpendItem = items.find((i) => i.name === selectedItemName) || items[0];

  // Recent transactions associated with this account / mock transactions for drill-down
  const currentAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];
  const transactions = currentAccount ? transactionsForAccount(currentAccount.id) : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Toggle Mode: Transaction Types vs Categories (matching Figma 66:72746) */}
        <div className="inline-flex rounded-xl bg-muted/80 p-1 border border-border/60 self-start">
          <button
            type="button"
            onClick={() => {
              setViewMode("types");
              setSelectedItemName(null);
            }}
            className={`px-4 py-1.5 text-[13px] font-medium rounded-lg transition-all cursor-pointer ${
              viewMode === "types"
                ? "bg-white dark:bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Transaction Types
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("categories");
              setSelectedItemName(null);
            }}
            className={`px-4 py-1.5 text-[13px] font-medium rounded-lg transition-all cursor-pointer ${
              viewMode === "categories"
                ? "bg-white dark:bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Transaction Categories
          </button>
        </div>

        {/* Right filters: Account Scope & Period Picker */}
        <div className="flex items-center gap-2.5">
          {/* Account Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl h-8 px-3 text-[12.5px] font-medium border-border/80 bg-card shadow-xs hover:bg-muted/50"
                >
                  <Wallet size={13} className="text-muted-foreground mr-1.5" />
                  <span className="truncate max-w-[120px]">
                    {selectedAccountId
                      ? accounts.find((a) => a.id === selectedAccountId)?.name ?? "Account"
                      : "All Accounts"}
                  </span>
                  <ChevronDown size={13} className="text-muted-foreground ml-1" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-48">
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

          {/* Period Selector (matching Figma 66:72712) */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl h-8 px-3 text-[12.5px] font-medium border-border/80 bg-card shadow-xs hover:bg-muted/50"
                >
                  <Calendar size={13} className="text-muted-foreground mr-1.5" />
                  <span>{PERIOD_LABELS[period]}</span>
                  <ChevronDown size={13} className="text-muted-foreground ml-1" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-40">
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
      </div>

      {/* Main Dual Grid: Left Donut & Distribution, Right Breakdown & History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Card: Total Spends & Donut Visual */}
        <div className="lg:col-span-5 flex flex-col items-center justify-between rounded-2xl border border-border/80 bg-card p-6 shadow-xs min-h-[360px]">
          <div className="w-full flex items-center justify-between">
            <span className="text-[13px] font-medium text-muted-foreground">
              {viewMode === "types" ? "Channel Breakdown" : "Category Breakdown"}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {PERIOD_LABELS[period]}
            </span>
          </div>

          {/* Donut Chart with Centered Total Spends */}
          <div className="relative my-4 flex items-center justify-center w-full max-w-[240px]">
            <ChartContainer config={chartConfig} className="aspect-square w-full">
              <PieChart>
                <Pie
                  data={items}
                  dataKey="amount"
                  nameKey="name"
                  innerRadius="65%"
                  outerRadius="95%"
                  paddingAngle={3}
                  stroke="var(--card)"
                  strokeWidth={2}
                  isAnimationActive={true}
                  onClick={(data) => {
                    if (data?.name) setSelectedItemName(data.name);
                  }}
                  className="cursor-pointer"
                >
                  {items.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.color}
                      opacity={selectedItemName && selectedItemName !== entry.name ? 0.4 : 1}
                      className="transition-opacity duration-200"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

            {/* Centered Total Spends Label (matching Figma Total Spends: 5000.00) */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[12px] text-muted-foreground font-normal">
                {selectedItemName ? selectedItemName : "Total Spends"}
              </span>
              <div className="mt-0.5 text-[22px] sm:text-[24px] font-medium tracking-tight text-foreground tabular leading-none">
                <RevealingAmount
                  amount={selectedItemName ? activeSpendItem?.amount ?? totalSpend : totalSpend}
                  currency="GHS"
                />
              </div>
              <span className="mt-1 text-[11px] text-muted-foreground font-medium">
                {selectedItemName
                  ? `${activeSpendItem?.percentage.toFixed(1)}% of total`
                  : `${items.length} items`}
              </span>
            </div>
          </div>

          {/* Bottom Progress Bar Multi-Segment */}
          <div className="w-full flex flex-col gap-1.5 pt-2 border-t border-border/40">
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
              {items.map((item) => (
                <div
                  key={item.name}
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: item.color,
                  }}
                  className={`h-full transition-opacity duration-200 cursor-pointer ${
                    selectedItemName && selectedItemName !== item.name ? "opacity-30" : "opacity-100"
                  }`}
                  onClick={() => setSelectedItemName(item.name)}
                  title={`${item.name}: ${item.percentage.toFixed(1)}%`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>0%</span>
              <span className="font-medium text-foreground">100.00%</span>
            </div>
          </div>
        </div>

        {/* Right Card: Ranked Breakdown & Transaction History */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-6 shadow-xs min-h-[360px]">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-medium text-foreground">
                {viewMode === "types" ? "Transaction Types" : "Transaction Categories"}
              </h3>
              {selectedItemName && (
                <button
                  type="button"
                  onClick={() => setSelectedItemName(null)}
                  className="text-[12px] text-primary hover:underline font-medium cursor-pointer"
                >
                  Clear filter
                </button>
              )}
            </div>

            {/* List of items matching Figma Frame 13292 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {items.map((item) => {
                const isSelected = selectedItemName === item.name;
                const Icon = item.icon;
                return (
                  <div
                    key={item.name}
                    onClick={() => setSelectedItemName(isSelected ? null : item.name)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-xs"
                        : "border-border/60 hover:bg-muted/40 hover:border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white"
                        style={{ backgroundColor: item.color }}
                      >
                        <Icon size={16} strokeWidth={1.9} />
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[13px] font-medium text-foreground truncate">
                          {item.name}
                        </span>
                        <span className="text-[11.5px] text-muted-foreground tabular">
                          {item.percentage.toFixed(1)}% of spends
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[13.5px] font-medium text-foreground tabular">
                        <RevealingAmount amount={item.amount} currency="GHS" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Drill Down History Section (matching Figma Frame 13298) */}
          <div className="mt-6 pt-5 border-t border-border/60 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={15} className="text-muted-foreground" />
                <span className="text-[13.5px] font-medium text-foreground">
                  {selectedItemName
                    ? `${selectedItemName} History`
                    : "Recent Spending Activity"}
                </span>
              </div>
              <Link
                href="/transactions"
                className="text-[12.5px] text-muted-foreground hover:text-foreground transition-colors"
              >
                View all
              </Link>
            </div>

            {/* Drill-down transaction items */}
            <div className="rounded-xl border border-border/60 bg-muted/20 divide-y divide-border/40 overflow-hidden">
              {transactions.slice(0, 3).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between px-3.5 py-2.5 transition-colors hover:bg-muted/40 text-[13px]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <ArrowDownLeft size={13} />
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-normal text-foreground">
                        {t.description}
                      </span>
                      <span className="text-[11.5px] text-muted-foreground tabular">
                        {formatDate(t.date)} · {t.channel}
                      </span>
                    </div>
                  </div>
                  <span className="font-medium text-foreground tabular shrink-0">
                    −<RevealingAmount amount={t.amount} currency={t.currency} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
