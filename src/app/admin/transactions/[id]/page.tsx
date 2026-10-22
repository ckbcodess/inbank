"use client";

/**
 * Transaction Details — Operations View — section 7, a VARIANT of 13.2. STUB.
 *
 * Reuses the transaction object structure with operational information and
 * actions. Per 12.5 this view is strictly view-only: no execution controls, and
 * the exception stays attached to its transaction rather than becoming its own
 * screen.
 */

import { Fact } from "@/components/ui/fact";
import { useState, use } from "react";
import { AlertTriangle, Eye } from "@/components/ui/icons";
import PageHeader from "@/components/layout/PageHeader";
import StubNotice from "@/components/StubNotice";
import { TransactionStatusBadge } from "@/components/StatusBadge";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import { TRANSACTION_STATE_LABEL, type TransactionState } from "@/lib/states";
import { findTransaction, formatDate, formatMoney } from "@/lib/mock-data";

const TRANSACTION_STATES: readonly TransactionState[] = [
  "pending",
  "completed",
  "failed-single",
  "failed-bulk",
  "failed-trade",
  "reversed",
  "disputed",
  "awaiting-approval",
] as const;

const AUDIT_TRAIL = [
  { at: "2026-08-10 09:14", actor: "Ransford Gyasi", event: "Payment submitted via Internet Banking" },
  { at: "2026-08-10 09:15", actor: "System", event: "Sanctions screening passed" },
  { at: "2026-08-10 09:16", actor: "System", event: "Routed to approver queue" },
  { at: "2026-08-10 11:02", actor: "System", event: "Flagged — counterparty name mismatch" },
];

export default function OpsTransactionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [state, setState] = useState<TransactionState>("pending");
  const txn = findTransaction(id);

  if (!txn) {
    return (
      <PageHeader title="Transaction Not Found" backTo={{ href: "/admin/transactions", label: "Monitoring" }} />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={txn.description}
        description={`${txn.reference} · ${txn.channel}`}
        backTo={{ href: "/admin/transactions", label: "Transaction monitoring" }}
      />

      <StateSwitcher
        section="13.2"
        states={TRANSACTION_STATES}
        value={state}
        onChange={setState}
        labels={TRANSACTION_STATE_LABEL}
      />

      <StubNotice section="section 7" states="13.2 operations variant" />

      {/* View-only indicator — the defining constraint of this variant */}
      <div className="flex items-start gap-2 rounded-2xl border border-border bg-muted/40 p-3">
        <Eye size={16} aria-hidden="true" className="mt-px shrink-0 text-muted-foreground" />
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          View-only. Internal staff can investigate and annotate this transaction but cannot execute,
          amend or reverse it from the Admin Portal.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
          <div>
            <span className="text-[12px] text-muted-foreground">Amount</span>
            <p className="mt-2 text-[28px] leading-none tracking-[var(--ls-heading)] text-foreground tabular">
              {formatMoney(txn.amount, txn.currency)}
            </p>
          </div>
          <TransactionStatusBadge state={txn.state} />
        </div>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 pt-4 sm:grid-cols-2">
          <Fact label="Reference" value={txn.reference} mono />
          <Fact label="Date" value={formatDate(txn.date)} />
          <Fact label="Counterparty" value={txn.counterparty} />
          <Fact label="Counterparty account" value={txn.counterpartyAccount} mono />
          <Fact label="Channel" value={txn.channel} />
          <Fact label="Customer" value="Adinkra Textiles Ltd" />
        </dl>
      </section>

      {/* Exception stays attached to its transaction context (section 7) */}
      {(txn.state === "failed-single" || txn.state === "failed-bulk" || txn.state === "disputed") && (
        <section className="rounded-2xl border border-warning/40 bg-warning/5 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle
              size={17}
              aria-hidden="true"
              className="mt-px shrink-0 text-warning-text"
            />
            <div>
              <p className="text-[14px] text-warning-text">Exception attached</p>
              <p className="mt-2 text-[13px] leading-relaxed text-foreground/90">
                {txn.failureReason ?? "This transaction is flagged for operational review."}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card">
        <h2 className="border-b border-border px-4 py-3 text-[15px] text-foreground">Audit trail</h2>
        <ul className="divide-y divide-border">
          {AUDIT_TRAIL.map((e, i) => (
            <li key={i} className="flex gap-3 px-4 py-2">
              <span className="w-28 shrink-0 text-[12px] text-muted-foreground tabular">{e.at}</span>
              <span className="min-w-0 flex-1 text-[13px] text-foreground">{e.event}</span>
              <span className="shrink-0 text-[12px] text-muted-foreground">{e.actor}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

