"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { SPEND_RANGES, type SpendBreakdown, type SpendRange } from "@/lib/dashboard-insights";
import { createAnnularWedgePath, useTweenedArcs, type Arc } from "@/components/charts/arc-tween";

export { SPEND_RANGES, type SpendRange };

const RANGE_LABEL: Record<SpendRange, string> = {
  "1w": "past week",
  "1m": "past month",
  "3m": "past 3 months",
  "6m": "past 6 months",
  "1y": "past year",
};

function fmtAmount(amount: number): string {
  return `GHS ${amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface CategoryItem {
  id: string;
  label: string;
  amount: number;
}

/**
 * Segment colors assigned by rank (from largest on far-left to smallest on far-right):
 * In Dark Mode:
 *   - Major segments: Mint (#8ef574), Sky Blue (#54c5f8), Warm Yellow (#ffd343), Accent Pink (#ff3366)
 *   - Tail segments on the right edge: Sophisticated muted dark graphite (#4d5055 and #3e4044),
 *     never bright/white like #cbd5e1 or #e2e8f0.
 * In Light Mode:
 *   - Major segments: Vibrant tones (#86efac, #38bdf8, #facc15, #fb7185)
 *   - Tail segments: Soft lighter neutral gray/slate (#cbd5e1 and #e2e8f0)
 */
const SEGMENT_PALETTE: Array<{ light: string; dark: string }> = [
  { light: "#86efac", dark: "#8ef574" }, // 1st (largest) - Mint / Light green
  { light: "#38bdf8", dark: "#54c5f8" }, // 2nd - Sky / Cyan blue
  { light: "#facc15", dark: "#ffd343" }, // 3rd - Warm golden yellow
  { light: "#fb7185", dark: "#ff3366" }, // 4th - Accent coral pink
  { light: "#cbd5e1", dark: "#4d5055" }, // 5th - Muted dark slate (light on light mode, dark slate on dark mode)
  { light: "#e2e8f0", dark: "#3e4044" }, // 6th (smallest) - Deep graphite (light on light mode, deep graphite on dark mode)
];

export interface SpendsRadialChartProps {
  /** One ledger-derived breakdown per range pill. */
  byRange: Record<SpendRange, SpendBreakdown>;
  showAmounts?: boolean;
  className?: string;
  defaultRange?: SpendRange;
}

export function SpendsRadialChart({
  byRange,
  showAmounts: propShowAmounts,
  className,
  defaultRange = "1m",
}: SpendsRadialChartProps) {
  const [selectedRange, setSelectedRange] = useState<SpendRange>(defaultRange);
  const { showAmounts: contextShowAmounts } = useAmountVisibility();
  const showEffectiveAmounts = propShowAmounts ?? contextShowAmounts;

  const [hoveredCategory, setHoveredCategory] = useState<CategoryItem | null>(null);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const activeBreakdown = byRange[selectedRange];

  // 1. Stable order across ranges (shared category set, "Other" last), so a
  //    range switch resizes segments in place instead of reshuffling them.
  const categories = useMemo<CategoryItem[]>(() => {
    return activeBreakdown.slices.map((sl) => ({ id: sl.label, label: sl.label, amount: sl.amount }));
  }, [activeBreakdown]);

  const totalSpend = activeBreakdown.total;
  const isEmpty = totalSpend <= 0;

  /**
   * PERFECT SEMICIRCLE GEOMETRY:
   * ViewBox: width 400, height 230
   * Baseline is strictly horizontal at cy = 200.
   * Circle center: cx = 200, cy = 200.
   * Outer radius: 170 (touches y = 30 at 270° apex, x = 30 at 180°, x = 370 at 360°).
   * Inner radius: 116 (gives 54px chunky segment thickness and a wide 232px inner clearance).
   * Exactly 180.0° total span from 180.0° to 360.0°.
   */
  const cx = 200;
  const cy = 200;
  const outerR = 170;
  const innerR = 116;
  const gapDeg = 3.2; // Clean radial gaps between segments

  const startArchAngle = 180.0;
  const totalArchSpan = 180.0;

  // 2. Target angles: span proportional to spend. Empty categories collapse to
  //    a point where they sit, so every category keeps a slot to animate from.
  const target = useMemo(() => {
    const visible = categories.filter((c) => c.amount > 0).length;
    const available = totalArchSpan - Math.max(0, visible - 1) * gapDeg;
    const out: Record<string, Arc> = {};
    let angle = startArchAngle;
    let first = true;
    for (const cat of categories) {
      if (cat.amount <= 0 || totalSpend <= 0) {
        out[cat.id] = { start: angle, end: angle };
        continue;
      }
      if (!first) angle += gapDeg;
      first = false;
      const start = angle;
      angle += (cat.amount / totalSpend) * available;
      out[cat.id] = { start, end: angle };
    }
    return out;
  }, [categories, totalSpend, totalArchSpan, startArchAngle, gapDeg]);

  const arcs = useTweenedArcs(target);

  const slices = categories.map((cat, index) => {
    const arc = arcs[cat.id] ?? target[cat.id];
    const palette = SEGMENT_PALETTE[index % SEGMENT_PALETTE.length];
    return {
      ...cat,
      proportion: totalSpend > 0 ? cat.amount / totalSpend : 0,
      visible: arc.end - arc.start > 0.3,
      path: createAnnularWedgePath(cx, cy, innerR, outerR, arc.start, arc.end, 8),
      lightColor: palette.light,
      darkColor: palette.dark,
    };
  });

  // The legend ranks this range's biggest categories; colours stay stable.
  const topSlices = slices
    .filter((sl) => sl.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  const displayedAmount = hoveredCategory ? hoveredCategory.amount : totalSpend;
  const displayedLabel = hoveredCategory
    ? `${hoveredCategory.label} · ${Math.round((hoveredCategory.amount / totalSpend) * 100)}%`
    : isEmpty
      ? `No spending · ${RANGE_LABEL[selectedRange]}`
      : `Spent · ${RANGE_LABEL[selectedRange]}`;

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-none transition-colors sm:p-6",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-medium leading-none tracking-[-0.01em] text-foreground">
          Analytics
        </h2>
        <Link
          href="/reports"
          className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
        </Link>
      </div>

      {/* Semicircle Chart Container */}
      <div className="relative my-auto flex flex-col items-center justify-center pt-2 pb-0">
        <div className="relative w-full max-w-[340px] aspect-[400/225] select-none">
          <svg
            viewBox="0 0 400 225"
            className="size-full overflow-visible"
            role="img"
            aria-label={`Spending by category, ${RANGE_LABEL[selectedRange]}`}
          >
            <defs>
              <filter id="segment-glow" x="-15%" y="-15%" width="130%" height="130%">
                <feDropShadow dx="0" dy="2" stdDeviation="3.5" floodOpacity="0.22" />
              </filter>
            </defs>

            {/* Empty period — a quiet track, so the card keeps its shape */}
            {isEmpty && (
              <path
                d={createAnnularWedgePath(cx, cy, innerR, outerR, startArchAngle, startArchAngle + totalArchSpan, 8)}
                fill="var(--muted)"
              />
            )}

            {/* Perfect Semicircle Wedges (180° -> 360°) */}
            {slices.filter((slice) => slice.visible).map((slice) => {
              const isHovered = hoveredCategory?.id === slice.id;
              const isDimmed = hoveredCategory !== null && !isHovered;
              const fillColor = isDark ? slice.darkColor : slice.lightColor;

              return (
                <path
                  key={slice.id}
                  d={slice.path}
                  fill={fillColor}
                  className="cursor-pointer transition-[opacity,transform,filter] duration-200"
                  style={{
                    opacity: isDimmed ? 0.35 : 1,
                    transformOrigin: `${cx}px ${cy}px`,
                    transform: isHovered ? "scale(1.025)" : "scale(1)",
                    filter: isHovered ? "url(#segment-glow)" : undefined,
                  }}
                  onMouseEnter={() => setHoveredCategory(slice)}
                  onMouseLeave={() => setHoveredCategory(null)}
                />
              );
            })}

            {/* Center Typography — Positioned at optical center of the semicircle above baseline cy */}
            <text
              x={cx}
              y={cy - 40}
              textAnchor="middle"
              className="fill-foreground font-sans tabular"
              style={{ fontSize: "22px", letterSpacing: "-0.015em" }}
            >
              {showEffectiveAmounts ? fmtAmount(displayedAmount) : "GHS ••••"}
            </text>
            <text
              x={cx}
              y={cy - 16}
              textAnchor="middle"
              className="fill-muted-foreground font-sans"
              style={{ fontSize: "13px" }}
            >
              {displayedLabel}
            </text>
          </svg>
        </div>
      </div>

      {/* Top categories — the chart's hover detail, reachable by touch and keyboard too */}
      <ul className="flex flex-col pt-3">
        {topSlices.map((slice) => {
          const isActive = hoveredCategory?.id === slice.id;
          return (
            <li key={slice.id}>
              <button
                type="button"
                onMouseEnter={() => setHoveredCategory(slice)}
                onMouseLeave={() => setHoveredCategory(null)}
                onFocus={() => setHoveredCategory(slice)}
                onBlur={() => setHoveredCategory(null)}
                onClick={() => setHoveredCategory(isActive ? null : slice)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors cursor-pointer",
                  isActive ? "bg-muted" : "hover:bg-muted/60",
                )}
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: isDark ? slice.darkColor : slice.lightColor }}
                  aria-hidden="true"
                />
                <span className="flex-1 truncate text-[13px] text-foreground">{slice.label}</span>
                <span className="tabular text-[12px] text-muted-foreground">
                  {Math.round(slice.proportion * 100)}%
                </span>
                <span className="tabular w-[92px] text-right text-[13px] text-foreground">
                  {showEffectiveAmounts ? fmtAmount(slice.amount) : "GHS ••••"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Time Range Filter Pills */}
      <div className="flex w-full items-center gap-2 pt-2">
        {SPEND_RANGES.map((rg) => {
          const isActive = selectedRange === rg;
          return (
            <button
              key={rg}
              type="button"
              aria-pressed={isActive}
              onClick={() => {
                setSelectedRange(rg);
                setHoveredCategory(null);
              }}
              className={cn(
                "flex-1 rounded-full py-2 text-[13.5px] tabular transition-colors cursor-pointer text-center outline-none select-none",
                isActive
                  ? "bg-foreground text-background shadow-xs"
                  : "border border-border/80 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {rg}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const ChartRadialStacked = SpendsRadialChart;
export default SpendsRadialChart;
