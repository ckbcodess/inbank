"use client";

/**
 * Transaction Monitoring — section 7, state model 13.1. STUB.
 *
 * Operational work queue optimized for scanning, filtering and exceptions. Rows
 * open Transaction Details in the OPERATIONS VIEW — a variant of the same
 * object screen, view-only with no execution (12.5).
 */

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import StubNotice from "@/components/StubNotice";
import { Input } from "@/components/ui/input";
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

export default function TransactionMonitoringPage() {
  const [state, setState] = useState<ListState>("populated");
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Transaction monitoring"
        description="Operational queue across all customers. View-only — no execution from this portal."
      />

      <StateSwitcher
        section="13.1"
        states={LIST_STATES}
        value={state}
        onChange={setState}
        labels={LIST_STATE_LABEL}
      />

      <StubNotice section="section 7 / sitemap 12.5" states="13.1 list, 13.2 ops variant" />

      <section className="rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <div className="relative min-w-[200px] flex-1">
            <Search
              size={15}
              strokeWidth={1.9}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search reference, customer or counterparty"
              className="pl-9"
              aria-label="Search transactions"
            />
          </div>
        </div>

        <ul className="divide-y divide-border">
          {TRANSACTIONS.map((t) => (
            <li key={t.id}>
              <Link
                href={`/admin/transactions/${t.id}`}
                className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/50 active:scale-[0.99] transition-transform"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13.5px] text-foreground">{t.description}</span>
                  <span className="mt-0.5 truncate text-[12px] text-muted-foreground tabular">
                    {t.reference} · {formatDate(t.date)} · {t.channel}
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
