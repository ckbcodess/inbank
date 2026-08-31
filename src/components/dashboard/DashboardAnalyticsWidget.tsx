"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";

export function DashboardAnalyticsWidget() {
  const [selectedRange, setSelectedRange] = useState<"1w" | "1m" | "3m" | "6m" | "1y">("1y");
  const ranges = ["1w", "1m", "3m", "6m", "1y"] as const;
  const { showAmounts } = useAmountVisibility();

  const categories = [
    { label: "Groceries", percentage: 32, color: "#2a78d6", amount: 4800 },
    { label: "Shopping", percentage: 15, color: "#eb6834", amount: 2250 },
    { label: "Cash & MoMo", percentage: 14, color: "#1baf7a", amount: 2100 },
    { label: "Transport", percentage: 12, color: "#eda100", amount: 1800 },
    { label: "Utilities", percentage: 10, color: "#e87ba4", amount: 1500 },
    { label: "Other", percentage: 18, color: "#a4a4a4", amount: 2700 },
  ];

  // SVG Donut calculation (radius: 40, circumference: 251.32)
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xs transition-all">
      {/* Top Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-medium text-foreground">Analytics</h2>
          <button
            type="button"
            className="flex items-center gap-2 rounded-full border border-border/80 bg-muted/60 px-3 py-1 text-[12px] font-normal text-foreground transition-colors hover:bg-muted cursor-pointer"
          >
            <span>Current •••82139</span>
            <ChevronDown size={13} className="text-muted-foreground" />
          </button>
        </div>

        <Link
          href="/reports"
          className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
        </Link>
      </div>

      {/* Time Switcher Tabs */}
      <div className="mt-4 flex items-center gap-1.5">
        {ranges.map((r) => {
          const isActive = selectedRange === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => setSelectedRange(r)}
              className={`flex-1 rounded-full py-1 text-[12px] font-medium transition-all cursor-pointer ${
                isActive
                  ? "bg-foreground text-background shadow-xs font-semibold"
                  : "border border-border/80 bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              {r}
            </button>
          );
        })}
      </div>

      {/* Donut Chart & Category Breakdown Container */}
      <div className="mt-4 flex flex-col sm:flex-row items-center gap-4 rounded-xl bg-muted/40 p-4 dark:bg-muted/20">
        {/* Donut Chart with Center Text */}
        <div className="relative flex size-36 shrink-0 items-center justify-center">
          <svg className="size-full -rotate-90" viewBox="0 0 100 100">
            {categories.map((cat, i) => {
              const strokeDasharray = `${(cat.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
              accumulatedPercent += cat.percentage;
              return (
                <circle
                  key={i}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke={cat.color}
                  strokeWidth="12"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500 ease-out"
                />
              );
            })}
          </svg>

          {/* Center Info */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-muted-foreground leading-tight">Total spend</span>
            <span className="text-[13px] font-medium text-foreground leading-tight mt-0.5">
              {showAmounts ? "GH₵ 15,150" : "GH₵ ••••"}
            </span>
          </div>
        </div>

        {/* Legend List */}
        <div className="flex flex-1 flex-col gap-1.5 w-full">
          {categories.map((cat, idx) => (
            <div key={idx} className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <span
                  className="size-2 rounded-xs shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-foreground">{cat.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">{cat.percentage}%</span>
                <span className="text-foreground tabular w-16 text-right">
                  {showAmounts ? `GH₵ ${cat.amount}` : "GH₵ ••••"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
