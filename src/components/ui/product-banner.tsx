"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Clock } from "@/components/ui/icons";
import type { AlertItem, ProductAlert } from "@/lib/product-alerts";
import { cn } from "@/lib/utils";

/** The mark in front of an alert: a filled "!" when it needs the customer, a clock when it is waiting on us. */
export function AlertMark({ tone, success = false, className }: { tone: ProductAlert["tone"]; success?: boolean; className?: string }) {
  const act = tone === "act";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full text-[12px] font-medium",
        success ? "bg-[color-mix(in_srgb,var(--success)_82%,var(--black))] text-white" : act ? "bg-primary text-primary-foreground" : "border border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      {success ? <Check size={12} className="stroke-current [stroke-linejoin:round] [stroke-width:55]" /> : act ? "!" : <Clock size={12} />}
    </span>
  );
}

const SHOWN = 3;

/** "policies" becomes "policy" for a count of one. */
function singular(word: string): string {
  return word.endsWith("ies") ? `${word.slice(0, -3)}y` : word.endsWith("s") ? word.slice(0, -1) : word;
}

/**
 * The one line under a product's title that says what needs the customer, or what we are doing. One alert is a
 * headline of up to six words and at most one underlined action. Two or more stay one banner: it counts them, and
 * opens in place into a line per record, each with its own action. Never a stack of banners.
 */
export function ProductBanner({
  alert,
  items,
  noun,
  className,
}: {
  /** A single alert, for a record's own page. */
  alert?: ProductAlert | null;
  /** Every alert on a product, for its home page. */
  items?: AlertItem[];
  /** What the records are called, plural: "policies", "investments". */
  noun?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);

  const list: AlertItem[] = items ?? (alert ? [{ key: "one", label: "", alert }] : []);
  if (list.length === 0) return null;

  const frame = (tone: ProductAlert["tone"], success = false) =>
    cn("rounded-2xl border", success ? "border-success/40 bg-success/15" : tone === "act" ? "border-warning/40 bg-warning/15" : "border-transparent bg-muted/50", className);

  if (list.length === 1) {
    const one = list[0].alert;
    return (
      <div role="status" className={cn("flex items-center gap-3 px-4 py-3", frame(one.tone, one.success))}>
        <AlertMark tone={one.tone} success={one.success} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[14px] font-medium text-foreground">{one.headline}</span>
          {one.detail && <span className="text-[12px] text-muted-foreground">{one.detail}</span>}
        </span>
        {one.action && (
          <Link href={one.action.href} onClick={one.action.onClick} className="shrink-0 text-[13px] text-foreground underline underline-offset-4">
            {one.action.label}
          </Link>
        )}
      </div>
    );
  }

  const acting = list.filter((i) => i.alert.tone === "act").length;
  const tone: ProductAlert["tone"] = acting > 0 ? "act" : "wait";
  const word = noun ?? "items";
  const headline = acting > 0 ? `${acting} ${acting === 1 ? singular(word) : word} ${acting === 1 ? "needs" : "need"} you` : `${list.length} ${word} in progress`;
  const rows = all ? list : list.slice(0, SHOWN);

  return (
    <div role="status" className={frame(tone)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left"
      >
        <AlertMark tone={tone} />
        <span className="min-w-0 flex-1 text-[14px] font-medium text-foreground">{headline}</span>
        <ChevronDown size={16} aria-hidden="true" className={cn("shrink-0 text-muted-foreground transition-transform duration-reveal ease-settle", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="flex flex-col gap-0.5 px-2 pb-2">
          {rows.map((i) => (
            <li key={i.key} className="flex items-center gap-3 rounded-xl px-2 py-2">
              <AlertMark tone={i.alert.tone} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[14px] text-foreground">{i.alert.headline}</span>
                <span className="truncate text-[12px] text-muted-foreground">{i.label}</span>
              </span>
              {i.alert.action && (
                <Link href={i.alert.action.href} onClick={i.alert.action.onClick} className="shrink-0 text-[13px] text-foreground underline underline-offset-4">
                  {i.alert.action.label}
                </Link>
              )}
            </li>
          ))}
          {list.length > SHOWN && !all && (
            <li className="px-2 py-1">
              <button type="button" onClick={() => setAll(true)} className="text-[13px] text-muted-foreground underline underline-offset-4 hover:text-foreground">
                {`Show all ${list.length}`}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/** The dot on a sidebar item whose product needs the customer. Only `act` earns one; waiting is quiet. */
export function NavAlertDot({ label }: { label: string }) {
  return <span role="img" aria-label={label} className="absolute right-2 top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary" />;
}
