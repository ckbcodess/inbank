"use client";

/**
 * Transaction Details — Operations View — section 7, a VARIANT of 13.2. STUB.
 *
 * Reuses the transaction object structure with operational information and
 * actions. Per 12.5 this view is strictly view-only: no execution controls, and
 * the exception stays attached to its transaction rather than becoming its own
 * screen.
 */

import { use } from "react";
import { AlertTriangle, Eye } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import StubNotice from "@/components/StubNotice";
import { TransactionStatusBadge } from "@/components/StatusBadge";
import { findTransaction, formatDate, formatMoney } from "@/lib/mock-data";

const AUDIT_TRAIL = [
  { at: "2026-08-10 09:14", actor: "Kwame Boateng", event: "Payment submitted via Internet Banking" },
  { at: "2026-08-10 09:15", actor: "System", event: "Sanctions screening passed" },
  { at: "2026-08-10 09:16", actor: "System", event: "Routed to approver queue" },
  { at: "2026-08-10 11:02", actor: "System", event: "Flagged — counterparty name mismatch" },
];

export default function OpsTransactionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const txn = findTransaction(id);

  if (!txn) {
    return (
      <PageHeader title="Transaction not found" backTo={{ href: "/admin/transactions", label: "Monitoring" }} />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={txn.description}
        description={`${txn.reference} · ${txn.channel}`}
        backTo={{ href: "/admin/transactions", label: "Transaction monitoring" }}
      />

      <StubNotice section="section 7" states="13.2 operations variant" />

      {/* View-only indicator — the defining constraint of this variant */}
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4">
        <Eye size={16} strokeWidth={1.8} aria-hidden="true" className="mt-px shrink-0 text-muted-foreground" />
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          View-only. Internal staff can investigate and annotate this transaction but cannot execute,
          amend or reverse it from the Admin Portal.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <span className="text-[12px] text-muted-foreground">Amount</span>
            <p className="mt-1.5 text-[28px] leading-none tracking-[-0.02em] text-foreground tabular">
              {formatMoney(txn.amount, txn.currency)}
            </p>
          </div>
          <TransactionStatusBadge state={txn.state} />
        </div>

        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 pt-5 sm:grid-cols-2">
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
        <section className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={17}
              strokeWidth={1.8}
              aria-hidden="true"
              className="mt-px shrink-0 text-amber-600 dark:text-amber-400"
            />
            <div>
              <p className="text-[14px] text-amber-700 dark:text-amber-400">Exception attached</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/90">
                {txn.failureReason ?? "This transaction is flagged for operational review."}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card">
        <h2 className="border-b border-border px-5 py-4 text-[15px] text-foreground">Audit trail</h2>
        <ul className="divide-y divide-border">
          {AUDIT_TRAIL.map((e, i) => (
            <li key={i} className="flex gap-4 px-5 py-3">
              <span className="w-32 shrink-0 text-[12px] text-muted-foreground tabular">{e.at}</span>
              <span className="min-w-0 flex-1 text-[13px] text-foreground">{e.event}</span>
              <span className="shrink-0 text-[12px] text-muted-foreground">{e.actor}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 text-[13px] text-foreground ${mono ? "tabular" : ""}`}>{value}</dd>
    </div>
  );
}
