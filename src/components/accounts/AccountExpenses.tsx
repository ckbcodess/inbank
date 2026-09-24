"use client";

/**
 * My Spends — read one account at a time.
 *
 * There is no relationship-wide expenses hub: the customer reaches this from
 * an account's detail page, so the account is already chosen and never
 * re-selected here. `AccountExpensesView` is the page at
 * /accounts/[id]/expenses: the breakdown only, grouped by category or
 * transaction type over a period. Layout follows Figma 1867:4819 ("My Spends").
 * Individual payments live on the statement, not here.
 *
 * Transfers between the customer's own accounts carry no category, so moving
 * money into savings is never shown as an expense.
 */

import { useMemo, useState } from "react";
import { Calendar, ChevronDown, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ListErrorState,
  ListSkeleton,
  TrueEmptyState,
} from "@/components/states/ListStates";
import { useAmountVisibility, RevealingAmount } from "@/components/providers/AmountVisibilityProvider";
import type { Account } from "@/lib/mock-data";
import { createAnnularWedgePath, useTweenedArcs, type Arc } from "@/components/charts/arc-tween";
import {
  EXPENSE_PERIODS,
  EXPENSE_PERIOD_LABEL,
  accountExpenses,
  type CategorySlice,
  type ExpensePeriod,
  type ExpenseView,
} from "@/lib/insights";
import { roundMoney } from "@/lib/money";
import type { BaselineState } from "@/lib/states";

function kindOf(account: Account) {
  return account.profileKind ?? "CORPORATE";
}

function percent(share: number): string {
  const p = share * 100;
  return p > 0 && p < 1 ? "<1%" : `${Math.round(p)}%`;
}

/* ── Full page ─────────────────────────────────────────────────────────────── */

const VIEW_LABEL: Record<ExpenseView, string> = { category: "Category", type: "Transaction type" };
const BREAKDOWN_LABEL: Record<ExpenseView, string> = {
  category: "Category breakdown",
  type: "By transaction type",
};

