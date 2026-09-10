"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
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
  const activeItem = categories.find((c) => c.label === activeCategory);

  // SVG Donut Ring Calculations
  const radius = 64;
  const circumference = 2 * Math.PI * radius; // ≈ 402.124

  let accumulatedPercent = 0;
  const slices = categories.map((cat) => {
    const percent = cat.percentage;
    const sliceLength = (percent / 100) * circumference;
    const gap = 3;
    const dashLength = Math.max(0, sliceLength - gap);
    const dashGap = circumference - dashLength;
    const strokeDashoffset = -(accumulatedPercent / 100) * circumference;
    accumulatedPercent += percent;

    return {
      ...cat,
      strokeDasharray: `${dashLength} ${dashGap}`,
      strokeDashoffset,
    };
  });

  return (
    <div className="flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xs transition-colors">
      {/* Top Header with Account Switcher & View All */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[15px] font-medium text-foreground">Analytics</h2>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              className="flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/60 px-3 py-0.5 text-[11.5px] font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.96] transition-transform cursor-pointer"
            >
              <span>{selectedAccount}</span>
              <ChevronDown size={12} className="text-muted-foreground" />
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
          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-muted-foreground hover:text-foreground transition-colors active:scale-[0.96] transition-transform"
        >
          <span>View all</span>
          <ChevronRight size={13} strokeWidth={1.8} />
        </Link>
      </div>

      {/* Main Analytics Content: Interactive Ring Donut & Category Breakdown */}
      <div className="my-auto py-2">
        <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4 sm:gap-6">
          {/* Left: Donut Ring with Center Summary */}
          <div className="sm:col-span-5 flex items-center justify-center">
            <div className="relative size-[165px] shrink-0">
              <svg
                viewBox="0 0 170 170"
                className="size-full -rotate-90 overflow-visible"
              >
                {/* Background Ring Track */}
                <circle
                  cx="85"
                  cy="85"
                  r={radius}
                  fill="none"
                  className="stroke-muted/40"
                  strokeWidth="15"
                />
                {/* Donut Slices */}
                {slices.map((slice) => {
                  const isHovered = activeCategory === slice.label;
                  const isDimmed = activeCategory !== null && !isHovered;
                  return (
                    <circle
                      key={slice.label}
                      cx="85"
                      cy="85"
                      r={radius}
                      fill="none"
                      stroke={slice.color}
                      strokeWidth={isHovered ? 19 : 15}
                      strokeDasharray={slice.strokeDasharray}
                      strokeDashoffset={slice.strokeDashoffset}
                      strokeLinecap="round"
                      className={`cursor-pointer transition-[stroke-width,opacity] duration-200 ${
                        isDimmed ? "opacity-35" : "opacity-100"
                      }`}
                      onMouseEnter={() => setActiveCategory(slice.label)}
                      onMouseLeave={() => setActiveCategory(null)}
                      onClick={() =>
                        setActiveCategory(activeCategory === slice.label ? null : slice.label)
                      }
                    />
                  );
                })}
              </svg>

              {/* Center Summary Label */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-2">
                <span className="text-[11px] font-medium text-muted-foreground truncate max-w-[100px]">
                  {activeItem ? activeItem.label : "Total Spend"}
                </span>
                <span className="text-[17px] sm:text-[18px] font-semibold tracking-tight text-foreground tabular leading-tight mt-0.5">
                  {showAmounts
                    ? `GH₵${new Intl.NumberFormat("en-GH").format(
                        activeItem ? activeItem.amount : totalSpend
                      )}`
                    : "GH₵••••"}
                </span>
                <span className="mt-0.5 text-[10.5px] text-muted-foreground tabular">
                  {activeItem ? `${activeItem.percentage}% of total` : activeDataset.trend}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Category Breakdown List */}
          <div className="flex flex-col gap-0.5 sm:col-span-7">
            {categories.map((cat) => {
              const isHovered = activeCategory === cat.label;
              const isDimmed = activeCategory !== null && !isHovered;
              return (
                <div
                  key={cat.label}
                  onMouseEnter={() => setActiveCategory(cat.label)}
                  onMouseLeave={() => setActiveCategory(null)}
                  onClick={() =>
                    setActiveCategory(activeCategory === cat.label ? null : cat.label)
                  }
                  className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer ${
                    isHovered
                      ? "bg-muted/80"
                      : isDimmed
                      ? "opacity-45 hover:bg-muted/40 hover:opacity-100"
                      : "hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="size-2.5 shrink-0 rounded-full transition-transform"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="truncate text-[12.5px] font-medium text-foreground">
                      {cat.label}
                    </span>
                    <span className="text-[11.5px] text-muted-foreground tabular">
                      {cat.percentage}%
                    </span>
                  </div>
                  <div className="flex items-center shrink-0 pl-2">
                    <span className="text-[12.5px] font-medium text-foreground tabular">
                      {showAmounts
                        ? `GH₵${new Intl.NumberFormat("en-GH").format(cat.amount)}`
                        : "GH₵••••"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Time Switcher Tabs */}
      <div className="flex items-center gap-1.5 border-t border-border/50 pt-3.5">
        {ranges.map((r) => {
          const isActive = selectedRange === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => setSelectedRange(r)}
              className={`flex-1 rounded-full py-1 text-[11.5px] font-medium transition-colors cursor-pointer text-center active:scale-[0.96] transition-transform ${
                isActive
                  ? "bg-foreground text-background shadow-2xs"
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
