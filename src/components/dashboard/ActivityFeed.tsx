"use client";

/**
 * FR-04 / FR-22 / FR-32 — recent activity, with failures surfaced in place.
 *
 * A failed payment is the one item on this feed the customer has to act on, so
 * it is the one item that must not require a tap to understand. Where the state
 * is a failure, the row expands to carry the bank's exact reason and the
 * correct recovery action — the same destinations Transaction Details routes
 * to, so the two never disagree:
 *
 *   failed-single → duplicate into a fresh draft to correct and resubmit
 *   failed-bulk   → the batch's validation view, where records are fixed together
 *   failed-trade  → the trade's versioned resubmission
 *
 * Everything else stays a quiet one-line row. If every row shouted, the failing
 * one would not stand out.
 */

import Link from "next/link";
import { AlertCircle, ArrowUpRight, Copy, Layers, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionStatusBadge } from "@/components/StatusBadge";
import { formatDate, type Transaction } from "@/lib/mock-data";
import { useAmountVisibility, RevealingAmount } from "@/components/providers/AmountVisibilityProvider";

const FAILED_STATES = new Set(["failed-single", "failed-bulk", "failed-trade"]);

/** Where a failed record goes to be corrected, and what to call the action. */
function recovery(txn: Transaction): { href: string; label: string; icon: React.ElementType } {
  switch (txn.state) {
    case "failed-bulk":
      return {
        href: `/payments/bulk/${txn.batchId ?? "batch-0090"}`,
        label: "Open batch",
        icon: Layers,
      };
    case "failed-trade":
      return {
        href: `/trade/${txn.tradeId ?? txn.id}`,
        label: "Review & resubmit",
        icon: RefreshCw,
      };
    default:
      return { href: `/payments/send?duplicate=${txn.id}`, label: "Edit & retry", icon: Copy };
  }
}

function FailureDetail({ txn }: { txn: Transaction }) {
  const { href, label, icon: Icon } = recovery(txn);

  return (
    <div className="mt-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-3">
      <div className="flex gap-2.5">
        <AlertCircle
          size={15}
          strokeWidth={1.9}
          aria-hidden="true"
          className="mt-px shrink-0 text-destructive"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] leading-relaxed text-foreground">
            {txn.failureReason ??
              "The receiving bank rejected this payment. No funds left your account."}
          </p>
          <div className="mt-2.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 px-2.5 text-[12px]"
              nativeButton={false}
              render={<Link href={href} />}
            >
              <Icon size={13} strokeWidth={1.9} aria-hidden="true" />
              {label}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ActivityFeed({ transactions }: { transactions: Transaction[] }) {
  useAmountVisibility();
  const recent = transactions.slice(0, 5);

  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-[15px] text-foreground">Recent activity</h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Your last {recent.length} transactions, with anything that needs fixing shown here
          </p>
        </div>
        <Link href="/transactions" className="text-[12px] text-primary underline-offset-4 hover:underline">
          View all transactions
        </Link>
      </div>

      {recent.length === 0 ? (
        <p className="px-5 py-8 text-center text-[13px] text-muted-foreground">
          No transactions yet.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {recent.map((t) => {
            const failed = FAILED_STATES.has(t.state);

            return (
              <li key={t.id} className="px-5 py-3.5">
                <Link
                  href={`/transactions/${t.id}`}
                  className="flex items-center gap-3 rounded-lg transition-colors hover:opacity-80"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13px] text-foreground">{t.description}</span>
                    <span className="mt-0.5 text-[12px] text-muted-foreground tabular">
                      {formatDate(t.date)} · {t.counterparty}
                    </span>
                  </span>
                  <span className="shrink-0 text-[13px] text-foreground tabular">
                    {t.direction === "debit" ? "−" : "+"}
                    <RevealingAmount amount={t.amount} currency={t.currency} />
                  </span>
                  <TransactionStatusBadge state={t.state} />
                  <ArrowUpRight
                    size={15}
                    strokeWidth={1.8}
                    aria-hidden="true"
                    className="shrink-0 text-muted-foreground"
                  />
                </Link>

                {failed && <FailureDetail txn={t} />}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
