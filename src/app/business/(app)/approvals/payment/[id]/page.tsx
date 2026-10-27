"use client";

/**
 * Payment Approval Details — section 4, state model 13.4.
 *
 * One of TWO separate approval screens. This one is payment-specific: no
 * documents, no version comparison, no clarification loop. Its trade sibling
 * lives at /approvals/trade/[id] and shares no screen with it — section 4
 * split "Approval Details" into two variants deliberately.
 *
 * 13.4 states:
 *   awaiting-decision  — default
 *   within-limit       — approver's authority covers this; standard controls
 *   exceeds-limit      — outside authority; actions restricted (open item)
 *   decision-submitted — transient confirmation before returning to the queue
 */

import { Fact } from "@/components/ui/fact";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Info,
  ShieldAlert,
  XCircle,
} from "@/components/ui/icons";
import { AppLoader } from "@/components/ui/loader";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import RejectionDialog from "@/components/approvals/RejectionDialog";
import type { PaymentApprovalState } from "@/lib/states";
import { formatMoney } from "@/lib/mock-data";
import { findApproval } from "@/lib/corporate/approvals";
import { decideApproval } from "@/lib/corporate/payments";

const STATES: readonly PaymentApprovalState[] = [
  "awaiting-decision",
  "within-limit",
  "exceeds-limit",
  "decision-submitted",
] as const;

const STATE_LABEL: Record<PaymentApprovalState, string> = {
  "awaiting-decision": "Awaiting decision",
  "within-limit": "Within limit",
  "exceeds-limit": "Exceeds limit",
  "decision-submitted": "Decision submitted",
};

export default function PaymentApprovalDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const item = findApproval(id);

  // Initial state reflects the approver's actual authority for this item.
  const initial: PaymentApprovalState = item
    ? item.amount > item.approvalLimit
      ? "exceeds-limit"
      : "within-limit"
    : "awaiting-decision";

  const [state, setState] = useState<PaymentApprovalState>(initial);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [outcome, setOutcome] = useState<"approved" | "rejected" | null>(null);

  if (!item || item.type !== "payment") {
    return (
      <PageHeader title="Approval Not Found" backTo={{ href: "/business/approvals", label: "Approvals" }} />
    );
  }

  function submitDecision(kind: "approved" | "rejected") {
    setOutcome(kind);
    setState("decision-submitted");
    // Result becomes the updated transaction state (section 4), so the approver
    // is returned to the queue rather than left on a result screen.
    // The decision is recorded as the person leaves (the screen reads the item, so removing it sooner would
    // turn the confirmation into "not found").
    const approvalId = item?.id;
    window.setTimeout(() => {
      if (approvalId) decideApproval(approvalId, kind);
      router.push("/business/approvals");
    }, 1600);
  }

  const exceeds = state === "exceeds-limit";

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Payment Approval"
        description={`${item.reference} · submitted by ${item.submittedBy}`}
        backTo={{ href: "/business/approvals", label: "Approvals" }}
      />

      <StateSwitcher
        section="13.4"
        states={STATES}
        value={state}
        onChange={(next) => {
          setState(next);
          if (next !== "decision-submitted") setOutcome(null);
        }}
        labels={STATE_LABEL}
      />

      {/* Transient confirmation before leaving the queue (13.4) */}
      {state === "decision-submitted" && (
        <div
          className={`flex items-start gap-2 rounded-2xl border p-4 ${
            outcome === "rejected"
              ? "border-destructive/30 bg-destructive/5"
              : "border-success/30 bg-success/5"
          }`}
        >
          {outcome === "rejected" ? (
            <XCircle size={17} aria-hidden="true" className="mt-px shrink-0 text-destructive" />
          ) : (
            <CheckCircle2 size={17} aria-hidden="true" className="mt-px shrink-0 text-success-text" />
          )}
          <div>
            <p className="text-[14px] text-foreground">
              {outcome === "rejected" ? "Payment rejected" : "Payment approved"}
            </p>
            <p className="mt-1 flex items-center gap-2 text-[13px] text-muted-foreground">
              <AppLoader size={13} />
              Returning you to the queue…
            </p>
          </div>
        </div>
      )}

      {/* Authority band — 13.4 within-limit vs exceeds-limit */}
      {state === "exceeds-limit" && (
        <div className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <ShieldAlert size={17} aria-hidden="true" className="mt-px shrink-0 text-destructive" />
          <div className="min-w-0">
            <p className="text-[14px] text-destructive">This is above your approval limit</p>
            <p className="mt-2 text-[13px] leading-relaxed text-foreground/90">
              {formatMoney(item.amount, item.currency)} exceeds your authority of{" "}
              {formatMoney(item.approvalLimit, item.currency)}. You can review the payment and refer
              it upward, but you can&apos;t approve it yourself.
            </p>
            <p className="mt-2 flex items-start gap-2 text-[12.5px] text-muted-foreground">
              <Info size={13} aria-hidden="true" className="mt-px shrink-0" />
              Exact behaviour above an approver&apos;s limit is an open item in the consolidation doc
              (13.4) — to be confirmed against the BRD.
            </p>
          </div>
        </div>
      )}

      {state === "within-limit" && (
        <div className="flex items-start gap-2 rounded-2xl border border-border bg-muted/40 p-3">
          <CheckCircle2 size={16} aria-hidden="true" className="mt-px shrink-0 text-muted-foreground" />
          <p className="text-[13px] text-muted-foreground">
            Within your approval authority of {formatMoney(item.approvalLimit, item.currency)}.
          </p>
        </div>
      )}

      {/* Payment facts */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="border-b border-border pb-4">
          <span className="text-[12px] text-muted-foreground">Amount requested</span>
          <p className="mt-2 text-[28px] leading-none tracking-[var(--ls-heading)] text-foreground tabular">
            {formatMoney(item.amount, item.currency)}
          </p>
        </div>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 pt-4 sm:grid-cols-2">
          <Fact label="Reference" value={item.reference} mono />
          <Fact label="Beneficiary" value={item.counterparty} />
          <Fact label="Description" value={item.description} />
          <Fact label="Submitted by" value={item.submittedBy} />
          <Fact label="Submitted at" value={item.submittedAt} mono />
          <Fact label="Priority" value={item.priority === "urgent" ? "Urgent" : "Standard"} />
          <Fact label="Your approval limit" value={formatMoney(item.approvalLimit, item.currency)} mono />
        </dl>

        <div className="mt-4 border-t border-border pt-3">
          <Link
            href="/business/transactions/txn-008"
            className="inline-flex items-center gap-2 text-[13px] text-primary underline-offset-4 hover:underline"
          >
            View full transaction record
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Decision controls — payment-specific: approve / reject only.
          No "Return for Clarification" here; that belongs to trade (13.5). */}
      {state !== "decision-submitted" && (
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => submitDecision("approved")} disabled={exceeds}>
            <CheckCircle2 size={15} aria-hidden="true" />
            Approve Payment
          </Button>
          <Button variant="destructive" onClick={() => setRejectOpen(true)}>
            <XCircle size={15} aria-hidden="true" />
            Reject
          </Button>
          {exceeds && (
            <Button variant="outline">
              <AlertTriangle size={15} aria-hidden="true" />
              Refer to Senior Approver
            </Button>
          )}
        </div>
      )}

      <RejectionDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        reference={item.reference}
        onConfirm={() => {
          setRejectOpen(false);
          submitDecision("rejected");
        }}
      />
    </div>
  );
}

