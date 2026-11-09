"use client";

import { useState, type ReactNode } from "react";
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

/** The underlined words that say what a tap does. They are the visible part of the action; the whole row is the target. */
function ActionLabel({ label }: { label: string }) {
  return <span className="shrink-0 text-[13px] text-foreground underline underline-offset-4">{label}</span>;
}

/**
 * A row of a banner. With an action the whole row is the tap target (a link when it goes to a page, a button when it
 * opens something in place), so a thumb doesn't have to find the underlined words; without one it is plain.
 */
function AlertRow({ action, className, children }: { action?: ProductAlert["action"]; className?: string; children: ReactNode }) {
  const row = cn("flex w-full items-center gap-3 text-left", className);
  if (action?.href) {
    return (
      <Link href={action.href} onClick={action.onClick} className={row}>
        {children}
      </Link>
    );
  }
  if (action) {
    return (
      <button type="button" onClick={action.onClick} className={cn(row, "cursor-pointer")}>
        {children}
      </button>
    );
  }
  return <div className={row}>{children}</div>;
}

const SHOWN = 3;

/** "policies" becomes "policy" for a count of one. */
function singular(word: string): string {
  return word.endsWith("ies") ? `${word.slice(0, -3)}y` : word.endsWith("s") ? word.slice(0, -1) : word;
}

/**
 * The one line under a product's title that says what needs the customer, or what we are doing. One alert is a
 * headline of up to six words and at most one underlined action; with an action the whole banner is tappable. Two or more stay one banner: it counts them, and
 * opens in place into a line per record, each with its own action. Never a stack of banners.
 */
export function ProductBanner({
  alert,
  items,
  noun,
  summary,
  className,
}: {
  /** A single alert, for a record's own page. */
  alert?: ProductAlert | null;
  /** Every alert on a product, for its home page. */
  items?: AlertItem[];
  /** What the records are called, plural: "policies", "investments". */
  noun?: string;
  /** The collapsed headline for two or more alerts, when "needs you" and the noun don't say it (the dashboard mixes kinds). */
  summary?: (total: number, acting: number) => string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);

  const list: AlertItem[] = items ?? (alert ? [{ key: "one", label: "", alert }] : []);
  if (list.length === 0) return null;

  const frame = (tone: ProductAlert["tone"], success = false) =>
    cn("rounded-2xl", success ? "bg-success/15" : tone === "act" ? "bg-warning/15" : "bg-muted/50", className);

  if (list.length === 1) {
    const one = list[0].alert;
    return (
      <div role="status" className={frame(one.tone, one.success)}>
        <AlertRow action={one.action} className="rounded-2xl px-4 py-3">
          <AlertMark tone={one.tone} success={one.success} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[14px] font-medium text-foreground">{one.headline}</span>
            {one.detail && <span className="text-[12px] text-muted-foreground">{one.detail}</span>}
          </span>
          {one.action && <ActionLabel label={one.action.label} />}
        </AlertRow>
      </div>
    );
  }

  const acting = list.filter((i) => i.alert.tone === "act").length;
  const tone: ProductAlert["tone"] = acting > 0 ? "act" : "wait";
  const word = noun ?? "items";
  const headline = summary ? summary(list.length, acting) : acting > 0 ? `${acting} ${acting === 1 ? singular(word) : word} ${acting === 1 ? "needs" : "need"} you` : `${list.length} ${word} in progress`;
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
            <li key={i.key}>
              <AlertRow action={i.alert.action} className="rounded-xl px-2 py-2">
                <AlertMark tone={i.alert.tone} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[14px] text-foreground">{i.alert.headline}</span>
                  <span className="truncate text-[12px] text-muted-foreground">{i.label}</span>
                </span>
                {i.alert.action && <ActionLabel label={i.alert.action.label} />}
              </AlertRow>
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
