import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";

export function DashboardAnalyticsWidget() {
  const [selectedRange, setSelectedRange] = useState<"1w" | "1m" | "3m" | "6m" | "1y">("1y");
  const ranges = ["1w", "1m", "3m", "6m", "1y"] as const;
  const { showAmounts } = useAmountVisibility();

  const [selectedAccount, setSelectedAccount] = useState("Current •••82139");
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const accountOptions = [
    "Current •••82139",
    "Savings •••10482",
    "FX Foreign •••93012",
  ];

  const periodData: Record<"1w" | "1m" | "3m" | "6m" | "1y", {
    trend: string;
    categories: Array<{ label: string; percentage: number; color: string; amount: number }>;
  }> = {
    "1w": {
      trend: "↓ 1.4% vs last week",
      categories: [
        { label: "Groceries", percentage: 38, color: "#2a78d6", amount: 1140 },
        { label: "Shopping", percentage: 22, color: "#eb6834", amount: 660 },
        { label: "Cash & MoMo", percentage: 15, color: "#1baf7a", amount: 450 },
        { label: "Transport", percentage: 11, color: "#eda100", amount: 330 },
        { label: "Utilities", percentage: 8, color: "#e87ba4", amount: 240 },
        { label: "Other", percentage: 6, color: "#a4a4a4", amount: 180 },
      ],
    },
    "1m": {
      trend: "↓ 4.8% vs last month",
      categories: [
        { label: "Groceries", percentage: 34, color: "#2a78d6", amount: 3400 },
        { label: "Shopping", percentage: 18, color: "#eb6834", amount: 1800 },
        { label: "Cash & MoMo", percentage: 16, color: "#1baf7a", amount: 1600 },
        { label: "Transport", percentage: 12, color: "#eda100", amount: 1200 },
        { label: "Utilities", percentage: 10, color: "#e87ba4", amount: 1000 },
        { label: "Other", percentage: 10, color: "#a4a4a4", amount: 1000 },
      ],
    },
    "3m": {
      trend: "↑ 2.1% vs prev quarter",
      categories: [
        { label: "Groceries", percentage: 31, color: "#2a78d6", amount: 9300 },
        { label: "Shopping", percentage: 19, color: "#eb6834", amount: 5700 },
        { label: "Cash & MoMo", percentage: 15, color: "#1baf7a", amount: 4500 },
        { label: "Transport", percentage: 13, color: "#eda100", amount: 3900 },
        { label: "Utilities", percentage: 11, color: "#e87ba4", amount: 3300 },
        { label: "Other", percentage: 11, color: "#a4a4a4", amount: 3300 },
      ],
    },
    "6m": {
      trend: "↓ 1.9% vs prev 6m",
      categories: [
        { label: "Groceries", percentage: 33, color: "#2a78d6", amount: 18150 },
        { label: "Shopping", percentage: 16, color: "#eb6834", amount: 8800 },
        { label: "Cash & MoMo", percentage: 14, color: "#1baf7a", amount: 7700 },
        { label: "Transport", percentage: 12, color: "#eda100", amount: 6600 },
        { label: "Utilities", percentage: 10, color: "#e87ba4", amount: 5500 },
        { label: "Other", percentage: 15, color: "#a4a4a4", amount: 8250 },
      ],
    },
    "1y": {
      trend: "↓ 3.2% vs last year",
      categories: [
        { label: "Groceries", percentage: 32, color: "#2a78d6", amount: 4800 },
        { label: "Shopping", percentage: 15, color: "#eb6834", amount: 2250 },
        { label: "Cash & MoMo", percentage: 14, color: "#1baf7a", amount: 2100 },
        { label: "Transport", percentage: 12, color: "#eda100", amount: 1800 },
        { label: "Utilities", percentage: 10, color: "#e87ba4", amount: 1500 },
        { label: "Other", percentage: 18, color: "#a4a4a4", amount: 2700 },
      ],
    },
  };

  const activeDataset = periodData[selectedRange];
  const categories = activeDataset.categories;
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const totalSpend = categories.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xs transition-all">
      {/* Top Header with Account Switcher & View All */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-[16px] font-medium text-foreground">Analytics</h2>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              className="flex items-center gap-2 rounded-full border border-border/80 bg-muted/60 px-3.5 py-1 text-[12px] font-normal text-foreground transition-colors hover:bg-muted cursor-pointer"
            >
              <span>{selectedAccount}</span>
              <ChevronDown size={13} className="text-muted-foreground" />
            </button>

            {showAccountMenu && (
              <div className="absolute left-0 top-full z-30 mt-1.5 w-44 rounded-xl border border-border bg-card py-1 shadow-lg animate-in fade-in zoom-in-95 duration-100">
                {accountOptions.map((acc) => (
                  <button
                    key={acc}
                    type="button"
                    onClick={() => {
                      setSelectedAccount(acc);
                      setShowAccountMenu(false);
                    }}
                    className={`flex w-full items-center px-3.5 py-2 text-left text-[12px] transition-colors cursor-pointer ${
                      selectedAccount === acc
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    {acc}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <Link
          href="/reports"
          className="text-[14px] text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
        </Link>
      </div>

      {/* Main Analytics Content: Total Spend & Visual Distribution */}
      <div className="my-auto flex flex-col gap-5 py-2">
        {/* Total Spend Hero Metric */}
        <div className="flex items-baseline justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] font-medium text-muted-foreground">Total Spend</span>
            <div className="text-[26px] font-normal tracking-tight text-foreground sm:text-[28px]">
              {showAmounts ? `GH₵ ${new Intl.NumberFormat("en-GH").format(totalSpend)}.00` : "GH₵ ••••••"}
            </div>
          </div>
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:bg-emerald-500/15 dark:text-[#49ff8d]">
            {activeDataset.trend}
          </span>
        </div>

        {/* Multi-segment Distribution Bar */}
        <div className="flex flex-col gap-2">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/60 p-0.5 shadow-inner">
            {categories.map((cat) => {
              const isHovered = activeCategory === cat.label;
              const isDimmed = activeCategory !== null && !isHovered;
              return (
                <div
                  key={cat.label}
                  style={{
                    width: `${cat.percentage}%`,
                    backgroundColor: cat.color,
                  }}
                  className={`h-full first:rounded-l-full last:rounded-r-full transition-all duration-300 ${
                    isDimmed ? "opacity-30" : "opacity-100"
                  } ${isHovered ? "scale-y-110 shadow-sm" : ""}`}
                  onMouseEnter={() => setActiveCategory(cat.label)}
                  onMouseLeave={() => setActiveCategory(null)}
                />
              );
            })}
          </div>
        </div>

        {/* Category Breakdown Grid formatted exactly as specified */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
          {categories.map((cat) => {
            const isHovered = activeCategory === cat.label;
            return (
              <div
                key={cat.label}
                onMouseEnter={() => setActiveCategory(cat.label)}
                onMouseLeave={() => setActiveCategory(null)}
                className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-all cursor-pointer ${
                  isHovered ? "bg-muted/60 scale-[1.01]" : "hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="size-2.5 shrink-0 rounded-full transition-transform"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="truncate text-[14px] font-medium text-foreground">
                    {cat.label}
                  </span>
                  <span className="text-[14px] font-normal text-muted-foreground">
                    {cat.percentage}%
                  </span>
                </div>
                <div className="flex items-center shrink-0 pl-3">
                  <span className="text-[14px] font-normal text-foreground tabular">
                    {showAmounts ? `GH₵${new Intl.NumberFormat("en-GH").format(cat.amount)}` : "GH₵••••"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Time Switcher Tabs */}
      <div className="flex items-center gap-1.5 border-t border-border/60 pt-4">
        {ranges.map((r) => {
          const isActive = selectedRange === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => setSelectedRange(r)}
              className={`flex-1 rounded-full py-1 text-[12px] transition-all cursor-pointer text-center ${
                isActive
                  ? "bg-foreground text-background font-medium shadow-xs"
                  : "border border-border/80 bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              {r}
            </button>
          );
        })}
      </div>
    </div>
  );
}
