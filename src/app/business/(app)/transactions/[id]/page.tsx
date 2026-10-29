"use client";

/**
 * Business transaction receipt. The receipt body is shared with personal banking; what is business's is where
 * it links (everything stays under /business), what "repeat" means (the supplier payment), where a payment is on
 * its approval path (and what was said when it was sent back), and the two failures only a company has: a record
 * that failed inside a bulk batch, and a trade request returned by bank operations.
 */

import { use } from "react";
import Link from "next/link";
import { ArrowRight, Clock, Undo2, FileWarning, History, Layers, RotateCcw } from "@/components/ui/icons";
import ApprovalTrail from "@/components/corporate/approvals/ApprovalTrail";
import { Button } from "@/components/ui/button";
import { Band, TransactionReceipt } from "@/components/transactions/TransactionReceipt";
import { findApprovalByReference, TRADE_VERSIONS } from "@/lib/corporate/approvals";
import { businessRepeatHref } from "@/lib/corporate/repeat-payment";
import type { Transaction } from "@/lib/mock-data";
import type { TransactionState } from "@/lib/states";

const BUSINESS_STATES: readonly TransactionState[] = ["returned", "failed-bulk", "failed-trade"] as const;

function renderBusinessBand(state: TransactionState, txn: Transaction) {
  const approval = findApprovalByReference(txn.reference);

  if (state === "awaiting-approval" && approval) {
    return (
      <Band tone="neutral" icon={<Clock size={17} aria-hidden="true" />} title="Waiting for approval">
        <p className="mb-3">Nothing has left the account yet.</p>
        <ApprovalTrail item={approval} />
      </Band>
    );
  }

  if (state === "returned") {
    const repeat = businessRepeatHref(txn);
    return (
      <Band tone="warning" icon={<Undo2 size={17} aria-hidden="true" />} title="Sent back to the inputter">
        <p className="mb-3">Nothing left the account. Change what was asked and submit it again.</p>
        {approval ? <ApprovalTrail item={approval} /> : txn.failureReason && <p>“{txn.failureReason}”</p>}
        {repeat && (
          <div className="mt-3">
            <Button size="sm" nativeButton={false} render={<Link href={repeat} />}>
              <RotateCcw size={14} className="mr-2" />
              Edit and Resubmit
            </Button>
          </div>
        )}
      </Band>
    );
  }

  if (state === "failed-bulk") {
    return (
      <Band tone="destructive" icon={<Layers size={17} aria-hidden="true" />} title="Failed within a batch">
        <p>{txn.failureReason ?? "This record failed as part of a bulk payment batch."}</p>
        <p className="mt-2 text-muted-foreground">Records in a batch are corrected together in batch validation.</p>
        <div className="mt-2">
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href={`/business/payments/bulk/${txn.batchId ?? "batch-0090"}`} />}
          >
            <ArrowRight size={14} className="mr-2" />
            Open Batch Correction
          </Button>
        </div>
      </Band>
    );
  }

  if (state === "failed-trade") {
    return (
      <Band tone="warning" icon={<FileWarning size={17} aria-hidden="true" />} title="Returned by bank operations">
        <p>{txn.failureReason ?? "This trade request was returned for correction."}</p>
        <div className="mt-2 rounded-xl border border-border bg-card">
          <p className="flex items-center gap-2 border-b border-border px-2 py-2 text-[12px] text-muted-foreground">
            <History size={13} />
            Version history
          </p>
          <ul className="divide-y divide-border">
            {TRADE_VERSIONS.map((v) => (
              <li key={v.version} className="flex items-center gap-2 px-2 py-2 text-[13px]">
                <span className="w-7 shrink-0 text-muted-foreground tabular">v{v.version}</span>
                <span className="min-w-0 flex-1 truncate text-foreground">{v.summary}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-2 flex gap-2">
          <Button size="sm" nativeButton={false} render={<Link href={`/business/trade/${txn.tradeId ?? "trade-0417"}`} />}>
            <RotateCcw size={14} className="mr-2" />
            Resubmit as v{TRADE_VERSIONS.length + 1}
          </Button>
        </div>
      </Band>
    );
  }

  return null;
}

export default function BusinessTransactionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <TransactionReceipt
      id={id}
      list={{ href: "/business/transactions", label: "Transactions" }}
      success={{ href: "/business/payments", label: "Send & Pay" }}
      repeatHref={businessRepeatHref}
      extraStates={BUSINESS_STATES}
      renderBand={renderBusinessBand}
    />
  );
}
