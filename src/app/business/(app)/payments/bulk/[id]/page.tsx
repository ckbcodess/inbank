"use client";

/**
 * One bulk batch (FR-COR-39, BRL-21): where it is on its approval path, and once released, each line's own status.
 * A line that failed at the receiving bank says why; the rest of the batch is unaffected and nothing was debited
 * for that line. Transaction Details sends a batch record here, and so does the approver from the queue.
 */

import { use, useMemo } from "react";
import { CheckCircle2, Clock, XCircle } from "@/components/ui/icons";
import PageHeader from "@/components/layout/PageHeader";
import ApprovalTrail from "@/components/corporate/approvals/ApprovalTrail";
import { Badge } from "@/components/ui/badge";
import { ListCard } from "@/components/ui/list-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { findBusinessAccount } from "@/lib/corporate/accounts";
import { findApproval } from "@/lib/corporate/approvals";
import { findBatch, railFor, totals, type LineStatus } from "@/lib/corporate/bulk";
import { formatMoney } from "@/lib/mock-data";

const STATUS: Record<LineStatus, { label: string; icon: React.ReactNode }> = {
  paid: { label: "Paid", icon: <CheckCircle2 size={14} className="text-success-text" aria-hidden="true" /> },
  processing: { label: "Processing", icon: <Clock size={14} className="text-muted-foreground" aria-hidden="true" /> },
  failed: { label: "Failed", icon: <XCircle size={14} className="text-destructive-text" aria-hidden="true" /> },
  waiting: { label: "Waiting for approval", icon: <Clock size={14} className="text-muted-foreground" aria-hidden="true" /> },
};

export default function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const batch = useMemo(() => findBatch(id), [id]);

  if (!batch) {
    return <PageHeader title="Batch Not Found" backTo={{ href: "/business/transactions", label: "Transactions" }} />;
  }

  const account = findBusinessAccount(batch.accountId);
  const approval = batch.approvalId ? findApproval(batch.approvalId) : undefined;
  const sum = totals(batch.lines);
  const failed = batch.lines.filter((l) => l.status === "failed");
  const paid = batch.lines.filter((l) => l.status === "paid").length;
  const processing = batch.lines.filter((l) => l.status === "processing").length;

  const headline =
    batch.status === "awaiting-approval"
      ? "Waiting for approval. Nothing has left the account."
      : batch.status === "returned"
        ? "Sent back to the inputter. Nothing left the account."
        : [`${paid} paid`, processing ? `${processing} processing` : "", failed.length ? `${failed.length} failed` : ""].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-10">
      <PageHeader
        title={batch.name}
        description={`${batch.id} · submitted by ${batch.submittedBy} · ${batch.submittedAt}`}
        backTo={{ href: "/business/transactions", label: "Transactions" }}
      />

      <section className="flex flex-col gap-2" aria-label="Batch total">
        <span className="text-[13px] text-muted-foreground">
          {`${batch.lines.length} payments${account ? ` from ${account.name}` : ""}`}
        </span>
        <span className="tabular text-[40px] leading-none tracking-[var(--ls-heading)] text-foreground">{formatMoney(sum.amount, "GHS", true)}</span>
        <span className="tabular text-[13px] text-muted-foreground">{`Fees ${formatMoney(sum.fees, "GHS", true)} · ${headline}`}</span>
      </section>

      {approval && (
        <section className="flex flex-col gap-3">
          <SectionHeading title="Approval Path" />
          <ApprovalTrail item={approval} />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <SectionHeading title="Payments" />
        <ListCard>
          {batch.lines.map((l) => (
            <li key={l.row} className="flex items-start gap-3 rounded-xl px-2 py-3 sm:px-3">
              <span className="tabular w-6 shrink-0 pt-0.5 text-[12px] text-muted-foreground">{l.row}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[14px] text-foreground">{l.name}</span>
                <span className="tabular truncate text-[12px] text-muted-foreground">
                  {`${l.bank} · ${l.account} · ${railFor(l.rail)?.shortName ?? l.rail}`}
                </span>
                {l.failure && <span className="text-[12px] text-destructive-text">{l.failure}</span>}
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span className="tabular text-[14px] text-foreground">{formatMoney(l.amount, "GHS", true)}</span>
                <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                  {STATUS[l.status].icon}
                  {STATUS[l.status].label}
                </span>
              </span>
            </li>
          ))}
        </ListCard>
        {failed.length > 0 && (
          <p className="text-[12px] text-muted-foreground">
            <Badge variant="warning" className="mr-2">
              {failed.length === 1 ? "1 failed" : `${failed.length} failed`}
            </Badge>
            Nothing was debited for a failed payment. Check the details with the recipient and add it to a new batch.
          </p>
        )}
      </section>
    </div>
  );
}
