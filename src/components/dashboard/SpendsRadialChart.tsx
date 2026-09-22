"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { SPEND_RANGES, type SpendBreakdown, type SpendRange } from "@/lib/dashboard-insights";

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

/**
 * Creates an exact annular wedge path with rounded corner caps for a true circular arc.
 * Mathematical coordinate system:
 * 180° = 9 o'clock (horizontal left baseline)
 * 270° = 12 o'clock (vertical apex)
 * 360° = 3 o'clock (horizontal right baseline)
 */
function createAnnularWedgePath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngleDeg: number,
  endAngleDeg: number,
  cornerR: number = 8
): string {
  const startRad = (startAngleDeg * Math.PI) / 180;
  const endRad = (endAngleDeg * Math.PI) / 180;
  const sweepAngle = endRad - startRad;

  const maxCornerThickness = (outerR - innerR) / 2;
  const maxCornerOuterArc = (outerR * sweepAngle) / 2;
  const maxCornerInnerArc = (innerR * sweepAngle) / 2;
  const cr = Math.max(0, Math.min(cornerR, maxCornerThickness, maxCornerOuterArc, maxCornerInnerArc));

  if (cr <= 0.5) {
    const x1 = cx + outerR * Math.cos(startRad);
    const y1 = cy + outerR * Math.sin(startRad);
    const x2 = cx + outerR * Math.cos(endRad);
    const y2 = cy + outerR * Math.sin(endRad);
    const x3 = cx + innerR * Math.cos(endRad);
    const y3 = cy + innerR * Math.sin(endRad);
    const x4 = cx + innerR * Math.cos(startRad);
    const y4 = cy + innerR * Math.sin(startRad);
    const largeArc = sweepAngle > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  }

  const outerAngleOffset = cr / outerR;
  const innerAngleOffset = cr / innerR;

  // Outer circular arc start and end points
  const oStartRad = startRad + outerAngleOffset;
  const oEndRad = endRad - outerAngleOffset;
  const oStartX = cx + outerR * Math.cos(oStartRad);
  const oStartY = cy + outerR * Math.sin(oStartRad);
  const oEndX = cx + outerR * Math.cos(oEndRad);
  const oEndY = cy + outerR * Math.sin(oEndRad);

  // Radial edges with corner offsets
  const rEndOuterX = cx + (outerR - cr) * Math.cos(endRad);
  const rEndOuterY = cy + (outerR - cr) * Math.sin(endRad);
  const rEndInnerX = cx + (innerR + cr) * Math.cos(endRad);
  const rEndInnerY = cy + (innerR + cr) * Math.sin(endRad);

  // Inner circular arc end and start points
  const iEndRad = endRad - innerAngleOffset;
  const iStartRad = startRad + innerAngleOffset;
  const iEndX = cx + innerR * Math.cos(iEndRad);
  const iEndY = cy + innerR * Math.sin(iEndRad);
  const iStartX = cx + innerR * Math.cos(iStartRad);
  const iStartY = cy + innerR * Math.sin(iStartRad);

  const rStartInnerX = cx + (innerR + cr) * Math.cos(startRad);
  const rStartInnerY = cy + (innerR + cr) * Math.sin(startRad);
  const rStartOuterX = cx + (outerR - cr) * Math.cos(startRad);
  const rStartOuterY = cy + (outerR - cr) * Math.sin(startRad);

  const largeOuterArc = oEndRad - oStartRad > Math.PI ? 1 : 0;
  const largeInnerArc = iEndRad - iStartRad > Math.PI ? 1 : 0;

  return [
    `M ${oStartX} ${oStartY}`,
    `A ${outerR} ${outerR} 0 ${largeOuterArc} 1 ${oEndX} ${oEndY}`,
    `A ${cr} ${cr} 0 0 1 ${rEndOuterX} ${rEndOuterY}`,
    `L ${rEndInnerX} ${rEndInnerY}`,
    `A ${cr} ${cr} 0 0 1 ${iEndX} ${iEndY}`,
    `A ${innerR} ${innerR} 0 ${largeInnerArc} 0 ${iStartX} ${iStartY}`,
    `A ${cr} ${cr} 0 0 1 ${rStartInnerX} ${rStartInnerY}`,
    `L ${rStartOuterX} ${rStartOuterY}`,
    `A ${cr} ${cr} 0 0 1 ${oStartX} ${oStartY}`,
    `Z`,
  ].join(" ");
}

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

  // 1. Sort descending by amount (largest on far left to smallest on far right)
  const sortedCategories = useMemo<CategoryItem[]>(() => {
    return activeBreakdown.slices
      .map((sl) => ({ id: sl.label, label: sl.label, amount: sl.amount }))
      .sort((a, b) => b.amount - a.amount);
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

  // 2. Angular span proportional to spend amount
  const slices = useMemo(() => {
    const n = sortedCategories.length;
    const totalGap = (n - 1) * gapDeg;
    const availableSpan = totalArchSpan - totalGap;

    let currentAngle = startArchAngle;

    return sortedCategories.map((cat, index) => {
      const proportion = cat.amount / totalSpend;
      const span = proportion * availableSpan;
      const startAngle = currentAngle;
      const endAngle = currentAngle + span;
      currentAngle = endAngle + gapDeg;

      const path = createAnnularWedgePath(
        cx,
        cy,
        innerR,
        outerR,
        startAngle,
        endAngle,
        8
      );

      const palette = SEGMENT_PALETTE[index % SEGMENT_PALETTE.length];

      return {
        ...cat,
        proportion,
        startAngle,
        endAngle,
        path,
        lightColor: palette.light,
        darkColor: palette.dark,
      };
    });
  }, [sortedCategories, totalSpend, totalArchSpan, startArchAngle, cx, cy, innerR, outerR, gapDeg]);

  const displayedAmount = hoveredCategory ? hoveredCategory.amount : totalSpend;
  const displayedLabel = hoveredCategory
    ? `${hoveredCategory.label} · ${Math.round((hoveredCategory.amount / totalSpend) * 100)}%`
    : isEmpty
      ? `No spending · ${RANGE_LABEL[selectedRange]}`
      : `Spent · ${RANGE_LABEL[selectedRange]}`;

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-none transition-colors",
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
            {slices.map((slice) => {
              const isHovered = hoveredCategory?.id === slice.id;
              const isDimmed = hoveredCategory !== null && !isHovered;
              const fillColor = isDark ? slice.darkColor : slice.lightColor;

              return (
                <path
                  key={slice.id}
                  d={slice.path}
                  fill={fillColor}
                  className="cursor-pointer transition-all duration-200"
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
        {slices.slice(0, 3).map((slice) => {
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
