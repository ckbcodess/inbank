"use client";

/**
 * Where the money went, as a donut plus a ranked list.
 *
 * The list is not decoration. A donut is only honest for part-to-whole "at a
 * glance" and gets unreadable when slices are close in size, so every figure is
 * printed beside it — the reader never has to compare arc lengths or hover to
 * get a number. It is also the required relief for the palette: three of the
 * five categorical slots sit below 3:1 contrast on the light surface, which is
 * legal only when the values are readable another way.
 *
 * Capped at five named slices plus "Other". A sixth generated hue would be
 * indistinguishable from an existing one under colour-blind simulation, so the
 * tail folds rather than the palette growing.
 */

import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import type { CategorySlice } from "@/lib/insights";
import { compactMoney, exactMoney, formatPercent } from "./chart-format";

interface TooltipPayloadItem {
  payload?: CategorySlice;
}

function SliceTooltip({
  active,
  payload,
  showAmounts,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  showAmounts: boolean;
}) {
  if (!active || !payload?.length) return null;
  const slice = payload[0]?.payload;
  if (!slice) return null;

  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 shadow-xl">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-[2px]"
          style={{ backgroundColor: slice.color }}
        />
        <span className="text-[12px] text-muted-foreground">{slice.category}</span>
      </div>
      <div className="mt-1 text-[13px] text-foreground tabular">
        {exactMoney(slice.amount, showAmounts)}
        <span className="ml-1.5 text-[12px] text-muted-foreground">
          {formatPercent(slice.share)}
        </span>
      </div>
    </div>
  );
}

export function SpendByCategory({ slices }: { slices: CategorySlice[] }) {
  const { showAmounts } = useAmountVisibility();
  const total = slices.reduce((sum, s) => sum + s.amount, 0);

  const config = Object.fromEntries(
    slices.map((s) => [s.category, { label: s.category, color: s.color }]),
  ) satisfies ChartConfig;

  if (slices.length === 0) {
    return (
      <p className="py-10 text-center text-[13px] text-muted-foreground">
        No spending recorded in this period.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="relative mx-auto w-full max-w-[220px]">
        <ChartContainer config={config} className="aspect-square w-full">
          <PieChart>
            <ChartTooltip content={<SliceTooltip showAmounts={showAmounts} />} />
            <Pie
              data={slices}
              dataKey="amount"
              nameKey="category"
              innerRadius="62%"
              outerRadius="94%"
              // A 2px gap in the surface colour separates touching slices —
              // the separator is negative space, never a stroke of its own.
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {slices.map((s) => (
                <Cell key={s.category} fill={s.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] text-muted-foreground">Total spend</span>
          <span className="mt-0.5 text-[17px] leading-tight text-foreground">
            {compactMoney(total, showAmounts)}
          </span>
        </div>
      </div>

      {/* The legend and the value table in one: identity from the swatch,
          magnitude from the printed figure. */}
      <ul className="flex flex-col gap-2">
        {slices.map((s) => (
          <li key={s.category} className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: s.color }}
            />
            <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">
              {s.category}
            </span>
            <span className="shrink-0 text-[12px] text-muted-foreground tabular">
              {formatPercent(s.share)}
            </span>
            <span className="w-24 shrink-0 text-right text-[12px] text-foreground tabular">
              {compactMoney(s.amount, showAmounts)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
