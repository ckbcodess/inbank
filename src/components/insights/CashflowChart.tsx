"use client";

/**
 * Money in vs money out over time.
 *
 * Grouped columns rather than a stacked bar: the reader's job here is comparing
 * two magnitudes per period, and stacking would make "out" start from a moving
 * baseline. One y-axis only — a second scale would invent a relationship
 * between the two series that isn't in the data.
 *
 * Colours are categorical slots 1 and 2 (blue / orange), a warm-cool pair that
 * reads as opposite without borrowing the reserved success/destructive status
 * tokens — spending is not an error state.
 */

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import type { CashflowBucket } from "@/lib/insights";
import { compactTick, exactMoney } from "./chart-format";

const CHART_CONFIG = {
  income: { label: "Money in", color: "var(--cat-1)" },
  expense: { label: "Money out", color: "var(--cat-2)" },
} satisfies ChartConfig;

interface TooltipPayloadItem {
  dataKey?: string | number;
  value?: number;
  payload?: CashflowBucket;
}

function CashflowTooltip({
  active,
  payload,
  showAmounts,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  showAmounts: boolean;
}) {
  if (!active || !payload?.length) return null;
  const bucket = payload[0]?.payload;
  if (!bucket) return null;

  const net = bucket.income - bucket.expense;

  return (
    <div className="min-w-44 rounded-lg border border-border/50 bg-background px-3 py-2 shadow-xl">
      <div className="text-[12px] text-foreground">
        {bucket.rangeLabel}
        {bucket.partial && <span className="text-muted-foreground"> · so far</span>}
      </div>
      <dl className="mt-2 grid gap-1.5">
        {(["income", "expense"] as const).map((key) => (
          <div key={key} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-0.5 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: CHART_CONFIG[key].color }}
            />
            <dt className="flex-1 text-[12px] text-muted-foreground">{CHART_CONFIG[key].label}</dt>
            <dd className="text-[12px] text-foreground tabular">
              {exactMoney(bucket[key], showAmounts)}
            </dd>
          </div>
        ))}
        <div className="mt-0.5 flex items-center gap-2 border-t border-border/60 pt-1.5">
          <dt className="flex-1 text-[12px] text-muted-foreground">Net</dt>
          <dd className="text-[12px] text-foreground tabular">{exactMoney(net, showAmounts)}</dd>
        </div>
      </dl>
    </div>
  );
}

export function CashflowChart({ data }: { data: CashflowBucket[] }) {
  const { showAmounts } = useAmountVisibility();

  return (
    <ChartContainer config={CHART_CONFIG} className="aspect-auto h-[260px] w-full">
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -8 }} barGap={2}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          minTickGap={4}
          fontSize={11}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          width={52}
          fontSize={11}
          tickFormatter={(value: number) => compactTick(value, showAmounts)}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={<CashflowTooltip showAmounts={showAmounts} />}
        />
        {/* 4px rounded data-end, square at the baseline; 24px cap so a wide
            card gives the bars air instead of fat blocks. */}
        <Bar dataKey="income" fill="var(--cat-1)" radius={[4, 4, 0, 0]} maxBarSize={24} />
        <Bar dataKey="expense" fill="var(--cat-2)" radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ChartContainer>
  );
}

export { CHART_CONFIG as CASHFLOW_CONFIG };
