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
 *   - Fifth named segment: soft violet; "Other" is the muted graphite (#4d5055),
 *     never bright/white like #cbd5e1 or #e2e8f0.
 * In Light Mode:
 *   - Major segments: Vibrant tones (#86efac, #38bdf8, #facc15, #fb7185)
 *   - "Other": soft lighter neutral gray/slate (#cbd5e1)
 */
const SEGMENT_PALETTE: Array<{ light: string; dark: string }> = [
  { light: "var(--spend-1)", dark: "var(--spend-1)" },
  { light: "var(--spend-2)", dark: "var(--spend-2)" },
  { light: "var(--spend-3)", dark: "var(--spend-3)" },
  { light: "var(--spend-4)", dark: "var(--spend-4)" },
  { light: "var(--spend-5)", dark: "var(--spend-5)" },
];

/** "Other" is always the quiet graphite tail, whatever its position. */
const OTHER_PALETTE = { light: "var(--spend-other)", dark: "var(--spend-other)" };

export interface SpendsRadialChartProps {
  /** One ledger-derived breakdown per range pill. */
  byRange: Record<SpendRange, SpendBreakdown>;
  showAmounts?: boolean;
  className?: string;
  defaultRange?: SpendRange;
  /** Where the card's link goes — the My Spends page of the account these figures belong to. */
  href?: string;
}

export function SpendsRadialChart({
  byRange,
  showAmounts: propShowAmounts,
  className,
  defaultRange = "1m",
  href = "/reports",
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
    const palette = cat.id === "Other" ? OTHER_PALETTE : SEGMENT_PALETTE[index % SEGMENT_PALETTE.length];
    return {
      ...cat,
      proportion: totalSpend > 0 ? cat.amount / totalSpend : 0,
      visible: arc.end - arc.start > 0.3,
      path: createAnnularWedgePath(cx, cy, innerR, outerR, arc.start, arc.end, 8),
      lightColor: palette.light,
      darkColor: palette.dark,
    };
  });

  const displayedAmount = hoveredCategory ? hoveredCategory.amount : totalSpend;

  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-3 rounded-2xl border border-border bg-panel p-4 shadow-none transition-colors sm:p-5",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-medium leading-none text-foreground sm:text-[16px]">
          My Spends
        </h2>
        <Link
          href={href}
          className="text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Details
        </Link>
      </div>

      {/* Semicircle Chart Container */}
      <div className="relative my-auto flex flex-col items-center justify-center">
        <div className="relative w-full max-w-[360px] aspect-[400/225] select-none">
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
                  className="cursor-pointer outline-none transition-[opacity,transform,filter] duration-200"
                  style={{
                    fill: fillColor,
                    opacity: isDimmed ? 0.35 : 1,
                    transformOrigin: `${cx}px ${cy}px`,
                    transform: isHovered ? "scale(1.025)" : "scale(1)",
                    filter: isHovered ? "url(#segment-glow)" : undefined,
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${slice.label}, ${Math.round(slice.proportion * 100)}%`}
                  aria-pressed={isHovered}
                  onMouseEnter={() => setHoveredCategory(slice)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  onFocus={() => setHoveredCategory(slice)}
                  onBlur={() => setHoveredCategory(null)}
                  onClick={() => setHoveredCategory(isHovered ? null : slice)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setHoveredCategory(isHovered ? null : slice);
                    }
                  }}
                />
              );
            })}

            {/* Center Typography — Positioned at optical center of the semicircle above baseline cy */}
            {/* Just the total, sized to sit well inside the arc. The range is on the pills below;
                a label appears only to name a hovered category. An empty period says so instead of a bare zero. */}
            {isEmpty ? (
              <text
                x={cx}
                y={cy - 24}
                textAnchor="middle"
                className="fill-muted-foreground font-sans"
                style={{ fontSize: "21px", letterSpacing: "-0.01em" }}
              >
                No spending
              </text>
            ) : (
              <>
                {/* Above the figure: "You’ve spent" by default, the category's name while one is picked. */}
                <text
                  x={cx}
                  y={cy - 62}
                  textAnchor="middle"
                  className="fill-muted-foreground font-sans"
                  style={{ fontSize: "16px" }}
                >
                  {hoveredCategory ? hoveredCategory.label : "You’ve spent"}
                </text>
                <text
                  x={cx}
                  y={cy - 24}
                  textAnchor="middle"
                  className="fill-foreground font-sans tabular"
                  style={{ fontSize: "24px", letterSpacing: "-0.02em" }}
                >
                  {showEffectiveAmounts ? fmtAmount(displayedAmount) : "GHS ••••"}
                </text>
              </>
            )}
          </svg>
        </div>
      </div>

      {/* Time Range Filter Pills */}
      <div className="flex w-full items-center gap-2">
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
                "flex-1 rounded-full py-1.5 text-[13px] tabular transition-colors cursor-pointer text-center outline-none select-none",
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