export function AccountExpensesView({
  account,
  period,
  onPeriodChange,
  state,
  onRetry,
}: {
  account: Account;
  period: ExpensePeriod;
  onPeriodChange: (p: ExpensePeriod) => void;
  state: BaselineState;
  onRetry: () => void;
}) {
  const [view, setView] = useState<ExpenseView>("category");
  const [selected, setSelected] = useState<string | null>(null);
  const data = useMemo(
    () => accountExpenses(kindOf(account), account.id, period, view),
    [account, period, view],
  );
  const periodLabel = EXPENSE_PERIOD_LABEL[period];

  const isEmpty = state === "empty" || data.total === 0;
  const activeSlice = data.slices.find((s) => s.category === selected) ?? null;

  const changePeriod = (p: ExpensePeriod) => {
    onPeriodChange(p);
    setSelected(null);
  };
  const changeView = (v: ExpenseView) => {
    setView(v);
    setSelected(null);
  };

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <ViewTabs value={view} onChange={changeView} />
        <PeriodMenu value={period} onChange={changePeriod} />
      </div>

      {state === "loading" && <ListSkeleton rows={4} columns={3} />}

      {state === "error" && (
        <div className="rounded-2xl border border-border bg-card">
          <ListErrorState
            onRetry={onRetry}
            description="We couldn't load spending for this account. Your money hasn't moved — try again."
          />
        </div>
      )}

      {(state === "populated" || state === "empty") && isEmpty && (
        <div className="rounded-2xl border border-border bg-card">
          <TrueEmptyState
            icon={<PieChart size={22} strokeWidth={1.5} />}
            title={`Nothing spent from this account in the last ${periodLabel}`}
            description="Payments and card spend from this account will show here. Transfers between your own accounts aren't counted."
            action={
              period !== "12m" ? (
                <Button variant="outline" size="sm" className="h-8 rounded-lg px-3 text-[13px]" onClick={() => changePeriod("12m")}>
                  Look at the last 12 months
                </Button>
              ) : undefined
            }
          />
        </div>
      )}

      {state === "populated" && !isEmpty && (
          <section className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
            <div className="flex flex-col items-center gap-5">
              <Donut slices={data.slices} selected={selected}>
                <span className="max-w-[160px] truncate text-[14px] text-muted-foreground">
                  {activeSlice ? activeSlice.category : "You’ve spent"}
                </span>
                <RevealingAmount
                  amount={activeSlice ? activeSlice.amount : data.total}
                  currency={account.currency}
                  className="mt-1 text-[26px] leading-[1.25] tracking-[-0.025em] text-foreground tabular sm:text-[30px]"
                />
                {activeSlice && (
                  <span className="mt-2 text-[12.5px] text-muted-foreground tabular">
                    {percent(activeSlice.share)} of spend
                  </span>
                )}
              </Donut>
              <Comparison
                total={data.total}
                previous={data.previousTotal}
                currency={account.currency}
                periodLabel={periodLabel}
              />
            </div>

            <div className="flex flex-col gap-4 md:gap-6">
              {/* Same weight as the section headings on Accounts ("Sources of Funds"). */}
              <h2 className="px-2 text-[16px] font-medium tracking-[-0.01em] text-foreground">
                {BREAKDOWN_LABEL[view]}
              </h2>
              <ul className="flex flex-col gap-0.5" aria-label={BREAKDOWN_LABEL[view]}>
                {data.slices.filter((s) => s.amount > 0).map((s) => {
                  const isActive = selected === s.category;
                  const breakdown = s.breakdown?.filter((b) => b.amount > 0) ?? [];
                  const expandable = breakdown.length > 0;
                  return (
                    <li key={s.category}>
                      <button
                        type="button"
                        aria-pressed={isActive}
                        aria-expanded={expandable ? isActive : undefined}
                        onClick={() => setSelected(isActive ? null : s.category)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors cursor-pointer",
                          isActive ? "bg-muted" : "hover:bg-muted/50",
                          selected && !isActive && "opacity-55",
                        )}
                      >
                        <span className="size-[10px] shrink-0 rounded-[3px]" style={{ backgroundColor: s.color }} />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="flex items-baseline gap-2">
                            <span className="truncate text-[15px] text-foreground">{s.category}</span>
                            <span className="shrink-0 text-[13px] text-muted-foreground tabular">{percent(s.share)}</span>
                          </span>
                          {expandable && !isActive && (
                            <span className="truncate text-[13px] text-muted-foreground">
                              {/* One span per name so each category is translated on its own */}
                              {breakdown.map((b, i) => (
                                <span key={b.category}>
                                  {i > 0 && ", "}
                                  <span>{b.category}</span>
                                </span>
                              ))}
                            </span>
                          )}
                        </span>
                        <RevealingAmount
                          amount={s.amount}
                          currency={account.currency}
                          className="shrink-0 text-[15px] leading-[1.25] text-foreground tabular"
                        />
                        {expandable && (
                          <ChevronDown
                            size={16}
                            strokeWidth={1.8}
                            aria-hidden="true"
                            className={cn(
                              "shrink-0 text-muted-foreground transition-transform duration-200",
                              isActive && "rotate-180",
                            )}
                          />
                        )}
                      </button>

                      {/* What "Other" is made of — each category with its share of total spend. */}
                      {expandable && isActive && (
                        <ul
                          aria-label={`${s.category} breakdown`}
                          className="ml-[23px] mt-1 flex flex-col border-l border-border pl-3 animate-in fade-in slide-in-from-top-1 duration-200"
                        >
                          {breakdown.map((b) => (
                            <li key={b.category} className="flex items-center gap-3 px-2 py-2">
                              <span className="flex min-w-0 flex-1 items-baseline gap-2">
                                <span className="truncate text-[14px] text-foreground">{b.category}</span>
                                <span className="shrink-0 text-[12.5px] text-muted-foreground tabular">
                                  {percent(b.share)}
                                </span>
                              </span>
                              <RevealingAmount
                                amount={b.amount}
                                currency={account.currency}
                                className="shrink-0 text-[14px] leading-[1.25] text-foreground tabular"
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
      )}
    </div>
  );
}

function ViewTabs({ value, onChange }: { value: ExpenseView; onChange: (v: ExpenseView) => void }) {
  return (
    <div className="flex items-center rounded-xl bg-muted p-1" role="group" aria-label="Group expenses by">
      {(["category", "type"] as const).map((v) => {
        const isActive = value === v;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(v)}
            className={cn(
              "whitespace-nowrap rounded-lg px-3.5 py-1.5 text-[13px] transition-colors cursor-pointer",
              isActive ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {VIEW_LABEL[v]}
          </button>
        );
      })}
    </div>
  );
}

function PeriodMenu({ value, onChange }: { value: ExpensePeriod; onChange: (p: ExpensePeriod) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" className="h-9 gap-1.5 rounded-lg px-3 text-[13.5px]">
            <Calendar size={15} strokeWidth={1.8} className="text-muted-foreground" />
            <span className="tabular">{`Last ${EXPENSE_PERIOD_LABEL[value]}`}</span>
            <ChevronDown size={15} strokeWidth={1.8} className="text-muted-foreground" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-44">
        {EXPENSE_PERIODS.map((p) => (
          <DropdownMenuItem
            key={p}
            onClick={() => onChange(p)}
            className={cn("text-[13px] tabular", value === p && "bg-muted")}
          >
            {`Last ${EXPENSE_PERIOD_LABEL[p]}`}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Neutral either way: spending less isn't praised and spending more isn't
 * scolded — the customer reads the direction, the page doesn't grade it.
 */
function Comparison({
  total,
  previous,
  currency,
  periodLabel,
}: {
  total: number;
  previous: number;
  currency: string;
  periodLabel: string;
}) {
  const { formatMoney } = useAmountVisibility();
  if (previous <= 0) return null;
  const diff = roundMoney(total - previous);
  const text =
    Math.abs(diff) < 1
      ? `About the same as the previous ${periodLabel}`
      : diff > 0
        ? `${formatMoney(diff, currency)} more than the previous ${periodLabel}`
        : `${formatMoney(Math.abs(diff), currency)} less than the previous ${periodLabel}`;
  return <p className="max-w-[260px] text-center text-[12.5px] leading-relaxed text-muted-foreground tabular">{text}</p>;
}

/** Drawn in a 300-unit viewBox and scaled to its container, so it shrinks on phones. */
const DONUT_BOX = 300;
const DONUT_OUTER = 150;
const DONUT_INNER = 106;
/** Degrees between visible segments. */
const DONUT_GAP = 2;

/**
 * Same motion as the dashboard analytics widget: every slot keeps its place and
 * colour across periods (see `stableSlices`), and each segment's start/end
 * angle tweens to its new size — a period change reads as segments growing and
 * shrinking in place, never reshuffling.
 */
function Donut({
  slices,
  selected,
  children,
}: {
  slices: CategorySlice[];
  selected: string | null;
  children: React.ReactNode;
}) {
  const target = useMemo(() => {
    const visible = slices.filter((s) => s.amount > 0).length;
    const available = 360 - (visible > 1 ? visible * DONUT_GAP : 0);
    const out: Record<string, Arc> = {};
    let angle = -90;
    for (const s of slices) {
      if (s.amount <= 0) {
        out[s.category] = { start: angle, end: angle };
        continue;
      }
      const start = angle;
      angle += s.share * available;
      out[s.category] = { start, end: angle };
      if (visible > 1) angle += DONUT_GAP;
    }
    return out;
  }, [slices]);

  const arcs = useTweenedArcs(target);
  const c = DONUT_BOX / 2;

  return (
    <div className="relative aspect-square w-full max-w-[260px] sm:max-w-[300px]">
      <svg viewBox={`0 0 ${DONUT_BOX} ${DONUT_BOX}`} className="size-full" aria-hidden="true">
        {slices.map((s) => {
          const arc = arcs[s.category] ?? target[s.category];
          if (!arc || arc.end - arc.start <= 0.3) return null;
          // A single segment is a whole ring; a wedge path can't close on itself.
          const d =
            arc.end - arc.start >= 359.5
              ? `M ${c} ${c - DONUT_OUTER} A ${DONUT_OUTER} ${DONUT_OUTER} 0 1 1 ${c - 0.01} ${c - DONUT_OUTER} Z M ${c} ${c - DONUT_INNER} A ${DONUT_INNER} ${DONUT_INNER} 0 1 0 ${c - 0.01} ${c - DONUT_INNER} Z`
              : createAnnularWedgePath(c, c, DONUT_INNER, DONUT_OUTER, arc.start, arc.end, 6);
          return (
            <path
              key={s.category}
              d={d}
              fillRule="evenodd"
              style={{
                fill: s.color,
                opacity: selected && selected !== s.category ? 0.25 : 1,
                transition: "opacity 200ms",
              }}
            />
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
        {children}
      </div>
    </div>
  );
}
