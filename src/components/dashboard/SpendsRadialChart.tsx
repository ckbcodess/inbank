"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
  Label,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import type { SpendBreakdown } from "@/lib/dashboard-insights";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";

export const description = "A radial chart with stacked sections for spends on the dashboard";

export const SPEND_RANGES = ["1w", "1m", "3m", "6m", "1y"] as const;
export type SpendRange = (typeof SPEND_RANGES)[number];

interface PeriodData {
  rangeLabel: string;
  dateRange: string;
  trendText: string;
  trendDirection: "up" | "down";
  subtext: string;
  values: {
    groceries: number;
    shopping: number;
    cash_momo: number;
    transport: number;
    utilities: number;
    other: number;
  };
}

const PERIODS: Record<SpendRange, PeriodData> = {
  "1w": {
    rangeLabel: "1w",
    dateRange: "Aug 05 – Aug 12, 2026",
    trendText: "Trending down by 1.4% vs last week",
    trendDirection: "down",
    subtext: "Showing total spend for the last 7 days",
    values: {
      groceries: 1140,
      shopping: 660,
      cash_momo: 450,
      transport: 330,
      utilities: 240,
      other: 180,
    },
  },
  "1m": {
    rangeLabel: "1m",
    dateRange: "July 12 – Aug 12, 2026",
    trendText: "Trending down by 4.8% vs last month",
    trendDirection: "down",
    subtext: "Showing total spend for the last 30 days",
    values: {
      groceries: 3400,
      shopping: 1800,
      cash_momo: 1600,
      transport: 1200,
      utilities: 1000,
      other: 1000,
    },
  },
  "3m": {
    rangeLabel: "3m",
    dateRange: "May – Aug 2026",
    trendText: "Trending up by 2.1% vs prev quarter",
    trendDirection: "up",
    subtext: "Showing total spend for the last 3 months",
    values: {
      groceries: 9300,
      shopping: 5700,
      cash_momo: 4500,
      transport: 3900,
      utilities: 3300,
      other: 3300,
    },
  },
  "6m": {
    rangeLabel: "6m",
    dateRange: "Feb – Aug 2026",
    trendText: "Trending down by 1.9% vs prev 6 months",
    trendDirection: "down",
    subtext: "Showing total spend for the last 6 months",
    values: {
      groceries: 18150,
      shopping: 8800,
      cash_momo: 7700,
      transport: 6600,
      utilities: 5500,
      other: 8250,
    },
  },
  "1y": {
    rangeLabel: "1y",
    dateRange: "Aug 2025 – Aug 2026",
    trendText: "Trending down by 3.2% vs last year",
    trendDirection: "down",
    subtext: "Showing total spend for the last 12 months",
    values: {
      groceries: 28400,
      shopping: 14250,
      cash_momo: 12100,
      transport: 10800,
      utilities: 9500,
      other: 12700,
    },
  },
};

const chartConfig = {
  groceries: {
    label: "Groceries",
    color: "var(--cat-1)",
  },
  shopping: {
    label: "Shopping",
    color: "var(--cat-2)",
  },
  cash_momo: {
    label: "Cash & MoMo",
    color: "var(--cat-3)",
  },
  transport: {
    label: "Transport",
    color: "var(--cat-4)",
  },
  utilities: {
    label: "Utilities",
    color: "var(--cat-5)",
  },
  other: {
    label: "Other",
    color: "var(--cat-other)",
  },
} satisfies ChartConfig;

export interface SpendsRadialChartProps {
  breakdown?: SpendBreakdown;
  showAmounts?: boolean;
  className?: string;
  defaultRange?: SpendRange;
}

