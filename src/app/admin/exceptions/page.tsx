"use client";

/**
 * Exceptions — sitemap 12.5. STUB.
 *
 * Explicitly "a filtered view of Transaction Monitoring", so it reuses that
 * list rather than introducing a new screen pattern. Rows open the same
 * operations-view Transaction Details, where the exception lives as a state.
 */

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import StubNotice from "@/components/StubNotice";
import { TransactionStatusBadge } from "@/components/StatusBadge";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import { LIST_STATE_LABEL, type ListState } from "@/lib/states";
import { TRANSACTIONS, formatDate, formatMoney } from "@/lib/mock-data";

const LIST_STATES: readonly ListState[] = [
  "loading",
  "empty",
  "filtered-empty",
  "populated",
  "partial-load",
  "error",
] as const;

export default function ExceptionsPage() {
  const [state, setState] = useState<ListState>("populated");
  // Same source as Transaction Monitoring, narrowed to exception states.
  const exceptions = TRANSACTIONS.filter(
    (t) => t.state === "failed-single" || t.state === "failed-bulk" || t.state === "disputed" || t.state === "failed-trade",
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Exceptions"
        description="A filtered view of transaction monitoring — items needing investigation."
      />

      <StateSwitcher
        section="13.1"
        states={LIST_STATES}
        value={state}
        onChange={setState}
        labels={LIST_STATE_LABEL}
      />

      <StubNotice section="sitemap 12.5" states="13.1 list" />

      <section className="rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <AlertTriangle size={16} strokeWidth={1.8} aria-hidden="true" className="text-amber-600 dark:text-amber-400" />
          <h2 className="text-[15px] text-foreground">{exceptions.length} open exceptions</h2>
        </div>

        <ul className="divide-y divide-border">
          {exceptions.map((t) => (
            <li key={t.id}>
              <Link
                href={`/admin/transactions/${t.id}`}
                className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/50 active:scale-[0.99] transition-transform"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13.5px] text-foreground">{t.description}</span>
                  <span className="mt-0.5 truncate text-[12px] text-muted-foreground">
                    {t.failureReason ?? "Flagged for operational review"}
                  </span>
                  <span className="mt-0.5 truncate text-[12px] text-muted-foreground tabular">
                    {t.reference} · {formatDate(t.date)}
                  </span>
                </span>
                <span className="shrink-0 text-[13.5px] text-foreground tabular">
                  {formatMoney(t.amount, t.currency)}
                </span>
                <TransactionStatusBadge state={t.state} />
                <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
