"use client";

/**
 * Transaction Details — section 2, state model 13.2.
 *
 * The doc calls this the highest-leverage screen in the system; it is inherited
 * by the Payment Approval context, the Operations view and the Exception view.
 *
 * All eight states are implemented. Critically, the three failure states are
 * NOT one generic "Error" — recovery branches by transaction type per section 3:
 *
 *   failed-single -> Duplicate & Edit, which clones into a fresh draft
 *   failed-bulk   -> links back to batch correction; no standalone fix here
 *   failed-trade  -> version history (v1/v2/v3) + resubmit path
 *
 * Object destination: reached from the Transaction List, never from nav (12.4).
 */

import { use, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Clock,
  Copy,
  FileWarning,
  History,
  Info,
  Layers,
  RotateCcw,
  ShieldQuestion,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { TransactionStatusBadge } from "@/components/StatusBadge";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import { TRANSACTION_STATE_LABEL, type TransactionState } from "@/lib/states";
import { findTransaction, formatDate, formatMoney, TRADE_VERSIONS } from "@/lib/mock-data";

const ALL_STATES: readonly TransactionState[] = [
  "pending",
  "completed",
  "failed-single",
  "failed-bulk",
  "failed-trade",
  "reversed",
  "disputed",
  "awaiting-approval",
] as const;

export default function TransactionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const txn = findTransaction(id);
  const [state, setState] = useState<TransactionState>(txn?.state ?? "completed");

  if (!txn) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Transaction not found" backTo={{ href: "/transactions", label: "Transactions" }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={txn.description}
        description={`${txn.reference} · ${txn.channel}`}
        backTo={{ href: "/transactions", label: "Transactions" }}
      />

      <StateSwitcher
        section="13.2"
        states={ALL_STATES}
        value={state}
        onChange={setState}
        labels={TRANSACTION_STATE_LABEL}
      />

      {/* Amount + status header */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-[12px] text-muted-foreground">
              {txn.direction === "debit" ? "Amount sent" : "Amount received"}
            </span>
            <p className="mt-1.5 text-[28px] leading-none tracking-[-0.02em] text-foreground tabular">
              {txn.direction === "debit" ? "−" : "+"}
              {formatMoney(txn.amount, txn.currency)}
            </p>
            {txn.fee !== undefined && (
              <p className="mt-2 text-[12.5px] text-muted-foreground tabular">
                Fee {formatMoney(txn.fee, txn.currency)}
              </p>
            )}
          </div>
          <TransactionStatusBadge state={state} />
        </div>
      </section>

      {/* ── State-specific band ── */}
      <StateBand state={state} txn={txn} />

      {/* Shared transaction facts */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-4 text-[15px] text-foreground">Details</h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <Fact label="Reference" value={txn.reference} mono copyable />
          <Fact label="Date" value={formatDate(txn.date)} />
          <Fact label="Value date" value={formatDate(txn.valueDate)} />
          <Fact label="Channel" value={txn.channel} />
          <Fact label="Counterparty" value={txn.counterparty} />
          <Fact label="Counterparty account" value={txn.counterpartyAccount} mono />
        </dl>
      </section>
    </div>
  );
}

/**
 * Renders the band that belongs to the current 13.2 state. Each failure type
 * gets its own recovery affordance — they intentionally do not share a
 * component, so the three paths can never collapse into one.
 */
function StateBand({ state, txn }: { state: TransactionState; txn: NonNullable<ReturnType<typeof findTransaction>> }) {
  switch (state) {
    // ── Pending / Processing — show expected timing if known ──
    case "pending":
      return (
        <Band tone="warning" icon={<Clock size={17} strokeWidth={1.8} aria-hidden="true" />} title="Processing">
          <p>
            This payment has been submitted and is being processed. Funds are expected to settle by{" "}
            <span className="text-foreground">{formatDate(txn.valueDate)}, end of day</span>.
          </p>
        </Band>
      );

    // ── Completed ──
    case "completed":
      return null;

    // ── Failure 1 of 3: single payment → Duplicate & Edit into a fresh draft ──
    case "failed-single":
      return (
        <Band tone="destructive" icon={<AlertCircle size={17} strokeWidth={1.8} aria-hidden="true" />} title="Payment failed">
          <p>
            {txn.failureReason ??
              "The receiving bank rejected this payment. No funds left your account."}
          </p>
          <p className="mt-2 text-muted-foreground">
            Nothing was debited. Duplicating creates a new draft with these details so you can correct
            and resubmit.
          </p>
          <div className="mt-4">
            <Button size="sm" nativeButton={false} render={<Link href={`/payments/new?duplicate=${txn.id}`} />}>
              <Copy size={14} strokeWidth={1.9} aria-hidden="true" />
              Duplicate &amp; Edit
            </Button>
          </div>
        </Band>
      );

    // ── Failure 2 of 3: bulk → correction happens in the batch, not here ──
    case "failed-bulk":
      return (
        <Band tone="destructive" icon={<Layers size={17} strokeWidth={1.8} aria-hidden="true" />} title="Failed within a batch">
          <p>{txn.failureReason ?? "This record failed as part of a bulk payment batch."}</p>
          <p className="mt-2 text-muted-foreground">
            Records in a batch are corrected together, so this one is fixed in the batch&apos;s validation
            view rather than here. The rest of the batch is unaffected.
          </p>
          <div className="mt-4">
            <Button
              size="sm"
              variant="outline"
              nativeButton={false} render={<Link href={`/payments/bulk/${txn.batchId ?? "batch-0090"}`} />}
            >
              <ArrowRight size={14} strokeWidth={1.9} aria-hidden="true" />
              Open batch correction
            </Button>
          </div>
        </Band>
      );

    // ── Failure 3 of 3: trade → version history + resubmit ──
    case "failed-trade":
      return (
        <Band tone="warning" icon={<FileWarning size={17} strokeWidth={1.8} aria-hidden="true" />} title="Returned by bank operations">
          <p>{txn.failureReason ?? "This trade request was returned for correction."}</p>
          <p className="mt-2 text-muted-foreground">
            Trade requests are versioned. Resubmitting creates a new version and keeps the full history
            for comparison.
          </p>

          <div className="mt-4 rounded-xl border border-border bg-background">
            <p className="flex items-center gap-1.5 border-b border-border px-3.5 py-2.5 text-[12px] uppercase tracking-wider text-muted-foreground">
              <History size={13} strokeWidth={1.9} aria-hidden="true" />
              Version history
            </p>
            <ul className="divide-y divide-border">
              {TRADE_VERSIONS.map((v) => (
                <li key={v.version} className="flex items-center gap-3 px-3.5 py-2.5">
                  <span className="w-8 shrink-0 text-[12.5px] text-muted-foreground tabular">v{v.version}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-foreground">{v.summary}</span>
                    <span className="block text-[12px] text-muted-foreground tabular">{v.submittedAt}</span>
                  </span>
                  {v.version === TRADE_VERSIONS.length && (
                    <span className="shrink-0 text-[12px] text-muted-foreground">Current</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" nativeButton={false} render={<Link href={`/trade/${txn.tradeId ?? "trade-0417"}`} />}>
              <RotateCcw size={14} strokeWidth={1.9} aria-hidden="true" />
              Resubmit as v{TRADE_VERSIONS.length + 1}
            </Button>
            <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/trade/${txn.tradeId ?? "trade-0417"}`} />}>
              Compare versions
            </Button>
          </div>
        </Band>
      );

    // ── Reversed — show original + reversal reference ──
    case "reversed":
      return (
        <Band tone="neutral" icon={<RotateCcw size={17} strokeWidth={1.8} aria-hidden="true" />} title="Reversed">
          <p>
            This transaction completed and was later reversed. The reversing entry carries reference{" "}
            <span className="text-foreground tabular">{txn.reversalReference ?? "—"}</span>.
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2">
            <div>
              <dt className="text-[12px] text-muted-foreground">Original</dt>
              <dd className="mt-0.5 text-[13px] text-foreground tabular">{txn.reference}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-muted-foreground">Reversal</dt>
              <dd className="mt-0.5 text-[13px] text-foreground tabular">{txn.reversalReference ?? "—"}</dd>
            </div>
          </dl>
        </Band>
      );

    // ── Disputed — flagged in the doc as an open item pending BRD confirmation ──
    case "disputed":
      return (
        <Band tone="warning" icon={<ShieldQuestion size={17} strokeWidth={1.8} aria-hidden="true" />} title="Under dispute">
          <p>
            This transaction has been flagged as disputed and is being investigated. You&apos;ll be
            notified when the outcome is recorded.
          </p>
          <p className="mt-2 flex items-start gap-1.5 text-[12.5px] text-muted-foreground">
            <Info size={13} strokeWidth={1.9} aria-hidden="true" className="mt-px shrink-0" />
            Scope of the disputed state is an open item in the consolidation doc (13.2) — behaviour to be
            confirmed against the BRD.
          </p>
        </Band>
      );

    // ── Awaiting approval — read-only for the initiator, no decision controls ──
    case "awaiting-approval":
      return (
        <Band tone="neutral" icon={<Clock size={17} strokeWidth={1.8} />} title="Waiting for approval">
          <p>
            This payment is in an approver&apos;s queue and hasn&apos;t been sent yet. You submitted it, so
            you can follow its progress but can&apos;t approve it yourself.
          </p>
        </Band>
      );
  }
}

function Band({
  tone,
  icon,
  title,
  children,
}: {
  tone: "warning" | "destructive" | "neutral";
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const toneClasses = {
    warning: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
    destructive: "border-destructive/30 bg-destructive/5 text-destructive",
    neutral: "border-border bg-muted/40 text-foreground",
  }[tone];

  return (
    <section className={`rounded-2xl border p-5 ${toneClasses}`}>
      <div className="flex items-start gap-3">
        <span className="mt-px shrink-0">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px]">{title}</p>
          <div className="mt-1.5 text-[13px] leading-relaxed text-foreground/90">{children}</div>
        </div>
      </div>
    </section>
  );
}

function Fact({
  label,
  value,
  mono,
  copyable,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
}) {
  return (
    <div>
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 flex items-center gap-1.5 text-[13px] text-foreground ${mono ? "tabular" : ""}`}>
        {value}
        {copyable && (
          <button
            type="button"
            aria-label={`Copy ${label.toLowerCase()}`}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <Copy size={13} strokeWidth={1.8} />
          </button>
        )}
      </dd>
    </div>
  );
}