export function SpendsRadialChart({
  breakdown,
  showAmounts: propShowAmounts,
  className,
  defaultRange = "6m",
}: SpendsRadialChartProps) {
  const [selectedRange, setSelectedRange] = useState<SpendRange>(defaultRange);
  const { showAmounts: contextShowAmounts } = useAmountVisibility();
  const showEffectiveAmounts = propShowAmounts ?? contextShowAmounts;

  const currentPeriod = PERIODS[selectedRange];

  // If live ledger breakdown is provided and on default 6m/1y range, we can optionally align with ledger total
  const { chartData, totalSpend } = useMemo(() => {
    const vals = currentPeriod.values;
    const dataRow = [{ ...vals }];
    const total = Object.values(vals).reduce((sum, v) => sum + v, 0);

    return {
      chartData: dataRow,
      totalSpend: total,
    };
  }, [currentPeriod]);

  return (
    <Card className={cn("flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-none", className)}>
      {/* Card Header with Category Link */}
      <CardHeader className="p-0">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-[16px] font-medium leading-none text-foreground">
              Spending
            </CardTitle>
            <CardDescription className="text-[12.5px] text-muted-foreground">
              {currentPeriod.dateRange}
            </CardDescription>
          </div>
          <Link
            href="/reports"
            className="text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
          </Link>
        </div>
      </CardHeader>

      {/* Semicircle Stacked Radial Bar Chart */}
      <CardContent className="flex flex-1 items-center justify-center p-0 my-2">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-[240px] -mb-12"
        >
          <RadialBarChart
            data={chartData}
            endAngle={180}
            innerRadius={80}
            outerRadius={110}
          >
            <RadialBar
              dataKey="groceries"
              stackId="a"
              cornerRadius={5}
              fill="var(--color-groceries)"
              className="stroke-transparent stroke-2"
            />
            <RadialBar
              dataKey="shopping"
              stackId="a"
              cornerRadius={5}
              fill="var(--color-shopping)"
              className="stroke-transparent stroke-2"
            />
            <RadialBar
              dataKey="cash_momo"
              stackId="a"
              cornerRadius={5}
              fill="var(--color-cash_momo)"
              className="stroke-transparent stroke-2"
            />
            <RadialBar
              dataKey="transport"
              stackId="a"
              cornerRadius={5}
              fill="var(--color-transport)"
              className="stroke-transparent stroke-2"
            />
            <RadialBar
              dataKey="utilities"
              stackId="a"
              cornerRadius={5}
              fill="var(--color-utilities)"
              className="stroke-transparent stroke-2"
            />
            <RadialBar
              dataKey="other"
              stackId="a"
              cornerRadius={5}
              fill="var(--color-other)"
              className="stroke-transparent stroke-2"
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, name) => {
                    const label =
                      chartConfig[name as keyof typeof chartConfig]?.label || name;
                    return (
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="text-[12px] text-muted-foreground">{label}</span>
                        <span className="font-mono text-[12px] font-medium text-foreground tabular-nums">
                          {showEffectiveAmounts
                            ? `GHS ${Number(value).toLocaleString()}`
                            : "GHS ••••"}
                        </span>
                      </div>
                    );
                  }}
                />
              }
            />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 16}
                          className="fill-foreground text-2xl font-medium tracking-tight tabular-nums"
                        >
                          {showEffectiveAmounts
                            ? `GHS ${totalSpend.toLocaleString("en-US", {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              })}`
                            : "GHS ••••"}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 5}
                          className="fill-muted-foreground text-xs"
                        >
                          Total spend
                        </tspan>
                      </text>
                    );
                  }
                  return null;
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>

      {/* Footer with Trend Metric & Range Tabs */}
      <CardFooter className="flex-col items-stretch gap-3.5 p-0 text-sm border-0 bg-transparent">
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="flex items-center gap-1.5 text-[13px] font-medium leading-none text-foreground">
            {currentPeriod.trendText}
            {currentPeriod.trendDirection === "down" ? (
              <TrendingDown className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
          <div className="text-[11.5px] leading-none text-muted-foreground">
            {currentPeriod.subtext}
          </div>
        </div>

        {/* Range switcher tabs */}
        <div className="flex w-full items-center gap-1.5 pt-1">
          {SPEND_RANGES.map((rg) => (
            <button
              key={rg}
              type="button"
              onClick={() => setSelectedRange(rg)}
              className={cn(
                "flex-1 rounded-full py-1 text-[13px] leading-none transition-colors cursor-pointer text-center",
                selectedRange === rg
                  ? "bg-foreground text-background font-medium"
                  : "border border-border text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {rg}
            </button>
          ))}
        </div>
      </CardFooter>
    </Card>
  );
}

/** Alias matching user request snippet */
export const ChartRadialStacked = SpendsRadialChart;

export default SpendsRadialChart;
