"use client";

/**
 * Personal transaction receipt, as its own page. The body is shared with business (`TransactionReceipt`); this route
 * only says where it goes back to, which repeat applies, and adds Report Issue (personal only: the case is tracked
 * in Help's Reported Issues, which business doesn't have). Opened from a payment's success screen with `?from=success`.
 */

import { use, useState } from "react";
import { TransactionReceipt } from "@/components/transactions/TransactionReceipt";
import { ReportIssueDialog } from "@/components/transactions/ReportIssueDialog";
import { RoundAction } from "@/components/ui/round-action";
import { MessageSquareWarning } from "@/components/ui/icons";
import { personalRepeatHref } from "@/lib/repeat-payment";

/** The transaction is already known, so the form asks only what went wrong. */
function ReportIssueAction({ reference }: { reference: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <RoundAction icon={MessageSquareWarning} label="Report Issue" onClick={() => setOpen(true)} />
      <ReportIssueDialog open={open} onOpenChange={setOpen} reference={reference} />
    </>
  );
}

export default function TransactionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <TransactionReceipt
      id={id}
      list={{ href: "/transactions", label: "Transactions" }}
      success={{ href: "/overview", label: "Overview" }}
      repeatHref={personalRepeatHref}
      renderActions={(txn) => <ReportIssueAction reference={txn.reference} />}
    />
  );
}
