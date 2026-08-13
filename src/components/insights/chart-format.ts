/**
 * Number formatting shared by the dashboard charts.
 *
 * Axis ticks and slice labels need a much shorter form than `formatMoney` —
 * "GH₵ 1,284,530.44" on a y-axis tick would push the plot off the card — so
 * these compact the magnitude and drop the decimals. Both honour the
 * hide-amounts toggle, since a chart is as much of a shoulder-surfing risk as
 * a balance is.
 */

const UNITS = [
  { limit: 1_000_000_000, suffix: "B" },
  { limit: 1_000_000, suffix: "M" },
  { limit: 1_000, suffix: "K" },
] as const;

/** e.g. 1284530 → "1.3M", 48500 → "48.5K", 420 → "420". */
export function compactNumber(value: number): string {
  const abs = Math.abs(value);
  for (const { limit, suffix } of UNITS) {
    if (abs >= limit) {
      const scaled = value / limit;
      // One decimal below 10 ("1.3M"), none above ("48K") — keeps ticks even.
      const text = Math.abs(scaled) < 10 ? scaled.toFixed(1) : Math.round(scaled).toString();
      return `${text.replace(/\.0$/, "")}${suffix}`;
    }
  }
  return Math.round(value).toString();
}

/** Axis tick: compact, unprefixed — the axis title carries the currency. */
export function compactTick(value: number, showAmounts: boolean): string {
  if (!showAmounts) return "••";
  return compactNumber(value);
}

/** Compact with the currency symbol, for tooltips and headline figures. */
export function compactMoney(value: number, showAmounts: boolean): string {
  if (!showAmounts) return "GH₵ ••••";
  const sign = value < 0 ? "−" : "";
  return `${sign}GH₵ ${compactNumber(Math.abs(value))}`;
}

/** Exact figure with grouping, for the values printed beside a chart. */
export function exactMoney(value: number, showAmounts: boolean): string {
  if (!showAmounts) return "GH₵ ••••••";
  const sign = value < 0 ? "−" : "";
  const body = new Intl.NumberFormat("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
  return `${sign}GH₵ ${body}`;
}

export function formatPercent(share: number): string {
  return `${(share * 100).toFixed(share < 0.1 ? 1 : 0)}%`;
}

export function formatSignedPercent(ratio: number): string {
  const pct = ratio * 100;
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  return `${sign}${Math.abs(pct).toFixed(Math.abs(pct) < 10 ? 1 : 0)}%`;
}
